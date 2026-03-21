# Manual QA Checklist — IA Refactor + Contractor Reports

**Tester:** Jonny
**Date:** _______________
**Environment:** Production 
**Browser:** Chrome

**Legend:** Pass = `[x]` | Fail = `[!]` | Skipped = `[-]`

---

## Part 1: Voice Recording Test Scripts

Send each script as a voice note via Telegram to the bot.
After each, verify the Telegram confirmation and the records in the review queue.

### Script 1 — Verb-based work types, two workers same area

> "עידן ואורי ריססו היום בחלקה א׳ של גדש העמק, 6 שעות כל אחד"

**Tests:** verb→noun mapping (ריססו→ריסוס), client extraction, multi-worker

**Expected:** 2 records — עידן 6h + אורי 6h, area=חלקה א׳, client=גדש העמק, work_type=ריסוס

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [ ] | |
| Correct worker count (2) | [ ] | |
| Worker names correct (עידן, אורי) | [ ] | |
| Area matched (חלקה א׳) | [ ] | |
| Client matched (גדש העמק) | [ ] | |
| Hours correct (6 each) | [ ] | |
| Work type extracted (ריססו→ריסוס) | [ ] | |
| Records appear in review queue with client + work type badges | [ ] | |

### Script 2 — Multiple verbs, fractional hours, two clients

> "קאי השקה שעתיים וחצי בגוש א׳ של יפעת, ואחרי זה קון דיסקס 4 וחצי שעות בחלקה א׳ של גדש העמק"

**Tests:** verb mapping (השקה→השקיה, דיסקס→עיבוד קרקע), fractional hours, different clients

**Expected:** 2 records — קאי 2.5h (גוש א׳, יפעת, השקיה) + קון 4.5h (חלקה א׳, גדש העמק, עיבוד קרקע)

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [ ] | |
| Correct record count (2) | [ ] | |
| קאי: 2.5h, גוש א׳, יפעת, השקיה | [ ] | |
| קון: 4.5h, חלקה א׳, גדש העמק, עיבוד קרקע | [ ] | |
| Fractional hours parsed correctly | [ ] | |
| Both clients correctly distinguished | [ ] | |
| Records appear in review queue | [ ] | |

### Script 3 — Own farm verbs, no client mentioned (implicit own-farm)

> "עידן גזם בשקדים 5 שעות, יוגב חרש את חיטה 3 שבע שעות, ואורי קטף בזיתים שלנו 6 שעות"

**Tests:** verb mapping (גזם→גיזום, חרש→עיבוד קרקע, קטף→קציר/קטיף), own-farm implicit, Hebrew number words

**Expected:** 3 records — עידן 5h (שקדים, own farm, גיזום) + יוגב 7h (חיטה 3, own farm, עיבוד קרקע) + אורי 6h (זיתים, own farm, קציר/קטיף)

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [ ] | |
| Correct record count (3) | [ ] | |
| עידן: 5h, שקדים, own farm, גיזום | [ ] | |
| יוגב: 7h, חיטה 3, own farm, עיבוד קרקע | [ ] | |
| אורי: 6h, זיתים, own farm, קציר/קטיף | [ ] | |
| No client shown (all own-farm) | [ ] | |
| Hebrew number word (שבע→7) parsed | [ ] | |
| Records appear in review queue | [ ] | |

### Script 4 — Mixed own-farm + contractor, natural flow

> "היום בבוקר עידן ויוגב ריססו בשקדים שלנו, 7 שעות. אחרי הצהריים קאי וקון נסעו ליפעת וזרעו בגוש א׳, 5 שעות כל אחד"

**Tests:** verb mapping (ריססו→ריסוס, זרעו→זריעה), own-farm vs contractor split, group hours

**Expected:** 4 records — עידן 7h + יוגב 7h (שקדים, own farm, ריסוס) + קאי 5h + קון 5h (גוש א׳, יפעת, זריעה)

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [ ] | |
| Correct record count (4) | [ ] | |
| עידן: 7h, שקדים, own farm, ריסוס | [ ] | |
| יוגב: 7h, שקדים, own farm, ריסוס | [ ] | |
| קאי: 5h, גוש א׳, יפעת, זריעה | [ ] | |
| קון: 5h, גוש א׳, יפעת, זריעה | [ ] | |
| Own-farm vs contractor correctly distinguished | [ ] | |
| Records appear in review queue | [ ] | |

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
| Telegram confirmation received | [ ] | |
| Correct record count (5) | [ ] | |
| עידן: 6h, חלקה א׳, גדש העמק, ריסוס | [ ] | |
| אורי: 8h, גוש א׳, יפעת, עיבוד קרקע | [ ] | |
| קאי: 8h, גוש א׳, יפעת, עיבוד קרקע | [ ] | |
| יוגב: 5h, שקדים, own farm, גיזום | [ ] | |
| קון: 4h, חיטה 3, own farm, השקיה | [ ] | |
| All verb→noun mappings correct | [ ] | |
| Hebrew number word (ארבע→4) parsed | [ ] | |
| All 3 areas/clients correctly distinguished | [ ] | |
| Records appear in review queue | [ ] | |

---

## Part 2: Desktop Flow Sanity Checks

