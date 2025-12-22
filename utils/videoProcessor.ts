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
} from "./faceDetector";

let ffmpeg: FFmpeg | null = null;
let isProcessing = false;
let processedCount = 0; // 処理カウンター（メモリクリア判定用）

// 処理タイムアウト（秒）- 動画の長さに応じて動的に計算
const BASE_TIMEOUT_SECONDS = 60;
const TIMEOUT_PER_MINUTE_OF_VIDEO = 120; // 1分の動画につき2分のタイムアウト

/**
 * アスペクト比に応じたFFmpegビデオフィルターを生成
 * 中央クロップでアスペクト比を調整
 */
function getThumbnailVideoFilter(
  aspectRatio: ThumbnailAspectRatio,
  outputWidth: number,
): string {
  switch (aspectRatio) {
    case "16:9":
      // 16:9にクロップ（中央）してからスケール
      // 元が縦長の場合は上下を切り取り、元が横長の場合はそのまま
      return `crop='if(gt(iw/ih,16/9),ih*16/9,iw)':'if(gt(iw/ih,16/9),ih,iw*9/16)',scale=${outputWidth}:-1`;
    case "1:1":
      // 正方形にクロップ（中央）してからスケール
      return `crop='min(iw,ih)':'min(iw,ih)',scale=${outputWidth}:-1`;
    case "9:16":
      // 9:16にクロップ（中央）してからスケール
      // 高さ基準でスケールする
      return `crop='if(gt(iw/ih,9/16),ih*9/16,iw)':'if(gt(iw/ih,9/16),ih,iw*16/9)',scale=-1:${Math.round((outputWidth * 16) / 9)}`;
    case "original":
    default:
      // クロップなし、横幅基準でスケール
      return `scale=${outputWidth}:-1`;
  }
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

  const CORE_VERSION = "0.12.6";
  const FFMPEG_VERSION = "0.12.10";
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
 */
export async function resetFFmpeg(): Promise<void> {
  if (ffmpeg) {
    try {
      ffmpeg.terminate();
    } catch (e) {
      console.warn("FFmpeg terminate failed:", e);
    }
    ffmpeg = null;
  }
  processedCount = 0;
  // 少し待ってからGCを促す
  await new Promise((resolve) => setTimeout(resolve, 500));
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
  const instance = await loadFFmpeg();
  const inputName = "input_" + file.name.replace(/\s+/g, "_");
  const outputName = "output.mp4";

  await instance.writeFile(inputName, await fetchFile(file));

  // メタデータ取得（タイムアウト付き）
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
    30000, // 30秒でタイムアウト
    "動画メタデータの取得がタイムアウトしました。",
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

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress(Math.floor(progress * 100));
  };
  instance.on("progress", progressHandler);

  let currentTargetMB = config.targetSizeMB;
  let attempt = 0;
  const maxAttempts = 2;
  let finalBlob: Blob | null = null;
  let finalBitrate = 0;

  try {
    while (attempt < maxAttempts) {
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

      const data = await instance.readFile(outputName);
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
      timePoints = await getOptimalThumbnailTimestamps(
        file,
        duration,
        config.thumbnailOffsetSeconds,
        30, // 明るさ閾値
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
    if (
      config.thumbnailFaceDetection &&
      config.thumbnailAspectRatio !== "original"
    ) {
      try {
        await loadFaceDetectionModel();
      } catch (e) {
        console.warn("Face detection model load failed, will use center crop");
      }
    }

    // 顔検出が有効な場合は元のアスペクト比で抽出し、後でクロップ
    // 無効な場合はFFmpegで直接クロップ
    const useFaceDetection =
      config.thumbnailFaceDetection &&
      config.thumbnailAspectRatio !== "original";

    const thumbnailFilter = useFaceDetection
      ? `scale=${config.thumbnailWidthPx * 2}:-1` // 顔検出用に大きめに抽出
      : getThumbnailVideoFilter(
          config.thumbnailAspectRatio,
          config.thumbnailWidthPx,
        );

    for (let i = 0; i < timePoints.length; i++) {
      const t = timePoints[i];
      const thumbName = `thumb_${i}.jpg`;
      await instance.exec([
        "-ss",
        t.toString(),
        "-i",
        inputName,
        "-vframes",
        "1",
        "-q:v",
        "2",
        "-vf",
        thumbnailFilter,
        thumbName,
      ]);
      const thumbData = await instance.readFile(thumbName);
      let thumbBlob = new Blob([thumbData], { type: "image/jpeg" });

      // 顔検出クロップを実行
      if (useFaceDetection) {
        try {
          thumbBlob = await cropImageWithFaceDetection(
            thumbBlob,
            config.thumbnailAspectRatio,
            config.thumbnailWidthPx,
          );
        } catch (e) {
          console.warn(`Face detection crop failed for thumbnail ${i + 1}:`, e);
          // フォールバック：中央クロップ
        }
      }

      thumbnails.push({
        url: URL.createObjectURL(thumbBlob),
        blob: thumbBlob,
        timestamp: t,
      });
      await instance.deleteFile(thumbName);
    }

    processedCount++; // 処理カウントをインクリメント

    return {
      optimizedBlob: finalBlob,
      thumbnails,
      duration,
      bitrate: finalBitrate,
    };
  } finally {
    instance.off("progress", progressHandler);
    try {
      await instance.deleteFile(inputName);
      await instance.deleteFile(outputName);
    } catch (e) {
      console.warn("FFmpeg FS cleanup failed:", e);
    }
  }
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
