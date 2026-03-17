"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { VoiceRecorder } from "@/components/voice-recorder";
import {
  processVoiceAttendance,
  getWorkerOwnAttendance,
  type VoiceAttendanceResult,
  type WorkerAttendanceRecord,
} from "@/app/actions/voice-attendance";
import { Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

type Step = "record" | "processing" | "review" | "success";

interface RecordPageClientProps {
  userId: string;
}

// ============================================================================
// Helpers
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "ממתין",
    approved: "מאושר",
    rejected: "נדחה",
    imported: "יובא",
  };
  const colorMap: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    imported: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {map[status] ?? status}
    </span>
  );
}

// ============================================================================
// Component
// ============================================================================

export function RecordPageClient({ userId }: RecordPageClientProps) {
  const [step, setStep] = useState<Step>("record");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>("audio/webm");
  const [result, setResult] = useState<VoiceAttendanceResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [recentRecords, setRecentRecords] = useState<WorkerAttendanceRecord[]>([]);
  const [isPending, startTransition] = useTransition();

  // Load recent records on mount
  useEffect(() => {
    getWorkerOwnAttendance(userId, 5).then((res) => {
      if (res.success) setRecentRecords(res.data);
    });
  }, [userId]);

  // Refresh recent records after a successful submission
  const refreshRecentRecords = useCallback(() => {
    getWorkerOwnAttendance(userId, 5).then((res) => {
      if (res.success) setRecentRecords(res.data);
    });
  }, [userId]);

  const handleRecordingComplete = useCallback((blob: Blob, mimeType: string) => {
    setAudioBlob(blob);
    setAudioMimeType(mimeType);
  }, []);

  const handleSend = useCallback(() => {
    if (!audioBlob) return;

    setErrorMsg(null);
    setStep("processing");

    const ext = audioMimeType.includes("mp4") || audioMimeType.includes("mpeg") ? "m4a" : "webm";
    const formData = new FormData();
    formData.append("audio", audioBlob, `recording.${ext}`);

    startTransition(async () => {
      const res = await processVoiceAttendance(formData);
      if (res.success) {
        setResult(res.data);
        setStep("review");
      } else {
        setErrorMsg(res.error);
        setStep("record");
      }
    });
  }, [audioBlob]);

  const handleConfirm = useCallback(() => {
    setStep("success");
    refreshRecentRecords();
  }, [refreshRecentRecords]);

  const handleReRecord = useCallback(() => {
    setAudioBlob(null);
    setAudioMimeType("audio/webm");
    setResult(null);
    setErrorMsg(null);
    setTranscriptOpen(false);
    setStep("record");
  }, []);

  // ── Step: Processing ──────────────────────────────────────────────────────

  if (step === "processing" || isPending) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">מעבד...</p>
      </div>
    );
  }

  // ── Step: Review ──────────────────────────────────────────────────────────

  if (step === "review" && result) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-6 p-6">
        <h1 className="text-center text-xl font-bold">בדוק את הדיווח</h1>

        {/* Extracted info cards */}
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <InfoRow
            label="עובד"
            value={result.matched_worker_name ?? result.extracted_worker_name ?? undefined}
            fallback="עובד לא זוהה"
            matched={result.matched_profile_id !== null}
          />
          <InfoRow
            label="אזור"
            value={result.matched_area_name ?? result.extracted_area_name ?? undefined}
            fallback="אזור לא זוהה"
            matched={result.matched_area_id !== null}
          />
          <InfoRow
            label="שעות"
            value={
              result.total_hours !== null
                ? String(result.total_hours)
                : undefined
            }
            fallback="לא זוהה"
            matched={result.total_hours !== null}
          />
        </div>

        {/* Collapsible transcript */}
        {result.raw_transcript && (
          <div className="rounded-xl border">
            <button
              type="button"
              onClick={() => setTranscriptOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
            >
              <span>תמלול</span>
              {transcriptOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {transcriptOpen && (
              <div className="border-t px-4 py-3 text-sm text-muted-foreground" dir="rtl">
                {result.raw_transcript}
              </div>
            )}
          </div>
        )}

        {/* Confirm / Re-record */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleReRecord}
          >
            הקלט שוב
          </Button>
          <Button className="flex-1" onClick={handleConfirm}>
            אשר ושלח
          </Button>
        </div>
      </div>
    );
  }

  // ── Step: Success ─────────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-6 p-8">
        <CheckCircle2 className="h-20 w-20 text-green-500" />
        <div className="text-center">
          <p className="text-xl font-bold">הדיווח נשלח בהצלחה</p>
          <p className="mt-1 text-sm text-muted-foreground">
            הדיווח ממתין לאישור מנהל
          </p>
        </div>

        <Button variant="outline" className="w-full" onClick={handleReRecord}>
          הקלט שוב
        </Button>

        <RecentRecordsPanel records={recentRecords} />
      </div>
    );
  }

  // ── Step: Record (default) ────────────────────────────────────────────────

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">דיווח נוכחות</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          לחץ על הכפתור ודווח על שעות העבודה שלך
        </p>
      </div>

      {errorMsg && (
        <div className="w-full rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          שגיאה בעיבוד ההקלטה: {errorMsg}
        </div>
      )}

      <VoiceRecorder
        onRecordingComplete={handleRecordingComplete}
        disabled={isPending}
      />

      {/* Show Send button only after recording */}
      {audioBlob && (
        <Button
          className="w-full max-w-xs"
          size="lg"
          onClick={handleSend}
          disabled={isPending}
        >
          שלח
        </Button>
      )}

      <RecentRecordsPanel records={recentRecords} />
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function InfoRow({
  label,
  value,
  fallback,
  matched,
}: {
  label: string;
  value?: string;
  fallback: string;
  matched: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span
        className={`text-sm font-semibold ${
          matched ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {value ?? fallback}
      </span>
    </div>
  );
}

function RecentRecordsPanel({
  records,
}: {
  records: WorkerAttendanceRecord[];
}) {
  if (records.length === 0) return null;

  return (
    <div className="w-full">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        דיווחים אחרונים
      </h2>
      <div className="flex flex-col gap-2">
        {records.map((rec) => (
          <div
            key={rec.id}
            className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm"
          >
            <div className="flex flex-col gap-0.5" dir="rtl">
              <span className="font-medium">{rec.work_date}</span>
              {rec.area_name && (
                <span className="text-xs text-muted-foreground">
                  {rec.area_name}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              {rec.total_hours !== null && (
                <span className="font-medium">{rec.total_hours} שע&#39;</span>
              )}
              <StatusBadge status={rec.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