### A. Login & Navigation

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Open app, log in with admin credentials → redirect to home page, sidebar visible | [ ] | |
| 2 | Sidebar shows sections: דוחות ותפעול (4 items), ניהול (3 items), כספים (1 item) | [ ] | |
| 3 | Sidebar "לקוחות ושטחים" links to `/admin/clients-areas` | [ ] | |
| 4 | Sidebar "הגדרות" links to `/admin/settings` | [ ] | |
| 5 | Old sidebar items gone (no separate שטחים, ציוד, גידולים, לקוחות, סוגי עבודה, חומרים) | [ ] | |
| 6 | "דוחות קבלן" appears under דוחות ותפעול section (not ניהול) | [ ] | |
| 7 | Topbar breadcrumb shows correct label on each new page | [ ] | |

### B. Clients & Areas (`/admin/clients-areas`)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 8 | Page loads with heading "לקוחות ושטחים", green "שטחי המשק" section at top | [ ] | |
| 9 | Own farm section shows שקדים, חיטה 3, זיתים with crop badges | [ ] | |
| 10 | גדש העמק section is collapsible — click header to toggle | [ ] | |
| 11 | גדש העמק contains חלקה א׳ (תירס) area card | [ ] | |
| 12 | קיבוץ יפעת contains גוש א׳ (זיתים) area card | [ ] | |
| 13 | "+ הוסף לקוח" — form has NO pricing fields (rate_per_dunam, rate_per_hour) | [ ] | |
| 14 | Create test client "לקוח-בדיקה" → new section appears | [ ] | |
| 15 | "+ הוסף שטח" inside גדש העמק → form pre-fills client, no ownership toggle | [ ] | |
| 16 | "+ הוסף שטח" inside own farm → defaults to own field checkbox checked | [ ] | |
| 17 | Edit client (click עריכה on גדש העמק) → dialog with name, phone, notes, NO rates | [ ] | |
| 18 | Add alias to a client → alias badge appears inline | [ ] | |
| 19 | Edit area (click עריכה on חלקה א׳) → inline edit with name, crop, ownership, dunam | [ ] | |
| 20 | Add alias to an area → alias badge appears inline | [ ] | |
| 21 | Search: type "גדש" → only גדש העמק section visible | [ ] | |
| 22 | Archive test client "לקוח-בדיקה" → confirm dialog, section disappears | [ ] | |

### C. Settings (`/admin/settings`)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 23 | Page loads with heading "הגדרות", 4 tabs visible | [ ] | |
| 24 | Default tab is "סוגי עבודה" — work types table visible | [ ] | |
| 25 | Click "חומרים" tab → materials table loads | [ ] | |
| 26 | Click "גידולים" tab → crops table loads | [ ] | |
| 27 | Click "ציוד" tab → equipment table loads | [ ] | |
| 28 | Create a work type in סוגי עבודה tab → row appears | [ ] | |
| 29 | Create a material in חומרים tab → row appears | [ ] | |
| 30 | Refresh page with `?tab=materials` → materials tab active | [ ] | |
| 31 | Edit + archive operations work, feedback message shown | [ ] | |

### D. Contractor Reports (`/admin/contractor-reports`)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 32 | Page loads, set date range to current month | [ ] | |
| 33 | Click "עבודות" → summary cards + charts + work summary table load | [ ] | |
| 34 | Summary cards: total hours, dunam, session count, active clients | [ ] | |
| 35 | "פירוט עבודות לפי לקוח" section appears with collapsible client sections | [ ] | |
| 36 | Each row = work x area (same work on 2 areas = 2 rows) | [ ] | |
| 37 | Row columns: date, area, work type, hours, dunam, workers, materials | [ ] | |
| 38 | Collapse/expand client sections works | [ ] | |
| 39 | Client header shows aggregated total hours + dunam | [ ] | |
| 40 | Filter by specific client → only that client in charts + detail table | [ ] | |
| 41 | CSV export → file downloads, opens in Excel with Hebrew, no pricing columns | [ ] | |
| 42 | CSV export with client filter → only filtered client's data | [ ] | |

### E. Home Page

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 43 | "ניהול" section cards: עובדים, לקוחות ושטחים, הגדרות | [ ] | |
| 44 | "דוחות ותפעול" section includes דוחות קבלן card | [ ] | |
| 45 | Click each card → navigates to correct page | [ ] | |

### F. Bot Pipeline (after voice test scripts)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 46 | Telegram confirmation with inline keyboard (כן / בטל) received | [ ] | |
| 47 | Records appear in "רשומות ממתינות לאישור" with correct data | [ ] | |
| 48 | Unrecognized worker/area → admin notification via Telegram | [ ] | |
| 49 | Approve records in review queue → status changes to approved | [ ] | |
| 50 | Approved records appear in contractor reports detail table under correct client | [ ] | |

---

## Summary

| Section | Total | Pass | Fail | Skip |
|---------|-------|------|------|------|
| Voice Scripts (1-5) | ___ | ___ | ___ | ___ |
| A. Login & Navigation | 7 | ___ | ___ | ___ |
| B. Clients & Areas | 15 | ___ | ___ | ___ |
| C. Settings | 9 | ___ | ___ | ___ |
| D. Contractor Reports | 11 | ___ | ___ | ___ |
| E. Home Page | 3 | ___ | ___ | ___ |
| F. Bot Pipeline | 5 | ___ | ___ | ___ |
| **TOTAL** | **50+** | ___ | ___ | ___ |

### Blockers / Critical Issues

1. ___
2. ___
3. ___

### Notes

___
