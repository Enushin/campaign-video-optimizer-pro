import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import {
  OptimizationConfig,
  ThumbnailData,
  ThumbnailAspectRatio,
} from "../types";
import { getOptimalThumbnailTimestamps } from "./frameAnalyzer";
import {
  loadFaceDetectionModel,
  cropImageWithFaceDetection,
  calculateCropArea,
} from "./faceDetector";

let ffmpeg: FFmpeg | null = null;
let isProcessing = false;
let processedCount = 0; // 処理カウンター（メモリクリア判定用）

// 処理タイムアウト（秒）- 動画の長さに応じて動的に計算
const BASE_TIMEOUT_SECONDS = 60;
const TIMEOUT_PER_MINUTE_OF_VIDEO = 120; // 1分の動画につき2分のタイムアウト

function getAspectRatioValue(aspectRatio: ThumbnailAspectRatio): number {
  switch (aspectRatio) {
    case "16:9":
      return 16 / 9;
    case "1:1":
      return 1;
    case "9:16":
      return 9 / 16;
    case "original":
    default:
      return 0;
  }
}

async function captureThumbnailFallback(
  file: File,
  timestamp: number,
  outputWidth: number,
  aspectRatio: ThumbnailAspectRatio,
): Promise<Blob | null> {
  return withTimeout(
    new Promise<Blob | null>((resolve) => {
      let settled = false;
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);

      video.src = url;
      video.muted = true;
      video.preload = "metadata";
      video.playsInline = true;

      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("error", onError);
        URL.revokeObjectURL(url);
      };

      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(null);
      };

      const onSeeked = () => {
        if (settled) return;
        const ctx = document.createElement("canvas").getContext("2d");
        if (!ctx) {
          settled = true;
          cleanup();
          resolve(null);
          return;
        }

        const srcW = video.videoWidth || 0;
        const srcH = video.videoHeight || 0;
        if (!srcW || !srcH) {
          settled = true;
          cleanup();
          resolve(null);
          return;
        }

        const targetRatio = getAspectRatioValue(aspectRatio);
        const canvas = ctx.canvas;

        if (aspectRatio === "original" || targetRatio === 0) {
          const outH = Math.round((outputWidth * srcH) / srcW);
          canvas.width = outputWidth;
          canvas.height = outH;
          ctx.drawImage(video, 0, 0, srcW, srcH, 0, 0, outputWidth, outH);
        } else {
          const crop = calculateCropArea(srcW, srcH, aspectRatio, []);
          const outH = Math.round(outputWidth / targetRatio);
          canvas.width = outputWidth;
          canvas.height = outH;
          ctx.drawImage(
            video,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            outputWidth,
            outH,
          );
        }

        canvas.toBlob(
          (blob) => {
            settled = true;
            cleanup();
            if (!blob) {
              resolve(null);
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.9,
        );
      };

      const onLoadedMetadata = () => {
        const safeTime = Math.min(
          Math.max(timestamp, 0),
          Math.max(0, (video.duration || 0) - 0.1),
        );
        try {
          video.currentTime = safeTime;
        } catch (e) {
          onError();
        }
      };

      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("seeked", onSeeked);
      video.addEventListener("error", onError);
    }),
    15000, // 15秒に延長（大きなファイルでも対応）
    "フォールバックサムネイル取得がタイムアウトしました。",
  ).catch((e) => {
    console.warn("Thumbnail capture failed:", e);
    return null;
  });
}

/**
 * タイムアウト付きPromiseラッパー
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * FFmpegエンジンの初期化
 */
export async function loadFFmpeg() {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();

  const FFMPEG_VERSION = "0.12.10";
  const CORE_VERSION = FFMPEG_VERSION;
  const CORE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.js`;
  const WASM_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm/ffmpeg-core.wasm`;
  const WORKER_URL = `https://unpkg.com/@ffmpeg/ffmpeg@${FFMPEG_VERSION}/dist/esm/worker.js`;

  try {
    await ffmpeg.load({
      coreURL: await toBlobURL(CORE_URL, "text/javascript"),
      wasmURL: await toBlobURL(WASM_URL, "application/wasm"),
      workerURL: await toBlobURL(WORKER_URL, "text/javascript"),
    });
  } catch (error) {
    console.error("Failed to load FFmpeg:", error);
    ffmpeg = null;
    throw new Error("FFmpegエンジンの初期化に失敗しました。");
  }

  return ffmpeg;
}

/**
 * FFmpegインスタンスをリセット（メモリクリア）
 * 注意: 頻繁に呼び出すとエラーの原因になる
 */
export async function resetFFmpeg(force: boolean = false): Promise<void> {
  // 処理中の場合はリセットしない（強制時は除外）
  if (isProcessing && !force) {
    console.warn("FFmpeg is processing, skip reset");
    return;
  }
  if (force) {
    isProcessing = false;
  }

  if (ffmpeg) {
    try {
      // まずイベントリスナーを全て解除
      ffmpeg.off("progress", () => {});
      ffmpeg.off("log", () => {});
      // 少し待ってからterminate
      await new Promise((resolve) => setTimeout(resolve, 200));
      ffmpeg.terminate();
    } catch (e) {
      console.warn("FFmpeg terminate failed:", e);
    }
    ffmpeg = null;
  }

  processedCount = 0;

  // GCを促すために待つ
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 再初期化
  await loadFFmpeg();
  console.log("FFmpeg instance reset for memory cleanup");
}

