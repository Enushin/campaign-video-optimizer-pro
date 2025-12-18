import React, { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";

interface Props {
  videoBlob: Blob;
  videoName: string;
  onClose: () => void;
}

export const VideoPreviewModal: React.FC<Props> = ({
  videoBlob,
  videoName,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(videoBlob);
    setVideoUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoBlob]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        className="relative bg-[#0d0d12] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 max-w-4xl w-full mx-4 border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div>
            <h3 className="font-semibold text-white truncate max-w-md">
              {videoName}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              圧縮後プレビュー
              <span className="ml-2 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">
                {(videoBlob.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video bg-black">
          {videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
            />
          )}

          {/* Play Overlay */}
          {!isPlaying && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-20 h-20 bg-indigo-500/30 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-indigo-500/40 transition-all hover:scale-105 border border-white/20">
                <Play size={36} className="text-white ml-1" fill="white" />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 py-4 space-y-3 border-t border-white/5 bg-white/[0.02]">
          {/* Progress Bar */}
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-4
                       [&::-webkit-slider-thumb]:h-4
                       [&::-webkit-slider-thumb]:bg-indigo-500
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:shadow-lg
                       [&::-webkit-slider-thumb]:shadow-indigo-500/30"
          />

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
              >
                {isPlaying ? (
                  <Pause size={18} className="text-white" />
                ) : (
                  <Play size={18} className="text-white ml-0.5" />
                )}
              </button>

              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMuted ? (
                  <VolumeX size={18} className="text-slate-400" />
                ) : (
                  <Volume2 size={18} className="text-slate-400" />
                )}
              </button>

              <span className="text-xs text-slate-500 font-mono tracking-wide">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <button
              onClick={handleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Maximize2 size={18} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Tip */}
        <div className="px-6 pb-4 bg-white/[0.02]">
          <p className="text-[10px] text-slate-600 text-center">
            <span className="px-1.5 py-0.5 bg-white/5 rounded mr-1 text-slate-500">
              Space
            </span>
            再生/停止
            <span className="mx-2 text-slate-700">|</span>
            <span className="px-1.5 py-0.5 bg-white/5 rounded mr-1 text-slate-500">
              Esc
            </span>
            閉じる
          </p>
        </div>
      </div>
    </div>
  );
};
