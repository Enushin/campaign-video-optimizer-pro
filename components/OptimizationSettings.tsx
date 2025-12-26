import React, { useRef } from "react";
import { OptimizationConfig, ThumbnailAspectRatio } from "../types";
import { PLATFORM_PRESETS, DEFAULT_CONFIG } from "../constants";
import {
  Sliders,
  ShieldCheck,
  Smartphone,
  Image as ImageIcon,
  RectangleHorizontal,
  Square,
  RectangleVertical,
  Maximize,
  ScanFace,
  Layers,
  Download,
  Upload,
  RotateCcw,
  FileText,
  Zap,
  Hash,
} from "lucide-react";

interface Props {
  config: OptimizationConfig;
  onChange: (config: OptimizationConfig) => void;
  onExport?: () => void;
  onImport?: (file: File) => Promise<{ success: boolean; message: string }>;
  onReset?: () => void;
}

interface InputFieldProps {
  label: string;
  name: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
  unit?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  value,
  onChange,
  step,
  unit,
}) => (
  <div className="group">
    <label className="block text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wider">
      {label}
    </label>
    <div className="relative">
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        step={step}
        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-200
                   focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none
                   transition-all duration-200 hover:border-white/20
                   [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium">
          {unit}
        </span>
      )}
    </div>
  </div>
);

// プラットフォームアイコンコンポーネント
const PlatformIcon: React.FC<{ icon: string; size?: number }> = ({
  icon,
  size = 16,
}) => {
  switch (icon) {
    case "twitter":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "instagram":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
        </svg>
      );
    case "youtube":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "line":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      );
    case "campaign":
      return <Zap size={size} />;
    default:
      return <Layers size={size} />;
  }
};

