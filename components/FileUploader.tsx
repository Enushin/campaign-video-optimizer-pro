import React, { useCallback, useState } from "react";
import { Upload, Film, CloudUpload, FolderOpen } from "lucide-react";
import { ALLOWED_EXTENSIONS } from "../constants";

interface Props {
  onFilesSelected: (files: File[]) => void;
}

export const FileUploader: React.FC<Props> = ({ onFilesSelected }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = (Array.from(e.dataTransfer.files) as File[]).filter((f) =>
        ALLOWED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
      );
      if (files.length > 0) onFilesSelected(files);
    },
    [onFilesSelected],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        onFilesSelected(files);
      }
    },
    [onFilesSelected],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`card relative overflow-hidden transition-all duration-300 ${
        isDragging
          ? "border-indigo-500/50 bg-indigo-500/5 scale-[1.02]"
          : "hover:border-white/10"
      }`}
    >
      {/* Decorative Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-20 -right-20 w-40 h-40 rounded-full transition-all duration-500 ${
            isDragging ? "bg-indigo-500/20" : "bg-indigo-500/5"
          }`}
        />
        <div
          className={`absolute -bottom-10 -left-10 w-32 h-32 rounded-full transition-all duration-500 ${
            isDragging ? "bg-emerald-500/20" : "bg-emerald-500/5"
          }`}
        />
      </div>

      <div className="p-10 flex flex-col items-center text-center">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 ${
            isDragging ? "bg-indigo-500/20 scale-110" : "bg-white/5"
          }`}
        >
          {isDragging ? (
            <CloudUpload size={28} className="text-indigo-400" />
          ) : (
            <Upload size={28} className="text-slate-400" />
          )}
        </div>

        <h3 className="text-lg font-semibold mb-2">
          {isDragging ? "ドロップして追加" : "動画をアップロード"}
        </h3>

        <p className="text-sm text-slate-500 mb-5 max-w-xs">
          ドラッグ＆ドロップ、またはクリックしてファイルを選択
        </p>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          {ALLOWED_EXTENSIONS.map((ext) => (
            <span
              key={ext}
              className="px-2.5 py-1 bg-white/5 text-slate-400 text-[10px] font-bold uppercase rounded-md border border-white/5"
            >
              {ext.replace(".", "")}
            </span>
          ))}
        </div>

        {/* Visible Button */}
        <label
          className="mt-6 px-6 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400
                     rounded-lg border border-indigo-500/30 transition-all duration-200
                     flex items-center gap-2 text-sm font-medium cursor-pointer"
        >
          <FolderOpen size={16} />
          ファイルを選択
          <input
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={handleFileInput}
            className="hidden"
          />
        </label>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
          <Film size={14} />
          <span>複数ファイル対応・ドラッグ&ドロップ可</span>
        </div>
      </div>
    </div>
  );
};
