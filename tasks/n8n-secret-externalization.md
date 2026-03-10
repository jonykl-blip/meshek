# n8n Secret Externalization — Remediation Guide

**Date:** 2026-03-10
**Source:** Epic 2 retrospective action item
**Status:** Ready for implementation (changes must be made in n8n UI)

---

## Executive Summary

Two n8n workflows contain hardcoded secrets across **9 Code nodes** (8 in bot-workflow, 1 in daily-cutoff-alert). This guide documents every instance and provides step-by-step instructions for externalizing them using n8n credentials and environment variables.

| Secret Type | Expected | Found | Workflow(s) |
|---|---|---|---|
| `service_role` key | 7 nodes | **8 nodes** (7 bot + 1 cutoff) | Both |
| Telegram bot token | 5 nodes | **6 nodes** (5 bot + 1 cutoff) | Both |
| `ADMIN_CHAT_ID` (Jonny) | 3 nodes | **4 nodes** (3 bot + 1 cutoff) | Both |

> **Note on count discrepancies:** The original estimates in CLAUDE.md (7/5/3) only counted the bot workflow. The daily-cutoff-alert workflow adds 1 service_role node, 1 bot token node, and 1 ADMIN_CHAT_ID node. Additionally, the "Identify Sender" node in the bot workflow contains the service_role key (for profile lookup by telegram_id) which may not have been counted in the original 7-node estimate — bringing the bot workflow alone to 7 nodes with service_role.

---

## Part 1: Hardcoded Service Role Key — 7 Nodes

All nodes reference the Supabase service_role key as `<SUPABASE_SERVICE_ROLE_KEY>` (placeholder in the sanitized export; the live n8n instance contains the real key).

### 1.1 — Lookup Worker Profile

- **Workflow:** Bot Workflow (bot-workflow.json)
- **Node name:** `Lookup Worker Profile`
- **Node ID:** `a1b2c3d4-1111-4aaa-bbbb-lookup_worker1`
- **Node type:** Code (v2), `runOnceForEachItem`
- **Hardcoded lines:**
  ```js
  'apikey': '<SUPABASE_SERVICE_ROLE_KEY>',
  'Authorization': `Bearer ${'<SUPABASE_SERVICE_ROLE_KEY>'}`,
  ```

### 1.2 — Lookup Area by Alias

- **Workflow:** Bot Workflow
- **Node name:** `Lookup Area by Alias`
- **Node ID:** `b2c3d4e5-2222-4bbb-cccc-lookup_area_01`
- **Node type:** Code (v2), `runOnceForEachItem`
- **Hardcoded lines (×2 — alias lookup + direct area lookup):**
  ```js
  // First request (area_aliases table):
  'apikey': '<SUPABASE_SERVICE_ROLE_KEY>',
  'Authorization': `Bearer ${'<SUPABASE_SERVICE_ROLE_KEY>'}`,

  // Second request (areas table):
  'apikey': '<SUPABASE_SERVICE_ROLE_KEY>',
  'Authorization': `Bearer ${'<SUPABASE_SERVICE_ROLE_KEY>'}`,
  ```

### 1.3 — Insert Attendance Log

- **Workflow:** Bot Workflow
- **Node name:** `Insert Attendance Log`
- **Node ID:** `c3d4e5f6-3333-4ccc-dddd-insert_attend01`
- **Node type:** Code (v2), `runOnceForEachItem`
- **Hardcoded lines:**
  ```js
  const SERVICE_KEY = '<SUPABASE_SERVICE_ROLE_KEY>';
  ```
  Used in `'apikey': SERVICE_KEY` and `'Authorization': 'Bearer ' + SERVICE_KEY`.

### 1.4 — Upload Voice to Supabase Storage

- **Workflow:** Bot Workflow
- **Node name:** `Upload Voice to Supabase Storage`
- **Node ID:** `e5f6a7b8-vu01-4eee-ffff-upload_voice01`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded lines:**
  ```js
  const SERVICE_KEY = '<SUPABASE_SERVICE_ROLE_KEY>';
  ```
  Used in upload POST and signed-URL POST headers.

### 1.5 — Fetch Static Lists

- **Workflow:** Bot Workflow
- **Node name:** `Fetch Static Lists`
- **Node ID:** `f1a2b3c4-5678-4ddd-eeee-fetch_lists_01`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded lines:**
  ```js
  const SERVICE_KEY = '<SUPABASE_SERVICE_ROLE_KEY>';
  ```
  Used in two GET requests (profiles and areas).

### 1.6 — Handle Callback Query

