import { OptimizationConfig } from "./types";

export const DEFAULT_CONFIG: OptimizationConfig = {
  targetSizeMB: 1.5, // 許容値（推奨ターゲット）を1.5MBに変更
  maxLimitMB: 2.0, // 絶対上限を2.0MBに変更
  audioBitrateKbps: 128,
  minVideoBitrateKbps: 300,
  targetWidthPx: 720,
  thumbnailWidthPx: 1000,
  thumbnailOffsetSeconds: 1.0,
  thumbnailTargetSizeKB: 100,
};

export const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".m4v"];
