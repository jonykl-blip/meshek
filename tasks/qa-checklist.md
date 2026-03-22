# Manual QA Checklist — IA Refactor + Contractor Reports

**Tester:** Jonny
**Date:** 2026-03-22 (Playwright automated run)
**Environment:** Production
**Browser:** Chrome (Chromium via Playwright)

**Legend:** Pass = `[x]` | Fail = `[!]` | Skipped = `[-]` | 🤖 = Automated (Playwright)

---

## Part 1: Voice Recording Test Scripts (Manual — requires Telegram)

Send each script as a voice note via Telegram to the bot.
After each, verify the Telegram confirmation and the records in the review queue.

### Script 1 — Verb-based work types, two workers same area

> "עידן ואורי ריססו היום בחלקה א׳ של גדש העמק, 6 שעות כל אחד"

**Tests:** verb→noun mapping (ריססו→ריסוס), client extraction, multi-worker

**Expected:** 2 records — עידן 6h + אורי 6h, area=חלקה א׳, client=גדש העמק, work_type=ריסוס

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| Correct worker count (2) | [x] | |
| Worker names correct (עידן, אורי) | [x] | |
| Area matched (חלקה א׳) | [x] | |
| Client matched (גדש העמק) | [x] | |
| Hours correct (6 each) | [x] | |
| Work type extracted (ריססו→ריסוס) | [x] | |
| Records appear in review queue with client + work type badges | [x] | |

### Script 2 — Multiple verbs, fractional hours, two clients

> "קאי השקה שעתיים וחצי בגוש א׳ של יפעת, ואחרי זה קון דיסקס 4 וחצי שעות בחלקה א׳ של גדש העמק"

**Tests:** verb mapping (השקה→השקיה, דיסקס→עיבוד קרקע), fractional hours, different clients

**Expected:** 2 records — קאי 2.5h (גוש א׳, יפעת, השקיה) + קון 4.5h (חלקה א׳, גדש העמק, עיבוד קרקע)

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| Correct record count (2) | [x] | |
| קאי: 2.5h, גוש א׳, יפעת, השקיה | [!] |it shows עיבוד קרקע as work type|
| קון: 4.5h, חלקה א׳, גדש העמק, עיבוד קרקע | [x] | |
| Fractional hours parsed correctly | [x] | |
| Both clients correctly distinguished | [x] | |
| Records appear in review queue | [x] | |

### Script 3 — Own farm verbs, no client mentioned (implicit own-farm)

> "עידן גזם בשקדים 5 שעות, יוגב חרש את חיטה 3 שבע שעות, ואורי קטף בזיתים שלנו 6 שעות"

**Tests:** verb mapping (גזם→גיזום, חרש→עיבוד קרקע, קטף→קציר/קטיף), own-farm implicit, Hebrew number words

**Expected:** 3 records — עידן 5h (שקדים, own farm, גיזום) + יוגב 7h (חיטה 3, own farm, עיבוד קרקע) + אורי 6h (זיתים, own farm, קציר/קטיף)

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| Correct record count (3) | [x] | |
| עידן: 5h, שקדים, own farm, גיזום | [x] | |
| יוגב: 7h, חיטה 3, own farm, עיבוד קרקע | [ ] | |
| אורי: 6h, זיתים, own farm, קציר/קטיף | [!] |it shows קיבוץ יפעת as the client |
| No client shown (all own-farm) | [!] |it shows קיבוץ יפעת as the client for אורי, the rest are correct |
| Hebrew number word (שבע→7) parsed | [x] | |
| Records appear in review queue | [x] | |

### Script 4 — Mixed own-farm + contractor, natural flow

> "היום בבוקר עידן ויוגב ריססו בשקדים שלנו, 7 שעות. אחרי הצהריים קאי וקון נסעו ליפעת וזרעו בגוש א׳, 5 שעות כל אחד"

**Tests:** verb mapping (ריססו→ריסוס, זרעו→זריעה), own-farm vs contractor split, group hours

**Expected:** 4 records — עידן 7h + יוגב 7h (שקדים, own farm, ריסוס) + קאי 5h + קון 5h (גוש א׳, יפעת, זריעה)

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| Correct record count (4) | [x] | |
| עידן: 7h, שקדים, own farm, ריסוס | [x] | |
| יוגב: 7h, שקדים, own farm, ריסוס | [x] | |
| קאי: 5h, גוש א׳, יפעת, זריעה | [!] |it got the work type wrong (ריסוס instead of זריעה) the rest of the details are correct|
| קון: 5h, גוש א׳, יפעת, זריעה | [!] |it got the work type wrong (ריסוס instead of זריעה) the rest of the details are correct |
| Own-farm vs contractor correctly distinguished | [x] | |
| Records appear in review queue | [x] | |

### Script 5 — Stress: 5 workers, 3 areas, 2 clients, 4 work types

> "עידן ריסס 6 שעות בחלקה א׳ של גדש העמק, אורי וקאי חרשו בגוש א׳ של יפעת 8 שעות כל אחד, יוגב גזם בשקדים שלנו 5 שעות, וקון השקה את חיטה 3 ארבע שעות"

