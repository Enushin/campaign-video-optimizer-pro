import { useState, useEffect, useCallback } from "react";
import { OptimizationConfig, SavedPreset } from "../types";
import { DEFAULT_CONFIG } from "../constants";
import { normalizeConfig, normalizeSavedPresets } from "../utils/validation";

const STORAGE_KEY = "video-optimizer-settings";
const PRESETS_KEY = "video-optimizer-presets";

export const useSettings = () => {
  const [configState, setConfigState] = useState<OptimizationConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return normalizeConfig(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load settings from localStorage:", e);
    }
    return normalizeConfig(DEFAULT_CONFIG);
  });

  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(() => {
    try {
      const saved = localStorage.getItem(PRESETS_KEY);
      if (saved) {
        return normalizeSavedPresets(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Failed to load presets from localStorage:", e);
    }
    return [];
  });

  const setConfig = useCallback(
    (
      next:
        | OptimizationConfig
        | ((previousConfig: OptimizationConfig) => OptimizationConfig),
    ) => {
      setConfigState((previousConfig) =>
        normalizeConfig(
          typeof next === "function" ? next(previousConfig) : next,
        ),
      );
    },
    [],
  );

  // 設定が変更されたらLocalStorageに保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configState));
    } catch (e) {
      console.warn("Failed to save settings to localStorage:", e);
    }
  }, [configState]);

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
        id:
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        config: normalizeConfig(configState),
        createdAt: Date.now(),
      };
      setSavedPresets((prev) => [...prev, newPreset]);
      return newPreset;
    },
    [configState],
  );

  // プリセットを削除
  const deletePreset = useCallback((id: string) => {
    setSavedPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // プリセットを適用
  const applyPreset = useCallback((preset: SavedPreset) => {
    setConfig(normalizeConfig(preset.config));
  }, []);

  // 設定をJSONとしてエクスポート
  const exportSettings = useCallback(() => {
    const data = {
      config: configState,
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
  }, [configState, savedPresets]);

  // 設定をJSONからインポート
  const importSettings = useCallback(
    (file: File): Promise<{ success: boolean; message: string }> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (!data || typeof data !== "object" || !("config" in data)) {
              resolve({
                success: false,
                message: "設定ファイルの形式が正しくありません",
              });
              return;
            }

            const parsed = data as {
              config: unknown;
              presets?: unknown;
            };
            const normalizedConfig = normalizeConfig(parsed.config);
            const normalizedPresets = normalizeSavedPresets(parsed.presets);

            setConfig(normalizedConfig);
            if (parsed.presets !== undefined) {
              setSavedPresets(normalizedPresets);
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
    setConfig(normalizeConfig(DEFAULT_CONFIG));
  }, []);

  return {
    config: configState,
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
