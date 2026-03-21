"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, Volume2, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AudioPlayer } from "@/components/audio-player";
import {
  resolveWorker,
  resolveArea,
  createWorkerAndResolve,
  approveRecord,
  rejectRecord,
  editRecord,
  bulkApproveRecords,
  bulkRejectRecords,
} from "@/app/actions/attendance";
import type { PendingRecord } from "@/app/actions/attendance";
import { resolveClient, createClientAction } from "@/app/actions/clients";

interface ReviewQueueLabels {
  emptyState: string;
  showAll: string;
  pendingOnly: string;
  statusPending: string;
  statusApproved: string;
  statusRejected: string;
  statusImported: string;
  worker: string;
  area: string;
  date: string;
  hours: string;
  dunam: string;
  transcript: string;
  unrecognized: string;
  play: string;
  pause: string;
  expand: string;
  collapse: string;
  matchExistingWorker: string;
  matchExistingArea: string;
  newWorker: string;
  searchWorker: string;
  searchArea: string;
  confirm: string;
  cancel: string;
  name: string;
  hourlyRate: string;
  language: string;
  langHe: string;
  langTh: string;
  langEn: string;
  saving: string;
  resolved: string;
  workerCreated: string;
  approve: string;
  reject: string;
  edit: string;
  editRecord: string;
  rejectConfirm: string;
  rejectConfirmBtn: string;
  approved: string;
  rejected: string;
  edited: string;
  editHours: string;
  editArea: string;
  cannotApproveUnresolved: string;
  noChanges: string;
  selectAll: string;
  clearSelection: string;
  selectedCount: string;
  bulkApprove: string;
  bulkReject: string;
  bulkRejectConfirm: string;
  bulkApproved: string;
  bulkRejected: string;
  bulkPartialApprove: string;
  clientUnrecognized: string;
  matchExistingClient: string;
  newClient: string;
  searchClient: string;
  clientResolved: string;
  clientCreated: string;
  clientName: string;
  clientPhone: string;
}

interface ReviewQueueProps {
  records: PendingRecord[];
  showAll: boolean;
  workers: { id: string; full_name: string }[];
  areas: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  labels: ReviewQueueLabels;
}

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(
    new Date(dateStr)
  );

const statusLabelMap: Record<string, keyof ReviewQueueLabels> = {
  pending: "statusPending",
  approved: "statusApproved",
  rejected: "statusRejected",
  imported: "statusImported",
};

function getStatusBadgeClassName(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "approved":
      return "bg-[#4A6741] text-white";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "";
  }
}

