import { ThumbnailAspectRatio } from "../types";

// 動的インポート用の型定義
type FaceApiModule = typeof import("@vladmandic/face-api");

let faceapi: FaceApiModule | null = null;
let isModelLoaded = false;
let isModelLoading = false;
const MODEL_LOAD_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Face detection model load timed out"));
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
 * 顔検出モデルの読み込み（遅延読み込み）
 */
export async function loadFaceDetectionModel(): Promise<void> {
  if (isModelLoaded) return;
  if (isModelLoading) {
    // 読み込み中の場合は完了を待つ
    const start = Date.now();
    while (isModelLoading) {
      if (Date.now() - start > MODEL_LOAD_TIMEOUT_MS) {
        throw new Error("Face detection model load timed out");
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return;
  }

  isModelLoading = true;

  try {
    // face-apiを動的にインポート（初回アクセス時のみ）
    if (!faceapi) {
      console.log("Loading face-api.js module...");
      faceapi = await import("@vladmandic/face-api");
    }

    // CDNからモデルを読み込み
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

    await withTimeout(
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      MODEL_LOAD_TIMEOUT_MS,
    );
    console.log("Face detection model loaded");
    isModelLoaded = true;
  } catch (error) {
    console.error("Failed to load face detection model:", error);
    throw error;
  } finally {
    isModelLoading = false;
  }
}

/**
 * 顔検出モデルが読み込まれているか
 */
export function isFaceModelLoaded(): boolean {
  return isModelLoaded;
}

interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 画像から顔を検出
 */
export async function detectFaces(
  imageElement: HTMLImageElement | HTMLCanvasElement,
): Promise<FaceBox[]> {
  if (!isModelLoaded || !faceapi) {
    await loadFaceDetectionModel();
  }

  if (!faceapi) {
    throw new Error("Face API not loaded");
  }

  const detections = await faceapi.detectAllFaces(
    imageElement,
    new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5,
    }),
  );

  return detections.map((d) => ({
    x: d.box.x,
    y: d.box.y,
    width: d.box.width,
    height: d.box.height,
  }));
}

/**
 * アスペクト比に応じたクロップ領域を計算
 * 顔がある場合は顔を中心に、なければ中央クロップ
 */
export function calculateCropArea(
  imageWidth: number,
  imageHeight: number,
  aspectRatio: ThumbnailAspectRatio,
  faces: FaceBox[],
): CropArea {
  // オリジナルの場合はクロップなし
  if (aspectRatio === "original") {
    return { x: 0, y: 0, width: imageWidth, height: imageHeight };
  }

  // 目標アスペクト比を計算
  let targetRatio: number;
  switch (aspectRatio) {
    case "16:9":
      targetRatio = 16 / 9;
      break;
    case "1:1":
      targetRatio = 1;
      break;
    case "9:16":
      targetRatio = 9 / 16;
      break;
    default:
      targetRatio = 16 / 9;
  }

  const currentRatio = imageWidth / imageHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (currentRatio > targetRatio) {
    // 横長すぎる → 横を切る
    cropHeight = imageHeight;
    cropWidth = imageHeight * targetRatio;
  } else {
    // 縦長すぎる → 縦を切る
    cropWidth = imageWidth;
    cropHeight = imageWidth / targetRatio;
  }

  // 顔の中心を計算（複数の顔がある場合は全ての顔を含む領域の中心）
  let centerX = imageWidth / 2;
  let centerY = imageHeight / 2;

  if (faces.length > 0) {
    // 全ての顔を含むバウンディングボックスを計算
    const minX = Math.min(...faces.map((f) => f.x));
    const maxX = Math.max(...faces.map((f) => f.x + f.width));
    const minY = Math.min(...faces.map((f) => f.y));
    const maxY = Math.max(...faces.map((f) => f.y + f.height));

    centerX = (minX + maxX) / 2;
    centerY = (minY + maxY) / 2;

    console.log(
      `Face detected at center: (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`,
    );
  }

  // クロップ領域の左上座標を計算（顔を中心に）
  let cropX = centerX - cropWidth / 2;
  let cropY = centerY - cropHeight / 2;

  // 画像の範囲内に収める
  cropX = Math.max(0, Math.min(cropX, imageWidth - cropWidth));
  cropY = Math.max(0, Math.min(cropY, imageHeight - cropHeight));

  return {
    x: Math.round(cropX),
    y: Math.round(cropY),
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
  };
}

/**
 * Blobから画像要素を作成
 */
export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

/**
 * 画像をクロップしてBlobとして返す
 */
export async function cropImageWithFaceDetection(
  imageBlob: Blob,
  aspectRatio: ThumbnailAspectRatio,
  outputWidth: number,
): Promise<Blob> {
  // オリジナルの場合はそのまま返す
  if (aspectRatio === "original") {
    return imageBlob;
  }

  // 画像を読み込み
  const img = await blobToImage(imageBlob);

  // 顔検出
  let faces: FaceBox[] = [];
  try {
    faces = await detectFaces(img);
    if (faces.length > 0) {
      console.log(`Detected ${faces.length} face(s)`);
    }
  } catch (error) {
    console.warn("Face detection failed, using center crop:", error);
  }

  // クロップ領域を計算
  const cropArea = calculateCropArea(img.width, img.height, aspectRatio, faces);

  // 出力サイズを計算
  let targetRatio: number;
  switch (aspectRatio) {
    case "16:9":
      targetRatio = 16 / 9;
      break;
    case "1:1":
      targetRatio = 1;
      break;
    case "9:16":
      targetRatio = 9 / 16;
      break;
    default:
      targetRatio = 16 / 9;
  }

  const outputHeight = Math.round(outputWidth / targetRatio);

  // Canvasでクロップ
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // クロップ領域を出力サイズに描画
  ctx.drawImage(
    img,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  // BlobとしてエクスポートE
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      "image/jpeg",
      0.9,
    );
  });
}