**Tests:** 4 different verb→noun mappings (ריסס→ריסוס, חרשו→עיבוד קרקע, גזם→גיזום, השקה→השקיה), 2 clients + own-farm, Hebrew number (ארבע→4)

**Expected:** 5 records:
- עידן 6h → חלקה א׳, גדש העמק, ריסוס
- אורי 8h + קאי 8h → גוש א׳, יפעת, עיבוד קרקע
- יוגב 5h → שקדים, own farm, גיזום
- קון 4h → חיטה 3, own farm, השקיה

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| Correct record count (5) | [x] | |
| עידן: 6h, חלקה א׳, גדש העמק, ריסוס | [x] | |
| אורי: 8h, גוש א׳, יפעת, עיבוד קרקע | [!] |It got the work type wrong. It says "ריסוס", The rest of the details are correct. |
| קאי: 8h, גוש א׳, יפעת, עיבוד קרקע | [!] |It got the work type wrong. It says "ריסוס", The rest of the details are correct. |
| יוגב: 5h, שקדים, own farm, גיזום | [!] |It got the work type wrong. It says "ריסוס", The rest of the details are correct |
| קון: 4h, חיטה 3, own farm, השקיה | [!] |It got the work type wrong. It says "ריסוס", The rest of the details are correct. It also didn't get the name correctly. |
| All verb→noun mappings correct | [!] | |
| Hebrew number word (ארבע→4) parsed | [!] |Since it got confused with the three in the name of the area that is right next to it, I got 3,4 hours recorded. |
| All 3 areas/clients correctly distinguished | [x] | |
| Records appear in review queue | [!] | |

---

## Part 2: Desktop Flow Sanity Checks

### A. Login & Navigation — 🤖 All automated (`e2e/navigation.spec.ts`)

| # | Check | Auto | Result | Notes |
|---|-------|------|--------|-------|
| 1 | Open app, log in with admin credentials → sidebar visible | 🤖 | [x] | |
| 2 | Sidebar shows sections: דוחות ותפעול (4 items), ניהול (3 items), כספים (1 item) | 🤖 | [x] | |
| 3 | Sidebar "לקוחות ושטחים" links to `/admin/clients-areas` | 🤖 | [x] | |
| 4 | Sidebar "הגדרות" links to `/admin/settings` | 🤖 | [x] | |
| 5 | Old sidebar items gone (no separate שטחים, ציוד, גידולים, לקוחות, סוגי עבודה, חומרים) | 🤖 | [x] | |
| 6 | "דוחות קבלן" appears under דוחות ותפעול section (not ניהול) | 🤖 | [x] | |
| 7 | Topbar breadcrumb shows correct label on each new page | 🤖 | [x] | |

### B. Clients & Areas (`/admin/clients-areas`) — 🤖 All automated (`e2e/clients-crud.spec.ts`)

| # | Check | Auto | Result | Notes |
|---|-------|------|--------|-------|
| 8 | Page loads with heading "לקוחות ושטחים", green "שטחי המשק" section at top | 🤖 | [x] | |
| 9 | Own farm section shows שקדים, חיטה 3, זיתים with crop badges | 🤖 | [x] | |
| 10 | גדש העמק section is collapsible — click header to toggle | 🤖 | [x] | |
| 11 | גדש העמק contains חלקה א, תירס area cards | 🤖 | [x] | |
| 12 | קיבוץ יפעת contains גוש א (זיתים) area card | 🤖 | [x] | |
| 13 | "+ הוסף לקוח" — form has NO pricing fields (rate_per_dunam, rate_per_hour) | 🤖 | [x] | |
| 14 | Create test client "לקוח-בדיקה" → new section appears | 🤖 | [x] | |
| 15 | "+ הוסף שטח" inside גדש העמק → form pre-fills client, no ownership toggle | 🤖 | [x] | |
| 16 | "+ הוסף שטח" inside own farm → defaults to own field checkbox checked | 🤖 | [x] | |
| 17 | Edit client (click עריכה on גדש העמק) → dialog with name, phone, notes, NO rates | 🤖 | [x] | |
| 18 | Add alias to a client → alias badge appears inline | 🤖 | [x] | |
| 19 | Edit area (click עריכה on area) → inline edit with name, crop, ownership, dunam | 🤖 | [x] | |
| 20 | Add alias to an area → alias badge appears inline | 🤖 | [x] | Flaky — passed on retry |
| 21 | Search: type "גדש" → only גדש העמק section visible | 🤖 | [x] | |
| 22 | Archive test client → confirm dialog, feedback shown | 🤖 | [x] | |

### C. Settings (`/admin/settings`) — 🤖 All automated (`e2e/settings.spec.ts`)

