"use client";

import { useState, useTransition } from "react";
import { Plus, Minus, AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { createManualAttendance } from "@/app/actions/attendance";

export interface AddRecordModalLabels {
  buttonLabel: string;
  modalTitle: string;
  workerLabel: string;
  workerPlaceholder: string;
  workerSearchPlaceholder: string;
  workerSearchEmpty: string;
  dateLabel: string;
  areaLabel: string;
  areaPlaceholder: string;
  hoursLabel: string;
  hoursDecrease: string;
  hoursIncrease: string;
  workTypeLabel: string;
  workTypePlaceholder: string;
  dunamLabel: string;
  materialsLabel: string;
  materialQuantity: string;
  saveButton: string;
  saveAndAddAnother: string;
  cancel: string;
  saving: string;
  successApproved: string;
  successPending: string;
  duplicateWarning: string;
  duplicateHours: string;
  excessiveHoursWarning: string;
  validationRequired: string;
  validationHoursRange: string;
  validationHoursStep: string;
  validationFutureDate: string;
}

export interface MaterialSelection {
  material_id: string;
  quantity: number | null;
  unit: string | null;
}

interface AddRecordModalProps {
  workers: { id: string; full_name: string }[];
  areas: { id: string; name: string }[];
  workTypes: { id: string; name_he: string }[];
  materials: { id: string; name_he: string; default_unit: string | null }[];
  labels: AddRecordModalLabels;
  todayJerusalem: string;
}

export function AddRecordModal({
  workers,
  areas,
  workTypes,
  materials,
  labels,
  todayJerusalem,
}: AddRecordModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [workerPopoverOpen, setWorkerPopoverOpen] = useState(false);

  const [profileId, setProfileId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [workDate, setWorkDate] = useState(todayJerusalem);
  const [totalHours, setTotalHours] = useState(8.0);
  const [workTypeId, setWorkTypeId] = useState("");
  const [dunamCovered, setDunamCovered] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialSelection[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    id: string;
    total_hours: number;
  } | null>(null);

  const selectedWorker = workers.find((w) => w.id === profileId);

  function toggleMaterial(materialId: string, defaultUnit: string | null) {
    setSelectedMaterials((prev) => {
      const exists = prev.find((m) => m.material_id === materialId);
      if (exists) {
        return prev.filter((m) => m.material_id !== materialId);
      }
      return [...prev, { material_id: materialId, quantity: null, unit: defaultUnit }];
    });
  }

  function updateMaterialQuantity(materialId: string, quantity: string) {
    setSelectedMaterials((prev) =>
      prev.map((m) =>
        m.material_id === materialId
          ? { ...m, quantity: quantity ? parseFloat(quantity) : null }
          : m
      )
    );
  }

  function resetForm() {
    setProfileId("");
    setAreaId("");
    setWorkDate(todayJerusalem);
    setTotalHours(8.0);
    setWorkTypeId("");
    setDunamCovered("");
    setSelectedMaterials([]);
    setErrors({});
    setSuccessMessage(null);
    setDuplicateInfo(null);
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!profileId) newErrors.profileId = labels.validationRequired;
    if (!areaId) newErrors.areaId = labels.validationRequired;
    if (!workDate) newErrors.workDate = labels.validationRequired;
    if (workDate > todayJerusalem)
      newErrors.workDate = labels.validationFutureDate;
    if (totalHours < 0.5 || totalHours > 24)
      newErrors.totalHours = labels.validationHoursRange;
    else if (Math.round(totalHours * 2) !== totalHours * 2)
      newErrors.totalHours = labels.validationHoursStep;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function adjustHours(delta: number) {
    setTotalHours((prev) => {
      const next = Math.round((prev + delta) * 2) / 2;
      if (next < 0.5) return 0.5;
      if (next > 24) return 24;
      return next;
    });
  }

  function handleSubmit(addAnother: boolean) {
    if (!validate()) return;
    setSuccessMessage(null);
    setDuplicateInfo(null);

    startTransition(async () => {
      // New fields (workTypeId, dunamCovered, materials) are passed through
      // but not yet accepted by createManualAttendance — will be wired in action update
      const result = await createManualAttendance({
        profileId,
        workDate,
        areaId,
        totalHours,
        workTypeId: workTypeId || undefined,
        dunamCovered: dunamCovered ? parseFloat(dunamCovered) : undefined,
        materials: selectedMaterials.length > 0 ? selectedMaterials : undefined,
      } as Parameters<typeof createManualAttendance>[0]);

      if (!result.success) {
        setErrors({ form: result.error });
        return;
      }

      if (result.data.duplicate) {
        setDuplicateInfo(result.data.duplicate);
      }

      const msg =
        result.data.status === "approved"
          ? labels.successApproved
          : labels.successPending;
      setSuccessMessage(msg);

      if (addAnother) {
        setProfileId("");
        setAreaId("");
        setTotalHours(8.0);
        setWorkTypeId("");
        setDunamCovered("");
        setSelectedMaterials([]);
        setErrors({});
        setTimeout(() => {
          setSuccessMessage(null);
          setDuplicateInfo(null);
        }, 3000);
      } else {
        setTimeout(() => {
          setOpen(false);
          resetForm();
        }, 1500);
      }
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
      <DialogTrigger asChild>
        <Button size="sm">
          {labels.buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.modalTitle}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Worker — searchable combobox */}
          <div className="grid gap-1.5">
            <Label>{labels.workerLabel}</Label>
            <Popover open={workerPopoverOpen} onOpenChange={setWorkerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={workerPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedWorker
                    ? selectedWorker.full_name
                    : labels.workerPlaceholder}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder={labels.workerSearchPlaceholder} />
                  <CommandList>
                    <CommandEmpty>{labels.workerSearchEmpty}</CommandEmpty>
                    <CommandGroup>
                      {workers.map((w) => (
                        <CommandItem
                          key={w.id}
                          value={w.full_name}
                          onSelect={() => {
                            setProfileId(w.id);
                            setWorkerPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "me-2 h-4 w-4",
                              profileId === w.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {w.full_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.profileId && (
              <p className="text-sm text-destructive">{errors.profileId}</p>
            )}
          </div>

          {/* Date */}
          <div className="grid gap-1.5">
            <Label htmlFor="date-input">{labels.dateLabel}</Label>
            <Input
              id="date-input"
              type="date"
              value={workDate}
              max={todayJerusalem}
              onChange={(e) => setWorkDate(e.target.value)}
            />
            {errors.workDate && (
              <p className="text-sm text-destructive">{errors.workDate}</p>
            )}
          </div>

          {/* Area */}
          <div className="grid gap-1.5">
            <Label htmlFor="area-select">{labels.areaLabel}</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger id="area-select" className="w-full">
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
            {errors.areaId && (
              <p className="text-sm text-destructive">{errors.areaId}</p>
            )}
          </div>

          {/* Hours */}
          <div className="grid gap-1.5">
            <Label htmlFor="hours-input">{labels.hoursLabel}</Label>
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
                id="hours-input"
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
            {errors.totalHours && (
              <p className="text-sm text-destructive">{errors.totalHours}</p>
            )}
          </div>

          {/* Work Type */}
          {workTypes.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="work-type-select">{labels.workTypeLabel}</Label>
              <Select value={workTypeId} onValueChange={setWorkTypeId}>
                <SelectTrigger id="work-type-select" className="w-full">
                  <SelectValue placeholder={labels.workTypePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {workTypes.map((wt) => (
                    <SelectItem key={wt.id} value={wt.id}>
                      {wt.name_he}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dunam */}
          <div className="grid gap-1.5">
            <Label htmlFor="dunam-input">{labels.dunamLabel}</Label>
            <Input
              id="dunam-input"
              type="number"
              step="0.5"
              min="0"
              value={dunamCovered}
              onChange={(e) => setDunamCovered(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* Materials */}
          {materials.length > 0 && (
            <div className="grid gap-1.5">
              <Label>{labels.materialsLabel}</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                {materials.map((mat) => {
                  const selected = selectedMaterials.find(
                    (m) => m.material_id === mat.id
                  );
                  return (
                    <div key={mat.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`mat-${mat.id}`}
                        checked={!!selected}
                        onChange={() => toggleMaterial(mat.id, mat.default_unit)}
                        className="h-4 w-4 shrink-0 rounded border-gray-300"
                      />
                      <label
                        htmlFor={`mat-${mat.id}`}
                        className="min-w-0 flex-1 truncate text-sm"
                      >
                        {mat.name_he}
                      </label>
                      {selected && (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder={labels.materialQuantity}
                            value={selected.quantity ?? ""}
                            onChange={(e) =>
                              updateMaterialQuantity(mat.id, e.target.value)
                            }
                            className="h-7 w-20 text-sm"
                          />
                          {mat.default_unit && (
                            <span className="text-xs text-muted-foreground">
                              {mat.default_unit}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Duplicate warning */}
          {duplicateInfo && (
            <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200">
              <p>{labels.duplicateWarning}</p>
              <p className="mt-1 font-medium">
                {labels.duplicateHours}: {duplicateInfo.total_hours}
              </p>
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-200">
              {successMessage}
            </div>
          )}

          {/* Form-level error */}
          {errors.form && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {errors.form}
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
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={isPending}
          >
            {isPending ? labels.saving : labels.saveAndAddAnother}
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={isPending}>
            {isPending ? labels.saving : labels.saveButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