- **Workflow:** Bot Workflow
- **Node name:** `Handle Callback Query`
- **Node ID:** `a1b2c3d4-2400-4001-b001-callback00001`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded lines:**
  ```js
  const SERVICE_KEY = '<SUPABASE_SERVICE_ROLE_KEY>';
  ```
  Used in PATCH request to update attendance_logs status.

### 1.7 — Identify Sender

- **Workflow:** Bot Workflow
- **Node name:** `Identify Sender`
- **Node ID:** `a1b2c3d4-2700-4001-b001-identifysend1`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded lines:**
  ```js
  const SERVICE_KEY = '<SUPABASE_SERVICE_ROLE_KEY>';
  ```
  Used in GET request to query profiles by `telegram_id`.

### 1.8 — Check Today's Records (Daily Cutoff Alert)

- **Workflow:** Daily Cutoff Alert (daily-cutoff-alert.json)
- **Node name:** `Check Today's Records`
- **Node ID:** `cutoff-0004-check-recs-0001-000000000004`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded lines:**
  ```js
  const SERVICE_KEY = '<SUPABASE_SERVICE_ROLE_KEY>';
  ```
  Used in GET request to count today's attendance records.

---

## Part 2: Hardcoded Telegram Bot Token — 6 Nodes

All nodes reference `<TELEGRAM_BOT_TOKEN>` (placeholder in sanitized export).

### 2.1 — Send Confirmation

- **Workflow:** Bot Workflow
- **Node name:** `Send Confirmation`
- **Node ID:** `a1b2c3d4-2400-4001-b001-sendconfirm01`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded line:**
  ```js
  const TELEGRAM_BOT_TOKEN = '<TELEGRAM_BOT_TOKEN>';
  ```
  Used in `sendMessage` API call.

### 2.2 — Handle Callback Query

- **Workflow:** Bot Workflow
- **Node name:** `Handle Callback Query`
- **Node ID:** `a1b2c3d4-2400-4001-b001-callback00001`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded line:**
  ```js
  const TELEGRAM_BOT_TOKEN = '<TELEGRAM_BOT_TOKEN>';
  ```
  Used in `answerCallbackQuery`, `editMessageReplyMarkup`, and `sendMessage` calls (3 API calls).

### 2.3 — Notify Admin Pending

- **Workflow:** Bot Workflow
- **Node name:** `Notify Admin Pending`
- **Node ID:** `a1b2c3d4-2500-4001-b001-notifyadmin01`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded line:**
  ```js
  const TELEGRAM_BOT_TOKEN = '<TELEGRAM_BOT_TOKEN>';
  ```

### 2.4 — Send Transcription Error

- **Workflow:** Bot Workflow
- **Node name:** `Send Transcription Error`
- **Node ID:** `a1b2c3d4-2600-4001-b001-transerr00001`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded line:**
  ```js
  const TELEGRAM_BOT_TOKEN = '<TELEGRAM_BOT_TOKEN>';
  ```

### 2.5 — Identify Sender

- **Workflow:** Bot Workflow
- **Node name:** `Identify Sender`
- **Node ID:** `a1b2c3d4-2700-4001-b001-identifysend1`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded line:**
  ```js
  const TELEGRAM_BOT_TOKEN = '<TELEGRAM_BOT_TOKEN>';
  ```
  Used in welcome message and admin notification `sendMessage` calls.

### 2.6 — Onboarding Prompt

- **Workflow:** Bot Workflow
- **Node name:** `Onboarding Prompt`
- **Node ID:** `a1b2c3d4-2700-4001-b001-onboarding01`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded line:**
  ```js
  const TELEGRAM_BOT_TOKEN = '<TELEGRAM_BOT_TOKEN>';
  ```
  Used in onboarding message and admin notification `sendMessage` calls.

### 2.7 — Send Cutoff Alert (Daily Cutoff Alert)

- **Workflow:** Daily Cutoff Alert (daily-cutoff-alert.json)
- **Node name:** `Send Cutoff Alert`
- **Node ID:** `cutoff-0006-send-alert-0001-000000000006`
- **Node type:** Code (v2), `runOnceForAllItems`
- **Hardcoded line:**
  ```js
  const TELEGRAM_BOT_TOKEN = '<TELEGRAM_BOT_TOKEN>';
  ```

---

## Part 3: Hardcoded ADMIN_CHAT_ID (Jonny → Sigal) — 3 Nodes

