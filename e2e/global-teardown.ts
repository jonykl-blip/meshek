import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";

/**
 * Playwright global teardown — removes test records created by e2e specs.
 * Patterns match the names used in clients-crud, work-types-crud, and settings specs.
 */
export default async function globalTeardown() {
  // Load .env.local for Supabase credentials
  const dotenv = await import("dotenv");
  dotenv.config({ path: resolve(__dirname, "../.env.local") });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[teardown] Missing Supabase env vars — skipping cleanup");
    return;
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete in FK-safe order
  await supabase.from("area_aliases").delete().like("alias", "כינוי-שטח-%");
  await supabase.from("client_aliases").delete().like("alias", "כינוי-%");

  // Delete test areas linked to test clients
  const { data: testClients } = await supabase
    .from("clients")
    .select("id")
    .or("name.like.לקוח-בדיקה-%,name.like.לקוח-למחיקה-%");

  if (testClients && testClients.length > 0) {
    const ids = testClients.map((c) => c.id);
    await supabase.from("areas").delete().in("client_id", ids);
  }

  await supabase
    .from("clients")
    .delete()
    .or("name.like.לקוח-בדיקה-%,name.like.לקוח-למחיקה-%");

  await supabase
    .from("work_types")
    .delete()
    .or(
      "name_he.like.סוג-בדיקה-%,name_he.like.סוג-qa-%,name_he.like.סוג-archive-%",
    );

  await supabase.from("materials").delete().like("name_he", "חומר-qa-%");

  console.log("[teardown] Test data cleanup complete");
}