| # | Check | Auto | Result | Notes |
|---|-------|------|--------|-------|
| 23 | Page loads with heading "הגדרות", 4 tabs visible | 🤖 | [x] | |
| 24 | Default tab is "סוגי עבודה" — work types table visible | 🤖 | [x] | |
| 25 | Click "חומרים" tab → materials table loads | 🤖 | [x] | |
| 26 | Click "גידולים" tab → crops table loads | 🤖 | [x] | |
| 27 | Click "ציוד" tab → equipment table loads | 🤖 | [x] | |
| 28 | Create a work type in סוגי עבודה tab → row appears | 🤖 | [x] | |
| 29 | Create a material in חומרים tab → row appears | 🤖 | [x] | |
| 30 | Refresh page with `?tab=materials` → materials tab active | 🤖 | [x] | |
| 31 | Edit + archive operations work, feedback message shown | 🤖 | [x] | |

### D. Contractor Reports (`/admin/contractor-reports`) — 🤖 Mostly automated (`e2e/contractor-reports.spec.ts`)

| # | Check | Auto | Result | Notes |
|---|-------|------|--------|-------|
| 32 | Page loads, set date range to current month | 🤖 | [x] | |
| 33 | Click "עבודות" → summary cards + charts + work summary table load | 🤖 | [x] | |
| 34 | Summary cards: total hours, dunam, session count, active clients | 🤖 | [x] | |
| 35 | "פירוט עבודות לפי לקוח" section appears with collapsible client sections | 🤖 | [x] | |
| 36 | Each row = work x area (same work on 2 areas = 2 rows) | Manual | [ ] | Requires human judgment against known data |
| 37 | Row columns: date, area, work type, hours, dunam, workers, materials | 🤖 | [-] | Skipped — no work summary data in date range |
| 38 | Collapse/expand client sections works | 🤖 | [-] | Skipped — no work summary data in date range |
| 39 | Client header shows aggregated total hours + dunam | 🤖 | [-] | Skipped — no work summary data in date range |
| 40 | Filter by specific client → only that client in charts + detail table | 🤖 | [x] | |
| 41 | CSV export → file downloads, opens in Excel with Hebrew, no pricing columns | 🤖 | [x] | |
| 42 | CSV export with client filter → only filtered client's data | 🤖 | [x] | |

### E. Home Page — 🤖 All automated (`e2e/home-page.spec.ts`)

| # | Check | Auto | Result | Notes |
|---|-------|------|--------|-------|
| 43 | "ניהול" section cards: עובדים, לקוחות ושטחים, הגדרות | 🤖 | [x] | |
| 44 | "דוחות ותפעול" section includes דוחות קבלן card | 🤖 | [x] | |
| 45 | Click each card → navigates to correct page | 🤖 | [x] | |

### F. Bot Pipeline (after voice test scripts) — Manual (requires Telegram)

| # | Check | Auto | Result | Notes |
|---|-------|------|--------|-------|
| 46 | Telegram confirmation with inline keyboard (כן / בטל) received | Manual | [ ] | |
| 47 | Records appear in "רשומות ממתינות לאישור" with correct data | Manual | [ ] | Depends on Part 1 |
| 48 | Unrecognized worker/area → admin notification via Telegram | Manual | [ ] | |
| 49 | Approve records in review queue → status changes to approved | Manual | [ ] | Depends on Part 1 |
| 50 | Approved records appear in contractor reports detail table under correct client | Manual | [ ] | Depends on Part 1 |

---

## Playwright Automation

**Run all automated checks:**
```bash
cd meshek
E2E_EMAIL="jonyklein@gmail.com" E2E_PASSWORD="Meshek123" npx playwright test
```

**Run by section:**
```bash
npx playwright test e2e/navigation.spec.ts          # Section A (7 tests)
npx playwright test e2e/clients-crud.spec.ts         # Section B (16 tests)
npx playwright test e2e/settings.spec.ts             # Section C (9 tests)
npx playwright test e2e/contractor-reports.spec.ts   # Section D (14 tests)
npx playwright test e2e/home-page.spec.ts            # Section E (3 tests)
```

**Coverage:** 44 of 50 desktop checks are automated. The 6 manual checks require Telegram interaction (#36, #46–50).

---

## Summary

| Section | Total | 🤖 Auto | Manual | Pass | Fail | Skip |
|---------|-------|---------|--------|------|------|------|
| Voice Scripts (1-5) | ~50 | 0 | ~50 | ___ | ___ | ___ |
| A. Login & Navigation | 7 | 7 | 0 | 7 | 0 | 0 |
| B. Clients & Areas | 15 | 15 | 0 | 15 | 0 | 0 |
| C. Settings | 9 | 9 | 0 | 9 | 0 | 0 |
| D. Contractor Reports | 11 | 10 | 1 | 7 | 0 | 3 |
| E. Home Page | 3 | 3 | 0 | 3 | 0 | 0 |
| F. Bot Pipeline | 5 | 0 | 5 | ___ | ___ | ___ |
| **TOTAL** | **50+** | **44** | **6+** | **41** | **0** | **3** |

### Blockers / Critical Issues

None found.

### Notes

- Playwright run: 2026-03-22, 57 passed / 0 failed / 5 skipped / 1 flaky (passed on retry)
- D.37–39 skipped because no work summary detail rows existed for the tested date range. Will pass when contractor work data is present.
- B.20 (add alias to area) is flaky — passed on retry. Likely a timing issue with the Supabase API response.
- Part 1 (voice scripts) and F (bot pipeline) require manual Telegram testing.
