"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createEquipment,
  updateEquipment,
  archiveEquipment,
  type Equipment,
} from "@/app/actions/equipment";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Labels {
  addEquipment: string;
  editEquipment: string;
  archiveEquipment: string;
  name: string;
  archiveConfirm: string;
  archiveDescription: string;
  confirm: string;
  cancel: string;
  save: string;
  saving: string;
  created: string;
  updated: string;
  archived: string;
  noEquipment: string;
  actions: string;
  validationNameRequired: string;
}

export function EquipmentTable({
  equipment,
  labels,
}: {
  equipment: Equipment[];
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
          {labels.addEquipment}
        </Button>
        {feedbackMsg && (
          <span className="text-sm text-green-600">{feedbackMsg}</span>
        )}
      </div>

      {showCreateForm && (
        <CreateEquipmentForm
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
              <th className="px-4 py-3 text-start font-medium">{labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {equipment.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
                  {labels.noEquipment}
                </td>
              </tr>
            ) : (
              equipment.map((item) => (
                <EquipmentRow
                  key={item.id}
                  item={item}
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

function CreateEquipmentForm({
  labels,
  onClose,
  onSuccess,
}: {
  labels: Labels;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError("");
    if (!name.trim()) {
      setError(labels.validationNameRequired);
      return;
    }
    startTransition(async () => {
      const result = await createEquipment({ name: name.trim() });
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

function EquipmentRow({
  item,
  labels,
  onFeedback,
}: {
  item: Equipment;
  labels: Labels;
  onFeedback: (msg: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError("");
    startTransition(async () => {
      const result = await updateEquipment(item.id, { name: editName });
      if (result.success) {
        setIsEditing(false);
        onFeedback(labels.updated);
      } else {
        setError(result.error);
      }
    });
  }

  function handleCancelEdit() {
    setEditName(item.name);
    setError("");
    setIsEditing(false);
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveEquipment(item.id);
      if (result.success) {
        setShowArchiveDialog(false);
        onFeedback(labels.archived);
      } else {
        setError(result.error);
        setShowArchiveDialog(false);
      }
    });
  }

  if (isEditing) {
    return (
      <tr className="border-b last:border-b-0 bg-muted/20">
        <td className="px-4 py-3">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="max-w-[250px]"
          />
        </td>
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
        <td className="px-4 py-3 text-base font-semibold">{item.name}</td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              {labels.editEquipment}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowArchiveDialog(true)}
            >
              {labels.archiveEquipment}
            </Button>
          </div>
        </td>
      </tr>
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {labels.archiveConfirm.replace("__NAME__", item.name)}
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
