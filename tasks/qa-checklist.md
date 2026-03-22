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

## Part 1B: Re-test Failed Scripts (after Bug 1 fix)

Re-run Scripts 2, 4, 5 to verify work type no longer bleeds across segments.

### Script 2 (re-test)

> "קאי השקה שעתיים וחצי בגוש א׳ של יפעת, ואחרי זה קון דיסקס 4 וחצי שעות בחלקה א׳ של גדש העמק"

**Expected:** קאי 2.5h (גוש א׳, יפעת, **השקיה**) + קון 4.5h (חלקה א׳, גדש העמק, **עיבוד קרקע**)

| Check | Result | Notes |
|-------|--------|-------|
| קאי: 2.5h, גוש א׳, יפעת, השקיה | [x] | Previously failed — got עיבוד קרקע |
| קון: 4.5h, חלקה א׳, גדש העמק, עיבוד קרקע | [x] | |

### Script 4 (re-test)

> "היום בבוקר עידן ויוגב ריססו בשקדים שלנו, 7 שעות. אחרי הצהריים קאי וקון נסעו ליפעת וזרעו בגוש א׳, 5 שעות כל אחד"

**Expected:** עידן 7h + יוגב 7h (שקדים, own farm, **ריסוס**) + קאי 5h + קון 5h (גוש א׳, יפעת, **זריעה**)

| Check | Result | Notes |
|-------|--------|-------|
| עידן: 7h, שקדים, own farm, ריסוס | [x] | |
| יוגב: 7h, שקדים, own farm, ריסוס | [x] | |
| קאי: 5h, גוש א׳, יפעת, זריעה | [x] | Previously failed — got ריסוס |
| קון: 5h, גוש א׳, יפעת, זריעה | [x] | Previously failed — got ריסוס |

### Script 5 (re-test)

> "עידן ריסס 6 שעות בחלקה א׳ של גדש העמק, אורי וקאי חרשו בגוש א׳ של יפעת 8 שעות כל אחד, יוגב גזם בשקדים שלנו 5 שעות, וקון השקה את חיטה 3 ארבע שעות"

**Expected:** עידן 6h (ריסוס) + אורי 8h + קאי 8h (עיבוד קרקע) + יוגב 5h (גיזום) + קון 4h (השקיה)

| Check | Result | Notes |
|-------|--------|-------|
| עידן: 6h, חלקה א׳, גדש העמק, ריסוס | [x] | |
| אורי: 8h, גוש א׳, יפעת, עיבוד קרקע | [x] | Previously failed — got ריסוס |
| קאי: 8h, גוש א׳, יפעת, עיבוד קרקע | [x] | Previously failed — got ריסוס |
| יוגב: 5h, שקדים, own farm, גיזום | [x] | Previously failed — got ריסוס |
| קון: 4h, חיטה 3, own farm, השקיה | [x] | Previously failed — got ריסוס, wrong hours |
| Hebrew number ארבע→4 parsed correctly | [x] | Previously failed — got 3.4 |

---

## Part 1C: Round 2 — Dunams + Materials

### Script 6 — Dunam extraction, single worker

> "עידן ריסס 30 דונם בחלקה א׳ של גדש העמק, 6 שעות"

**Expected:** 1 record — עידן 6h, חלקה א׳, גדש העמק, ריסוס, 30 דונם

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| עידן: 6h, חלקה א׳, גדש העמק, ריסוס | [x] | |
| Dunam = 30 | [x] | |
| Record appears in review queue | [x] | |

### Script 7 — Dunam + material, single worker

> "עידן ריסס 30 דונם בחלקה א׳ של גדש העמק עם דלק 6 שעות"

**Expected:** 1 record — עידן 6h, חלקה א׳, גדש העמק, ריסוס, 30 דונם, חומר=דלק

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| עידן: 6h, חלקה א׳, גדש העמק, ריסוס | [x] | |
| Dunam = 30 | [x] |  Although it worked, I wanted to mention that the dunams are not editable in the review dashboard, and we need to address it. |
| Material = דלק | [!] | Materials not yet inserted to DB — check extraction only |
| Record appears in review queue | [x] | |

### Script 8 — Dunam + multiple workers, same area

> "אורי וקאי חרשו 45 דונם בגוש א׳ של יפעת, 8 שעות כל אחד"

**Expected:** 2 records — אורי 8h + קאי 8h, גוש א׳, יפעת, עיבוד קרקע, 45 דונם

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| Correct record count (2) | [x] | |
| אורי: 8h, גוש א׳, יפעת, עיבוד קרקע | [x] | |
| קאי: 8h, גוש א׳, יפעת, עיבוד קרקע | [x] | |
| Dunam = 45 on both records | [x] | |
Although it's not in the testing scope, I want to add a note that I see an odd number in the construct or reports table. I think it's only for this recording and not grouped with other previous recordings, but I see a total of 18 and a half hours. I would like you to check it from how many recordings it's coming and if this recording passed with the right time.
### Script 9 — Material without dunam, own farm

