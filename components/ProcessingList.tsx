import React, { useState } from "react";
import { VideoFile, OptimizationConfig } from "../types";
import { formatBytes } from "../utils/videoProcessor";
import { VideoPreviewModal } from "./VideoPreviewModal";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingDown,
  Film,
  Download,
  Play,
  FileVideo,
  Loader2,
  X,
  RotateCcw,
} from "lucide-react";

interface Props {
  videos: VideoFile;
  config: OptimizationConfig;
  onRemove?: (id: string) => void;
  onRetry?: (video: VideoFile) => void;
}

export const VideoCard: React.FC<Props> = ({
  videos: v,
  config,
  onRemove,
  onRetry,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const reduction =
    v.originalSize && v.optimizedSize
      ? (((v.originalSize - v.optimizedSize) / v.originalSize) * 100).toFixed(0)
      : null;

  const downloadFile = (blob: Blob | undefined, fileName: string) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card p-4 transition-all hover:border-white/10">
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            v.status === "completed"
              ? "bg-emerald-500/20"
              : v.status === "processing"
                ? "bg-indigo-500/20"
                : v.status === "error"
                  ? "bg-red-500/20"
                  : "bg-white/5"
          }`}
        >
          {v.status === "processing" ? (
            <Loader2 size={18} className="text-indigo-400 animate-spin" />
          ) : v.status === "completed" ? (
            <CheckCircle2 size={18} className="text-emerald-400" />
          ) : v.status === "error" ? (
            <AlertCircle size={18} className="text-red-400" />
          ) : (
            <FileVideo size={18} className="text-slate-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate" title={v.name}>
              {v.name}
            </h3>
            {v.status === "completed" && (
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded uppercase">
                完了
              </span>
            )}
            {v.status === "processing" && (
              <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded uppercase animate-pulse">
                処理中
              </span>
            )}
            {v.status === "error" && (
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded uppercase">
                エラー
              </span>
            )}
            {v.status === "pending" && (
              <span className="px-1.5 py-0.5 bg-slate-500/20 text-slate-400 text-[9px] font-bold rounded uppercase">
                待機中
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
            <span>{formatBytes(v.originalSize)}</span>
            {v.duration && <span>{v.duration.toFixed(1)}秒</span>}
            {v.projectedBitrate && (
              <span className="text-indigo-400">
                {v.projectedBitrate.toFixed(0)} kbps
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Reduction Badge */}
          {v.status === "completed" && reduction && (
            <div className="flex items-center gap-2 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
              <TrendingDown size={14} className="text-emerald-400" />
              <span className="text-sm font-bold text-emerald-400">
                -{reduction}%
              </span>
            </div>
          )}

          {/* Retry Button for Error State */}
          {v.status === "error" && onRetry && (
            <button
              onClick={() => onRetry(v)}
              className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
              title="リトライ"
            >
              <RotateCcw size={14} />
            </button>
          )}

          {/* Remove Button (not during processing) */}
          {v.status !== "processing" && onRemove && (
            <button
              onClick={() => onRemove(v.id)}
              className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
              title="削除"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {v.status === "processing" && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">処理中...</span>
            <span className="text-indigo-400 font-medium">{v.progress}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full accent-gradient transition-all duration-300"
              style={{ width: `${v.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {v.error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-xs text-red-400 flex items-center gap-2">
            <AlertCircle size={14} />
            {v.error}
          </p>
        </div>
      )}

      {/* Thumbnails */}
      {v.thumbnails.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[0, 1, 2].map((idx) => {
            const thumb = v.thumbnails[idx];
            return (
              <div
                key={idx}
                className="relative aspect-video bg-white/5 rounded-lg overflow-hidden group/thumb"
              >
                {thumb ? (
                  <>
                    <img
                      src={thumb.url}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                      alt={`Thumbnail ${idx + 1}`}
                    />
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm text-[9px] text-white rounded font-medium">
                      {thumb.timestamp.toFixed(1)}s
                    </div>
                    {v.status === "completed" && (
                      <button
                        onClick={() =>
                          downloadFile(
                            thumb.blob,
                            `${v.name.split(".")[0]}_thumb_${idx + 1}.jpg`,
                          )
                        }
                        className="absolute inset-0 bg-indigo-500/80 backdrop-blur-sm opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1"
                      >
                        <Download size={14} className="text-white" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Clock size={16} className="text-slate-600 animate-pulse" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {v.status === "completed" && v.optimizedBlob && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="flex-1 btn-secondary flex items-center justify-center gap-2 text-xs py-2.5"
          >
            <Play size={14} />
            プレビュー
          </button>
          <button
            onClick={() =>
              downloadFile(v.optimizedBlob, `${v.name.split(".")[0]}_opt.mp4`)
            }
            className="flex-1 btn-primary flex items-center justify-center gap-2 text-xs py-2.5"
          >
            <Download size={14} />
            ダウンロード
          </button>
        </div>
      )}

      {/* Result Stats */}
      {v.status === "completed" && v.optimizedSize && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
          <span className="text-slate-500">最適化後サイズ</span>
          <span className="font-medium text-slate-300">
            {formatBytes(v.optimizedSize)}
          </span>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && v.optimizedBlob && (
        <VideoPreviewModal
          videoBlob={v.optimizedBlob}
          videoName={v.name}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};
