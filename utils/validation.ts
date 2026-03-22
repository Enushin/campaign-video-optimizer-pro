import { ALLOWED_EXTENSIONS, DEFAULT_CONFIG } from "../constants";
import { OptimizationConfig, SavedPreset, VideoFile } from "../types";

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const NUMERIC_LIMITS = {
  targetSizeMB: { min: 0.3, max: 30, decimals: 1 },
  maxLimitMB: { min: 0.5, max: 30, decimals: 1 },
  audioBitrateKbps: { min: 32, max: 320, decimals: 0 },
  minVideoBitrateKbps: { min: 100, max: 4000, decimals: 0 },
  targetWidthPx: { min: 240, max: 1920, decimals: 0 },
  thumbnailWidthPx: { min: 240, max: 2000, decimals: 0 },
  thumbnailOffsetSeconds: { min: 0, max: 30, decimals: 1 },
  thumbnailTargetSizeKB: { min: 20, max: 1000, decimals: 0 },
} as const;

const THUMBNAIL_RATIOS = new Set(["16:9", "1:1", "9:16", "original"]);
const FILENAME_TEMPLATE_MAX_LENGTH = 80;

const EXTENSION_TO_MIME: Record<string, string[]> = {
  ".mp4": ["video/mp4"],
  ".mov": ["video/quicktime", "video/mp4"],
  ".avi": ["video/avi", "video/x-msvideo"],
  ".m4v": ["video/x-m4v", "video/mp4"],
};

export const FILE_LIMITS = {
  maxQueueFiles: 30,
  maxFileSizeBytes: 250 * 1024 * 1024,
  maxTotalSizeBytes: 1024 * 1024 * 1024,
  maxDurationSeconds: 10 * 60,
} as const;

export interface ValidatedVideoCandidate {
  file: File;
  duration?: number;
}

export interface FileValidationResult {
  accepted: ValidatedVideoCandidate[];
  rejected: string[];
  duplicateCount: number;
}

function clampNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  decimals: number,
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const clamped = Math.min(max, Math.max(min, parsed));
  return Number(clamped.toFixed(decimals));
}

function sanitizeTemplate(value: unknown) {
  if (typeof value !== "string") {
    return DEFAULT_CONFIG.filenameTemplate;
  }

  const trimmed = value.trim().slice(0, FILENAME_TEMPLATE_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : DEFAULT_CONFIG.filenameTemplate;
}

export function sanitizeFileSegment(value: string) {
  const sanitized = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/g, "");

  return sanitized.length > 0 ? sanitized : "asset";
}

export function normalizeConfig(candidate: unknown): OptimizationConfig {
  const source =
    candidate && typeof candidate === "object"
      ? (candidate as Partial<OptimizationConfig>)
      : {};

  const normalized: OptimizationConfig = {
    targetSizeMB: clampNumber(
      source.targetSizeMB,
      DEFAULT_CONFIG.targetSizeMB,
      NUMERIC_LIMITS.targetSizeMB.min,
      NUMERIC_LIMITS.targetSizeMB.max,
      NUMERIC_LIMITS.targetSizeMB.decimals,
    ),
    maxLimitMB: clampNumber(
      source.maxLimitMB,
      DEFAULT_CONFIG.maxLimitMB,
      NUMERIC_LIMITS.maxLimitMB.min,
      NUMERIC_LIMITS.maxLimitMB.max,
      NUMERIC_LIMITS.maxLimitMB.decimals,
    ),
    audioBitrateKbps: clampNumber(
      source.audioBitrateKbps,
      DEFAULT_CONFIG.audioBitrateKbps,
      NUMERIC_LIMITS.audioBitrateKbps.min,
      NUMERIC_LIMITS.audioBitrateKbps.max,
      NUMERIC_LIMITS.audioBitrateKbps.decimals,
    ),
    minVideoBitrateKbps: clampNumber(
      source.minVideoBitrateKbps,
      DEFAULT_CONFIG.minVideoBitrateKbps,
      NUMERIC_LIMITS.minVideoBitrateKbps.min,
      NUMERIC_LIMITS.minVideoBitrateKbps.max,
      NUMERIC_LIMITS.minVideoBitrateKbps.decimals,
    ),
    targetWidthPx: clampNumber(
      source.targetWidthPx,
      DEFAULT_CONFIG.targetWidthPx,
      NUMERIC_LIMITS.targetWidthPx.min,
      NUMERIC_LIMITS.targetWidthPx.max,
      NUMERIC_LIMITS.targetWidthPx.decimals,
    ),
    thumbnailWidthPx: clampNumber(
      source.thumbnailWidthPx,
      DEFAULT_CONFIG.thumbnailWidthPx,
      NUMERIC_LIMITS.thumbnailWidthPx.min,
      NUMERIC_LIMITS.thumbnailWidthPx.max,
      NUMERIC_LIMITS.thumbnailWidthPx.decimals,
    ),
    thumbnailOffsetSeconds: clampNumber(
      source.thumbnailOffsetSeconds,
      DEFAULT_CONFIG.thumbnailOffsetSeconds,
      NUMERIC_LIMITS.thumbnailOffsetSeconds.min,
      NUMERIC_LIMITS.thumbnailOffsetSeconds.max,
      NUMERIC_LIMITS.thumbnailOffsetSeconds.decimals,
    ),
    thumbnailTargetSizeKB: clampNumber(
      source.thumbnailTargetSizeKB,
      DEFAULT_CONFIG.thumbnailTargetSizeKB,
      NUMERIC_LIMITS.thumbnailTargetSizeKB.min,
      NUMERIC_LIMITS.thumbnailTargetSizeKB.max,
      NUMERIC_LIMITS.thumbnailTargetSizeKB.decimals,
    ),
    thumbnailAspectRatio: THUMBNAIL_RATIOS.has(
      String(source.thumbnailAspectRatio ?? ""),
    )
      ? (source.thumbnailAspectRatio as OptimizationConfig["thumbnailAspectRatio"])
      : DEFAULT_CONFIG.thumbnailAspectRatio,
    thumbnailFaceDetection:
      typeof source.thumbnailFaceDetection === "boolean"
        ? source.thumbnailFaceDetection
        : DEFAULT_CONFIG.thumbnailFaceDetection,
    filenameTemplate: sanitizeTemplate(source.filenameTemplate),
  };

  normalized.maxLimitMB = Math.max(
    normalized.targetSizeMB,
    normalized.maxLimitMB,
  );

  if (normalized.thumbnailAspectRatio === "original") {
    normalized.thumbnailFaceDetection = false;
  }

  return normalized;
}