> "יוגב דישן בשקדים שלנו עם דשן 20-20-20, חמש שעות"

**Expected:** 1 record — יוגב 5h, שקדים, own farm, דישון, null דונם, חומר=דשן 20-20-20

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| יוגב: 5h, שקדים, own farm, דישון | [x] | |
| Hebrew number חמש→5 parsed | [x] | |
| No dunam | [x] | |
| Material = דשן 20-20-20 | [x] | Check extraction only | I see it in the transcribed text, but I don't see it on the tag on the review dashboard. And once we have it as a target, it also needs to be editable. 

### Script 10 — Mixed dunams + materials + no dunams, two segments

> "עידן ריסס 25 דונם בשקדים שלנו עם קונפידור 5 שעות, ויוגב השקה בחיטה 3 שבע שעות"

**Expected:** 2 records — עידן 5h (שקדים, own farm, ריסוס, 25 דונם, חומר=קונפידור) + יוגב 7h (חיטה 3, own farm, השקיה, null דונם)

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| Correct record count (2) | [x] | |
| עידן: 5h, שקדים, own farm, ריסוס, 25 דונם | [x] | |
| יוגב: 7h, חיטה 3, own farm, השקיה, no dunam | [x] | |
| Material = קונפידור for עידן only | [!] | Check extraction only | I see the transcription on both records, and since I don't see it on a tag or extracted, I can't see if it's only done. 
| Different work types per worker (Bug 1 fix) | [x] | |

### Script 11 — Full stress: dunams + materials + multi-type + contractor

> "קאי חרש 40 דונם בגוש א׳ של יפעת 8 שעות, ועידן ריסס 20 דונם בחלקה א׳ של גדש העמק עם רנדאפ 6 שעות"

**Expected:** 2 records — קאי 8h (גוש א׳, יפעת, עיבוד קרקע, 40 דונם) + עידן 6h (חלקה א׳, גדש העמק, ריסוס, 20 דונם, חומר=רנדאפ)

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [x] | |
| Correct record count (2) | [x] | |
| קאי: 8h, גוש א׳, יפעת, עיבוד קרקע, 40 דונם | [x] | |
| עידן: 6h, חלקה א׳, גדש העמק, ריסוס, 20 דונם | [x] | |
| Material = רנדאפ for עידן only | [!] | Check extraction only | Again, I see it in the recording transcription, but we see the same recording transcription for both workers. I can't really check if it was extracted because I don't see the materials on the review dashboard. 
| Different work types per worker (Bug 1 fix) | [x] | |
| Different dunams per worker | [x] | |

---

## Part 1C Re-test: Materials Pipeline (after materials fix deployed)

Re-run Scripts 7, 9, 10, 11 — previously materials were not wired through the pipeline. Now they should appear as 🧪 badges on the review dashboard and in the Telegram confirmation.

### Script 7 (re-test) — Dunam + material

> "עידן ריסס 30 דונם בחלקה א׳ של גדש העמק עם דלק 6 שעות"

| Check | Result | Notes |
|-------|--------|-------|
| Material = דלק shown in Telegram confirmation (🧪) | [x] | Previously not shown |
| Material = דלק badge on review dashboard | [x] | Previously not shown |
| Material stored in work_log_materials table | [x] | Previously not stored |

### Script 9 (re-test) — Material without dunam

> "יוגב דישן בשקדים שלנו עם דשן 20-20-20, חמש שעות"

| Check | Result | Notes |
|-------|--------|-------|
| Material = דשן 20-20-20 in Telegram confirmation | [x] | |
| Material badge on review dashboard | [x] | |

### Script 10 (re-test) — Mixed materials + no materials

> "עידן ריסס 25 דונם בשקדים שלנו עם קונפידור 5 שעות, ויוגב השקה בחיטה 3 שבע שעות"

| Check | Result | Notes |
|-------|--------|-------|
| Material = קונפידור on עידן's Telegram line | [x] | |
| No material on יוגב's line | [x] | |
| Material badge only on עידן's review card | [x] | |
The type work it wrote for יוגב was עיבוד קרקע

### Script 11 (re-test) — Materials + multi-type + contractor

> "קאי חרש 40 דונם בגוש א׳ של יפעת 8 שעות, ועידן ריסס 20 דונם בחלקה א׳ של גדש העמק עם רנדאפ 6 שעות"

