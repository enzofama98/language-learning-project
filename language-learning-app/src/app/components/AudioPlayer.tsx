"use client";
import { useRef, useState } from "react";

export default function AudioPlayer({ url }: { url: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={togglePlay}
        className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full"
      >
        {isPlaying ? "⏸️" : "▶️"}
      </button>

      {/* L’elemento audio “nascosto” ma controllato */}
      <audio ref={audioRef} src={url} />
    </div>
  );
}