export function ReviewQueue({
  records,
  showAll,
  workers,
  areas,
  clients,
  labels,
}: ReviewQueueProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<{
    recordId: string;
    type: "approve" | "reject" | "edit" | "resolveWorker" | "resolveArea" | "createWorker" | "resolveClient" | "createClient";
  } | null>(null);
  const pendingRecordId = pendingAction?.recordId ?? null;
  const [feedback, setFeedback] = useState<{
    recordId: string;
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Worker resolution state
  const [workerResolvingId, setWorkerResolvingId] = useState<string | null>(null);
  const [workerResolveMode, setWorkerResolveMode] = useState<"existing" | "new" | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [workerFilter, setWorkerFilter] = useState("");

  // Area resolution state
  const [areaResolvingId, setAreaResolvingId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  // Client resolution state
  const [clientResolvingId, setClientResolvingId] = useState<string | null>(null);
  const [clientResolveMode, setClientResolveMode] = useState<"existing" | "new" | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  // New client form state
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  // New worker form state
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerRate, setNewWorkerRate] = useState("");
  const [newWorkerLang, setNewWorkerLang] = useState("he");

  // Reject confirmation state
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editAreaId, setEditAreaId] = useState("");
  const [editAreaFilter, setEditAreaFilter] = useState("");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkRejecting, setIsBulkRejecting] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Clear selection when records change (after refresh)
  useEffect(() => {
    setSelectedIds(new Set());
    setIsBulkRejecting(false);
  }, [records]);

  const pendingRecords = records.filter((r) => r.status === "pending");
  const allPendingSelected =
    pendingRecords.length > 0 &&
    pendingRecords.every((r) => selectedIds.has(r.id));

  const approvableSelectedIds = [...selectedIds].filter((id) => {
    const r = records.find((rec) => rec.id === id);
    return r?.profile_id !== null && r?.area_id !== null && r?.pending_client_name === null;
  });

  const filteredWorkers = workers.filter((w) =>
    w.full_name.toLowerCase().includes(workerFilter.toLowerCase())
  );

  const filteredAreas = areas.filter((a) =>
    a.name.toLowerCase().includes(areaFilter.toLowerCase())
  );

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientFilter.toLowerCase())
  );

  function resetClientResolution() {
    setClientResolvingId(null);
    setClientResolveMode(null);
    setSelectedClientId("");
    setClientFilter("");
    setNewClientName("");
    setNewClientPhone("");
  }

  function resetWorkerResolution() {
    setWorkerResolvingId(null);
    setWorkerResolveMode(null);
    setSelectedWorkerId("");
    setWorkerFilter("");
    setNewWorkerName("");
    setNewWorkerRate("");
    setNewWorkerLang("he");
  }

  function resetAreaResolution() {
    setAreaResolvingId(null);
    setSelectedAreaId("");
    setAreaFilter("");
  }

  function resetReject() {
    setRejectingId(null);
  }

  function resetEdit() {
    setEditingId(null);
    setEditHours("");
    setEditAreaId("");
    setEditAreaFilter("");
  }

  function handleToggle() {
    if (showAll) {
      router.push(pathname);
    } else {
      router.push(`${pathname}?show=all`);
    }
  }

  function handleToggleSelectAll() {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingRecords.map((r) => r.id)));
    }
    setIsBulkRejecting(false);
  }

  function handleToggleRecord(recordId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
    setIsBulkRejecting(false);
  }

  function handleBulkApprove() {
    setBulkPending(true);
    setBulkFeedback(null);
    startTransition(async () => {
      const result = await bulkApproveRecords(approvableSelectedIds);
      setBulkPending(false);
      if (result.success) {
        const { approvedCount, skippedCount } = result.data;
        const message =
          skippedCount > 0
            ? labels.bulkPartialApprove
                .replace("{approved}", String(approvedCount))
                .replace("{total}", String(approvedCount + skippedCount))
                .replace("{skipped}", String(skippedCount))
            : labels.bulkApproved.replace("{count}", String(approvedCount));
        setBulkFeedback({ message, type: "success" });
        router.refresh();
      } else {
        setBulkFeedback({ message: result.error, type: "error" });
      }
    });
  }

  function handleBulkReject() {
    setBulkPending(true);
    setBulkFeedback(null);
    setIsBulkRejecting(false);
    startTransition(async () => {
      const result = await bulkRejectRecords([...selectedIds]);
      setBulkPending(false);
      if (result.success) {
        const message = labels.bulkRejected.replace(
          "{count}",
          String(result.data.rejectedCount)
        );
        setBulkFeedback({ message, type: "success" });
        router.refresh();
      } else {
        setBulkFeedback({ message: result.error, type: "error" });
      }
    });
  }

  function handleApprove(recordId: string) {
    setPendingAction({ recordId, type: "approve" });
    startTransition(async () => {
      const result = await approveRecord(recordId);
      setPendingAction(null);
      if (result.success) {
        setFeedback({ recordId, message: labels.approved, type: "success" });
        router.refresh();
      } else {
        setFeedback({ recordId, message: result.error, type: "error" });
      }
    });
  }

  function handleReject(recordId: string) {
    setPendingAction({ recordId, type: "reject" });
    startTransition(async () => {
      const result = await rejectRecord(recordId);
      setPendingAction(null);
      if (result.success) {
        setFeedback({ recordId, message: labels.rejected, type: "success" });
        resetReject();
        router.refresh();
      } else {
        setFeedback({ recordId, message: result.error, type: "error" });
      }
    });
  }

  function handleEdit(recordId: string) {
    const record = records.find((r) => r.id === recordId);
    const updates: { total_hours?: number; area_id?: string } = {};
    if (editHours !== "") {
      const parsed = Number(editHours);
      if (!isNaN(parsed) && parsed !== record?.total_hours) {
        updates.total_hours = parsed;
      }
    }
    if (editAreaId !== "" && editAreaId !== record?.area_id) {
      updates.area_id = editAreaId;
    }
    if (updates.total_hours === undefined && updates.area_id === undefined) {
      setFeedback({ recordId, message: labels.noChanges, type: "error" });
      return;
    }
    setPendingAction({ recordId, type: "edit" });
    startTransition(async () => {
      const result = await editRecord(recordId, updates);
      setPendingAction(null);
      if (result.success) {
        setFeedback({ recordId, message: labels.edited, type: "success" });
        resetEdit();
        router.refresh();
      } else {
        setFeedback({ recordId, message: result.error, type: "error" });
      }
    });
  }

  function handleResolveWorker(recordId: string, profileId: string) {
    setPendingAction({ recordId, type: "resolveWorker" });
    startTransition(async () => {
      const result = await resolveWorker(recordId, profileId);
      setPendingAction(null);
      if (result.success) {
        setFeedback({ recordId, message: labels.resolved, type: "success" });
        resetWorkerResolution();
        router.refresh();
      } else {
        setFeedback({ recordId, message: result.error, type: "error" });
      }
    });
  }

  function handleResolveArea(recordId: string, areaId: string) {
    setPendingAction({ recordId, type: "resolveArea" });
    startTransition(async () => {
      const result = await resolveArea(recordId, areaId);
      setPendingAction(null);
      if (result.success) {
        setFeedback({ recordId, message: labels.resolved, type: "success" });
        resetAreaResolution();
        router.refresh();
      } else {
        setFeedback({ recordId, message: result.error, type: "error" });
      }
    });
  }

  function handleCreateWorkerAndResolve(recordId: string) {
    setPendingAction({ recordId, type: "createWorker" });
    startTransition(async () => {
      const result = await createWorkerAndResolve(recordId, {
        full_name: newWorkerName,
        hourly_rate: newWorkerRate ? Number(newWorkerRate) : undefined,
        language_pref: newWorkerLang,
      });
      setPendingAction(null);
      if (result.success) {
        setFeedback({
          recordId,
          message: labels.workerCreated,
          type: "success",
        });
        resetWorkerResolution();
        router.refresh();
      } else {
        setFeedback({ recordId, message: result.error, type: "error" });
      }
    });
  }

  function handleResolveClient(recordId: string, clientId: string) {
    setPendingAction({ recordId, type: "resolveClient" });
    startTransition(async () => {
      const result = await resolveClient(recordId, clientId);
      setPendingAction(null);
      if (result.success) {
        setFeedback({ recordId, message: labels.clientResolved, type: "success" });
        resetClientResolution();
        router.refresh();
      } else {
        setFeedback({ recordId, message: result.error, type: "error" });
      }
    });
  }

  function handleCreateClientAndResolve(recordId: string) {
    setPendingAction({ recordId, type: "createClient" });
    startTransition(async () => {
      const createResult = await createClientAction({
        name: newClientName,
        phone: newClientPhone || undefined,
      });
      if (!createResult.success) {
        setPendingAction(null);
        setFeedback({ recordId, message: createResult.error, type: "error" });
        return;
      }
      const result = await resolveClient(recordId, createResult.data.id);
      setPendingAction(null);
      if (result.success) {
        setFeedback({ recordId, message: labels.clientCreated, type: "success" });
        resetClientResolution();
        router.refresh();
      } else {
        setFeedback({ recordId, message: result.error, type: "error" });
      }
    });
  }

  return (
    <div>
      {/* Top toolbar */}
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {pendingRecords.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleToggleSelectAll}>
              {allPendingSelected ? labels.clearSelection : labels.selectAll}
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleToggle}>
          {showAll ? labels.pendingOnly : labels.showAll}
        </Button>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 rounded-md border bg-muted/50 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">
              {labels.selectedCount.replace("{count}", String(selectedIds.size))}
            </span>
            <Button
              size="sm"
              disabled={approvableSelectedIds.length === 0 || bulkPending}
              onClick={handleBulkApprove}
              title={approvableSelectedIds.length === 0 ? labels.cannotApproveUnresolved : undefined}
            >
              {bulkPending
                ? labels.saving
                : labels.bulkApprove.replace("{count}", String(approvableSelectedIds.length))}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkPending}
              onClick={() => setIsBulkRejecting(true)}
            >
              {labels.bulkReject.replace("{count}", String(selectedIds.size))}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedIds(new Set()); setIsBulkRejecting(false); }}
            >
              {labels.cancel}
            </Button>
          </div>
          {isBulkRejecting && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-2">
              <span className="text-sm">
                {labels.bulkRejectConfirm.replace("{count}", String(selectedIds.size))}
              </span>
              <Button
                variant="destructive"
                size="sm"
                disabled={bulkPending}
                onClick={handleBulkReject}
              >
                {bulkPending ? labels.saving : labels.bulkReject.replace("{count}", String(selectedIds.size))}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsBulkRejecting(false)}>
                {labels.cancel}
              </Button>
            </div>
          )}
          {bulkFeedback && (
            <p className={`text-sm ${bulkFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {bulkFeedback.message}
            </p>
          )}
        </div>
      )}

      {records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="mb-3 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg text-muted-foreground">{labels.emptyState}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const isExpanded = expandedId === record.id;
            const isPending = record.status === "pending";
            const isSelected = selectedIds.has(record.id);
            const workerDisplay = record.worker_name ?? labels.unrecognized;
            const areaDisplay = record.area_name ?? labels.unrecognized;
            const transcriptPreview =
              record.raw_transcript && record.raw_transcript.length > 80
                ? record.raw_transcript.slice(0, 80) + "…"
                : record.raw_transcript;
            const recordFeedback =
              feedback?.recordId === record.id ? feedback : null;

            return (
              <Card key={record.id} className={`shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {isPending && (
                      <div className="flex shrink-0 items-center pt-0.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleRecord(record.id)}
                          aria-label={workerDisplay}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="font-bold">{workerDisplay}</span>
                        <Badge variant="secondary">{areaDisplay}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(record.work_date)}
                        </span>
                        {record.total_hours != null && (
                          <span className="text-sm text-muted-foreground">
                            {record.total_hours}h
                          </span>
                        )}
                        {record.dunam_covered != null && (
                          <span className="text-sm text-muted-foreground">
                            {record.dunam_covered} {labels.dunam}
                          </span>
                        )}
                        {record.client_name && (
                          <Badge variant="outline">{record.client_name}</Badge>
                        )}
                        {record.work_type_name && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
                            {record.work_type_name}
                          </Badge>
                        )}
                        {record.status === "imported" ? (
                          <Badge variant="secondary">
                            {labels[statusLabelMap[record.status] ?? "statusPending"]}
                          </Badge>
                        ) : (
                          <Badge className={getStatusBadgeClassName(record.status)}>
                            {labels[statusLabelMap[record.status] ?? "statusPending"]}
                          </Badge>
                        )}
                        {record.pending_client_name && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            {labels.clientUnrecognized.replace("{name}", record.pending_client_name)}
                          </Badge>
                        )}
                      </div>
                      {!isExpanded && transcriptPreview && (
                        <p className="truncate text-sm text-muted-foreground">
                          {transcriptPreview}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {record.voice_signed_url && (
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : record.id)
                        }
                        aria-label={isExpanded ? labels.collapse : labels.expand}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 border-t pt-3">
                      {record.raw_transcript && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            {labels.transcript}
                          </p>
                          <p className="text-sm">{record.raw_transcript}</p>
                        </div>
                      )}
                      {record.voice_signed_url && (
                        <AudioPlayer
                          src={record.voice_signed_url}
                          playLabel={labels.play}
                          pauseLabel={labels.pause}
                        />
                      )}

                      {/* Worker Resolution — only for pending records */}
                      {isPending && record.profile_id === null && (
                        <div className="rounded-md border p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            {labels.worker}
                          </p>
                          {workerResolvingId !== record.id ? (
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => { resetWorkerResolution(); setWorkerResolvingId(record.id); setWorkerResolveMode("existing"); }}>{labels.matchExistingWorker}</Button>
                              <Button variant="outline" size="sm" onClick={() => { resetWorkerResolution(); setWorkerResolvingId(record.id); setWorkerResolveMode("new"); }}>{labels.newWorker}</Button>
                            </div>
                          ) : workerResolveMode === "existing" ? (
                            <div className="space-y-2">
                              <Input placeholder={labels.searchWorker} value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)} className="h-8" />
                              <div className="max-h-40 overflow-y-auto rounded border">
                                {filteredWorkers.map((w) => (
                                  <button key={w.id} type="button" className={`w-full px-3 py-1.5 text-sm text-start hover:bg-muted ${selectedWorkerId === w.id ? "bg-muted" : ""}`} onClick={() => setSelectedWorkerId(w.id)}>{w.full_name}</button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={!selectedWorkerId || pendingRecordId === record.id} onClick={() => handleResolveWorker(record.id, selectedWorkerId)}>{pendingRecordId === record.id ? labels.saving : labels.confirm}</Button>
                                <Button variant="ghost" size="sm" onClick={resetWorkerResolution}>{labels.cancel}</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs">{labels.name}</Label>
                                <Input value={newWorkerName} onChange={(e) => setNewWorkerName(e.target.value)} className="h-8" />
                              </div>
                              <div>
                                <Label className="text-xs">{labels.hourlyRate}</Label>
                                <Input type="number" step="0.01" value={newWorkerRate} onChange={(e) => setNewWorkerRate(e.target.value)} className="h-8" />
                              </div>
                              <div>
                                <Label className="text-xs">{labels.language}</Label>
                                <Select value={newWorkerLang} onValueChange={setNewWorkerLang}>
                                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="he">{labels.langHe}</SelectItem>
                                    <SelectItem value="th">{labels.langTh}</SelectItem>
                                    <SelectItem value="en">{labels.langEn}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={!newWorkerName.trim() || pendingRecordId === record.id} onClick={() => handleCreateWorkerAndResolve(record.id)}>{pendingRecordId === record.id ? labels.saving : labels.confirm}</Button>
                                <Button variant="ghost" size="sm" onClick={resetWorkerResolution}>{labels.cancel}</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Area Resolution — only for pending records */}
                      {isPending && record.area_id === null && (
                        <div className="rounded-md border p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">{labels.area}</p>
                          {areaResolvingId !== record.id ? (
                            <Button variant="outline" size="sm" onClick={() => { resetAreaResolution(); setAreaResolvingId(record.id); }}>{labels.matchExistingArea}</Button>
                          ) : (
                            <div className="space-y-2">
                              <Input placeholder={labels.searchArea} value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="h-8" />
                              <div className="max-h-40 overflow-y-auto rounded border">
                                {filteredAreas.map((a) => (
                                  <button key={a.id} type="button" className={`w-full px-3 py-1.5 text-sm text-start hover:bg-muted ${selectedAreaId === a.id ? "bg-muted" : ""}`} onClick={() => setSelectedAreaId(a.id)}>{a.name}</button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={!selectedAreaId || pendingRecordId === record.id} onClick={() => handleResolveArea(record.id, selectedAreaId)}>{pendingRecordId === record.id ? labels.saving : labels.confirm}</Button>
                                <Button variant="ghost" size="sm" onClick={resetAreaResolution}>{labels.cancel}</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Client Resolution — only for pending records with pending_client_name */}
                      {isPending && record.pending_client_name !== null && (
                        <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                          <p className="text-xs font-medium text-amber-800">
                            {labels.clientUnrecognized.replace("{name}", record.pending_client_name)}
                          </p>
                          {clientResolvingId !== record.id ? (
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => { resetClientResolution(); setClientResolvingId(record.id); setClientResolveMode("existing"); }}>{labels.matchExistingClient}</Button>
                              <Button variant="outline" size="sm" onClick={() => { resetClientResolution(); setClientResolvingId(record.id); setClientResolveMode("new"); setNewClientName(record.pending_client_name ?? ""); }}>{labels.newClient}</Button>
                            </div>
                          ) : clientResolveMode === "existing" ? (
                            <div className="space-y-2">
                              <Input placeholder={labels.searchClient} value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="h-8" />
                              <div className="max-h-40 overflow-y-auto rounded border">
                                {filteredClients.map((c) => (
                                  <button key={c.id} type="button" className={`w-full px-3 py-1.5 text-sm text-start hover:bg-muted ${selectedClientId === c.id ? "bg-muted" : ""}`} onClick={() => setSelectedClientId(c.id)}>{c.name}</button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={!selectedClientId || pendingRecordId === record.id} onClick={() => handleResolveClient(record.id, selectedClientId)}>{pendingRecordId === record.id ? labels.saving : labels.confirm}</Button>
                                <Button variant="ghost" size="sm" onClick={resetClientResolution}>{labels.cancel}</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs">{labels.clientName}</Label>
                                <Input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="h-8" />
                              </div>
                              <div>
                                <Label className="text-xs">{labels.clientPhone}</Label>
                                <Input type="tel" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} className="h-8" />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={!newClientName.trim() || pendingRecordId === record.id} onClick={() => handleCreateClientAndResolve(record.id)}>{pendingRecordId === record.id ? labels.saving : labels.confirm}</Button>
                                <Button variant="ghost" size="sm" onClick={resetClientResolution}>{labels.cancel}</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions — only for pending records */}
                      {isPending && (
                        <div className="border-t pt-3 space-y-2">
                          {rejectingId === record.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm">{labels.rejectConfirm}</span>
                              <Button variant="destructive" size="sm" disabled={pendingRecordId === record.id} onClick={() => handleReject(record.id)}>{pendingRecordId === record.id ? labels.saving : labels.rejectConfirmBtn}</Button>
                              <Button variant="ghost" size="sm" onClick={resetReject}>{labels.cancel}</Button>
                            </div>
                          ) : editingId === record.id ? (
                            <div className="rounded-md border p-3 space-y-2">
                              <p className="text-xs font-medium">{labels.editRecord}</p>
                              <div>
                                <Label className="text-xs">{labels.editHours}</Label>
                                <Input type="number" step="0.5" min="0" max="24" value={editHours} onChange={(e) => setEditHours(e.target.value)} className="h-8" />
                              </div>
                              <div>
                                <Label className="text-xs">{labels.editArea}</Label>
                                <Input placeholder={labels.searchArea} value={editAreaFilter} onChange={(e) => setEditAreaFilter(e.target.value)} className="h-8 mb-1" />
                                <div className="max-h-36 overflow-y-auto rounded border">
                                  {areas.filter((a) => a.name.toLowerCase().includes(editAreaFilter.toLowerCase())).map((a) => (
                                    <button key={a.id} type="button" className={`w-full px-3 py-1.5 text-sm text-start hover:bg-muted ${editAreaId === a.id ? "bg-muted" : ""}`} onClick={() => setEditAreaId(a.id)}>{a.name}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" disabled={(editHours === "" && editAreaId === "") || pendingRecordId === record.id} onClick={() => handleEdit(record.id)}>{pendingRecordId === record.id ? labels.saving : labels.confirm}</Button>
                                <Button variant="ghost" size="sm" onClick={resetEdit}>{labels.cancel}</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const canApprove = record.profile_id !== null && record.area_id !== null && record.pending_client_name === null;
                                return (
                                  <Button variant="default" size="sm" disabled={!canApprove || pendingRecordId === record.id} onClick={() => handleApprove(record.id)} title={!canApprove ? labels.cannotApproveUnresolved : undefined}>{pendingRecordId === record.id ? labels.saving : labels.approve}</Button>
                                );
                              })()}
                              <Button variant="outline" size="sm" disabled={pendingRecordId === record.id} onClick={() => { resetEdit(); setEditingId(record.id); setEditHours(String(record.total_hours ?? "")); setEditAreaId(record.area_id ?? ""); }}>{labels.edit}</Button>
                              <Button variant="destructive" size="sm" disabled={pendingRecordId === record.id} onClick={() => { resetReject(); setRejectingId(record.id); }}>{labels.reject}</Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Feedback */}
                      {recordFeedback && (
                        <p className={`text-sm ${recordFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}>
                          {recordFeedback.message}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
