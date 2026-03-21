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
import {
  createArea,
  createCrop,
  updateArea,
  archiveArea,
  addAreaAlias,
  removeAreaAlias,
  type Area,
} from "@/app/actions/areas";
import { OWN_FARM_CLIENT_ID } from "@/lib/constants";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronLeft, Plus } from "lucide-react";

interface Crop {
  id: string;
  name: string;
}

interface Labels {
  title: string;
  ownFarmSection: string;
  addClient: string;
  searchPlaceholder: string;
  // Client
  clientName: string;
  clientNameEn: string;
  clientPhone: string;
  clientNotes: string;
  clientAliases: string;
  clientAddAlias: string;
  clientOwnFarm: string;
  editClient: string;
  archiveClient: string;
  archiveClientConfirm: string;
  archiveClientDescription: string;
  archiveBlockedOwnFarm: string;
  clientCreated: string;
  clientUpdated: string;
  clientArchived: string;
  noClients: string;
  validationClientNameRequired: string;
  // Area
  areaName: string;
  areaCrop: string;
  areaAliases: string;
  addArea: string;
  editArea: string;
  archiveArea: string;
  archiveAreaConfirm: string;
  archiveAreaDescription: string;
  areaCreated: string;
  areaUpdated: string;
  areaArchived: string;
  aliasAdded: string;
  aliasRemoved: string;
  noAreas: string;
  addAlias: string;
  createCrop: string;
  cropName: string;
  ownField: string;
  totalAreaDunam: string;
  dunamUnit: string;
  selectClient: string;
  validationAreaNameRequired: string;
  validationCropRequired: string;
  // Shared
  confirm: string;
  cancel: string;
  save: string;
  saving: string;
  actions: string;
}

interface ClientWithAreas extends Client {
  areas: Area[];
}

export function ClientsAreasView({
  allClients,
  activeClients,
  areas,
  crops: initialCrops,
  labels,
}: {
  allClients: Client[];
  activeClients: Client[];
  areas: Area[];
  crops: Crop[];
  labels: Labels;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const feedbackTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const router = useRouter();

  const showFeedback = useCallback((msg: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedbackMsg(msg);
    feedbackTimer.current = setTimeout(() => setFeedbackMsg(""), 3000);
  }, []);

  // Build the unified client→areas hierarchy
  const { ownFarmAreas, clientSections } = useMemo(() => {
    const own: Area[] = [];
    const areasByClient = new Map<string, Area[]>();

    for (const area of areas) {
      if (area.is_own_field) {
        own.push(area);
      } else {
        const existing = areasByClient.get(area.client_id) ?? [];
        existing.push(area);
        areasByClient.set(area.client_id, existing);
      }
    }

    // Only external (non-own-farm) clients
    const externalClients = allClients.filter(
      (c) => !c.is_own_farm && c.id !== OWN_FARM_CLIENT_ID,
    );

    const sections: ClientWithAreas[] = externalClients.map((client) => ({
      ...client,
      areas: areasByClient.get(client.id) ?? [],
    }));

    sections.sort((a, b) => a.name.localeCompare(b.name, "he"));

    return { ownFarmAreas: own, clientSections: sections };
  }, [areas, allClients]);

  // Filter by search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return clientSections;
    const q = searchQuery.trim().toLowerCase();
    return clientSections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.name_en && c.name_en.toLowerCase().includes(q)) ||
        c.areas.some((a) => a.name.toLowerCase().includes(q)),
    );
  }, [clientSections, searchQuery]);

  const externalActiveClients = activeClients.filter(
    (c) => !c.is_own_farm && c.id !== OWN_FARM_CLIENT_ID,
  );

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateClient(true)} disabled={showCreateClient}>
            <Plus className="me-1 h-4 w-4" />
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

      {/* Create client form */}
      {showCreateClient && (
        <CreateClientForm
          labels={labels}
          onClose={() => setShowCreateClient(false)}
          onSuccess={(msg) => {
            setShowCreateClient(false);
            showFeedback(msg);
            router.refresh();
          }}
        />
      )}

      {/* Own Farm Section */}
      <section className="rounded-lg border bg-card shadow-sm">
        <div className="border-b bg-green-50 dark:bg-green-950/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {labels.ownFarmSection}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {ownFarmAreas.length}
            </Badge>
          </div>
        </div>
        <div className="p-4">
          {ownFarmAreas.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.noAreas}</p>
          ) : (
            <div className="space-y-2">
              {ownFarmAreas.map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  crops={initialCrops}
                  clients={externalActiveClients}
                  labels={labels}
                  onFeedback={(msg) => {
                    showFeedback(msg);
                    router.refresh();
                  }}
                />
              ))}
            </div>
          )}
          <AddAreaButton
            prefilledIsOwnField={true}
            crops={initialCrops}
            clients={externalActiveClients}
            labels={labels}
            onSuccess={(msg) => {
              showFeedback(msg);
              router.refresh();
            }}
          />
        </div>
      </section>

      {/* Client Sections */}
      {filteredSections.length === 0 && !searchQuery.trim() ? null : (
        filteredSections.map((client) => (
          <ClientSection
            key={client.id}
            client={client}
            crops={initialCrops}
            activeClients={externalActiveClients}
            labels={labels}
            onFeedback={(msg) => {
              showFeedback(msg);
              router.refresh();
            }}
          />
        ))
      )}
    </div>
  );
}

