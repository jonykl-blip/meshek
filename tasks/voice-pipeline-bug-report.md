# Voice Pipeline Bug Report — QA 2026-03-22

**Tester:** Jonny | **Environment:** Production | **Pipeline:** n8n bot-workflow → GPT-4o entity extraction

## Summary

Scripts 1 and 3 mostly passed. Scripts 2, 4, and 5 have significant failures. Two root causes account for nearly all bugs.

**Scorecard:** 8/8 pass (Script 1), 6/7 pass (Script 2), 5/8 pass (Script 3), 6/8 pass (Script 4), 3/11 pass (Script 5)

---

## Bug 1 (Critical): Work type bleeds across segments — single `סוג_עבודה` in extraction schema

**Affected:** Scripts 2, 4, 5

**Root cause:** The GPT-4o entity extraction prompt defines `סוג_עבודה` as a **single top-level field** in the JSON schema, not per-worker. When a voice note contains multiple work activities with different work types, GPT-4o picks one (typically the first or most prominent) and applies it to the entire report. After the Split+Prepare step, all workers inherit that single work type.

**Evidence:**
| Script | Expected | Got | Pattern |
|--------|----------|-----|---------|
| 2 | קאי → השקיה, קון → עיבוד קרקע | Both → עיבוד קרקע | Last verb wins |
| 4 | עידן/יוגב → ריסוס, קאי/קון → זריעה | All → ריסוס | First verb wins |
| 5 | 4 different work types across 5 workers | All → ריסוס | First verb wins |

**Fix:** Move `סוג_עבודה` into each `פועלים_ודיווחים` entry. The per-worker JSON object should be:

```json
{
  "שם_פועל": "...",
  "שעות_עבודה": "...",
  "מיקום_עבודה_ספציפי": "...",
  "סוג_עבודה": "...",
  "לקוח": "..."
}
```

This also applies to `לקוח` — in Script 4, own-farm workers and contractor workers appear in the same voice note with different clients, so `לקוח` should also be per-worker (or per-segment).

**Suggested new schema:**
```json
{
  "פועלים_ודיווחים": [
    {
      "שם_פועל": "שם הפועל",
      "שעות_עבודה": 8,
      "מיקום_עבודה": "שם השטח",
      "סוג_עבודה": "שם עצם מהרשימה, null אם לא צוין",
      "לקוח": "שם הלקוח, null אם עבודה עצמית / שלנו",
      "דונם": null
    }
  ]
}
```

**Impact:** This is the single biggest issue — it causes failures whenever a voice note describes more than one type of work, which is the common case for daily reports.

---

## Bug 2 (Medium): "זיתים שלנו" resolves to קיבוץ יפעת instead of own-farm

