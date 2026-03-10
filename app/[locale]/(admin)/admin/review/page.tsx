import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getPendingRecords,
  getActiveWorkers,
  getActiveAreas,
} from "@/app/actions/attendance";
import { ReviewQueue } from "./review-queue";

export function generateStaticParams() {
  return [{ locale: "he" }, { locale: "th" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.review");
  return { title: t("title") };
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.review");

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["owner", "admin"].includes(callerProfile.role)) {
    redirect(`/${locale}/dashboard`);
  }

  const [result, workersResult, areasResult] = await Promise.all([
    getPendingRecords(),
    getActiveWorkers(),
    getActiveAreas(),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      {result.success ? (
        <ReviewQueue
          records={result.data}
          workers={workersResult.success ? workersResult.data : []}
          areas={areasResult.success ? areasResult.data : []}
          labels={{
            emptyState: t("emptyState"),
            worker: t("worker"),
            area: t("area"),
            date: t("date"),
            hours: t("hours"),
            transcript: t("transcript"),
            unrecognized: t("unrecognized"),
            play: t("play"),
            pause: t("pause"),
            expand: t("expand"),
            collapse: t("collapse"),
            matchExistingWorker: t("matchExistingWorker"),
            matchExistingArea: t("matchExistingArea"),
            newWorker: t("newWorker"),
            searchWorker: t("searchWorker"),
            searchArea: t("searchArea"),
            confirm: t("confirm"),
            cancel: t("cancel"),
            name: t("name"),
            hourlyRate: t("hourlyRate"),
            language: t("language"),
            langHe: t("langHe"),
            langTh: t("langTh"),
            langEn: t("langEn"),
            saving: t("saving"),
            resolved: t("resolved"),
            workerCreated: t("workerCreated"),
            approve: t("approve"),
            reject: t("reject"),
            edit: t("edit"),
            editRecord: t("editRecord"),
            rejectConfirm: t("rejectConfirm"),
            rejectConfirmBtn: t("rejectConfirmBtn"),
            approved: t("approved"),
            rejected: t("rejected"),
            edited: t("edited"),
            editHours: t("editHours"),
            editArea: t("editArea"),
            cannotApproveUnresolved: t("cannotApproveUnresolved"),
          }}
        />
      ) : (
        <p className="text-sm text-red-600">{t("loadError")}</p>
      )}
    </main>
  );
}