export const OptimizationSettings: React.FC<Props> = ({
  config,
  onChange,
  onExport,
  onImport,
  onReset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...config, [name]: parseFloat(value) });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...config, [name]: value });
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = PLATFORM_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onChange({
        ...config,
        ...preset.config,
      });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      const result = await onImport(file);
      if (!result.success) {
        alert(result.message);
      }
    }
    // リセット（同じファイルを再選択可能に）
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <Sliders size={16} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="font-semibold text-sm">最適化設定</h2>
          <p className="text-[10px] text-slate-500">出力品質のカスタマイズ</p>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Platform Presets */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-purple-400" />
            <span className="text-xs font-medium text-slate-300">
              プラットフォーム別プリセット
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORM_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset.id)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/10 bg-white/5
                           hover:bg-white/10 hover:border-white/20 transition-all text-left group"
              >
                <div className="text-slate-400 group-hover:text-indigo-400 transition-colors">
                  <PlatformIcon icon={preset.icon} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-300 truncate">
                    {preset.name}
                  </p>
                  <p className="text-[9px] text-slate-500 truncate">
                    {preset.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Size Limits Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-indigo-400" />
            <span className="text-xs font-medium text-slate-300">
              サイズ制限
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="目標サイズ"
              name="targetSizeMB"
              value={config.targetSizeMB}
              onChange={handleChange}
              step="0.1"
              unit="MB"
            />
            <InputField
              label="絶対上限"
              name="maxLimitMB"
              value={config.maxLimitMB}
              onChange={handleChange}
              step="0.1"
              unit="MB"
            />
          </div>
        </div>

        {/* Resolution & Audio Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-slate-300">
              解像度・音声
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="横幅基準"
              name="targetWidthPx"
              value={config.targetWidthPx}
              onChange={handleChange}
              unit="px"
            />
            <InputField
              label="音声ビットレート"
              name="audioBitrateKbps"
              value={config.audioBitrateKbps}
              onChange={handleChange}
              unit="kbps"
            />
          </div>
        </div>

        {/* Filename Template */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-cyan-400" />
            <span className="text-xs font-medium text-slate-300">
              ファイル名テンプレート
            </span>
          </div>
          <div>
            <input
              type="text"
              name="filenameTemplate"
              value={config.filenameTemplate}
              onChange={handleTextChange}
              placeholder="{original}_opt"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-200
                         focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none
                         transition-all duration-200 hover:border-white/20"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { var: "{original}", desc: "元のファイル名" },
                { var: "{date}", desc: "日付" },
                { var: "{platform}", desc: "プラットフォーム" },
                { var: "{size}", desc: "目標サイズ" },
              ].map(({ var: v, desc }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...config,
                      filenameTemplate: config.filenameTemplate + v,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 rounded text-[9px] text-slate-400 hover:bg-white/10 transition-colors"
                >
                  <Hash size={10} />
                  {v}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[9px] text-slate-500">
              プレビュー:{" "}
              {config.filenameTemplate
                .replace("{original}", "video1")
                .replace("{date}", new Date().toISOString().slice(0, 10))
                .replace("{platform}", "twitter")
                .replace("{size}", `${config.targetSizeMB}MB`)}
              .mp4
            </p>
          </div>
        </div>

        {/* Thumbnail Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-slate-300">
              サムネイル設定
            </span>
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded">
              黒コマ回避
            </span>
          </div>

          {/* Aspect Ratio Selection */}
          <div className="space-y-2">
            <label className="block text-[10px] text-slate-500 font-medium uppercase tracking-wider">
              アスペクト比
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { value: "16:9", icon: RectangleHorizontal, label: "横長" },
                  { value: "1:1", icon: Square, label: "正方形" },
                  { value: "9:16", icon: RectangleVertical, label: "縦長" },
                  { value: "original", icon: Maximize, label: "元のまま" },
                ] as const
              ).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onChange({ ...config, thumbnailAspectRatio: value })
                  }
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border transition-all ${
                    config.thumbnailAspectRatio === value
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                      : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[9px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Face Detection Toggle */}
          {config.thumbnailAspectRatio !== "original" && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...config,
                  thumbnailFaceDetection: !config.thumbnailFaceDetection,
                })
              }
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                config.thumbnailFaceDetection
                  ? "bg-indigo-500/20 border-indigo-500/50"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <ScanFace
                size={18}
                className={
                  config.thumbnailFaceDetection
                    ? "text-indigo-400"
                    : "text-slate-500"
                }
              />
              <div className="flex-1 text-left">
                <span
                  className={`text-xs font-medium ${
                    config.thumbnailFaceDetection
                      ? "text-indigo-400"
                      : "text-slate-400"
                  }`}
                >
                  顔検出クロップ
                </span>
                <p className="text-[9px] text-slate-500">
                  顔を検出して中心にクロップ
                </p>
              </div>
              <div
                className={`w-8 h-5 rounded-full transition-all ${
                  config.thumbnailFaceDetection
                    ? "bg-indigo-500"
                    : "bg-white/10"
                }`}
              >
                <div
                  className={`w-4 h-4 mt-0.5 rounded-full bg-white transition-all ${
                    config.thumbnailFaceDetection ? "ml-3.5" : "ml-0.5"
                  }`}
                />
              </div>
            </button>
          )}

          <div className="grid grid-cols-3 gap-3">
            <InputField
              label="開始オフセット"
              name="thumbnailOffsetSeconds"
              value={config.thumbnailOffsetSeconds}
              onChange={handleChange}
              step="0.1"
              unit="秒"
            />
            <InputField
              label="画像容量"
              name="thumbnailTargetSizeKB"
              value={config.thumbnailTargetSizeKB}
              onChange={handleChange}
              unit="KB"
            />
            <InputField
              label="出力横幅"
              name="thumbnailWidthPx"
              value={config.thumbnailWidthPx}
              onChange={handleChange}
              unit="px"
            />
          </div>
        </div>

        {/* Export / Import / Reset */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <div className="flex gap-2">
            {onExport && (
              <button
                type="button"
                onClick={onExport}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 text-xs"
              >
                <Download size={14} />
                エクスポート
              </button>
            )}
            {onImport && (
              <>
                <button
                  type="button"
                  onClick={handleImportClick}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 text-xs"
                >
                  <Upload size={14} />
                  インポート
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            )}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="btn-secondary flex items-center justify-center gap-2 text-xs px-3"
                title="デフォルトに戻す"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            設定はブラウザに自動保存されます。エクスポートでチーム共有も可能です。
          </p>
        </div>
      </div>
    </div>
  );
};
