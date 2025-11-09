/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState, useEffect } from "react";

export type MediaPlayerProps = {
  src: string;
  poster?: string;
  className?: string;
  defaultPlaybackRate?: number;
};

export default function MediaPlayer({
  src,
  poster,
  className = "w-full max-w-4xl mx-auto",
  defaultPlaybackRate = 1,
}: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(defaultPlaybackRate);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      setProgress(video.duration ? video.currentTime / video.duration : 0);
    };
    const updateDuration = () => setDuration(video.duration);
    const updatePlayState = () => setIsPlaying(!video.paused);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("durationchange", updateDuration);
    video.addEventListener("play", updatePlayState);
    video.addEventListener("pause", updatePlayState);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("durationchange", updateDuration);
      video.removeEventListener("play", updatePlayState);
      video.removeEventListener("pause", updatePlayState);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newTime = ((e.clientX - rect.left) / rect.width) * video.duration;
    video.currentTime = newTime;
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div ref={containerRef} className={`${className}`}>
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full h-auto"
          preload="metadata"
        />

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
          <div
            className="h-2 bg-gray-600 rounded cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="h-2 bg-purple-500 rounded"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-sm font-medium">
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button onClick={toggleMute} className="text-sm font-medium">
                {muted ? "Unmute" : "Mute"}
              </button>
              <div className="text-xs">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={playbackRate}
                onChange={(e) => {
                  const rate = Number(e.target.value);
                  const video = videoRef.current;
                  if (video) video.playbackRate = rate;
                  setPlaybackRate(rate);
                }}
                className="bg-black/50 text-white rounded px-2 py-1 text-sm"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <option key={r} value={r}>{`${r}x`}</option>
                ))}
              </select>
              <button
                onClick={toggleFullscreen}
                className="text-sm font-medium bg-white/20 px-2 py-1 rounded"
              >
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
