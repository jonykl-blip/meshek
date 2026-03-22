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

### `audit_log.record_id` is UUID — never pass arbitrary strings

**Date:** 2026-03-11
**Symptom:** `invalid input syntax for type uuid: "2026-03-01--2026-03-11"` when exporting payroll CSV.
**Root cause:** `exportPayrollCsv` passed a date-range string as `recordId` to `logAudit()`, but `audit_log.record_id` is a UUID column. Unit tests mocked the audit insert and never hit a real DB, so the type mismatch was invisible.
**Fix:** Use `crypto.randomUUID()` for audit events that don't reference an existing DB record. The contextual data (date range, worker count, etc.) goes in `after_json`.
**Rule:** `logAudit({ recordId })` must always be a valid UUID. For events without a natural record ID (exports, bulk operations), generate one with `crypto.randomUUID()`.

---

## n8n Workflow V2 Debugging (2026-03-22)

### n8n connections use node names, not IDs

**Date:** 2026-03-22
**Symptom:** `"Destination node not found"` at runtime (execution #304). Workflow saved without error.
**Root cause:** Python script that generated V2 used node IDs (e.g., `v2-lookup-work-type-001`) in the `connections` object. n8n connections reference nodes by **name** (e.g., `"Lookup Work Type"`). n8n silently accepts invalid IDs on save but crashes at execution time.
**Fix:** Rewrote all connection targets to use node names.
**Rule:** When programmatically editing n8n workflow JSON, always use the node `name` field in connections, never the `id` field.

### `$input.all()` is forbidden in `runOnceForEachItem` mode

**Date:** 2026-03-22
**Symptom:** `"Can't use .all() here [line 2, for item 0]"` in Lookup Work Type node (execution #305).
**Root cause:** Code node set to `runOnceForEachItem` but code used `const items = $input.all()` which is only available in `runOnceForAllItems` mode.
**Fix:** Changed to `const item = $input.item` and `return item`.
**Rule:** In n8n Code nodes with `runOnceForEachItem`: use `$input.item` and `return item`. Reserve `$input.all()` and `return items` for `runOnceForAllItems` mode.

### `$parent.json` doesn't work after Split Out node

**Date:** 2026-03-22
**Symptom:** `סוג_עבודה` and `לקוח` were null in Prepare Data despite being correctly extracted by GPT (execution #307 — silent data loss, no error).
**Root cause:** Split Out splits `message.content['פועלים_ודיווחים']` array items. Sibling fields (`סוג_עבודה`, `לקוח`) at the same level are lost. The `$parent.json.סוג_עבודה` expression returns null because `$parent` doesn't preserve the pre-split context in n8n 2.9.3.
**Fix:** Changed to direct node reference: `$('חילוץ פועלים ושטחים').first().json.message.content['סוג_עבודה']`.
**Rule:** Never rely on `$parent.json` after a Split Out node. Use direct node references (`$('NodeName').first().json.path`) to access data from upstream nodes.