import React, { useMemo, useState } from "react";
import { Coins, Clock3, Scissors, Wallet } from "lucide-react";
import { VideoFile, OptimizationConfig } from "../types";
import { formatBytes } from "../utils/videoProcessor";

interface Props {
  videos: VideoFile[];
  config: OptimizationConfig;
}

export const ValueEstimator: React.FC<Props> = ({ videos, config }) => {
  const [manualMinutesPerVideo, setManualMinutesPerVideo] = useState(4);
  const [hourlyRateYen, setHourlyRateYen] = useState(3000);

  const metrics = useMemo(() => {
    const completed = videos.filter(
      (video) => video.status === "completed" && video.optimizedSize,
    );
    const remaining = videos.filter((video) => video.status !== "completed");
    const targetBytes = config.targetSizeMB * 1024 * 1024;

    const actualSavedBytes = completed.reduce((total, video) => {
      return total + (video.originalSize - (video.optimizedSize ?? 0));
    }, 0);

    const projectedSavedBytes = remaining.reduce((total, video) => {
      const projectedOutput = Math.min(video.originalSize, targetBytes);
      return total + Math.max(video.originalSize - projectedOutput, 0);
    }, 0);

    const queueCount = videos.length;
    const estimatedMinutesSaved = queueCount * manualMinutesPerVideo;
    const estimatedCostSaved =
      (estimatedMinutesSaved / 60) * Math.max(hourlyRateYen, 0);

    return {
      queueCount,
      totalSavedBytes: actualSavedBytes + projectedSavedBytes,
      estimatedMinutesSaved,
      estimatedCostSaved,
      projectedOutputBytes: videos.reduce((total, video) => {
        if (video.status === "completed") {
          return total + (video.optimizedSize ?? 0);
        }
        return total + Math.min(video.originalSize, targetBytes);
      }, 0),
    };
  }, [config.targetSizeMB, hourlyRateYen, manualMinutesPerVideo, videos]);

  if (videos.length === 0) return null;

  return (
    <div className="card-elevated p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Coins size={18} className="text-amber-400" />
        <div>
          <h3 className="font-semibold">コストカット試算</h3>
          <p className="text-[10px] text-slate-500">
            完了分は実績、未完了分は設定値ベースの見込みで算出
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Scissors size={12} className="text-emerald-400" />
            総削減見込み
          </div>
          <p className="text-lg font-bold text-emerald-400">
            {formatBytes(metrics.totalSavedBytes)}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Wallet size={12} className="text-indigo-400" />
            工数削減見込み
          </div>
          <p className="text-lg font-bold text-indigo-400">
            {Math.round(metrics.estimatedMinutesSaved)}分
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Clock3 size={12} className="text-cyan-400" />
            想定出力総量
          </div>
          <p className="text-lg font-bold text-cyan-400">
            {formatBytes(metrics.projectedOutputBytes)}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Coins size={12} className="text-amber-400" />
            金額換算
          </div>
          <p className="text-lg font-bold text-amber-400">
            ¥{Math.round(metrics.estimatedCostSaved).toLocaleString("ja-JP")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="manualMinutesPerVideo"
            className="block text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wider"
          >
            手作業時間 / 本
          </label>
          <div className="relative">
            <input
              id="manualMinutesPerVideo"
              type="number"
              min={1}
              step={1}
              value={manualMinutesPerVideo}
              onChange={(event) =>
                setManualMinutesPerVideo(
                  Math.max(1, Number.parseInt(event.target.value || "0", 10)),
                )
              }
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-200
                         focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium">
              分
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="hourlyRateYen"
            className="block text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wider"
          >
            人件費 / 時間
          </label>
          <div className="relative">
            <input
              id="hourlyRateYen"
              type="number"
              min={0}
              step={100}
              value={hourlyRateYen}
              onChange={(event) =>
                setHourlyRateYen(
                  Math.max(0, Number.parseInt(event.target.value || "0", 10)),
                )
              }
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-200
                         focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium">
              円
            </span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        圧縮、サムネイル切り出し、命名、ZIP整理を手作業で行う前提の試算です。
        現在のキュー {metrics.queueCount} 本をまとめて処理した場合の削減インパクトを示します。
      </p>
    </div>
  );
};
