"use client";

import { useState, useTransition } from "react";
import {
  dashboardApproveRecord,
  dashboardRejectRecord,
} from "@/app/actions/attendance";
import {
  EditRecordDialog,
  type EditRecordDialogLabels,
} from "./edit-record-dialog";

export interface AttendanceRowActionsLabels {
  approve: string;
  reject: string;
  pendingResolution: string;
  statusPending: string;
  approveSuccess: string;
  rejectSuccess: string;
  edit: string;
}

interface AttendanceRowActionsProps {
  recordId: string;
  status: string;
  profileId: string | null;
  areaId: string | null;
  totalHours: number | null;
  areaName: string | null;
  workerName: string | null;
  areas: { id: string; name: string }[];
  labels: AttendanceRowActionsLabels;
  editLabels: EditRecordDialogLabels;
}

export function AttendanceRowActions(props: AttendanceRowActionsProps) {
  const {
    recordId,
    status,
    profileId,
    areaId,
    totalHours,
    workerName,
    areas,
    labels,
    editLabels,
  } = props;
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const isEditable = status !== "rejected";
  const isPendingStatus = status === "pending";
  const isClean = profileId !== null && areaId !== null;

  if (!isEditable && !feedback) return null;

  if (!isEditable && feedback) {
    return (
      <span
        className={`text-xs ${feedback.type === "success" ? "text-green-600" : "text-red-600"}`}
      >
        {feedback.message}
      </span>
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

  const editButton = (
    <button
      type="button"
      className="w-[30px] h-[30px] rounded-[var(--radius-sm)] bg-[rgba(59,130,246,0.10)] text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors duration-150 disabled:opacity-50"
      disabled={isPending}
      aria-label={labels.edit}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></svg>
    </button>
  );

  return (
    <div className="row-actions flex items-center gap-1 opacity-0 ltr:translate-x-2 rtl:-translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
      {feedback ? (
        <span
          className={`text-xs ${feedback.type === "success" ? "text-green-600" : "text-red-600"}`}
        >
          {feedback.message}
        </span>
      ) : (
        <>
          {isPendingStatus && !isClean && (
            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--status-pending-bg)] text-[var(--status-pending-text)]">
              {labels.pendingResolution}
            </span>
          )}
          {isPendingStatus && isClean && (
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
          <EditRecordDialog
            recordId={recordId}
            currentHours={totalHours}
            currentAreaId={areaId}
            workerName={workerName}
            areas={areas}
            labels={editLabels}
            trigger={editButton}
          />
        </>
      )}
    </div>
  );
}
