"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createWorkerProfile,
  updateWorkerProfile,
  archiveWorkerProfile,
  addProfileAlias,
  removeProfileAlias,
} from "@/app/actions/workers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { getInitials } from "@/lib/format";
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

interface Profile {
  id: string;
  full_name: string;
  role: string;
  language_pref: string;
  telegram_id: string | null;
  hourly_rate: number | null;
  is_active: boolean;
  profile_aliases: { id: string; alias: string }[];
}

interface Labels {
  name: string;
  role: string;
  language: string;
  telegramId: string;
  save: string;
  saving: string;
  noTelegramId: string;
  saved: string;
  addWorker: string;
  editWorker: string;
  archiveWorker: string;
  hourlyRate: string;
  cancel: string;
  archiveConfirm: string;
  archiveDescription: string;
  confirm: string;
  created: string;
  updated: string;
  archived: string;
  actions: string;
  roleWorker: string;
  roleManager: string;
  roleAdmin: string;
  roleOwner: string;
  langHe: string;
  langTh: string;
  langEn: string;
  noWorkers: string;
  email: string;
  emailPlaceholder: string;
  inviteSent: string;
  aliases: string;
  addAlias: string;
  aliasPlaceholder: string;
  aliasAdded: string;
  aliasRemoved: string;
  validationNameRequired: string;
  validationRatePositive: string;
  validationTelegramNumeric: string;
  validationEmailRequired: string;
  validationEmailInvalid: string;
}

const ROLE_MAP: Record<string, keyof Labels> = {
  worker: "roleWorker",
  manager: "roleManager",
  admin: "roleAdmin",
  owner: "roleOwner",
};

const LANG_MAP: Record<string, keyof Labels> = {
  he: "langHe",
  th: "langTh",
  en: "langEn",
};

