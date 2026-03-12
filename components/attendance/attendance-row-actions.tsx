"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-center gap-1">
      {feedback ? (
        <span
          className={`text-xs ${feedback.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {feedback.message}
        </span>
      ) : (
        <>
          <Button
            size="sm"
            variant="default"
            className="h-7 bg-green-600 hover:bg-green-700 text-white"
            disabled={isPending}
            onClick={handleApprove}
          >
            {labels.approve}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7"
            disabled={isPending}
            onClick={handleReject}
          >
            {labels.reject}
          </Button>
        </>
      )}
    </div>
  );
}