// ─── Client Section (Collapsible) ────────────────────────────────────────────

function ClientSection({
  client,
  crops,
  activeClients,
  labels,
  onFeedback,
}: {
  client: ClientWithAreas;
  crops: Crop[];
  activeClients: { id: string; name: string; is_own_farm: boolean }[];
  labels: Labels;
  onFeedback: (msg: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <section className="rounded-lg border bg-card shadow-sm">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between border-b bg-orange-50 dark:bg-orange-950/30 px-4 py-3 cursor-pointer hover:bg-orange-100/50 dark:hover:bg-orange-950/50 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              )}
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                {client.name}
              </Badge>
              {client.name_en && (
                <span className="text-sm text-muted-foreground">{client.name_en}</span>
              )}
              <Badge variant="outline" className="text-xs">
                {client.areas.length}
              </Badge>
            </div>
            <ClientHeaderActions client={client} labels={labels} onFeedback={onFeedback} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4">
            {/* Client details */}
            <ClientDetails client={client} labels={labels} onFeedback={onFeedback} />

            {/* Areas */}
            {client.areas.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-3">{labels.noAreas}</p>
            ) : (
              <div className="space-y-2 mt-3">
                {client.areas.map((area) => (
                  <AreaCard
                    key={area.id}
                    area={area}
                    crops={crops}
                    clients={activeClients}
                    labels={labels}
                    onFeedback={onFeedback}
                  />
                ))}
              </div>
            )}

            <AddAreaButton
              prefilledIsOwnField={false}
              prefilledClientId={client.id}
              crops={crops}
              clients={activeClients}
              labels={labels}
              onSuccess={onFeedback}
            />
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

// ─── Client Details (inline info + alias management) ──────────────────────────

