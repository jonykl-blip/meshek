"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createArea,
  createCrop,
  updateArea,
  archiveArea,
  addAreaAlias,
  removeAreaAlias,
  type Area,
} from "@/app/actions/areas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Crop {
  id: string;
  name: string;
}

interface Labels {
  addArea: string;
  editArea: string;
  archiveArea: string;
  name: string;
  crop: string;
  aliases: string;
  addAlias: string;
  removeAlias: string;
  archiveConfirm: string;
  archiveDescription: string;
  confirm: string;
  cancel: string;
  save: string;
  saving: string;
  created: string;
  updated: string;
  archived: string;
  aliasAdded: string;
  aliasRemoved: string;
  noAreas: string;
  actions: string;
  createCrop: string;
  cropName: string;
  noCrops: string;
  validationNameRequired: string;
  validationCropRequired: string;
}

export function AreasTable({
  areas,
  crops,
  labels,
}: {
  areas: Area[];
  crops: Crop[];
  labels: Labels;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  const showFeedback = useCallback((msg: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedbackMsg(msg);
    feedbackTimer.current = setTimeout(() => setFeedbackMsg(""), 3000);
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          {labels.addArea}
        </Button>
        {feedbackMsg && (
          <span className="text-sm text-green-600">{feedbackMsg}</span>
        )}
      </div>

      {showCreateForm && (
        <CreateAreaForm
          crops={crops}
          labels={labels}
          onClose={() => setShowCreateForm(false)}
          onSuccess={(msg) => {
            setShowCreateForm(false);
            showFeedback(msg);
            router.refresh();
          }}
        />
      )}

      <div className="overflow-x-auto rounded-lg border shadow-md bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-start font-medium">{labels.name}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.crop}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.aliases}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {areas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  {labels.noAreas}
                </td>
              </tr>
            ) : (
              areas.map((area) => (
                <AreaRow
                  key={area.id}
                  area={area}
                  crops={crops}
                  labels={labels}
                  onFeedback={(msg) => {
                    showFeedback(msg);
                    router.refresh();
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateAreaForm({
  crops: initialCrops,
  labels,
  onClose,
  onSuccess,
}: {
  crops: Crop[];
  labels: Labels;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [cropId, setCropId] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showNewCrop, setShowNewCrop] = useState(initialCrops.length === 0);
  const [newCropName, setNewCropName] = useState("");
  const [localCrops, setLocalCrops] = useState(initialCrops);

  function handleCreateCrop() {
    if (!newCropName.trim()) return;
    startTransition(async () => {
      const result = await createCrop({ name: newCropName.trim() });
      if (result.success) {
        setLocalCrops((prev) => [...prev, result.data]);
        setCropId(result.data.id);
        setNewCropName("");
        setShowNewCrop(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSubmit() {
    setError("");
    if (!name.trim()) {
      setError(labels.validationNameRequired);
      return;
    }
    if (!cropId) {
      setError(labels.validationCropRequired);
      return;
    }
    startTransition(async () => {
      const result = await createArea({
        name: name.trim(),
        crop_id: cropId,
        alias: alias.trim() || undefined,
      });
      if (result.success) {
        onSuccess(labels.created);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mb-6 max-w-md rounded-lg border bg-card p-4 shadow-sm">
      <div className="space-y-4">
        <div>
          <Label>{labels.name}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label>{labels.crop}</Label>
          {showNewCrop ? (
            <div className="mt-1 flex items-center gap-2">
              <Input
                value={newCropName}
                onChange={(e) => setNewCropName(e.target.value)}
                placeholder={labels.cropName}
                onKeyDown={(e) => e.key === "Enter" && handleCreateCrop()}
              />
              <Button size="sm" onClick={handleCreateCrop} disabled={isPending}>
                {labels.save}
              </Button>
              {localCrops.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => setShowNewCrop(false)}>
                  {labels.cancel}
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-1 flex items-center gap-2">
              <Select value={cropId} onValueChange={setCropId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {localCrops.map((crop) => (
                    <SelectItem key={crop.id} value={crop.id}>
                      {crop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => setShowNewCrop(true)}>
                {labels.createCrop}
              </Button>
            </div>
          )}
        </div>
        <div>
          <Label>{labels.addAlias}</Label>
          <Input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            className="mt-1"
            placeholder={labels.aliases}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? labels.saving : labels.save}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {labels.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AreaRow({
  area,
  crops,
  labels,
  onFeedback,
}: {
  area: Area;
  crops: Crop[];
  labels: Labels;
  onFeedback: (msg: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [editData, setEditData] = useState({ name: area.name, crop_id: area.crop_id });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [newAlias, setNewAlias] = useState("");
  const [showAliasInput, setShowAliasInput] = useState(false);

  function handleSave() {
    setError("");
    startTransition(async () => {
      const result = await updateArea(area.id, editData);
      if (result.success) {
        setIsEditing(false);
        onFeedback(labels.updated);
      } else {
        setError(result.error);
      }
    });
  }

  function handleCancelEdit() {
    setEditData({ name: area.name, crop_id: area.crop_id });
    setError("");
    setIsEditing(false);
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveArea(area.id);
      if (result.success) {
        setShowArchiveDialog(false);
        onFeedback(labels.archived);
      } else {
        setError(result.error);
        setShowArchiveDialog(false);
      }
    });
  }

  function handleAddAlias() {
    if (!newAlias.trim()) return;
    startTransition(async () => {
      const result = await addAreaAlias(area.id, newAlias.trim());
      if (result.success) {
        setNewAlias("");
        setShowAliasInput(false);
        onFeedback(labels.aliasAdded);
      } else {
        setError(result.error);
      }
    });
  }

  function handleRemoveAlias(aliasId: string) {
    startTransition(async () => {
      const result = await removeAreaAlias(aliasId);
      if (result.success) {
        onFeedback(labels.aliasRemoved);
      } else {
        setError(result.error);
      }
    });
  }

  if (isEditing) {
    return (
      <tr className="border-b last:border-b-0 bg-muted/20">
        <td className="px-4 py-3">
          <Input
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="max-w-[200px]"
          />
        </td>
        <td className="px-4 py-3">
          <Select
            value={editData.crop_id}
            onValueChange={(v) => setEditData({ ...editData, crop_id: v })}
          >
            <SelectTrigger className="max-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {crops.map((crop) => (
                <SelectItem key={crop.id} value={crop.id}>
                  {crop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3" />
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? labels.saving : labels.save}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isPending}>
                {labels.cancel}
              </Button>
            </div>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="border-b last:border-b-0 transition-colors hover:bg-muted/30">
        <td className="px-4 py-3 text-base font-semibold">{area.name}</td>
        <td className="px-4 py-3">
          <Badge variant="outline">{area.crops?.name ?? "—"}</Badge>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            {area.area_aliases.map((a) => (
              <Badge key={a.id} variant="secondary" className="gap-1">
                {a.alias}
                <button
                  onClick={() => handleRemoveAlias(a.id)}
                  className="me-1 text-xs opacity-60 hover:opacity-100"
                  disabled={isPending}
                >
                  ×
                </button>
              </Badge>
            ))}
            {showAliasInput ? (
              <div className="flex items-center gap-1">
                <Input
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  className="h-7 w-28 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleAddAlias()}
                />
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleAddAlias} disabled={isPending}>
                  +
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setShowAliasInput(false); setNewAlias(""); }}>
                  ×
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setShowAliasInput(true)}
              >
                {labels.addAlias}
              </Button>
            )}
          </div>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              {labels.editArea}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowArchiveDialog(true)}
            >
              {labels.archiveArea}
            </Button>
          </div>
        </td>
      </tr>
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {labels.archiveConfirm.replace("__NAME__", area.name)}
            </DialogTitle>
            <DialogDescription>{labels.archiveDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              disabled={isPending}
            >
              {labels.cancel}
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={isPending}>
              {isPending ? labels.saving : labels.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