export function normalizeSavedPresets(candidate: unknown): SavedPreset[] {
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const preset = item as Partial<SavedPreset>;
      const name =
        typeof preset.name === "string" ? preset.name.trim().slice(0, 40) : "";

      if (!name) {
        return null;
      }

      const createdAt =
        typeof preset.createdAt === "number" && Number.isFinite(preset.createdAt)
          ? preset.createdAt
          : Date.now();

      return {
        id:
          typeof preset.id === "string" && preset.id.trim().length > 0
            ? preset.id
            : createId(),
        name,
        createdAt,
        config: normalizeConfig(preset.config),
      } satisfies SavedPreset;
    })
    .filter((preset): preset is SavedPreset => preset !== null);
}

async function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("duration_unavailable"));
        return;
      }

      resolve(duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("metadata_read_failed"));
    };

    video.src = url;
  });
}

function isMimeAllowed(file: File, extension: string) {
  if (!file.type) {
    return true;
  }

  const allowedMimes = EXTENSION_TO_MIME[extension] ?? [];
  return (
    allowedMimes.includes(file.type) ||
    (file.type.startsWith("video/") && allowedMimes.length > 0)
  );
}

export async function validateIncomingFiles(
  files: File[],
  existingVideos: VideoFile[],
): Promise<FileValidationResult> {
  const accepted: ValidatedVideoCandidate[] = [];
  const rejected: string[] = [];
  const seenKeys = new Set(
    existingVideos.map(
      (video) => `${video.name}-${video.originalSize}-${video.file.lastModified}`,
    ),
  );

  let duplicateCount = 0;
  let queuedBytes = existingVideos.reduce(
    (total, video) => total + video.originalSize,
    0,
  );
  let queuedCount = existingVideos.length;

  for (const file of files) {
    const extension = ALLOWED_EXTENSIONS.find((ext) =>
      file.name.toLowerCase().endsWith(ext),
    );

    if (!extension) {
      rejected.push(`${file.name}: 未対応の形式です。`);
      continue;
    }

    if (!isMimeAllowed(file, extension)) {
      rejected.push(`${file.name}: 拡張子と MIME タイプが一致しません。`);
      continue;
    }

    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (seenKeys.has(key)) {
      duplicateCount += 1;
      continue;
    }

    if (queuedCount >= FILE_LIMITS.maxQueueFiles) {
      rejected.push(
        `${file.name}: キュー上限 ${FILE_LIMITS.maxQueueFiles} 本を超えるため追加できません。`,
      );
      continue;
    }

    if (file.size > FILE_LIMITS.maxFileSizeBytes) {
      rejected.push(
        `${file.name}: ${Math.round(FILE_LIMITS.maxFileSizeBytes / (1024 * 1024))}MB を超えるため追加できません。`,
      );
      continue;
    }

    if (queuedBytes + file.size > FILE_LIMITS.maxTotalSizeBytes) {
      rejected.push(
        `${file.name}: キュー総量上限 ${Math.round(FILE_LIMITS.maxTotalSizeBytes / (1024 * 1024))}MB を超えるため追加できません。`,
      );
      continue;
    }

    try {
      const duration = await readVideoDuration(file);
      if (duration > FILE_LIMITS.maxDurationSeconds) {
        rejected.push(
          `${file.name}: ${Math.round(FILE_LIMITS.maxDurationSeconds / 60)}分を超える長尺動画はブラウザ処理対象外です。`,
        );
        continue;
      }

      accepted.push({ file, duration });
      seenKeys.add(key);
      queuedBytes += file.size;
      queuedCount += 1;
    } catch {
      rejected.push(`${file.name}: 動画メタデータを読み取れませんでした。`);
    }
  }

  return { accepted, rejected, duplicateCount };
}

export function mapProcessingError(error: unknown) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (/タイムアウト/i.test(message)) {
    return "処理がタイムアウトしました。動画が長すぎるか、端末リソースが不足しています。短い動画に分割するか、解像度を下げて再試行してください。";
  }

  if (/memory access out of bounds/i.test(message)) {
    return "ブラウザのメモリ上限に達しました。キュー本数を減らすか、動画サイズを小さくして再試行してください。";
  }

  if (/メタデータ|duration|読み込み/i.test(message)) {
    return "動画メタデータの取得に失敗しました。ファイル形式か破損状態を確認してください。";
  }

  if (/face detection/i.test(message)) {
    return "顔検出モデルの読み込みに失敗しました。時間を置いて再試行するか、顔検出クロップを無効にしてください。";
  }

  return "処理中にエラーが発生しました。設定値とファイル形式を見直して再試行してください。";
}
