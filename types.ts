export type ThumbnailAspectRatio = "16:9" | "1:1" | "9:16" | "original";

export interface OptimizationConfig {
  targetSizeMB: number;
  maxLimitMB: number;
  audioBitrateKbps: number;
  minVideoBitrateKbps: number;
  targetWidthPx: number;
  thumbnailWidthPx: number;
  thumbnailOffsetSeconds: number;
  thumbnailTargetSizeKB: number;
  thumbnailAspectRatio: ThumbnailAspectRatio;
  thumbnailFaceDetection: boolean; // 顔検出クロップを有効にする
  filenameTemplate: string; // 出力ファイル名テンプレート
}

// プラットフォームプリセット用の部分設定
export type PartialConfig = Partial<
  Omit<
    OptimizationConfig,
    | "minVideoBitrateKbps"
    | "thumbnailWidthPx"
    | "thumbnailOffsetSeconds"
    | "thumbnailTargetSizeKB"
    | "thumbnailFaceDetection"
    | "filenameTemplate"
  >
>;

export interface PlatformPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  config: PartialConfig;
}

// 処理統計
export interface ProcessingStats {
  startTime: number | null;
  endTime: number | null;
  totalProcessed: number;
  currentVideoStartTime: number | null;
  estimatedTimeRemaining: number | null;
  averageProcessingTime: number | null;
}

export type ProcessingStatus = "pending" | "processing" | "completed" | "error";

export interface ThumbnailData {
  url: string;
  blob: Blob;
  timestamp: number;
}

export interface VideoFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  duration?: number;
  status: ProcessingStatus;
  progress: number;
  optimizedSize?: number;
  thumbnails: ThumbnailData[];
  selectedThumbnailIndex?: number;
  optimizedBlob?: Blob;
  projectedBitrate?: number;
  error?: string;
}
