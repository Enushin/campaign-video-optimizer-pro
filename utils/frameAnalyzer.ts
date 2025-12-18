/**
 * フレーム解析ユーティリティ
 * Canvas APIを使用して動画フレームの明るさを解析し、黒フレームを回避
 */

export interface FrameAnalysisResult {
  timestamp: number;
  brightness: number;
  isBlackFrame: boolean;
}

/**
 * 指定時間のフレームの明るさを解析
 * @param video HTMLVideoElement
 * @param timestamp 解析する時間（秒）
 * @returns 明るさ（0-255）
 */
export function analyzeFrameBrightness(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): number {
  // 動画フレームをキャンバスに描画
  canvas.width = Math.min(video.videoWidth, 320); // パフォーマンスのため縮小
  canvas.height = Math.floor(
    canvas.width * (video.videoHeight / video.videoWidth),
  );

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // ピクセルデータを取得
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 平均輝度を計算（サンプリングで高速化）
  let totalBrightness = 0;
  const sampleStep = 16; // 16ピクセルごとにサンプリング
  let sampleCount = 0;

  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // 人間の視覚に基づく輝度計算
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    totalBrightness += brightness;
    sampleCount++;
  }

  return totalBrightness / sampleCount;
}

/**
 * 黒フレームでない時間を検索
 * @param videoFile 動画ファイル
 * @param startTime 検索開始時間
 * @param endTime 検索終了時間
 * @param brightnessThreshold 黒判定の閾値（デフォルト: 30）
 * @returns 黒くないフレームのタイムスタンプ
 */
export async function findNonBlackFrame(
  videoFile: File,
  startTime: number,
  endTime: number,
  brightnessThreshold: number = 30,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve(startTime); // フォールバック
      return;
    }

    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;
    video.preload = "metadata";

    const searchStep = 0.5; // 0.5秒ごとに検索
    let currentTime = startTime;
    const maxSearchTime = Math.min(endTime, startTime + 10); // 最大10秒間検索

    const checkFrame = () => {
      if (currentTime >= maxSearchTime) {
        // タイムアウト - 最初の時間をフォールバックとして使用
        cleanup();
        resolve(startTime);
        return;
      }

      video.currentTime = currentTime;
    };

    const handleSeeked = () => {
      const brightness = analyzeFrameBrightness(video, canvas, ctx);

      if (brightness > brightnessThreshold) {
        // 黒くないフレームを発見
        cleanup();
        resolve(currentTime);
      } else {
        // 次の時間を試す
        currentTime += searchStep;
        checkFrame();
      }
    };

    const cleanup = () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      URL.revokeObjectURL(url);
    };

    const onLoadedMetadata = () => {
      video.addEventListener("seeked", handleSeeked);
      checkFrame();
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", () => {
      cleanup();
      resolve(startTime); // エラー時はフォールバック
    });
  });
}

/**
 * サムネイル用の最適なタイムスタンプを取得
 * 黒フレームを回避した3つのタイムスタンプを返す
 */
export async function getOptimalThumbnailTimestamps(
  videoFile: File,
  duration: number,
  offsetSeconds: number = 1.0,
  brightnessThreshold: number = 30,
): Promise<number[]> {
  // 基本のタイムポイント
  const baseTimePoints = [
    Math.min(offsetSeconds, duration * 0.1), // 開始付近
    duration * 0.5, // 中間
    duration * 0.85, // 終盤
  ];

  const optimalTimestamps: number[] = [];

  for (const baseTime of baseTimePoints) {
    try {
      // 各タイムポイントから黒フレームでない時間を検索
      const optimalTime = await findNonBlackFrame(
        videoFile,
        baseTime,
        Math.min(baseTime + 5, duration), // 最大5秒先まで検索
        brightnessThreshold,
      );
      optimalTimestamps.push(optimalTime);
    } catch (error) {
      console.warn("Frame analysis failed, using fallback time:", error);
      optimalTimestamps.push(baseTime);
    }
  }

  return optimalTimestamps;
}
