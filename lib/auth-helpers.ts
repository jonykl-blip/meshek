import { createClient } from "@/lib/supabase/server";

export type ActionResult<T> =
  | { success: true; data: T; warning?: string }
  | { success: false; error: string };

export async function verifyAdminCaller(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, error: "לא מאומת" } as const;
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["owner", "admin"].includes(callerProfile.role)) {
    return { user: null, error: "אין הרשאה" } as const;
  }

  return { user, error: null } as const;
}

export async function verifyDashboardCaller(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, error: "לא מחובר" } as const;
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["owner", "admin", "manager"].includes(callerProfile.role)) {
    return { user: null, role: null, error: "אין הרשאות צפייה" } as const;
  }

  return { user, role: callerProfile.role as "owner" | "admin" | "manager", error: null } as const;
}