"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPlayerProps {
  src: string;
  playLabel: string;
  pauseLabel: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src, playLabel, pauseLabel }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onDurationChange);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onDurationChange);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        // Browser blocked autoplay or source failed to load
      }
    }
  }, [isPlaying]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const fraction = clickX / rect.width;
      audio.currentTime = fraction * duration;
    },
    [duration]
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div dir="ltr" className="flex items-center gap-3">
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlayPause}
        aria-label={isPlaying ? pauseLabel : playLabel}
        className="h-8 w-8 shrink-0"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div
        className="h-2 flex-1 cursor-pointer rounded-full bg-muted"
        onClick={handleProgressClick}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
    </div>
  );
}
