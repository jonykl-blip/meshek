"use client";

import { useState, useTransition } from "react";
import { Plus, Minus, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dashboardEditRecord } from "@/app/actions/attendance";

export interface EditRecordDialogLabels {
  modalTitle: string;
  areaLabel: string;
  areaPlaceholder: string;
  hoursLabel: string;
  hoursDecrease: string;
  hoursIncrease: string;
  saveButton: string;
  cancel: string;
  saving: string;
  editSuccess: string;
  excessiveHoursWarning: string;
  validationHoursRange: string;
  validationHoursStep: string;
}

interface EditRecordDialogProps {
  recordId: string;
  currentHours: number | null;
  currentAreaId: string | null;
  workerName: string | null;
  areas: { id: string; name: string }[];
  labels: EditRecordDialogLabels;
  trigger: React.ReactNode;
}

export function EditRecordDialog({
  recordId,
  currentHours,
  currentAreaId,
  workerName,
  areas,
  labels,
  trigger,
}: EditRecordDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [totalHours, setTotalHours] = useState(currentHours ?? 8.0);
  const [areaId, setAreaId] = useState(currentAreaId ?? "");

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function resetForm() {
    setTotalHours(currentHours ?? 8.0);
    setAreaId(currentAreaId ?? "");
    setError(null);
    setSuccessMessage(null);
  }

  function validate(): string | null {
    if (totalHours < 0.5 || totalHours > 24) return labels.validationHoursRange;
    if (Math.round(totalHours * 2) !== totalHours * 2)
      return labels.validationHoursStep;
    return null;
  }

  function adjustHours(delta: number) {
    setTotalHours((prev) => {
      const next = Math.round((prev + delta) * 2) / 2;
      if (next < 0.5) return 0.5;
      if (next > 24) return 24;
      return next;
    });
  }

  function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccessMessage(null);

    const updates: { total_hours?: number; area_id?: string } = {};
    if (totalHours !== (currentHours ?? 8.0)) {
      updates.total_hours = totalHours;
    }
    if (areaId !== (currentAreaId ?? "")) {
      updates.area_id = areaId;
    }

    if (Object.keys(updates).length === 0) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await dashboardEditRecord(recordId, updates);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccessMessage(labels.editSuccess);
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.modalTitle}</DialogTitle>
          {workerName && (
            <p className="text-sm text-muted-foreground">{workerName}</p>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Area */}
          <div className="grid gap-1.5">
            <Label htmlFor="edit-area-select">{labels.areaLabel}</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger id="edit-area-select" className="w-full">
                <SelectValue placeholder={labels.areaPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {areas.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hours */}
          <div className="grid gap-1.5">
            <Label htmlFor="edit-hours-input">{labels.hoursLabel}</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => adjustHours(-0.5)}
                disabled={totalHours <= 0.5}
                aria-label={labels.hoursDecrease}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="edit-hours-input"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={totalHours}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setTotalHours(val);
                }}
                className="text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => adjustHours(0.5)}
                disabled={totalHours >= 24}
                aria-label={labels.hoursIncrease}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {totalHours > 12 && (
              <p className="flex items-center gap-1 text-sm text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                {labels.excessiveHoursWarning}
              </p>
            )}
          </div>

          {/* Success message */}
          {successMessage && (
            <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200">
              {successMessage}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
            disabled={isPending}
          >
            {labels.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? labels.saving : labels.saveButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