function ClientDetails({
  client,
  labels,
  onFeedback,
}: {
  client: Client;
  labels: Labels;
  onFeedback: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [newAlias, setNewAlias] = useState("");
  const [showAliasInput, setShowAliasInput] = useState(false);
  const [error, setError] = useState("");

  function handleAddAlias() {
    if (!newAlias.trim()) return;
    startTransition(async () => {
      const result = await addClientAlias(client.id, newAlias.trim());
      if (result.success) {
        setNewAlias("");
        setShowAliasInput(false);
        onFeedback(labels.clientUpdated);
      } else {
        setError(result.error);
      }
    });
  }

  function handleRemoveAlias(aliasId: string) {
    startTransition(async () => {
      const result = await removeClientAlias(aliasId);
      if (result.success) {
        onFeedback(labels.clientUpdated);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {client.phone && (
        <span className="text-muted-foreground">{labels.clientPhone}: {client.phone}</span>
      )}
      {client.notes && (
        <span className="text-muted-foreground">{labels.clientNotes}: {client.notes}</span>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {client.client_aliases.map((a) => (
          <Badge key={a.id} variant="secondary" className="gap-1">
            {a.alias}
            <button
              onClick={(e) => { e.stopPropagation(); handleRemoveAlias(a.id); }}
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
              onClick={(e) => e.stopPropagation()}
            />
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleAddAlias(); }} disabled={isPending}>
              +
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); setShowAliasInput(false); setNewAlias(""); }}>
              ×
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={(e) => { e.stopPropagation(); setShowAliasInput(true); }}
          >
            {labels.clientAddAlias}
          </Button>
        )}
      </div>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}

// ─── Client Header Actions (edit + archive buttons) ────────────────────────────

function ClientHeaderActions({
  client,
  labels,
  onFeedback,
}: {
  client: Client;
  labels: Labels;
  onFeedback: (msg: string) => void;
}) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="outline" onClick={() => setShowEditDialog(true)}>
        {labels.editClient}
      </Button>
      {!client.is_active ? (
        <Badge variant="secondary">{labels.archiveClient}</Badge>
      ) : (
        <Button size="sm" variant="destructive" onClick={() => setShowArchiveDialog(true)}>
          {labels.archiveClient}
        </Button>
      )}

      <EditClientDialog
        client={client}
        labels={labels}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={onFeedback}
      />

      <ArchiveClientDialog
        client={client}
        labels={labels}
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        onSuccess={onFeedback}
      />
    </div>
  );
}

// ─── Edit Client Dialog ──────────────────────────────────────────────────────

function EditClientDialog({
  client,
  labels,
  open,
  onOpenChange,
  onSuccess,
}: {
  client: Client;
  labels: Labels;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (msg: string) => void;
}) {
  const [editData, setEditData] = useState({
    name: client.name,
    name_en: client.name_en ?? "",
    phone: client.phone ?? "",
    notes: client.notes ?? "",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    setError("");
    if (!editData.name.trim()) {
      setError(labels.validationClientNameRequired);
      return;
    }
    startTransition(async () => {
      const result = await updateClient(client.id, {
        name: editData.name.trim(),
        name_en: editData.name_en.trim() || undefined,
        phone: editData.phone.trim() || undefined,
        notes: editData.notes.trim() || undefined,
        rate_per_dunam: null,
        rate_per_hour: null,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess(labels.clientUpdated);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.editClient}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{labels.clientName}</Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>{labels.clientNameEn}</Label>
              <Input
                value={editData.name_en}
                onChange={(e) => setEditData({ ...editData, name_en: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>{labels.clientPhone}</Label>
            <Input
              value={editData.phone}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>{labels.clientNotes}</Label>
            <Input
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {labels.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? labels.saving : labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Archive Client Dialog ──────────────────────────────────────────────────

function ArchiveClientDialog({
  client,
  labels,
  open,
  onOpenChange,
  onSuccess,
}: {
  client: Client;
  labels: Labels;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveClient(client.id);
      if (result.success) {
        onOpenChange(false);
        onSuccess(labels.clientArchived);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {labels.archiveClientConfirm.replace("__NAME__", client.name)}
          </DialogTitle>
          <DialogDescription>{labels.archiveClientDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {labels.cancel}
          </Button>
          <Button variant="destructive" onClick={handleArchive} disabled={isPending}>
            {isPending ? labels.saving : labels.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Client Form ─────────────────────────────────────────────────────

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
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError("");
    if (!name.trim()) {
      setError(labels.validationClientNameRequired);
      return;
    }
    startTransition(async () => {
      const result = await createClientAction({
        name: name.trim(),
        name_en: nameEn.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        rate_per_dunam: null,
        rate_per_hour: null,
      });
      if (result.success) {
        onSuccess(labels.clientCreated);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm max-w-lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{labels.clientName}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>{labels.clientNameEn}</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label>{labels.clientPhone}</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>{labels.clientNotes}</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
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

// ─── Area Card ──────────────────────────────────────────────────────────────

function AreaCard({
  area,
  crops,
  clients,
  labels,
  onFeedback,
}: {
  area: Area;
  crops: Crop[];
  clients: { id: string; name: string; is_own_farm: boolean }[];
  labels: Labels;
  onFeedback: (msg: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [editData, setEditData] = useState({
    name: area.name,
    crop_id: area.crop_id,
    is_own_field: area.is_own_field,
    client_id: area.client_id,
    total_area_dunam: area.total_area_dunam?.toString() ?? "",
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [newAlias, setNewAlias] = useState("");
  const [showAliasInput, setShowAliasInput] = useState(false);

  function handleSave() {
    setError("");
    const dunam = editData.total_area_dunam.trim()
      ? parseFloat(editData.total_area_dunam)
      : null;
    startTransition(async () => {
      const result = await updateArea(area.id, {
        name: editData.name,
        crop_id: editData.crop_id,
        is_own_field: editData.is_own_field,
        client_id: editData.is_own_field ? undefined : editData.client_id || undefined,
        total_area_dunam: dunam,
      });
      if (result.success) {
        setIsEditing(false);
        onFeedback(labels.areaUpdated);
      } else {
        setError(result.error);
      }
    });
  }

  function handleCancelEdit() {
    setEditData({
      name: area.name,
      crop_id: area.crop_id,
      is_own_field: area.is_own_field,
      client_id: area.client_id,
      total_area_dunam: area.total_area_dunam?.toString() ?? "",
    });
    setError("");
    setIsEditing(false);
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveArea(area.id);
      if (result.success) {
        setShowArchiveDialog(false);
        onFeedback(labels.areaArchived);
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
      <div className="rounded-md border bg-muted/20 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">{labels.areaName}</Label>
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{labels.areaCrop}</Label>
            <Select
              value={editData.crop_id}
              onValueChange={(v) => setEditData({ ...editData, crop_id: v })}
            >
              <SelectTrigger>
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
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editData.is_own_field}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  is_own_field: e.target.checked,
                  client_id: e.target.checked ? OWN_FARM_CLIENT_ID : editData.client_id,
                })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">{labels.ownField}</span>
          </label>
          {!editData.is_own_field && (
            <Select
              value={editData.client_id}
              onValueChange={(v) => setEditData({ ...editData, client_id: v })}
            >
              <SelectTrigger className="max-w-[180px]">
                <SelectValue placeholder={labels.selectClient} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{labels.totalAreaDunam}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.1"
              value={editData.total_area_dunam}
              onChange={(e) => setEditData({ ...editData, total_area_dunam: e.target.value })}
              className="max-w-[140px]"
            />
            <span className="text-xs text-muted-foreground">{labels.dunamUnit}</span>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? labels.saving : labels.save}
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={isPending}>
            {labels.cancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-md border bg-background px-4 py-3 transition-colors hover:bg-muted/30">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-medium">{area.name}</span>
          <Badge variant="outline" className="shrink-0">{area.crops?.name ?? "—"}</Badge>
          {area.total_area_dunam != null && (
            <span className="text-xs text-muted-foreground shrink-0">
              {area.total_area_dunam} {labels.dunamUnit}
            </span>
          )}
          {/* Aliases */}
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
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            {labels.editArea}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setShowArchiveDialog(true)}>
            {labels.archiveArea}
          </Button>
        </div>
      </div>

      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {labels.archiveAreaConfirm.replace("__NAME__", area.name)}
            </DialogTitle>
            <DialogDescription>{labels.archiveAreaDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)} disabled={isPending}>
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

// ─── Add Area Button (contextual) ───────────────────────────────────────────

function AddAreaButton({
  prefilledIsOwnField,
  prefilledClientId,
  crops: initialCrops,
  clients,
  labels,
  onSuccess,
}: {
  prefilledIsOwnField: boolean;
  prefilledClientId?: string;
  crops: Crop[];
  clients: { id: string; name: string; is_own_farm: boolean }[];
  labels: Labels;
  onSuccess: (msg: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [cropId, setCropId] = useState("");
  const [alias, setAlias] = useState("");
  const [totalAreaDunam, setTotalAreaDunam] = useState("");
  const [isOwnField, setIsOwnField] = useState(prefilledIsOwnField);
  const [clientId, setClientId] = useState(prefilledClientId ?? "");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showNewCrop, setShowNewCrop] = useState(initialCrops.length === 0);
  const [newCropName, setNewCropName] = useState("");
  const [localCrops, setLocalCrops] = useState(initialCrops);

  function resetForm() {
    setName("");
    setCropId("");
    setAlias("");
    setTotalAreaDunam("");
    setIsOwnField(prefilledIsOwnField);
    setClientId(prefilledClientId ?? "");
    setError("");
    setShowForm(false);
  }

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
      setError(labels.validationAreaNameRequired);
      return;
    }
    if (!cropId) {
      setError(labels.validationCropRequired);
      return;
    }
    const dunam = totalAreaDunam.trim() ? parseFloat(totalAreaDunam) : null;
    startTransition(async () => {
      const result = await createArea({
        name: name.trim(),
        crop_id: cropId,
        alias: alias.trim() || undefined,
        is_own_field: isOwnField,
        client_id: isOwnField ? undefined : clientId || undefined,
        total_area_dunam: dunam,
      });
      if (result.success) {
        resetForm();
        onSuccess(labels.areaCreated);
      } else {
        setError(result.error);
      }
    });
  }

  if (!showForm) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 text-muted-foreground"
        onClick={() => setShowForm(true)}
      >
        <Plus className="me-1 h-4 w-4" />
        {labels.addArea}
      </Button>
    );
  }

  return (
    <div className="mt-3 rounded-md border bg-muted/10 p-4 max-w-md space-y-3">
      <div>
        <Label>{labels.areaName}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label>{labels.areaCrop}</Label>
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
      {/* Only show ownership toggle when not pre-filled */}
      {prefilledClientId === undefined && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isOwnField}
              onChange={(e) => {
                setIsOwnField(e.target.checked);
                if (e.target.checked) setClientId("");
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">{labels.ownField}</span>
          </label>
        </div>
      )}
      {!isOwnField && !prefilledClientId && (
        <div>
          <Label>{labels.selectClient}</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={labels.selectClient} />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label>{labels.totalAreaDunam}</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="0.1"
            value={totalAreaDunam}
            onChange={(e) => setTotalAreaDunam(e.target.value)}
            className="max-w-[140px]"
          />
          <span className="text-sm text-muted-foreground">{labels.dunamUnit}</span>
        </div>
      </div>
      <div>
        <Label>{labels.addAlias}</Label>
        <Input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          className="mt-1"
          placeholder={labels.areaAliases}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? labels.saving : labels.save}
        </Button>
        <Button size="sm" variant="outline" onClick={resetForm} disabled={isPending}>
          {labels.cancel}
        </Button>
      </div>
    </div>
  );
}
