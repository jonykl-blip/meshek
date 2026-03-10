# Lessons Learned

Recurring mistakes and corrective rules. Review during retrospectives.

---

## Epic 3 Retrospective Notes

### `export type` in `"use server"` files causes runtime ReferenceError

**Date:** 2026-03-10
**Symptom:** `ReferenceError: ActionResult is not defined` at runtime on `/admin/workers` page.
**Root cause:** `export type { ActionResult }` in `app/actions/workers.ts` (a `"use server"` module). Next.js expects all exports from server action files to be async functions. Type re-exports confuse the bundler — even though TypeScript erases them, the server action module proxy may try to reference them at runtime.
**Fix:** Removed the `export type { ActionResult }` re-export. The type is still imported and used within the file for annotations; it just shouldn't be re-exported from a `"use server"` module.
**Rule:** Never `export type` from `"use server"` files. Import types where needed directly from their source module (e.g., `@/lib/auth-helpers`). Check other action files (`areas.ts`, `equipment.ts`) for the same pattern.

### RLS policies must include `owner` role alongside `admin`

**Date:** 2026-03-10
**Symptom:** "new row violates row-level security policy" when owner user creates/updates crops, areas, area_aliases, or equipment.
**Root cause:** Original RLS migration (`20260308231755`) used `get_user_role() = 'admin'` for INSERT/UPDATE/DELETE on crops, areas, area_aliases, and equipment — excluding the `owner` role. The `verifyAdminCaller()` helper correctly checks for both `owner` and `admin`, but the database-level RLS only allowed `admin`.
**Fix:** Migration `20260311100000` drops and recreates all affected policies with `IN ('admin', 'owner')`.
**Rule:** When writing RLS policies for admin-managed tables, always use `IN ('admin', 'owner')` — never just `= 'admin'`. The `owner` role is a superset of `admin` in this system.

### Avoid `.single()` on Supabase queries with embedded one-to-many joins

**Date:** 2026-03-10
**Symptom:** "Cannot coerce the result to a single JSON object" when updating an area that has aliases.
**Root cause:** Using `.update().select("..., area_aliases(id, alias)").single()` — the embedded one-to-many join with `area_aliases` can cause PostgREST to fail to coerce the result.
**Fix:** Separate the mutation (`.update().select("flat columns").single()`) from the joined fetch (`.select("..., relations(...)").eq("id", id)` without `.single()`, then take `[0]`).
**Rule:** For Supabase mutations (insert/update) that need to return related data, do the mutation with flat columns + `.single()`, then fetch relations separately without `.single()`.