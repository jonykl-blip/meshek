"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import {
  dashboardApproveRecord,
  dashboardRejectRecord,
} from "@/app/actions/attendance";

export interface AttendanceRowActionsLabels {
  approve: string;
  reject: string;
  pendingResolution: string;
  statusPending: string;
  approveSuccess: string;
  rejectSuccess: string;
}

interface AttendanceRowActionsProps {
  recordId: string;
  status: string;
  profileId: string | null;
  areaId: string | null;
  labels: AttendanceRowActionsLabels;
}

export function AttendanceRowActions({
  recordId,
  status,
  profileId,
  areaId,
  labels,
}: AttendanceRowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  if (status !== "pending" && !feedback) return null;

  if (status !== "pending" && feedback) {
    return (
      <span
        className={`text-xs ${feedback.type === "success" ? "text-green-600" : "text-red-600"}`}
      >
        {feedback.message}
      </span>
    );
  }

  const isClean = profileId !== null && areaId !== null;

  if (!isClean) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
        {labels.pendingResolution}
      </Badge>
    );
  }

  function handleApprove() {
    setFeedback(null);
    startTransition(async () => {
      const result = await dashboardApproveRecord(recordId);
      if (result.success) {
        setFeedback({ message: labels.approveSuccess, type: "success" });
      } else {
        setFeedback({ message: result.error, type: "error" });
      }
    });
  }

  function handleReject() {
    setFeedback(null);
    startTransition(async () => {
      const result = await dashboardRejectRecord(recordId);
      if (result.success) {
        setFeedback({ message: labels.rejectSuccess, type: "success" });
      } else {
        setFeedback({ message: result.error, type: "error" });
      }
    });
  }

  return (
    <div className="row-actions flex items-center gap-1 opacity-0 translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
      {feedback ? (
        <span
          className={`text-xs ${feedback.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {feedback.message}
        </span>
      ) : (
        <>
          <button
            type="button"
            className="w-[30px] h-[30px] rounded-[var(--radius-sm)] bg-[rgba(91,122,47,0.12)] text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors duration-150 disabled:opacity-50"
            disabled={isPending}
            onClick={handleApprove}
            aria-label={labels.approve}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </button>
          <button
            type="button"
            className="w-[30px] h-[30px] rounded-[var(--radius-sm)] bg-[rgba(192,57,43,0.10)] text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-colors duration-150 disabled:opacity-50"
            disabled={isPending}
            onClick={handleReject}
            aria-label={labels.reject}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </>
      )}
    </div>
  );
}
