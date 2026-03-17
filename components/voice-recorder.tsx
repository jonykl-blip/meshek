"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/audio-player";

// ============================================================================
// Types
// ============================================================================

type RecorderState = "idle" | "recording" | "recorded";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, mimeType: string) => void;
  disabled?: boolean;
}

// ============================================================================
// MIME type detection (iOS Safari only supports audio/mp4)
// ============================================================================

const MIME_TYPE_PRIORITY = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",   // iOS Safari (iPhone/iPad)
  "audio/mpeg",
];

const getSupportedMimeType = (): string => {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of MIME_TYPE_PRIORITY) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
};

// ============================================================================
// Helpers
// ============================================================================

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ============================================================================
// Component
// ============================================================================

export function VoiceRecorder({ onRecordingComplete, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setPermissionError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPermissionError("נא לאפשר גישה למיקרופון");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    // Pick the best supported MIME type (includes audio/mp4 for iOS Safari)
    const mimeType = getSupportedMimeType();

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const finalMimeType = recorder.mimeType || "audio/mp4";
      const blob = new Blob(chunksRef.current, {
        type: finalMimeType,
      });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setState("recorded");
      onRecordingComplete(blob, finalMimeType);

      // Stop all tracks
      stream.getTracks().forEach((t) => t.stop());
    };

    recorder.start(250); // collect data every 250ms
    setState("recording");

    // Start elapsed timer
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [onRecordingComplete]);

  const stopRecording = useCallback(() => {
    stopTimer();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, [stopTimer]);

  const resetRecording = useCallback(() => {
    stopTimer();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    chunksRef.current = [];
    setElapsed(0);
    setState("idle");
    setPermissionError(null);
  }, [previewUrl, stopTimer]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Permission error */}
      {permissionError && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {permissionError}
        </p>
      )}

      {/* Main record button */}
      {state !== "recorded" && (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={state === "idle" ? startRecording : stopRecording}
            disabled={disabled}
            aria-label={state === "idle" ? "הקלט" : "עצור הקלטה"}
            className={[
              "relative flex h-32 w-32 items-center justify-center rounded-full",
              "text-white shadow-lg transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              state === "idle"
                ? "bg-green-500 hover:bg-green-600 active:scale-95"
                : "bg-red-500 hover:bg-red-600 active:scale-95",
            ].join(" ")}
          >
            {/* Pulse ring while recording */}
            {state === "recording" && (
              <>
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-40" />
                <span className="absolute inset-0 animate-pulse rounded-full bg-red-400 opacity-20" />
              </>
            )}
            {state === "idle" ? (
              <Mic className="h-12 w-12" />
            ) : (
              <Square className="h-10 w-10" />
            )}
          </button>

          {/* Label / timer */}
          {state === "idle" ? (
            <span className="text-sm font-medium text-muted-foreground">הקלט</span>
          ) : (
            <span className="tabular-nums text-lg font-semibold text-red-500">
              {formatElapsed(elapsed)}
            </span>
          )}
        </div>
      )}

      {/* Recorded state: preview + action buttons */}
      {state === "recorded" && previewUrl && (
        <div className="flex w-full max-w-sm flex-col gap-4">
          {/* Audio preview */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <AudioPlayer
              src={previewUrl}
              playLabel="נגן הקלטה"
              pauseLabel="השהה הקלטה"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={resetRecording}
              disabled={disabled}
            >
              הקלט שוב
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