**Affected:** Script 3 (אורי's record)

**What happened:** The transcript said "אורי קטף בזיתים שלנו" — "שלנו" explicitly means own-farm. GPT-4o likely extracted `לקוח: null` correctly, but the downstream **area lookup** matched the area name "זיתים" to the קיבוץ יפעת area (which also has an area called "זיתים"), rather than the own-farm "זיתים" area.

**Root cause:** The area alias lookup query doesn't account for ownership. When the same area name exists under both own-farm and a client, the query returns the first match (likely by ID order), which may be the client's area.

**Fix options:**
1. In the area lookup node, if `לקוח` is null (own-farm), filter area matches to `is_own_field = true` first
2. If `לקוח` is a specific client, filter to areas belonging to that client
3. Add "שלנו" / "של המשק" as area alias suffixes that force own-farm resolution

---

## Bug 3 (Medium): Hebrew number "ארבע" confused with adjacent area name "חיטה 3"

**Affected:** Script 5 (קון's record)

**What happened:** The phrase "חיטה 3 ארבע שעות" was parsed as 3.4 hours instead of area="חיטה 3" + hours=4. The digit "3" in the area name and the Hebrew word "ארבע" (4) immediately following it caused GPT-4o to merge them.

**Fix:** Add an instruction to the extraction prompt:
```
הערה: שמות שטחים יכולים לכלול מספרים (לדוגמה: "חיטה 3", "גוש א").
כאשר מספר מופיע כחלק משם שטח, אל תערבב אותו עם שעות העבודה.
```

Also add the known area names to the extraction prompt context (they're already in the static lists, but emphasizing number-containing names would help).

---

## Bug 4 (Low): קון's name not extracted correctly in Script 5

**Affected:** Script 5

**What happened:** קון's worker name was not matched correctly in the stress test. Likely a Whisper transcription error — "קון" is a short Thai-origin name that may be transcribed as a Hebrew word.

**Fix:** Ensure "קון" appears in the worker name list hints passed to Whisper. The phonetic correction rules in the GPT-4o prompt should also list "קון" as a known name to watch for.

---

## Bug 5 (Validation): Confirm materials and dunams flow through the full pipeline

**Affected:** Entire pipeline — extraction → DB insert → review queue → contractor reports

**What to validate:** The extraction prompt already includes `דונם` in the schema, and there's a materials list fetched in the static lists node. Before writing new test scripts, the developer should verify end-to-end that:

1. **Extraction:** GPT-4o prompt schema includes `דונם` and `חומרים` (materials) fields — confirm they exist and are at the correct level (per-worker after Bug 1 fix)
2. **DB insert:** The `attendance_logs` insert node maps `דונם` → `dunam_covered` column and `חומרים` → the appropriate column (check if a `materials` or `material_id` column exists, or if materials need a join table)
3. **Telegram confirmation:** The confirmation message shown to the reporter includes dunams and materials when present
4. **Review queue:** Dunams and materials values are displayed on pending record cards
5. **Contractor reports:** The detail table already has "דונם" and "חומרים" columns — verify they render data correctly

**Why this matters:** Scripts 6–9 test dunams, and we want to add materials to the test scripts. If the pipeline doesn't wire these fields all the way through, testing them won't help — we need to confirm the plumbing first.

**Validation results (2026-03-22):**
- `דונם` (dunams): Fully wired. Extracted → Prepare Data → Insert (`dunam_covered` column) → Confirmation → Review queue → Contractor reports.
- `חומרים` (materials): **Gap found.** DB has `materials` table + `work_log_materials` join table, but:
  - Extraction prompt: Added `חומרים` field per-worker (Bug 1 fix)
  - Fetch Static Lists: Added `materials_list` output (Bug 5 fix)
  - Prepare Data: Added `חומרים` field mapping (Bug 5 fix)
  - **Missing:** Insert node does NOT write materials to `work_log_materials` join table yet. The Insert node writes to `attendance_logs` which has no materials column — materials go through a join table. A "Lookup Material" node + "Insert Work Log Material" node are needed after the Insert Attendance Log step.
  - **Missing:** Confirmation message doesn't display materials yet.
  - **Missing:** Review queue doesn't display or edit materials yet.
- **Status:** Extraction and static lists are now wired. DB insert and UI display for materials need a follow-up story.

---

## Bug 6 (Medium): Review dashboard edit form missing work type field

**Affected:** Review queue (`/admin/review`) — edit mode on any record

**What happened:** When editing a pending record in the review queue, the edit form only allows changing **hours** and **area**. If the worker name is unresolved, it also shows a name field. But there is no way to edit or correct the **work type** (`סוג_עבודה`). Given that Bug 1 causes frequent work type errors, the manager needs to be able to fix these manually before approving.

**Fix:** Add a work type dropdown (populated from the `work_types` table) to the review record edit form, alongside the existing hours and area fields. It should show the current work type value and allow changing it.

---

## Bug 6 (UX): Area display should include client name for context

**Affected:** Review queue (`/admin/review`) — both view and edit modes

**What happened:** Area names like "זיתים" or "גוש א" appear without their parent client, making it hard to tell which "זיתים" a record refers to (own-farm vs קיבוץ יפעת). The manager has to guess or cross-reference.

**Fix:** Display areas as `"שם שטח — שם לקוח"` format, e.g.:
- `זיתים — קיבוץ יפעת`
- `זיתים — שטחי המשק`
- `חלקה א — גדש העמק`

Apply this in:
1. **View mode** — the area badge/label on each record card
2. **Edit mode** — the area dropdown options

---

## Priority Order

1. **Bug 1** — Schema redesign (critical, affects all multi-activity reports)
2. **Bug 5** — Validate materials + dunams pipeline end-to-end (validation, before QA round 2)
3. **Bug 6** — Add work type edit to review form (medium, needed to correct Bug 1 errors until fixed)
4. **Bug 7** — Show client alongside area name (medium UX, reduces confusion for duplicate area names)
5. **Bug 2** — Area ownership filtering (medium, affects shared area names)
6. **Bug 3** — Number-in-area-name disambiguation (medium, edge case but common for this farm)
7. **Bug 4** — Worker name hint (low, can be mitigated with alias)

---

## Additional Test Scripts (Round 2 — after fixes)

After Bug 1 is fixed, re-run Scripts 2, 4, 5. Then run these additional scripts that also test **dunam extraction**:

### Script 6 — Dunam extraction, single worker

> "עידן ריסס 30 דונם בחלקה א׳ של גדש העמק, 6 שעות"

**Tests:** dunam extraction alongside hours, single worker
**Expected:** 1 record — עידן 6h, חלקה א׳, גדש העמק, ריסוס, 30 דונם

### Script 7 — Dunam + material, single worker

> "עידן ריסס 30 דונם בחלקה א׳ של גדש העמק עם דלק 6 שעות"

**Tests:** dunam + material extraction together, single worker
**Expected:** 1 record — עידן 6h, חלקה א׳, גדש העמק, ריסוס, 30 דונם, חומר=דלק

### Script 8 — Dunam + multiple workers, same area

> "אורי וקאי חרשו 45 דונם בגוש א׳ של יפעת, 8 שעות כל אחד"

**Tests:** dunam shared across workers, verb mapping (חרשו→עיבוד קרקע)
**Expected:** 2 records — אורי 8h + קאי 8h, גוש א׳, יפעת, עיבוד קרקע, 45 דונם

### Script 9 — Material without dunam, own farm

> "יוגב דישן בשקדים שלנו עם דשן 20-20-20, חמש שעות"

**Tests:** material extraction, own-farm, Hebrew number word (חמש→5), no dunam
**Expected:** 1 record — יוגב 5h, שקדים, own farm, דישון, null דונם, חומר=דשן 20-20-20

### Script 10 — Mixed dunams + materials + no dunams, two segments

> "עידן ריסס 25 דונם בשקדים שלנו עם קונפידור 5 שעות, ויוגב השקה בחיטה 3 שבע שעות"

**Tests:** one segment has dunams + material, other has neither; own-farm; Hebrew number word
**Expected:** 2 records — עידן 5h (שקדים, own farm, ריסוס, 25 דונם, חומר=קונפידור) + יוגב 7h (חיטה 3, own farm, השקיה, null דונם, null חומר)

### Script 11 — Dunams + materials + multiple work types + contractor (full stress)

> "קאי חרש 40 דונם בגוש א׳ של יפעת 8 שעות, ועידן ריסס 20 דונם בחלקה א׳ של גדש העמק עם רנדאפ 6 שעות"

**Tests:** different dunams per segment, different clients, different work types, material on one segment only (requires Bug 1 fix)
**Expected:** 2 records — קאי 8h (גוש א׳, יפעת, עיבוד קרקע, 40 דונם, null חומר) + עידן 6h (חלקה א׳, גדש העמק, ריסוס, 20 דונם, חומר=רנדאפ)
