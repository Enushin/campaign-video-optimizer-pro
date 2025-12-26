import { OptimizationConfig, PlatformPreset } from "./types";

export const DEFAULT_CONFIG: OptimizationConfig = {
  targetSizeMB: 1.5, // 許容値（推奨ターゲット）を1.5MBに変更
  maxLimitMB: 2.0, // 絶対上限を2.0MBに変更
  audioBitrateKbps: 128,
  minVideoBitrateKbps: 300,
  targetWidthPx: 720,
  thumbnailWidthPx: 1000,
  thumbnailOffsetSeconds: 1.0,
  thumbnailTargetSizeKB: 100,
  thumbnailAspectRatio: "16:9", // デフォルトは横長
  thumbnailFaceDetection: true, // デフォルトで顔検出を有効
  filenameTemplate: "{original}_opt", // デフォルトのファイル名テンプレート
};

export const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".m4v"];

// プラットフォーム別プリセット
export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: "twitter",
    name: "Twitter / X",
    icon: "twitter",
    description: "最大512MB、2:20以内",
    config: {
      targetSizeMB: 8.0,
      maxLimitMB: 15.0,
      targetWidthPx: 1280,
      audioBitrateKbps: 128,
      thumbnailAspectRatio: "16:9",
    },
  },
  {
    id: "instagram-feed",
    name: "Instagram フィード",
    icon: "instagram",
    description: "推奨1080px、60秒以内",
    config: {
      targetSizeMB: 4.0,
      maxLimitMB: 8.0,
      targetWidthPx: 1080,
      audioBitrateKbps: 128,
      thumbnailAspectRatio: "1:1",
    },
  },
  {
    id: "instagram-reels",
    name: "Instagram Reels",
    icon: "instagram",
    description: "縦型9:16、90秒以内",
    config: {
      targetSizeMB: 4.0,
      maxLimitMB: 8.0,
      targetWidthPx: 1080,
      audioBitrateKbps: 128,
      thumbnailAspectRatio: "9:16",
    },
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "tiktok",
    description: "縦型1080x1920推奨",
    config: {
      targetSizeMB: 15.0,
      maxLimitMB: 30.0,
      targetWidthPx: 1080,
      audioBitrateKbps: 128,
      thumbnailAspectRatio: "9:16",
    },
  },
  {
    id: "youtube-shorts",
    name: "YouTube Shorts",
    icon: "youtube",
    description: "縦型、60秒以内",
    config: {
      targetSizeMB: 10.0,
      maxLimitMB: 20.0,
      targetWidthPx: 1080,
      audioBitrateKbps: 128,
      thumbnailAspectRatio: "9:16",
    },
  },
  {
    id: "line",
    name: "LINE VOOM",
    icon: "line",
    description: "最大200MB、5分以内",
    config: {
      targetSizeMB: 10.0,
      maxLimitMB: 20.0,
      targetWidthPx: 720,
      audioBitrateKbps: 128,
      thumbnailAspectRatio: "16:9",
    },
  },
  {
    id: "campaign-1mb",
    name: "広告入稿 (1MB)",
    icon: "campaign",
    description: "1MB厳守、スマホ最適化",
    config: {
      targetSizeMB: 0.8,
      maxLimitMB: 1.0,
      targetWidthPx: 720,
      audioBitrateKbps: 96,
      thumbnailAspectRatio: "16:9",
    },
  },
  {
    id: "campaign-2mb",
    name: "広告入稿 (2MB)",
    icon: "campaign",
    description: "2MB厳守、スマホ最適化",
    config: {
      targetSizeMB: 1.5,
      maxLimitMB: 2.0,
      targetWidthPx: 720,
      audioBitrateKbps: 128,
      thumbnailAspectRatio: "16:9",
    },
  },
];
