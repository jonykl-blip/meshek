"use client";

import { useState, useTransition, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createClientAction,
  updateClient,
  archiveClient,
  addClientAlias,
  removeClientAlias,
  type Client,
} from "@/app/actions/clients";
import { OWN_FARM_CLIENT_ID } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  title: string;
  addClient: string;
  editClient: string;
  archiveClient: string;
  name: string;
  nameEn: string;
  phone: string;
  notes: string;
  rateDunam: string;
  rateHour: string;
  aliases: string;
  addAlias: string;
  removeAlias: string;
  ownFarm: string;
  archiveConfirm: string;
  archiveDescription: string;
  archiveBlockedOwnFarm: string;
  confirm: string;
  cancel: string;
  save: string;
  saving: string;
  created: string;
  updated: string;
  archived: string;
  noClients: string;
  actions: string;
  validationNameRequired: string;
  searchPlaceholder: string;
}

export function ClientsTable({
  clients,
  labels,
}: {
  clients: Client[];
  labels: Labels;
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  const showFeedback = useCallback((msg: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedbackMsg(msg);
    feedbackTimer.current = setTimeout(() => setFeedbackMsg(""), 3000);
  }, []);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.trim().toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.name_en && c.name_en.toLowerCase().includes(q)),
    );
  }, [clients, searchQuery]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
            {labels.addClient}
          </Button>
          {feedbackMsg && (
            <span className="text-sm text-green-600">{feedbackMsg}</span>
          )}
        </div>
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className="max-w-xs"
        />
      </div>

      {showCreateForm && (
        <CreateClientForm
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
              <th className="px-4 py-3 text-start font-medium">{labels.nameEn}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.phone}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.rateDunam} / {labels.rateHour}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.aliases}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {labels.noClients}
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
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