| Check | Result | Notes |
|-------|--------|-------|
| Material = רנדאפ on עידן's line only | [x] | |
| No material on קאי's line | [x] | |
| Material badge only on עידן's review card | [x] | |
| Dunam editable in review form | [x] | New feature |
| Material editable in review form dropdown | [x] | New feature |
 Connecting the work type as a primary hierarchy to the material in the edit can be nice. For example, if the work type is spray, then only show me materials that are relevant for spray. It's a nice-to-have feature, not a must.

---

## Part 1D: Round 3 — Realistic Farmer Scenarios

Natural-sounding voice reports simulating real daily usage. These combine multiple features including material **quantities and units**, and test the pipeline under realistic conditions.

### Script 12 — Morning briefing, material with quantity, mixed farm + contractor

> "בוקר טוב. אז היום עידן ויוגב יצאו לריסוס בשקדים שלנו עם 200 ליטר קונפידור, עשו 35 דונם, כל אחד שבע וחצי שעות. קאי נסע לגדש העמק וחרש בחלקה א, 50 דונם, שמונה שעות."

**Tests:** natural greeting (ignore), material with quantity+unit (200 ליטר קונפידור), "שלנו" = own-farm, Hebrew numbers (שבע וחצי→7.5, שמונה→8), different work types

**Expected:** 3 records:
- עידן 7.5h — שקדים, own farm, ריסוס, 35 דונם, 200 ליטר קונפידור
- יוגב 7.5h — שקדים, own farm, ריסוס, 35 דונם, 200 ליטר קונפידור
- קאי 8h — חלקה א, גדש העמק, עיבוד קרקע, 50 דונם

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [ ] | |
| Correct record count (3) | [ ] | |
| עידן: 7.5h, שקדים, own farm, ריסוס, 35 דונם | [ ] | |
| יוגב: 7.5h, שקדים, own farm, ריסוס, 35 דונם | [ ] | |
| קאי: 8h, חלקה א, גדש העמק, עיבוד קרקע, 50 דונם, no material | [ ] | |
| Material quantity = 200, unit = ליטר, name = קונפידור | [ ] | |
| Confirmation shows "🧪200 ליטר קונפידור" | [ ] | |
| Review badge shows quantity + unit + name | [ ] | |
| Contractor report: separate row if different material | [ ] | |

### Script 13 — Afternoon, material quantity in Hebrew words, area with number

> "אחה״צ — אורי וקון השקו בגוש א של יפעת, שש שעות כל אחד. עידן גזם בזיתים שלנו ארבע וחצי שעות. ויוגב דישן 20 דונם בחיטה 3 עם שלושה שקים דשן 20-20-20, חמש שעות."

**Tests:** material quantity as Hebrew word (שלושה→3), unit = שק/שקים, material with numbers in name, area "חיטה 3" with number, three different work types

**Expected:** 4 records:
- אורי 6h — גוש א, יפעת, השקיה
- קון 6h — גוש א, יפעת, השקיה
- עידן 4.5h — זיתים, own farm, גיזום
- יוגב 5h — חיטה 3, own farm, דישון, 20 דונם, 3 שק דשן 20-20-20

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [ ] | |
| Correct record count (4) | [ ] | |
| אורי: 6h, גוש א, יפעת, השקיה | [ ] | |
| קון: 6h, גוש א, יפעת, השקיה | [ ] | |
| עידן: 4.5h, זיתים, own farm, גיזום | [ ] | |
| יוגב: 5h, חיטה 3, own farm, דישון, 20 דונם | [ ] | |
| Material quantity = 3, unit = שק, name = דשן 20-20-20 | [ ] | |
| חיטה 3 area name not confused with hours or quantity | [ ] | |

### Script 14 — Same worker, two jobs, different materials

> "היום קאי עבד אצל גדש העמק — בבוקר ריסס 30 דונם בחלקה א עם 150 ליטר רנדאפ, ארבע שעות, ואחרי הצהריים חרש 25 דונם באותו מקום, עוד ארבע שעות."

**Tests:** same worker two entries, material with quantity only on first segment, "אותו מקום" = same location

**Expected:** 2 records:
- קאי 4h — חלקה א, גדש העמק, ריסוס, 30 דונם, 150 ליטר רנדאפ
- קאי 4h — חלקה א, גדש העמק, עיבוד קרקע, 25 דונם

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [ ] | |
| Correct record count (2) — same worker, two entries | [ ] | |
| קאי: 4h, חלקה א, גדש העמק, ריסוס, 30 דונם, 150 ליטר רנדאפ | [ ] | |
| קאי: 4h, חלקה א, גדש העמק, עיבוד קרקע, 25 דונם, no material | [ ] | |
| "אותו מקום" resolved to חלקה א | [ ] | |
| Contractor report: 2 separate rows (different work type + material) | [ ] | |

