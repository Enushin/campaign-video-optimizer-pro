import React from "react";
import { OptimizationConfig } from "../types";
import {
  Settings,
  ShieldCheck,
  Smartphone,
  Image as ImageIcon,
  Sliders,
} from "lucide-react";

interface Props {
  config: OptimizationConfig;
  onChange: (config: OptimizationConfig) => void;
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

export const OptimizationSettings: React.FC<Props> = ({ config, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onChange({ ...config, [name]: parseFloat(value) });
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

        {/* Info Note */}
        <div className="pt-3 border-t border-white/5">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            設定はすべての新規処理に適用されます。処理中のファイルには影響しません。
          </p>
        </div>
      </div>
    </div>
  );
};
