export interface OptimizationConfig {
  targetSizeMB: number;
  maxLimitMB: number;
  audioBitrateKbps: number;
  minVideoBitrateKbps: number;
  targetWidthPx: number;
  thumbnailWidthPx: number;
  thumbnailOffsetSeconds: number;
  thumbnailTargetSizeKB: number;
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