All three nodes set `ADMIN_CHAT_ID = '1867642206'` (Jonny's Telegram chat ID). This must be changed to Sigal's chat ID.

### 3.1 — Notify Admin Pending

- **Workflow:** Bot Workflow
- **Node name:** `Notify Admin Pending`
- **Node ID:** `a1b2c3d4-2500-4001-b001-notifyadmin01`
- **Hardcoded line:**
  ```js
  const ADMIN_CHAT_ID = '1867642206'; // Jonny (temporary — replace with Sigal's chat_id)
  ```

### 3.2 — Identify Sender

- **Workflow:** Bot Workflow
- **Node name:** `Identify Sender`
- **Node ID:** `a1b2c3d4-2700-4001-b001-identifysend1`
- **Hardcoded line:**
  ```js
  const ADMIN_CHAT_ID = '1867642206';
  ```

### 3.3 — Onboarding Prompt

- **Workflow:** Bot Workflow
- **Node name:** `Onboarding Prompt`
- **Node ID:** `a1b2c3d4-2700-4001-b001-onboarding01`
- **Hardcoded line:**
  ```js
  const ADMIN_CHAT_ID = '1867642206';
  ```

### 3.4 — Send Cutoff Alert (Daily Cutoff Alert)

- **Workflow:** Daily Cutoff Alert
- **Node name:** `Send Cutoff Alert`
- **Node ID:** `cutoff-0006-send-alert-0001-000000000006`
- **Hardcoded line:**
  ```js
  const ADMIN_CHAT_ID = '1867642206'; // Jonny (temporary — replace with Sigal's chat_id)
  ```

> **Total:** 4 nodes (3 bot + 1 cutoff), exceeding the expected 3. The original estimate missed the daily-cutoff-alert workflow.

### Additional: Pinned Test Data

The bot-workflow.json `pinData` section contains Jonny's Telegram ID `1867642206` in the test message fixture (lines 988, 995). This is test data only and does not affect production routing, but should be updated if the pinned data is refreshed.

---

## Part 4: `$today.toLocaleString()` — Locale-Fragile Date Formatting

Four locations in the bot workflow use `$today.toLocaleString()`, which produces locale-dependent output that varies by the n8n server's OS locale setting. This is fragile and can break date parsing downstream.

### 4.1 — Prepare Data for Workers Log (Set node)

- **Node name:** `Prepare Data for Workers Log`
- **Node ID:** `02f09471-a109-4357-ba25-859dc8d5326a`
- **Node type:** Set (v3.4)
- **Field:** `תאריך` assignment
- **Expression:** `={{ $today.toLocaleString() }}`
- **Risk:** The `Insert Attendance Log` Code node later parses this with `new Date(rawDate)` — locale-dependent strings (e.g., `dd/mm/yyyy` vs `mm/dd/yyyy`) can cause silent misparse.

### 4.2 — Upload file (Google Drive — DISABLED)

- **Node name:** `Upload file`
- **Node ID:** `ec3ae00c-4795-42d0-adc2-d157f48244b7`
- **Node type:** Google Drive (disabled)
- **Expression:** `={{ $today.toLocaleString() }}-{{$("Telegram Trigger").item.json.message.from.first_name}}.ogg`
- **Risk:** Low (node is disabled), but should be fixed if re-enabled.

### 4.3 — Append row in sheet (Google Sheets — legacy dual-write)

- **Node name:** `Append row in sheet`
- **Node ID:** `146710be-37ea-4534-a13f-1ad860a3809c`
- **Node type:** Google Sheets (v4.6)
- **Field:** `תאריך` column value
- **Expression:** `{{ $today.toLocaleString() }}`
- **Risk:** Inconsistent date format in the spreadsheet.

### 4.4 — Send a message (Gmail summary email)

- **Node name:** `Send a message`
- **Node ID:** `c91d59da-1848-4836-b409-c17394c16a20`
- **Node type:** Gmail (v2.1)
- **Expression:** `{{ $today.toLocaleString() }}` embedded in HTML email body.
- **Risk:** Cosmetic (display only), but inconsistent formatting.

### 4.5 — Daily Cutoff Alert: Check Rest Day and Check Today's Records

- **Workflow:** Daily Cutoff Alert
- **Node:** `Check Rest Day` (ID: `cutoff-0002-check-day-0001-000000000002`)
  - Uses `now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })` — this is **safe** because `en-US` locale is explicitly specified.
- **Node:** `Check Today's Records` (ID: `cutoff-0004-check-recs-0001-000000000004`)
  - Uses `now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' })` — this is **safe** because `en-CA` produces reliable `YYYY-MM-DD` format.

**No action needed** on the daily-cutoff-alert nodes — they already use explicit locale parameters.

---

## Part 5: Step-by-Step Remediation Instructions

### Step 1: Create n8n Environment Variables

n8n supports environment variables that are accessible in Code nodes via `process.env.VARIABLE_NAME` (self-hosted) or via the **Variables** feature (n8n Cloud and self-hosted ≥1.22).

**Option A — Server environment variables (self-hosted, recommended):**

Add to your n8n server's environment (e.g., `.env` file, Docker Compose, or systemd service):

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_actual_key...
SUPABASE_URL=https://jnsfklshpabogzvolzct.supabase.co
TELEGRAM_BOT_TOKEN=your_actual_bot_token
ADMIN_CHAT_ID=SIGALS_CHAT_ID_HERE
```

Then restart n8n. In Code nodes, access via:

```js
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;
```

**Option B — n8n Variables feature (UI-based):**

1. Go to **Settings → Variables** in the n8n UI.
2. Create variables:
   - `SUPABASE_SERVICE_ROLE_KEY` = `eyJ...`
   - `SUPABASE_URL` = `https://jnsfklshpabogzvolzct.supabase.co`
   - `TELEGRAM_BOT_TOKEN` = `your_token`
   - `ADMIN_CHAT_ID` = `SIGALS_CHAT_ID`
3. In Code nodes, access via `$vars.SUPABASE_SERVICE_ROLE_KEY` (n8n expression syntax) or in Code nodes:
   ```js
   const SERVICE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;
   ```

> **Important:** n8n Variables are **not encrypted**. For true secret management on self-hosted, prefer environment variables + Docker secrets or a vault integration. For n8n Cloud, Variables are the only option.

### Step 2: Obtain Sigal's Telegram Chat ID

Before updating `ADMIN_CHAT_ID`:

1. Have Sigal send any message to the Meshek bot in Telegram.
2. Check the n8n execution log for the Telegram Trigger node — `message.chat.id` will contain Sigal's chat ID.
3. Alternatively, use the Telegram Bot API: `GET https://api.telegram.org/bot<TOKEN>/getUpdates` and look for Sigal's message.
4. Record this value as the new `ADMIN_CHAT_ID`.

### Step 3: Update Each Code Node (Bot Workflow)

For each of the nodes listed in Parts 1–3, open the node in the n8n editor and replace the hardcoded values.

**Pattern for service_role key replacement:**

```js
// BEFORE:
const SERVICE_KEY = '<SUPABASE_SERVICE_ROLE_KEY>';

// AFTER:
const SERVICE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;
```

For nodes using inline string literals in headers:

```js
// BEFORE:
'apikey': '<SUPABASE_SERVICE_ROLE_KEY>',
'Authorization': `Bearer ${'<SUPABASE_SERVICE_ROLE_KEY>'}`,

// AFTER:
'apikey': $env.SUPABASE_SERVICE_ROLE_KEY,
'Authorization': `Bearer ${$env.SUPABASE_SERVICE_ROLE_KEY}`,
```

**Pattern for Telegram bot token replacement:**

```js
// BEFORE:
const TELEGRAM_BOT_TOKEN = '<TELEGRAM_BOT_TOKEN>';

// AFTER:
const TELEGRAM_BOT_TOKEN = $env.TELEGRAM_BOT_TOKEN;
```

**Pattern for ADMIN_CHAT_ID replacement:**

```js
// BEFORE:
const ADMIN_CHAT_ID = '1867642206';

// AFTER:
const ADMIN_CHAT_ID = $env.ADMIN_CHAT_ID;
```

### Step 4: Update Daily Cutoff Alert Workflow

Apply the same patterns to the two affected nodes:

1. **Check Today's Records** — replace `SERVICE_KEY` assignment.
2. **Send Cutoff Alert** — replace `TELEGRAM_BOT_TOKEN` and `ADMIN_CHAT_ID` assignments.

### Step 5: Fix `$today.toLocaleString()` Date Formatting

Replace all `$today.toLocaleString()` expressions with a deterministic ISO format.

**For Set node expressions** (Prepare Data for Workers Log):

```
// BEFORE:
={{ $today.toLocaleString() }}

// AFTER — ISO 8601 date only (YYYY-MM-DD), Jerusalem timezone:
={{ DateTime.now().setZone('Asia/Jerusalem').toFormat('yyyy-MM-dd') }}
```

n8n uses Luxon internally, so `DateTime` is available in expressions.

**For Google Sheets** (Append row in sheet):

```
// BEFORE:
{{ $today.toLocaleString() }}

// AFTER:
{{ DateTime.now().setZone('Asia/Jerusalem').toFormat('yyyy-MM-dd') }}
```

**For Gmail HTML** (Send a message):

```
// BEFORE:
{{ $today.toLocaleString() }}

// AFTER (human-readable Hebrew-style date):
{{ DateTime.now().setZone('Asia/Jerusalem').toFormat('dd/MM/yyyy') }}
```

**For Upload file** (disabled, fix if re-enabled):

```
// BEFORE:
={{ $today.toLocaleString() }}-...

// AFTER:
={{ DateTime.now().setZone('Asia/Jerusalem').toFormat('yyyy-MM-dd') }}-...
```

### Step 6: Test After Changes

1. **Save both workflows** (do not activate yet).
2. **Use n8n's "Test workflow" button** with the pinned test data in the bot workflow.
3. Verify:
   - Lookup Worker Profile returns a valid profile_id.
   - Lookup Area by Alias resolves an area_id.
   - Insert Attendance Log writes to Supabase successfully.
   - Send Confirmation sends a Telegram message.
   - Handle Callback Query processes confirm/reject.
   - Notify Admin Pending sends to Sigal (not Jonny).
   - Date fields use `YYYY-MM-DD` format.
4. **Test the Daily Cutoff Alert** manually (temporarily change schedule or use "Test workflow").
5. **Activate both workflows** once tests pass.

### Step 7: Update Sanitized Exports

After all changes are verified in production:

1. Export both workflows from n8n UI (Download → JSON).
2. Replace real secrets with placeholders:
   - `$env.SUPABASE_SERVICE_ROLE_KEY` → keep as-is (no secret in code)
   - If any raw values leaked, replace with `<PLACEHOLDER>`.
3. Commit updated JSON files to `meshek/n8n/`.

---

## Appendix: Full Node Inventory

### Bot Workflow — Nodes with Secrets

| # | Node Name | Node ID | service_role | bot_token | ADMIN_CHAT_ID |
|---|---|---|---|---|---|
| 1 | Lookup Worker Profile | `a1b2c3d4-1111-...lookup_worker1` | ✅ (×2) | — | — |
| 2 | Lookup Area by Alias | `b2c3d4e5-2222-...lookup_area_01` | ✅ (×4) | — | — |
| 3 | Insert Attendance Log | `c3d4e5f6-3333-...insert_attend01` | ✅ | — | — |
| 4 | Upload Voice to Supabase Storage | `e5f6a7b8-vu01-...upload_voice01` | ✅ | — | — |
| 5 | Fetch Static Lists | `f1a2b3c4-5678-...fetch_lists_01` | ✅ | — | — |
| 6 | Handle Callback Query | `a1b2c3d4-2400-...callback00001` | ✅ | ✅ | — |
| 7 | Send Confirmation | `a1b2c3d4-2400-...sendconfirm01` | — | ✅ | — |
| 8 | Notify Admin Pending | `a1b2c3d4-2500-...notifyadmin01` | — | ✅ | ✅ |
| 9 | Send Transcription Error | `a1b2c3d4-2600-...transerr00001` | — | ✅ | — |
| 10 | Identify Sender | `a1b2c3d4-2700-...identifysend1` | ✅ | ✅ | ✅ |
| 11 | Onboarding Prompt | `a1b2c3d4-2700-...onboarding01` | — | ✅ | ✅ |

> Node 10 (Identify Sender) contains **all three** secret types — handle it carefully.

### Daily Cutoff Alert — Nodes with Secrets

| # | Node Name | Node ID | service_role | bot_token | ADMIN_CHAT_ID |
|---|---|---|---|---|---|
| 1 | Check Today's Records | `cutoff-0004-...000000000004` | ✅ | — | — |
| 2 | Send Cutoff Alert | `cutoff-0006-...000000000006` | — | ✅ | ✅ |

### Nodes with `$today.toLocaleString()` (Bot Workflow only)

| # | Node Name | Node ID | Node Type | Active? |
|---|---|---|---|---|
| 1 | Prepare Data for Workers Log | `02f09471-...859dc8d5326a` | Set (v3.4) | ✅ Active |
| 2 | Upload file | `ec3ae00c-...d157f48244b7` | Google Drive | ❌ Disabled |
| 3 | Append row in sheet | `146710be-...1ad860a3809c` | Google Sheets (v4.6) | ✅ Active |
| 4 | Send a message | `c91d59da-...c17394c16a20` | Gmail (v2.1) | ✅ Active |