function CreateClientForm({
  labels,
  onClose,
  onSuccess,
}: {
  labels: Labels;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [rateDunam, setRateDunam] = useState("");
  const [rateHour, setRateHour] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError("");
    if (!name.trim()) {
      setError(labels.validationNameRequired);
      return;
    }
    startTransition(async () => {
      const result = await createClientAction({
        name: name.trim(),
        name_en: nameEn.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        rate_per_dunam: rateDunam ? Number(rateDunam) : null,
        rate_per_hour: rateHour ? Number(rateHour) : null,
      });
      if (result.success) {
        onSuccess(labels.created);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mb-6 max-w-lg rounded-lg border bg-card p-4 shadow-sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{labels.name}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{labels.nameEn}</Label>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label>{labels.phone}</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{labels.rateDunam}</Label>
            <Input
              type="number"
              value={rateDunam}
              onChange={(e) => setRateDunam(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{labels.rateHour}</Label>
            <Input
              type="number"
              value={rateHour}
              onChange={(e) => setRateHour(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label>{labels.notes}</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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

function ClientRow({
  client,
  labels,
  onFeedback,
}: {
  client: Client;
  labels: Labels;
  onFeedback: (msg: string) => void;
}) {
  const isOwnFarm = client.is_own_farm || client.id === OWN_FARM_CLIENT_ID;
  const [isEditing, setIsEditing] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [editData, setEditData] = useState({
    name: client.name,
    name_en: client.name_en ?? "",
    phone: client.phone ?? "",
    notes: client.notes ?? "",
    rate_per_dunam: client.rate_per_dunam?.toString() ?? "",
    rate_per_hour: client.rate_per_hour?.toString() ?? "",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [newAlias, setNewAlias] = useState("");
  const [showAliasInput, setShowAliasInput] = useState(false);

  function handleSave() {
    setError("");
    startTransition(async () => {
      const result = await updateClient(client.id, {
        name: editData.name,
        name_en: editData.name_en.trim() || undefined,
        phone: editData.phone.trim() || undefined,
        notes: editData.notes.trim() || undefined,
        rate_per_dunam: editData.rate_per_dunam ? Number(editData.rate_per_dunam) : null,
        rate_per_hour: editData.rate_per_hour ? Number(editData.rate_per_hour) : null,
      });
      if (result.success) {
        setIsEditing(false);
        onFeedback(labels.updated);
      } else {
        setError(result.error);
      }
    });
  }

  function handleCancelEdit() {
    setEditData({
      name: client.name,
      name_en: client.name_en ?? "",
      phone: client.phone ?? "",
      notes: client.notes ?? "",
      rate_per_dunam: client.rate_per_dunam?.toString() ?? "",
      rate_per_hour: client.rate_per_hour?.toString() ?? "",
    });
    setError("");
    setIsEditing(false);
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveClient(client.id);
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
      const result = await addClientAlias(client.id, newAlias.trim());
      if (result.success) {
        setNewAlias("");
        setShowAliasInput(false);
        onFeedback(labels.updated);
      } else {
        setError(result.error);
      }
    });
  }

  function handleRemoveAlias(aliasId: string) {
    startTransition(async () => {
      const result = await removeClientAlias(aliasId);
      if (result.success) {
        onFeedback(labels.updated);
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
            className="max-w-[180px]"
          />
        </td>
        <td className="px-4 py-3">
          <Input
            value={editData.name_en}
            onChange={(e) => setEditData({ ...editData, name_en: e.target.value })}
            className="max-w-[160px]"
          />
        </td>
        <td className="px-4 py-3">
          <Input
            value={editData.phone}
            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
            className="max-w-[140px]"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <Input
              type="number"
              value={editData.rate_per_dunam}
              onChange={(e) => setEditData({ ...editData, rate_per_dunam: e.target.value })}
              className="w-20"
              placeholder={labels.rateDunam}
            />
            <Input
              type="number"
              value={editData.rate_per_hour}
              onChange={(e) => setEditData({ ...editData, rate_per_hour: e.target.value })}
              className="w-20"
              placeholder={labels.rateHour}
            />
          </div>
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

  const rates: string[] = [];
  if (client.rate_per_dunam != null) rates.push(`${client.rate_per_dunam} / ${labels.rateDunam}`);
  if (client.rate_per_hour != null) rates.push(`${client.rate_per_hour} / ${labels.rateHour}`);

  return (
    <>
      <tr className="border-b last:border-b-0 transition-colors hover:bg-muted/30">
        <td className="px-4 py-3">
          <span className="text-base font-semibold">{client.name}</span>
          {isOwnFarm && (
            <Badge className="ms-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {labels.ownFarm}
            </Badge>
          )}
        </td>
        <td className="px-4 py-3 text-muted-foreground">{client.name_en ?? "—"}</td>
        <td className="px-4 py-3">{client.phone ?? "—"}</td>
        <td className="px-4 py-3 text-muted-foreground text-xs">
          {rates.length > 0 ? rates.join(" | ") : "—"}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            {client.client_aliases.map((a) => (
              <Badge key={a.id} variant="secondary" className="gap-1">
                {a.alias}
                {!isOwnFarm && (
                  <button
                    onClick={() => handleRemoveAlias(a.id)}
                    className="me-1 text-xs opacity-60 hover:opacity-100"
                    disabled={isPending}
                  >
                    ×
                  </button>
                )}
              </Badge>
            ))}
            {!isOwnFarm && (
              showAliasInput ? (
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
              )
            )}
          </div>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </td>
        <td className="px-4 py-3">
          {isOwnFarm ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                {labels.editClient}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowArchiveDialog(true)}
              >
                {labels.archiveClient}
              </Button>
            </div>
          )}
        </td>
      </tr>
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isOwnFarm
                ? labels.archiveBlockedOwnFarm
                : labels.archiveConfirm.replace("__NAME__", client.name)}
            </DialogTitle>
            <DialogDescription>
              {isOwnFarm ? labels.archiveBlockedOwnFarm : labels.archiveDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              disabled={isPending}
            >
              {labels.cancel}
            </Button>
            {!isOwnFarm && (
              <Button variant="destructive" onClick={handleArchive} disabled={isPending}>
                {isPending ? labels.saving : labels.confirm}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
