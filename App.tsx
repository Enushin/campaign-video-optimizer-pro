import React, { useState, useCallback, useEffect } from "react";
import JSZip from "jszip";
import { VideoFile, OptimizationConfig } from "./types";
import { DEFAULT_CONFIG } from "./constants";
import { FileUploader } from "./components/FileUploader";
import { VideoCard } from "./components/ProcessingList";
import { OptimizationSettings } from "./components/OptimizationSettings";
import {
  processVideoWithFFmpeg,
  loadFFmpeg,
  formatBytes,
  resetFFmpeg,
} from "./utils/videoProcessor";
import {
  Zap,
  Archive,
  Upload,
  Loader2,
  CheckCircle2,
  Cpu,
  Sparkles,
  Download,
  Play,
  Settings2,
  Layers,
  Image,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

// WAVE処理の設定
const WAVE_SIZE = 5; // 1WAVEあたりの処理数

const App: React.FC = () => {
  const [config, setConfig] = useState<OptimizationConfig>(DEFAULT_CONFIG);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [engineStatus, setEngineStatus] = useState<
    "unloaded" | "loading" | "ready"
  >("unloaded");
  const [showSettings, setShowSettings] = useState(false);
  const [currentWave, setCurrentWave] = useState(0);
  const [totalWaves, setTotalWaves] = useState(0);

  useEffect(() => {
    const init = async () => {
      setEngineStatus("loading");
      try {
        await loadFFmpeg();
        setEngineStatus("ready");
      } catch (e) {
        console.error("FFmpeg load failed", e);
        alert(
          "FFmpegエンジンの読み込みに失敗しました。ブラウザの設定やネットワークを確認してください。",
        );
      }
    };
    init();
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    const newVideos: VideoFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      originalSize: file.size,
      status: "pending",
      progress: 0,
      thumbnails: [],
    }));
    setVideos((prev) => [...prev, ...newVideos]);
  }, []);

  const handleRemoveVideo = useCallback((id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const processVideo = useCallback(
    async (v: VideoFile) => {
      if (engineStatus !== "ready") return;

      try {
        setVideos((prev) =>
          prev.map((item) =>
            item.id === v.id
              ? { ...item, status: "processing", progress: 0 }
              : item,
          ),
        );

        const result = await processVideoWithFFmpeg(
          v.file,
          config,
          (progress) => {
            setVideos((prev) =>
              prev.map((item) =>
                item.id === v.id ? { ...item, progress } : item,
              ),
            );
          },
        );

        setVideos((prev) =>
          prev.map((item) =>
            item.id === v.id
              ? {
                  ...item,
                  status: "completed",
                  progress: 100,
                  duration: result.duration,
                  thumbnails: result.thumbnails,
                  optimizedBlob: result.optimizedBlob,
                  optimizedSize: result.optimizedBlob.size,
                  projectedBitrate: result.bitrate,
                }
              : item,
          ),
        );
      } catch (err: any) {
        setVideos((prev) =>
          prev.map((item) =>
            item.id === v.id
              ? { ...item, status: "error", error: err.message }
              : item,
          ),
        );
      }
    },
    [config, engineStatus],
  );

  const handleRetryVideo = useCallback(
    async (video: VideoFile) => {
      // ステータスをリセットしてpendingに戻す
      setVideos((prev) =>
        prev.map((v) =>
          v.id === video.id
            ? { ...v, status: "pending", progress: 0, error: undefined }
            : v,
        ),
      );
      // 即座に再処理を開始
      await processVideo(video);
    },
    [processVideo],
  );

  // WAVE方式でバッチ処理（メモリ安定性重視）
  const processInWaves = async (items: VideoFile[]) => {
    const waves = Math.ceil(items.length / WAVE_SIZE);
    setTotalWaves(waves);

    for (let waveIndex = 0; waveIndex < waves; waveIndex++) {
      setCurrentWave(waveIndex + 1);
      const start = waveIndex * WAVE_SIZE;
      const end = Math.min(start + WAVE_SIZE, items.length);
      const waveItems = items.slice(start, end);

      console.log(
        `WAVE ${waveIndex + 1}/${waves}: Processing ${waveItems.length} videos`,
      );

      // WAVE内は順次処理（FFmpegはシングルインスタンス）
      for (const v of waveItems) {
        try {
          await processVideo(v);
        } catch (err) {
          // エラーは processVideo 内で処理済み、スキップして続行
          console.error(`Processing failed for ${v.name}:`, err);
        }
      }

      // WAVE完了後にメモリクリア（最後のWAVE以外）
      if (waveIndex < waves - 1) {
        console.log(`WAVE ${waveIndex + 1} completed. Clearing memory...`);
        try {
          await resetFFmpeg();
        } catch (e) {
          console.warn("FFmpeg reset failed, continuing:", e);
        }
      }
    }

    setCurrentWave(0);
    setTotalWaves(0);
  };

  const handleProcessAll = async () => {
    setIsProcessingAll(true);
    const pending = videos.filter(
      (v) => v.status !== "completed" && v.status !== "error",
    );

    if (pending.length === 0) {
      setIsProcessingAll(false);
      return;
    }

    await processInWaves(pending);
    setIsProcessingAll(false);
  };

  // 失敗した動画のみ再処理
  const handleRetryFailed = async () => {
    setIsProcessingAll(true);
    const failed = videos.filter((v) => v.status === "error");

    if (failed.length === 0) {
      setIsProcessingAll(false);
      return;
    }

    // エラーステータスをpendingにリセット
    setVideos((prev) =>
      prev.map((v) =>
        v.status === "error"
          ? { ...v, status: "pending", progress: 0, error: undefined }
          : v,
      ),
    );

    // 最新のvideos状態を取得するために少し待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // FFmpegをリセットしてから再処理
    try {
      await resetFFmpeg();
    } catch (e) {
      console.warn("FFmpeg reset failed before retry:", e);
    }

    await processInWaves(failed);
    setIsProcessingAll(false);
  };

  const handleBatchDownload = async () => {
    const completed = videos.filter((v) => v.status === "completed");
    if (completed.length === 0) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();

      completed.forEach((v) => {
        const baseName = v.name.replace(/\.[^/.]+$/, "");
        const folder = zip.folder(baseName);

        if (folder) {
          if (v.optimizedBlob) {
            folder.file(`${baseName}_opt.mp4`, v.optimizedBlob);
          }

          const thumbFolder = folder.folder("thumbnails");
          v.thumbnails.forEach((t, i) => {
            thumbFolder?.file(`${baseName}_thumb_0${i + 1}.jpg`, t.blob);
          });
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign_assets_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("ZIP作成中にエラーが発生しました。");
    } finally {
      setIsZipping(false);
    }
  };

  const [isZippingThumbnails, setIsZippingThumbnails] = useState(false);

  const handleBatchThumbnailDownload = async () => {
    const completed = videos.filter(
      (v) => v.status === "completed" && v.thumbnails.length > 0,
    );
    if (completed.length === 0) return;

    setIsZippingThumbnails(true);
    try {
      const zip = new JSZip();

      completed.forEach((v) => {
        const baseName = v.name.replace(/\.[^/.]+$/, "");
        // 1枚目のサムネイルのみ保存
        if (v.thumbnails[0]) {
          zip.file(`${baseName}_thumb.jpg`, v.thumbnails[0].blob);
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thumbnails_${new Date().getTime()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("サムネイルZIP作成中にエラーが発生しました。");
    } finally {
      setIsZippingThumbnails(false);
    }
  };

  const stats = {
    count: videos.length,
    completed: videos.filter((v) => v.status === "completed").length,
    failed: videos.filter((v) => v.status === "error").length,
    pending: videos.filter(
      (v) => v.status === "pending" || v.status === "processing",
    ).length,
    totalSaved: videos.reduce(
      (acc, v) =>
        acc +
        (v.status === "completed"
          ? v.originalSize - (v.optimizedSize || 0)
          : 0),
      0,
    ),
  };

  const progressPercent =
    stats.count > 0 ? (stats.completed / stats.count) * 100 : 0;

  return (
    <div className="min-h-screen gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 accent-gradient rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap size={22} className="text-white" />
            </div>
            <div>
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "Clash Display, sans-serif" }}
              >
                Video Optimizer
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                Campaign Pro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Engine Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                engineStatus === "ready"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              }`}
            >
              {engineStatus === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Loading Engine...</span>
                </>
              ) : (
                <>
                  <Cpu size={14} />
                  <span>Engine Ready</span>
                </>
              )}
            </div>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-lg transition-all ${
                showSettings
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Section */}
            <div className="card-elevated p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-500/5" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
                    <Sparkles size={10} className="inline mr-1" />
                    Browser-Native FFmpeg
                  </span>
                </div>
                <h2
                  className="text-3xl font-bold mb-3"
                  style={{ fontFamily: "Clash Display, sans-serif" }}
                >
                  動画を<span className="text-gradient">プロ品質</span>で最適化
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
                  1MB制限を厳守する再エンコードと、スマート黒コマ回避によるサムネイル抽出。
                  すべてブラウザ内で完結します。
                </p>
              </div>
            </div>

            {/* File Uploader */}
            <FileUploader onFilesSelected={handleFilesSelected} />

            {/* Video Queue */}
            {videos.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers size={18} className="text-indigo-400" />
                    <h3 className="font-semibold">処理キュー</h3>
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold">
                      {videos.length} files
                    </span>
                  </div>
                  {stats.completed > 0 && (
                    <span className="text-xs text-emerald-400">
                      {stats.completed}/{stats.count} 完了
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {videos.map((v, index) => (
                    <div
                      key={v.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <VideoCard
                        videos={v}
                        config={config}
                        onRemove={handleRemoveVideo}
                        onRetry={handleRetryVideo}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settings Panel */}
            {showSettings && (
              <div className="animate-slide-up">
                <OptimizationSettings config={config} onChange={setConfig} />
              </div>
            )}

            {/* Action Panel */}
            <div className="card-elevated p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Archive size={18} className="text-indigo-400" />
                <h3 className="font-semibold">エクスポート</h3>
              </div>

              {/* Progress */}
              {stats.count > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">進捗</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 font-medium">
                        {stats.completed} / {stats.count}
                      </span>
                      {stats.failed > 0 && (
                        <span className="text-red-400 font-medium">
                          ({stats.failed} 失敗)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isProcessingAll ? "animate-shimmer" : "accent-gradient"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {/* WAVE進捗表示 */}
                  {isProcessingAll && totalWaves > 0 && (
                    <p className="text-xs text-indigo-400 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      WAVE {currentWave} / {totalWaves} 処理中...
                    </p>
                  )}
                  {stats.totalSaved > 0 && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      {formatBytes(stats.totalSaved)} 削減
                    </p>
                  )}
                </div>
              )}

              {/* Process Button */}
              <button
                onClick={handleProcessAll}
                disabled={
                  isProcessingAll ||
                  engineStatus !== "ready" ||
                  videos.length === 0 ||
                  stats.pending === 0
                }
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isProcessingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    処理中...
                  </>
                ) : engineStatus === "loading" ? (
                  <>エンジン読込中...</>
                ) : (
                  <>
                    <Play size={18} />
                    圧縮を開始
                  </>
                )}
              </button>

              {/* Retry Failed Button */}
              {stats.failed > 0 && !isProcessingAll && (
                <button
                  onClick={handleRetryFailed}
                  disabled={isProcessingAll || engineStatus !== "ready"}
                  className="w-full btn-secondary flex items-center justify-center gap-2 bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
                >
                  <RotateCcw size={18} />
                  失敗した動画を再処理 ({stats.failed}件)
                </button>
              )}

              {/* Download Buttons - 完了した動画があれば表示 */}
              {stats.completed > 0 && !isProcessingAll && (
                <>
                  <button
                    onClick={handleBatchDownload}
                    disabled={isZipping}
                    className="w-full btn-secondary flex items-center justify-center gap-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  >
                    {isZipping ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Download size={18} />
                        ZIPでダウンロード ({stats.completed}件)
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleBatchThumbnailDownload}
                    disabled={isZippingThumbnails}
                    className="w-full btn-secondary flex items-center justify-center gap-2 bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20"
                  >
                    {isZippingThumbnails ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Image size={18} />
                        サムネイル一括保存
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Info Card */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                <Cpu size={14} />
                System Info
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                処理はブラウザのCPUで実行されます。長時間の動画は処理に時間がかかる場合があります。
                タブを閉じないでください。
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <label className="btn-primary rounded-full w-14 h-14 flex items-center justify-center cursor-pointer shadow-xl shadow-indigo-500/30">
          <Upload size={22} />
          <input
            type="file"
            multiple
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files)
                handleFilesSelected(Array.from(e.target.files));
            }}
          />
        </label>
      </div>
    </div>
  );
};

export default App;
