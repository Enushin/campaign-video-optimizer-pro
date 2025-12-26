import React, { useMemo } from "react";
import { VideoFile, OptimizationConfig } from "../types";
import { formatBytes } from "../utils/videoProcessor";
import {
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingDown,
  BarChart3,
} from "lucide-react";

interface Props {
  videos: VideoFile[];
  config: OptimizationConfig;
  processingStats?: {
    startTime: number | null;
    endTime: number | null;
    totalProcessed: number;
  };
}

interface ReportData {
  filename: string;
  status: string;
  originalSize: number;
  optimizedSize: number | null;
  compressionRatio: number | null;
  duration: number | null;
  bitrate: number | null;
  thumbnailCount: number;
  error: string | null;
}

export const SummaryReport: React.FC<Props> = ({
  videos,
  config,
  processingStats,
}) => {
  const reportData = useMemo<ReportData[]>(() => {
    return videos.map((v) => ({
      filename: v.name,
      status:
        v.status === "completed"
          ? "OK"
          : v.status === "error"
            ? "NG"
            : v.status,
      originalSize: v.originalSize,
      optimizedSize: v.optimizedSize ?? null,
      compressionRatio:
        v.optimizedSize && v.originalSize
          ? Math.round((1 - v.optimizedSize / v.originalSize) * 100)
          : null,
      duration: v.duration ?? null,
      bitrate: v.projectedBitrate ?? null,
      thumbnailCount: v.thumbnails.length,
      error: v.error ?? null,
    }));
  }, [videos]);

  const summary = useMemo(() => {
    const completed = videos.filter((v) => v.status === "completed");
    const failed = videos.filter((v) => v.status === "error");
    const totalOriginal = videos.reduce((acc, v) => acc + v.originalSize, 0);
    const totalOptimized = completed.reduce(
      (acc, v) => acc + (v.optimizedSize ?? 0),
      0,
    );
    const totalSaved = totalOriginal - totalOptimized;
    const avgCompressionRatio =
      totalOriginal > 0 ? ((totalSaved / totalOriginal) * 100).toFixed(1) : "0";

    let processingTime = null;
    if (processingStats?.startTime && processingStats?.endTime) {
      processingTime = Math.round(
        (processingStats.endTime - processingStats.startTime) / 1000,
      );
    }

    return {
      total: videos.length,
      completed: completed.length,
      failed: failed.length,
      totalOriginal,
      totalOptimized,
      totalSaved,
      avgCompressionRatio,
      processingTime,
    };
  }, [videos, processingStats]);

  const exportCSV = () => {
    const headers = [
      "ファイル名",
      "ステータス",
      "元サイズ(bytes)",
      "圧縮後サイズ(bytes)",
      "圧縮率(%)",
      "動画長(秒)",
      "ビットレート(kbps)",
      "サムネイル数",
      "エラー",
    ];
    const rows = reportData.map((r) => [
      r.filename,
      r.status,
      r.originalSize,
      r.optimizedSize ?? "",
      r.compressionRatio ?? "",
      r.duration ?? "",
      r.bitrate ?? "",
      r.thumbnailCount,
      r.error ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-optimization-report-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = {
      summary: {
        ...summary,
        totalOriginalFormatted: formatBytes(summary.totalOriginal),
        totalOptimizedFormatted: formatBytes(summary.totalOptimized),
        totalSavedFormatted: formatBytes(summary.totalSaved),
      },
      config: {
        targetSizeMB: config.targetSizeMB,
        maxLimitMB: config.maxLimitMB,
        targetWidthPx: config.targetWidthPx,
        audioBitrateKbps: config.audioBitrateKbps,
        thumbnailAspectRatio: config.thumbnailAspectRatio,
        thumbnailFaceDetection: config.thumbnailFaceDetection,
      },
      files: reportData,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-optimization-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (videos.length === 0) return null;

  const hasCompleted = summary.completed > 0;

  return (
    <div className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <BarChart3 size={16} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">処理サマリー</h2>
            <p className="text-[10px] text-slate-500">レポートをエクスポート</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <CheckCircle2 size={12} className="text-emerald-400" />
              完了
            </div>
            <p className="text-lg font-bold text-emerald-400">
              {summary.completed}
              <span className="text-xs text-slate-500 font-normal ml-1">
                / {summary.total}
              </span>
            </p>
          </div>

          {summary.failed > 0 && (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <XCircle size={12} className="text-red-400" />
                失敗
              </div>
              <p className="text-lg font-bold text-red-400">{summary.failed}</p>
            </div>
          )}

          {hasCompleted && (
            <>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <TrendingDown size={12} className="text-indigo-400" />
                  削減量
                </div>
                <p className="text-lg font-bold text-indigo-400">
                  {formatBytes(summary.totalSaved)}
                </p>
              </div>

              <div className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <BarChart3 size={12} className="text-amber-400" />
                  平均圧縮率
                </div>
                <p className="text-lg font-bold text-amber-400">
                  {summary.avgCompressionRatio}%
                </p>
              </div>
            </>
          )}

          {summary.processingTime && (
            <div className="bg-white/5 rounded-lg p-3 col-span-2">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Clock size={12} />
                総処理時間
              </div>
              <p className="text-lg font-bold">
                {Math.floor(summary.processingTime / 60)}分{" "}
                {summary.processingTime % 60}秒
              </p>
            </div>
          )}
        </div>

        {/* Export Buttons */}
        {hasCompleted && (
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="flex-1 btn-secondary flex items-center justify-center gap-2 text-xs"
            >
              <FileText size={14} />
              CSV
            </button>
            <button
              onClick={exportJSON}
              className="flex-1 btn-secondary flex items-center justify-center gap-2 text-xs"
            >
              <Download size={14} />
              JSON
            </button>
          </div>
        )}

        {/* Size Check */}
        {hasCompleted && (
          <div className="pt-3 border-t border-white/5">
            <p className="text-[10px] text-slate-500 mb-2">入稿チェック</p>
            <div className="space-y-1">
              {videos
                .filter((v) => v.status === "completed")
                .map((v) => {
                  const sizeOk =
                    v.optimizedSize &&
                    v.optimizedSize <= config.maxLimitMB * 1024 * 1024;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-400 truncate max-w-[150px]">
                        {v.name}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          sizeOk ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {sizeOk ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        {formatBytes(v.optimizedSize ?? 0)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