export function WorkersTable({
  profiles,
  emailMap,
  labels,
}: {
  profiles: Profile[];
  emailMap: Record<string, string>;
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

  function getRoleLabel(role: string) {
    const key = ROLE_MAP[role];
    return key ? (labels[key] as string) : role;
  }

  function getLangLabel(lang: string) {
    const key = LANG_MAP[lang];
    return key ? (labels[key] as string) : lang;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          {labels.addWorker}
        </Button>
        {feedbackMsg && (
          <span className="text-sm text-green-600">{feedbackMsg}</span>
        )}
      </div>

      {showCreateForm && (
        <CreateWorkerForm
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
              <th className="px-4 py-3 text-start font-medium">{labels.role}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.email}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.hourlyRate}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.language}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.telegramId}</th>
              <th className="px-4 py-3 text-start font-medium">{labels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  {labels.noWorkers}
                </td>
              </tr>
            ) : (
              profiles.map((profile) => (
                <WorkerRow
                  key={profile.id}
                  profile={profile}
                  email={emailMap[profile.id] ?? ""}
                  labels={labels}
                  getRoleLabel={getRoleLabel}
                  getLangLabel={getLangLabel}
                  onUpdated={(msg) => {
                    showFeedback(msg ?? labels.updated);
                    router.refresh();
                  }}
                  onArchived={() => {
                    showFeedback(labels.archived);
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

function CreateWorkerForm({
  labels,
  onClose,
  onSuccess,
}: {
  labels: Labels;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [languagePref, setLanguagePref] = useState("he");
  const [role, setRole] = useState("worker");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const isStaffRole = role === "admin" || role === "manager";

  function handleSubmit() {
    setError("");
    const rate = hourlyRate.trim() ? parseFloat(hourlyRate) : undefined;
    if (!name.trim()) {
      setError(labels.validationNameRequired);
      return;
    }
    if (isStaffRole && !email.trim()) {
      setError(labels.validationEmailRequired);
      return;
    }
    if (rate !== undefined && (isNaN(rate) || rate <= 0)) {
      setError(labels.validationRatePositive);
      return;
    }
    startTransition(async () => {
      const result = await createWorkerProfile({
        full_name: name.trim(),
        email: email.trim() || undefined,
        telegram_id: telegramId.trim() || undefined,
        hourly_rate: rate,
        language_pref: languagePref,
        role,
      });
      if (result.success) {
        onSuccess(isStaffRole ? labels.inviteSent : labels.created);
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
          <Label>{labels.role}</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="worker">{labels.roleWorker}</SelectItem>
              <SelectItem value="manager">{labels.roleManager}</SelectItem>
              <SelectItem value="admin">{labels.roleAdmin}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isStaffRole && (
          <div>
            <Label>{labels.email}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={labels.emailPlaceholder}
              className="mt-1"
              dir="ltr"
            />
          </div>
        )}
        <div>
          <Label>{labels.telegramId}</Label>
          <Input
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            placeholder={labels.noTelegramId}
            className="mt-1 font-mono"
            dir="ltr"
          />
        </div>
        <div>
          <Label>{labels.hourlyRate}</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="mt-1"
            dir="ltr"
          />
        </div>
        <div>
          <Label>{labels.language}</Label>
          <Select value={languagePref} onValueChange={setLanguagePref}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="he">{labels.langHe}</SelectItem>
              <SelectItem value="th">{labels.langTh}</SelectItem>
              <SelectItem value="en">{labels.langEn}</SelectItem>
            </SelectContent>
          </Select>
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

function WorkerRow({
  profile,
  email,
  labels,
  getRoleLabel,
  getLangLabel,
  onUpdated,
  onArchived,
}: {
  profile: Profile;
  email: string;
  labels: Labels;
  getRoleLabel: (role: string) => string;
  getLangLabel: (lang: string) => string;
  onUpdated: (msg?: string) => void;
  onArchived: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [editData, setEditData] = useState({
    full_name: profile.full_name,
    email,
    telegram_id: profile.telegram_id ?? "",
    hourly_rate: String(profile.hourly_rate ?? ""),
    language_pref: profile.language_pref,
    role: profile.role,
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [newAlias, setNewAlias] = useState("");
  const [showAliasInput, setShowAliasInput] = useState(false);

  function handleAddAlias() {
    if (!newAlias.trim()) return;
    setError("");
    startTransition(async () => {
      const result = await addProfileAlias(profile.id, newAlias.trim());
      if (result.success) {
        setNewAlias("");
        setShowAliasInput(false);
        onUpdated(labels.aliasAdded);
      } else {
        setError(result.error);
      }
    });
  }

  function handleRemoveAlias(aliasId: string) {
    setError("");
    startTransition(async () => {
      const result = await removeProfileAlias(aliasId);
      if (result.success) {
        onUpdated(labels.aliasRemoved);
      } else {
        setError(result.error);
      }
    });
  }

  function handleSave() {
    setError("");
    const rate = parseFloat(editData.hourly_rate);
    startTransition(async () => {
      const result = await updateWorkerProfile(profile.id, {
        full_name: editData.full_name,
        email: editData.email || undefined,
        telegram_id: editData.telegram_id,
        hourly_rate: isNaN(rate) ? undefined : rate,
        language_pref: editData.language_pref,
        role: editData.role,
      });
      if (result.success) {
        setIsEditing(false);
        onUpdated();
      } else {
        setError(result.error);
      }
    });
  }

  function handleCancelEdit() {
    setEditData({
      full_name: profile.full_name,
      email,
      telegram_id: profile.telegram_id ?? "",
      hourly_rate: String(profile.hourly_rate ?? ""),
      language_pref: profile.language_pref,
      role: profile.role,
    });
    setError("");
    setIsEditing(false);
  }

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveWorkerProfile(profile.id);
      if (result.success) {
        setShowArchiveDialog(false);
        onArchived();
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
            value={editData.full_name}
            onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
            className="max-w-[200px]"
          />
        </td>
        <td className="px-4 py-3">
          <Select
            value={editData.role}
            onValueChange={(v) => setEditData({ ...editData, role: v })}
          >
            <SelectTrigger className="max-w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="worker">{labels.roleWorker}</SelectItem>
              <SelectItem value="manager">{labels.roleManager}</SelectItem>
              <SelectItem value="admin">{labels.roleAdmin}</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3">
          {editData.role === "admin" || editData.role === "manager" ? (
            <Input
              type="email"
              value={editData.email}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              placeholder={labels.emailPlaceholder}
              className="max-w-[200px]"
              dir="ltr"
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={editData.hourly_rate}
            onChange={(e) => setEditData({ ...editData, hourly_rate: e.target.value })}
            className="max-w-[100px]"
            dir="ltr"
          />
        </td>
        <td className="px-4 py-3">
          <Select
            value={editData.language_pref}
            onValueChange={(v) => setEditData({ ...editData, language_pref: v })}
          >
            <SelectTrigger className="max-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="he">{labels.langHe}</SelectItem>
              <SelectItem value="th">{labels.langTh}</SelectItem>
              <SelectItem value="en">{labels.langEn}</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="px-4 py-3">
          <Input
            value={editData.telegram_id}
            onChange={(e) =>
              setEditData({ ...editData, telegram_id: e.target.value })
            }
            placeholder={labels.noTelegramId}
            className="max-w-[150px] font-mono text-sm"
            dir="ltr"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isPending}>
                {isPending ? labels.saving : labels.save}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isPending}
              >
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
      <tr className="border-b last:border-b-0">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#c56a2e]">
              <span className="text-xs font-bold text-white">{getInitials(profile.full_name)}</span>
            </div>
            <span className="text-base font-semibold">{profile.full_name}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className={
            profile.role === "owner" ? "bg-primary/15 text-primary border-primary/30" :
            profile.role === "admin" ? "bg-accent/15 text-accent border-accent/30" :
            profile.role === "manager" ? "bg-amber-100 text-amber-800 border-amber-200" :
            "bg-muted text-muted-foreground border-border"
          }>{getRoleLabel(profile.role)}</Badge>
        </td>
        <td className="px-4 py-3 text-sm" dir="ltr">
          {email || "—"}
        </td>
        <td className="px-4 py-3" dir="ltr">
          {profile.hourly_rate != null ? `₪${Number(profile.hourly_rate).toFixed(2)}` : "—"}
        </td>
        <td className="px-4 py-3">{getLangLabel(profile.language_pref)}</td>
        <td className="px-4 py-3 font-mono text-sm" dir="ltr">
          {profile.telegram_id ?? labels.noTelegramId}
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              {labels.editWorker}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowArchiveDialog(true)}
            >
              {labels.archiveWorker}
            </Button>
          </div>
        </td>
      </tr>
      <tr className="border-b last:border-b-0">
        <td colSpan={7} className="px-4 pb-3 pt-0">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-muted-foreground">{labels.aliases}:</span>
            {profile.profile_aliases.map((a) => (
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
                  placeholder={labels.aliasPlaceholder}
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
      </tr>
      <ArchiveDialog
        open={showArchiveDialog}
        onOpenChange={setShowArchiveDialog}
        workerName={profile.full_name}
        labels={labels}
        isPending={isPending}
        onConfirm={handleArchive}
      />
    </>
  );
}

function ArchiveDialog({
  open,
  onOpenChange,
  workerName,
  labels,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerName: string;
  labels: Labels;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {labels.archiveConfirm.replace("__NAME__", workerName)}
          </DialogTitle>
          <DialogDescription>{labels.archiveDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {labels.cancel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? labels.saving : labels.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
