"use client";

import { useState, useTransition } from "react";
import { bindTelegramId } from "@/app/actions/workers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Profile {
  id: string;
  full_name: string;
  role: string;
  language_pref: string;
  telegram_id: string | null;
  is_active: boolean;
}

interface WorkersTableProps {
  profiles: Profile[];
  labels: {
    name: string;
    role: string;
    language: string;
    telegramId: string;
    save: string;
    saving: string;
    noTelegramId: string;
    saved: string;
  };
}

export function WorkersTable({ profiles, labels }: WorkersTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-start font-medium">{labels.name}</th>
            <th className="px-4 py-3 text-start font-medium">{labels.role}</th>
            <th className="px-4 py-3 text-start font-medium">
              {labels.language}
            </th>
            <th className="px-4 py-3 text-start font-medium">
              {labels.telegramId}
            </th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <WorkerRow
              key={profile.id}
              profile={profile}
              labels={labels}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkerRow({
  profile,
  labels,
}: {
  profile: Profile;
  labels: WorkersTableProps["labels"];
}) {
  const [telegramId, setTelegramId] = useState(profile.telegram_id ?? "");
  const [savedTelegramId, setSavedTelegramId] = useState(profile.telegram_id ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasChanged = telegramId !== savedTelegramId;

  function handleSave() {
    startTransition(async () => {
      const result = await bindTelegramId(profile.id, telegramId);
      if (result.success) {
        setSavedTelegramId(telegramId);
        setStatus("saved");
        setErrorMsg("");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
        setErrorMsg(result.error);
      }
    });
  }

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-4 py-3 font-medium">{profile.full_name}</td>
      <td className="px-4 py-3">
        <Badge variant="outline">{profile.role}</Badge>
      </td>
      <td className="px-4 py-3">{profile.language_pref}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={telegramId}
            onChange={(e) => {
              setTelegramId(e.target.value);
              setStatus("idle");
              setErrorMsg("");
            }}
            placeholder={labels.noTelegramId}
            className="max-w-[180px] font-mono text-sm"
            dir="ltr"
          />
          {hasChanged && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
            >
              {isPending ? labels.saving : labels.save}
            </Button>
          )}
          {status === "saved" && (
            <span className="text-sm text-green-600">{labels.saved}</span>
          )}
          {status === "error" && (
            <span className="text-sm text-red-600">{errorMsg}</span>
          )}
        </div>
      </td>
    </tr>
  );
}
