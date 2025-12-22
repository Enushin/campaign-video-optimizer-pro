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
  optimizedBlob?: Blob;
  projectedBitrate?: number;
  error?: string;
}