/**
 * 処理カウントを取得
 */
export function getProcessedCount(): number {
  return processedCount;
}

/**
 * 動画の圧縮と3パターンのサムネイル抽出を実行
 * ファイルサイズ超過時のリトライロジックを含む
 */
export async function processVideoWithFFmpeg(
  file: File,
  config: OptimizationConfig,
  onProgress: (p: number) => void,
): Promise<{
  optimizedBlob: Blob;
  thumbnails: ThumbnailData[];
  duration: number;
  bitrate: number;
}> {
  const maxEngineRetries = 2;
  let lastError: unknown = null;

  const runOnce = async (): Promise<{
    optimizedBlob: Blob;
    thumbnails: ThumbnailData[];
    duration: number;
    bitrate: number;
  }> => {
    // 処理中フラグを設定
    isProcessing = true;

    let instance: FFmpeg | null = null;
    let progressHandler: ((arg: { progress: number }) => void) | null = null;

    // ファイル名を安全にサニタイズ（日本語・特殊文字対応）
    // FFmpeg.wasmはASCII文字のみ対応のため、拡張子のみ保持してユニークIDを使用
    const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const inputName = `input_${uniqueId}.${extension}`;
    const outputName = `output_${uniqueId}.mp4`;
    let finalBlob: Blob | null = null;
    let finalBitrate = 0;

    try {
      instance = await loadFFmpeg();
      if (!instance) {
        throw new Error("FFmpegエンジンの初期化に失敗しました。");
      }
      progressHandler = ({ progress }: { progress: number }) => {
        onProgress(Math.floor(progress * 100));
      };
      instance.on("progress", progressHandler);

      const writeTimeoutMs = Math.max(
        20000,
        Math.min(120000, (file.size / (1024 * 1024)) * 10000),
      );
      await withTimeout(
        instance.writeFile(inputName, await fetchFile(file)),
        writeTimeoutMs,
        "入力ファイルの読み込みがタイムアウトしました。",
      );

      // メタデータ取得（タイムアウト付き）- ファイルサイズに応じてタイムアウトを調整
      const metadataTimeoutMs = Math.max(
        30000, // 最低30秒
        Math.min(120000, 30000 + (file.size / (1024 * 1024)) * 2000), // 1MBあたり2秒追加、最大120秒
      );
      const duration = await withTimeout(
        new Promise<number>((res, rej) => {
          const v = document.createElement("video");
          const url = URL.createObjectURL(file);
          v.src = url;
          v.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            res(v.duration);
          };
          v.onerror = () => {
            URL.revokeObjectURL(url);
            rej(
              new Error(
                "動画ファイルの読み込みに失敗しました。ファイル形式を確認してください。",
              ),
            );
          };
        }),
        metadataTimeoutMs,
        `動画メタデータの取得がタイムアウトしました。(${Math.round(metadataTimeoutMs / 1000)}秒)`,
      );

      if (duration === 0 || !isFinite(duration)) {
        throw new Error(
          "動画の再生時間を取得できませんでした。ファイルが破損している可能性があります。",
        );
      }

      // 動画の長さに応じたタイムアウト時間を計算
      const timeoutMs =
        (BASE_TIMEOUT_SECONDS + (duration / 60) * TIMEOUT_PER_MINUTE_OF_VIDEO) *
        1000;
      let currentTargetMB = config.targetSizeMB;
      let attempt = 0;
      const maxAttempts = 2;

      while (attempt < maxAttempts) {
        // 前回の出力が残っている場合に備えて削除
        try {
          await instance.deleteFile(outputName);
        } catch (e) {
          // 既に存在しない場合は無視
        }

        // ビットレート計算
        const targetSizeBits = currentTargetMB * 1024 * 1024 * 8;
        const audioBitrateBps = config.audioBitrateKbps * 1024;
        const totalBitrateBps = targetSizeBits / duration;
        let videoBitrateBps = totalBitrateBps - audioBitrateBps;

        // 最低ラインを確保
        if (videoBitrateBps < config.minVideoBitrateKbps * 1024) {
          videoBitrateBps = config.minVideoBitrateKbps * 1024;
        }

        const videoBitrateKbps = Math.floor(videoBitrateBps / 1024);
        finalBitrate = videoBitrateKbps;

        // エンコード実行（タイムアウト付き）
        await withTimeout(
          instance.exec([
            "-y",
            "-i",
            inputName,
            "-vf",
            `scale=${config.targetWidthPx}:-2`,
            "-b:v",
            `${videoBitrateKbps}k`,
            "-b:a",
            `${config.audioBitrateKbps}k`,
            "-preset",
            "ultrafast",
            "-movflags",
            "+faststart",
            outputName,
          ]),
          timeoutMs,
          `エンコード処理がタイムアウトしました（${Math.round(timeoutMs / 1000)}秒）。動画が長すぎるか、処理に問題が発生しました。`,
        );

        const data = await withTimeout(
          instance.readFile(outputName),
          Math.min(15000, timeoutMs),
          "出力ファイルの読み込みがタイムアウトしました。",
        );
        const optimizedBlob = new Blob([data], { type: "video/mp4" });

        // サイズチェック
        const sizeMB = optimizedBlob.size / (1024 * 1024);

        // 上限を超えており、まだリトライ可能な場合
        if (sizeMB > config.maxLimitMB && attempt < maxAttempts - 1) {
          console.log(
            `Size ${sizeMB.toFixed(2)}MB exceeds limit ${config.maxLimitMB}MB. Retrying with lower bitrate...`,
          );
          currentTargetMB = currentTargetMB * 0.7; // ビットレートを30%削減して再試行
          attempt++;
          continue;
        }

        finalBlob = optimizedBlob;
        break;
      }

      if (!finalBlob) throw new Error("エンコード処理に失敗しました。");

      // サムネイル抽出（スマート黒コマ回避機能付き）
      const thumbnails: ThumbnailData[] = [];

      // 黒コマを回避した最適なタイムスタンプを取得
      let timePoints: number[];
      try {
        timePoints = await withTimeout(
          getOptimalThumbnailTimestamps(
            file,
            duration,
            config.thumbnailOffsetSeconds,
            30, // 明るさ閾値
          ),
          15000,
          "サムネイル解析がタイムアウトしました。",
        );
        console.log("Smart frame detection: optimal timestamps", timePoints);
      } catch (error) {
        console.warn("Smart frame detection failed, using fallback:", error);
        timePoints = [
          Math.min(config.thumbnailOffsetSeconds, duration * 0.1),
          duration * 0.5,
          duration * 0.85,
        ];
      }

      // 顔検出モデルを事前に読み込み（顔検出が有効な場合）
      let useFaceDetection =
        config.thumbnailFaceDetection &&
        config.thumbnailAspectRatio !== "original";
      if (useFaceDetection) {
        try {
          await loadFaceDetectionModel();
        } catch (e) {
          console.warn(
            "Face detection model load failed, will use center crop",
          );
          useFaceDetection = false;
        }
      }

      for (let i = 0; i < timePoints.length; i++) {
        const t = timePoints[i];
        const captureWidth = useFaceDetection
          ? config.thumbnailWidthPx * 2
          : config.thumbnailWidthPx;
        const captureAspect = useFaceDetection
          ? "original"
          : config.thumbnailAspectRatio;
        const baseBlob = await captureThumbnailFallback(
          file,
          t,
          captureWidth,
          captureAspect,
        );
        if (!baseBlob) continue;

        let thumbBlob = baseBlob;
        if (useFaceDetection) {
          try {
            thumbBlob = await cropImageWithFaceDetection(
              thumbBlob,
              config.thumbnailAspectRatio,
              config.thumbnailWidthPx,
            );
          } catch (e) {
            console.warn(
              `Face detection crop failed for thumbnail ${i + 1}:`,
              e,
            );
          }
        }

        thumbnails.push({
          url: URL.createObjectURL(thumbBlob),
          blob: thumbBlob,
          timestamp: t,
        });
      }

      processedCount++; // 処理カウントをインクリメント

      // サムネイルが0件の場合は警告
      if (thumbnails.length === 0) {
        console.warn(
          `No thumbnails generated for file: ${file.name}. TimePoints were:`,
          timePoints,
        );
      } else {
        console.log(
          `Generated ${thumbnails.length} thumbnails for file: ${file.name}`,
        );
      }

      return {
        optimizedBlob: finalBlob,
        thumbnails,
        duration,
        bitrate: finalBitrate,
      };
    } finally {
      // 処理完了フラグを解除
      isProcessing = false;
      if (instance && progressHandler) {
        instance.off("progress", progressHandler);
      }
      if (instance) {
        try {
          await instance.deleteFile(inputName);
          await instance.deleteFile(outputName);
        } catch (e) {
          // クリーンアップエラーは無視（ファイルが存在しない場合など）
        }
      }
    }
  };

  for (
    let engineAttempt = 0;
    engineAttempt < maxEngineRetries;
    engineAttempt++
  ) {
    try {
      return await runOnce();
    } catch (error) {
      lastError = error;
      const message =
        error instanceof Error ? error.message : String(error || "");
      const isMemoryError = /memory access out of bounds/i.test(message);

      if (isMemoryError && engineAttempt < maxEngineRetries - 1) {
        console.warn(
          "FFmpeg memory error detected. Resetting engine and retrying...",
        );
        try {
          await resetFFmpeg(true);
        } catch (resetError) {
          console.warn("FFmpeg reset failed after memory error:", resetError);
        }
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("エンコード処理に失敗しました。");
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