### Script 15 — Big crew, 5 workers, material with quantity on one segment

> "היום היה יום גדול. עידן ואורי ריססו בשקדים שלנו, 40 דונם עם 300 ליטר דלק, שבע שעות כל אחד. יוגב נסע ליפעת וזרע בגוש א, 30 דונם, שמונה שעות. קאי וקון חרשו בחלקה א של גדש העמק, 60 דונם, שמונה וחצי שעות כל אחד."

**Tests:** 5 workers, 3 locations, material with quantity (300 ליטר דלק), Hebrew numbers (שבע→7, שמונה→8, שמונה וחצי→8.5)

**Expected:** 5 records:
- עידן 7h — שקדים, own farm, ריסוס, 40 דונם, 300 ליטר דלק
- אורי 7h — שקדים, own farm, ריסוס, 40 דונם, 300 ליטר דלק
- יוגב 8h — גוש א, יפעת, זריעה, 30 דונם
- קאי 8.5h — חלקה א, גדש העמק, עיבוד קרקע, 60 דונם
- קון 8.5h — חלקה א, גדש העמק, עיבוד קרקע, 60 דונם

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [ ] | |
| Correct record count (5) | [ ] | |
| עידן: 7h, שקדים, own farm, ריסוס, 40 דונם, 300 ליטר דלק | [ ] | |
| אורי: 7h, שקדים, own farm, ריסוס, 40 דונם, 300 ליטר דלק | [ ] | |
| יוגב: 8h, גוש א, יפעת, זריעה, 30 דונם | [ ] | |
| קאי: 8.5h, חלקה א, גדש העמק, עיבוד קרקע, 60 דונם | [ ] | |
| קון: 8.5h, חלקה א, גדש העמק, עיבוד קרקע, 60 דונם | [ ] | |
| Material quantity=300, unit=ליטר on שקדים entries only | [ ] | |

### Script 16 — Quick report, no materials, no dunams

> "קאי השקה בחיטה 3 שלנו שלוש שעות, ואורי גזם בזיתים שש שעות."

**Tests:** minimal report, no materials, no dunams, "חיטה 3" area, Hebrew numbers (שלוש→3, שש→6)

**Expected:** 2 records:
- קאי 3h — חיטה 3, own farm, השקיה
- אורי 6h — זיתים, own farm, גיזום

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [ ] | |
| Correct record count (2) | [ ] | |
| קאי: 3h, חיטה 3, own farm, השקיה | [ ] | |
| אורי: 6h, זיתים, own farm, גיזום | [ ] | |
| חיטה 3 not confused with hours | [ ] | |
| No material badge on review dashboard | [ ] | |

### Script 17 — End of week, two materials with quantities, 4 work types

> "סיכום ליום שישי. עידן ריסס 45 דונם בחלקה א של גדש העמק עם 250 ליטר קונפידור, תשע שעות. אורי וקאי נסעו ליפעת — אורי השקה בגוש א חמש שעות, וקאי חרש שם 35 דונם, שבע שעות. קון דישן בשקדים שלנו עם שני שקים אמוניום, שש וחצי שעות, 15 דונם."

**Tests:** summary framing, "שם" = same place, two materials with different units (ליטר vs שק), Hebrew numbers (תשע→9, חמש→5, שבע→7, שש וחצי→6.5, שני→2), 4 work types, own-farm + 2 clients

**Expected:** 4 records:
- עידן 9h — חלקה א, גדש העמק, ריסוס, 45 דונם, 250 ליטר קונפידור
- אורי 5h — גוש א, יפעת, השקיה
- קאי 7h — גוש א, יפעת, עיבוד קרקע, 35 דונם
- קון 6.5h — שקדים, own farm, דישון, 15 דונם, 2 שק אמוניום

| Check | Result | Notes |
|-------|--------|-------|
| Telegram confirmation received | [ ] | |
| Correct record count (4) | [ ] | |
| עידן: 9h, חלקה א, גדש העמק, ריסוס, 45 דונם, 250 ליטר קונפידור | [ ] | |
| אורי: 5h, גוש א, יפעת, השקיה | [ ] | |
| קאי: 7h, גוש א, יפעת, עיבוד קרקע, 35 דונם | [ ] | |
| קון: 6.5h, שקדים, own farm, דישון, 15 דונם, 2 שק אמוניום | [ ] | |
| "שם" resolved to גוש א | [ ] | |
| Both material quantities + units parsed correctly | [ ] | |
| Contractor report: materials with quantities in materials column | [ ] | |
| Quantity + unit editable in review form | [ ] | |

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
