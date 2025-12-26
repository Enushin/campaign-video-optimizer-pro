import { useState, useEffect, useCallback } from "react";
import { OptimizationConfig } from "../types";
import { DEFAULT_CONFIG } from "../constants";

const STORAGE_KEY = "video-optimizer-settings";
const PRESETS_KEY = "video-optimizer-presets";

export interface SavedPreset {
  id: string;
  name: string;
  config: OptimizationConfig;
  createdAt: number;
}

export const useSettings = () => {
  const [config, setConfig] = useState<OptimizationConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // DEFAULT_CONFIGとマージして新しいプロパティに対応
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (e) {
      console.warn("Failed to load settings from localStorage:", e);
    }
    return DEFAULT_CONFIG;
  });

  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => {
    try {
      const saved = localStorage.getItem(PRESETS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load presets from localStorage:", e);
    }
    return [];
  });

  // 設定が変更されたらLocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn("Failed to save settings to localStorage:", e);
    }
  }, [config]);

  // プリセットが変更されたらLocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(savedPresets));
    } catch (e) {
      console.warn("Failed to save presets to localStorage:", e);
    }
  }, [savedPresets]);

  // プリセットを保存
  const savePreset = useCallback(
    (name: string) => {
      const newPreset: SavedPreset = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        config: { ...config },
        createdAt: Date.now(),
      };
      setSavedPresets((prev) => [...prev, newPreset]);
      return newPreset;
    },
    [config],
  );

  // プリセットを削除
  const deletePreset = useCallback((id: string) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // プリセットを適用
  const applyPreset = useCallback((preset: SavedPreset) => {
    setConfig({ ...DEFAULT_CONFIG, ...preset.config });
  }, []);

  // 設定をJSONとしてエクスポート
  const exportSettings = useCallback(() => {
    const data = {
      config,
      presets: savedPresets,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `video-optimizer-settings-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [config, savedPresets]);

  // 設定をJSONからインポート
  const importSettings = useCallback(
    (file: File): Promise<{ success: boolean; message: string }> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (data.config) {
              setConfig({ ...DEFAULT_CONFIG, ...data.config });
            }
            if (data.presets && Array.isArray(data.presets)) {
              setSavedPresets(data.presets);
            }
            resolve({ success: true, message: "設定をインポートしました" });
          } catch (err) {
            resolve({ success: false, message: "JSONの解析に失敗しました" });
          }
        };
        reader.onerror = () => {
          resolve({
            success: false,
            message: "ファイルの読み込みに失敗しました",
          });
        };
        reader.readAsText(file);
      });
    },
    [],
  );

  // 設定をリセット
  const resetSettings = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
  }, []);

  return {
    config,
    setConfig,
    savedPresets,
    savePreset,
    deletePreset,
    applyPreset,
    exportSettings,
    importSettings,
    resetSettings,
  };
};
