# Whisper Transcription Quality Investigation

**Epic 2 Retro Action Item** | Created: 2026-03-10
**Status**: Research complete — ready for implementation review
**Goal**: Achieve >90% correct name + area matching from Hebrew voice notes

---

## 1. Current Configuration (Verbatim from bot-workflow.json)

### 1.1 Whisper Transcription Node ("OpenAI")

**Node ID**: `a4e85e26-6e96-4a90-b297-59db617e3c2a`
**Type**: `@n8n/n8n-nodes-langchain.openAi` v1.8
**Error handling**: `continueErrorOutput`

```json
{
  "resource": "audio",
  "operation": "transcribe",
  "options": {
    "prompt": "={{ $json.whisper_prompt }}"
  }
}
```

**Notable gaps**:
- No explicit `model` parameter — defaults to `whisper-1`
- No `language` hint — Whisper auto-detects (unreliable for Hebrew/Thai mixed farm vocabulary)
- No `temperature` setting — defaults to 0 (greedy decoding)
- Prompt is dynamically built from the `Fetch Static Lists` node (see §1.2)

### 1.2 Whisper Prompt Construction (Fetch Static Lists node)

**Node ID**: `f1a2b3c4-5678-4ddd-eeee-fetch_lists_01`
**Type**: `n8n-nodes-base.code` v2

The prompt is built by concatenating active worker names and area names/aliases from Supabase:

```javascript
// Format worker names as comma-separated list
const workerNames = (workersResponse || []).map(w => w.full_name).filter(Boolean);
const workerNamesList = workerNames.join(', ');

// Format area names + aliases (deduplicated)
const areaEntries = [];
for (const area of (areasResponse || [])) {
  if (area.name) areaEntries.push(area.name);
  if (area.area_aliases && area.area_aliases.length > 0) {
    for (const a of area.area_aliases) {
      if (a.alias && a.alias !== area.name) {
        areaEntries.push(a.alias);
      }
    }
  }
}
const areaNamesAndAliasesList = areaEntries.join(', ');

// Build Whisper prompt (224 token limit — truncate at name boundary if needed)
let whisperPrompt = `Names: ${workerNamesList}. Areas: ${areaNamesAndAliasesList}.`;
if (whisperPrompt.length > 800) {
  whisperPrompt = whisperPrompt.substring(0, 800).replace(/,[^,]*$/, '.');
}
```

**Resulting prompt example**: `Names: Idan, Sigal, David, Somchai. Areas: Olive Grove North, Olive Grove South, Almond Orchard, Wheat Field, north olives, olives up top, south olives, almonds.`

**Issues identified**:
1. Prompt is a bare name list — no Hebrew context sentence to anchor Whisper's language model
2. Hebrew names in the database may be stored in Latin script, but voice notes are in Hebrew — mismatch
3. No example sentence showing how names appear in natural Hebrew speech
4. The 800-char truncation is a character limit, but Whisper's prompt limit is 224 *tokens* — Hebrew tokens are denser, so this may silently truncate

### 1.3 GPT-4o Entity Extraction Node ("חילוץ פועלים ושטחים")

**Node ID**: `0a519836-e372-4c80-a3b7-ee57d5c05748`
**Type**: `@n8n/n8n-nodes-langchain.openAi` v1.8
**Model**: `gpt-4o`
**JSON output**: `true`

#### System Prompt (verbatim Hebrew):

```
אתה עוזר ומומחה לחילוץ מידע מדוחות קוליים חקלאיים.
עליך לחלץ את הנתונים הבאים מתוך הטקסט שיינתן לך, ולייצר פלט בפורמט JSON בלבד.
הקפד על המבנה המדויק של ה-JSON.
אם נתון מסוים לא נמצא או לא צוין בבירור, רשום עבורו ערך מתאים (לדוגמה: null, 0, או רשימה ריקה []).
ודא שכל השדות הקיימים בפלט ה-JSON.

המבנה של JSON המצופה:
{
  "מיקום_עבודה_כללי": "שם שטח העבודה כפי שדווח, לדוגמה: זיתים, שקדים.",
  "פועלים_ודיווחים": [
    {
      "שם_פועל": "שם הפועל כפי שדווח, לדוגמה: דוד, משה.",
      "שעות_עבודה": "מספר שעות העבודה של הפועל הספציפי. לדוגמה: 8, 3.5.",
      "מיקום_עבודה_ספציפי": "מיקום העבודה הספציפי שעליו דיווח הפועל עבור השעות האלו. אם לא סופק מיקום ספציפי לפועל, השתמש ב'מיקום_עבודה_כללי' של הדיווח. לדוגמה: חממות, משתלה."
    }
  ]
}

הערות חשובות:
- 'מיקום_עבודה_כללי': ייצג את המיקום העיקרי או הכללי של הדיווח.
- 'פועלים_ודיווחים': רשימה של אובייקטים. כל אובייקט ייצג פועל אחד ודיווח השעות והמיקום הספציפי שלו.
- אם פועל דיווח על עבודה בכמה מיקומים שונים או בשעות שונות באותו מיקום, צור אובייקט נפרד עבור כל דיווח כזה. לדוגמה: "דוד עבד 4 שעות בזיתים ו-3 שעות בשקדים" יתפרש לשני אובייקטים נפרדים ב'פועלים_ודיווחים' עבור דוד.
- 'שעות_עבודה': יכול להיות מספר שלם או עשרוני.
- 'מיקום_עבודה_ספציפי': אם המשתמש לא מציין מיקום ספציפי עבור פועל, השתמש בערך מ'מיקום_עבודה_כללי'.

תמיד תן פלט JSON תקין.
```

#### User Prompt Template:

```
Content: {{ $('OpenAI').item.json.text }}

Known workers: {{ $('Fetch Static Lists').first().json.worker_names_list }}
Known areas: {{ $('Fetch Static Lists').first().json.area_names_and_aliases_list }}
When extracting names, prefer matching against the known lists above. If a name closely resembles a known worker/area, normalize to the known spelling. If a name is not on the list, output it as-is — do not discard.
```

### 1.4 Worker Lookup Node ("Lookup Worker Profile")

**Node ID**: `a1b2c3d4-1111-4aaa-bbbb-lookup_worker1`

```javascript
const workerName = ($input.item.json['שם העובד'] || '').trim();
const safeName = workerName.replace(/%/g, '\\%').replace(/_/g, '\\_');
// ... exact ILIKE match against profiles.full_name
```

**Critical gap**: Uses exact `ILIKE` match only — no fuzzy/partial matching. If GPT-4o outputs "הורי" instead of "אורי", the lookup returns `null` → attendance record gets `profile_id = NULL` → requires manual admin resolution.

### 1.5 Area Lookup Node ("Lookup Area by Alias")

**Node ID**: `b2c3d4e5-2222-4bbb-cccc-lookup_area_01`

Two-phase lookup: first checks `area_aliases.alias` (ILIKE), then falls back to `areas.name` (ILIKE). Same exact-match limitation as worker lookup.

---

## 2. Analysis: Phonetic Correction Gaps

### 2.1 Where Errors Originate

The pipeline has **two correction opportunities** and both are underutilized:

| Stage | Current Behavior | Gap |
|-------|-----------------|-----|
| **Whisper prompt** | Bare name list (`Names: Idan, Sigal...`) | No language hint, no Hebrew context sentence, no phonetic variants |
| **GPT-4o extraction** | "If a name closely resembles a known worker/area, normalize to the known spelling" | Too vague — no explicit phonetic correction rules, no common Whisper error examples |
| **Worker lookup** | Exact ILIKE match | No fuzzy fallback — a single misheard letter = NULL profile_id |

### 2.2 Common Whisper Misrecognitions in Hebrew

Whisper's Hebrew model frequently confuses:

| Correct Name | Whisper Output | Cause |
|-------------|---------------|-------|
| אורי (Uri) | הורי (Hori) | ה/א confusion — glottal stop vs. /h/ |
| עידן (Idan) | אידן (Idan) | ע/א — both realize as glottal stop in modern Hebrew |
| דוד (David) | דוויד / דויד | Vowel insertion from English influence |
| סיגל (Sigal) | סיגאל | Extra alef insertion |
| סומצ'אי (Somchai) | סומציי / סומצאי | Thai names are especially vulnerable — no Hebrew model training data |
| שקדים (Shkedim) | סקדים | ש/ס shin/sin confusion |
| זיתים (Zeitim) | זתים | Vowel elision |
| חממות (Hamamot) | המאמות / חממאות | Gemination confusion |

### 2.3 Root Cause Assessment

1. **No `language: "he"` parameter** → Whisper wastes confidence on language detection, reducing accuracy budget for names
2. **Whisper prompt lacks Hebrew context** → The prompt `Names: Idan, Sigal...` is in English/Latin, but the audio is Hebrew. Whisper's prompt-conditioning works best when the prompt matches the audio language
3. **GPT-4o "closely resembles" instruction is too vague** → The model has no examples of what "closely resembles" means for Hebrew phonetics. It may not know that הורי→אורי is a common error
4. **No phonetic correction mapping** → Neither Whisper nor GPT-4o has an explicit mapping of common misheard pairs
5. **Exact ILIKE lookup = zero tolerance** → Even if GPT-4o gets 95% of corrections right, the 5% that slip through have no safety net

---

## 3. Proposed Changes

### 3.1 Whisper Node: Add Language Hint

Add `language: "he"` to the Whisper options:

```json
{
  "resource": "audio",
  "operation": "transcribe",
  "options": {
    "language": "he",
    "prompt": "={{ $json.whisper_prompt }}"
  }
}
```

**Rationale**: Eliminates language detection overhead. Whisper documentation confirms this improves accuracy for non-English audio.

### 3.2 Whisper Prompt: Add Hebrew Context Sentence

Change the prompt construction from bare name list to a Hebrew context sentence:

```javascript
// BEFORE:
let whisperPrompt = `Names: ${workerNamesList}. Areas: ${areaNamesAndAliasesList}.`;

// AFTER:
const hebrewNames = workerNamesList; // Ensure DB stores Hebrew names
const hebrewAreas = areaNamesAndAliasesList;
let whisperPrompt = `דיווח שעות עבודה חקלאי. שמות עובדים: ${hebrewNames}. שטחי עבודה: ${hebrewAreas}. דוגמה: "אורי עבד שמונה שעות בזיתים."`;
```

**Rationale**: Whisper's prompt conditioning works via language model continuation. A Hebrew-language sentence with agricultural vocabulary and an example primes the decoder for the correct domain.

### 3.3 GPT-4o Extraction Prompt: Add Phonetic Correction Rules

Add an explicit phonetic correction section to the **system prompt** (append before "תמיד תן פלט JSON תקין"):

```
## תיקון פונטי לשמות
Whisper עושה שגיאות שכיחות בעברית. בעת חילוץ שמות, בצע תיקונים פונטיים:

כללי תיקון:
1. החלפות עיצורים שכיחות: ה↔א, ע↔א, ש↔ס, כ↔ח, ט↔ת, ב↔ו
2. שמות תאילנדיים: Whisper לרוב משנה צלילים תאילנדיים — תמיד העדף את הגרסה מרשימת העובדים המוכרים
3. אם שם בתמלול דומה פונטית לשם ברשימת העובדים (הבדל של 1-2 אותיות), נרמל לשם המוכר
4. דוגמאות לתיקונים:
   - "הורי" → "אורי" (ה→א)
   - "אידן" → "עידן" (א→ע)
   - "סיגאל" → "סיגל" (אלף מיותר)
   - "דויד" → "דוד" (תוספת ו)
   - "סקדים" → "שקדים" (ס→ש)

אם לאחר התיקון הפונטי יש התאמה לשם ברשימה — השתמש בשם מהרשימה.
אם אין התאמה גם אחרי תיקון — פלוט את השם כפי שהוא (אל תמציא שמות).
```

Also enhance the **user prompt** to be more explicit:

```
Content: {{ $('OpenAI').item.json.text }}

Known workers (use EXACT spelling from this list when matching): {{ worker_names_list }}
Known areas (use EXACT spelling from this list when matching): {{ area_names_and_aliases_list }}

IMPORTANT: Whisper often misrecognizes Hebrew names. Apply phonetic correction before matching.
For each extracted name, if it sounds like a known worker/area (within 1-2 consonant differences), output the known spelling.
```

### 3.4 Fuzzy Matching Fallback in Lookup Worker Profile

If prompt fixes alone don't achieve >90%, add Levenshtein distance fallback to the worker lookup node:

```javascript
// After exact ILIKE match fails, try fuzzy match
if (!profile_id && workerName) {
  const allWorkers = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/profiles`,
    qs: { is_active: 'eq.true', select: 'id,full_name' },
    headers: { /* ... */ },
    json: true,
  });

  // Simple Levenshtein distance
  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m + 1}, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i-1] === b[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[m][n];
  }

  let bestMatch = null;
  let bestDistance = Infinity;
  const threshold = Math.max(1, Math.floor(workerName.length * 0.3)); // 30% tolerance

  for (const w of allWorkers) {
    const dist = levenshtein(workerName, w.full_name);
    if (dist < bestDistance && dist <= threshold) {
      bestDistance = dist;
      bestMatch = w;
    }
  }

  if (bestMatch) {
    profile_id = bestMatch.id;
    console.log(`Fuzzy matched "${workerName}" → "${bestMatch.full_name}" (distance: ${bestDistance})`);
  }
}
```

**Rationale**: This is a safety net. The prompt fixes (§3.1–3.3) should handle most cases. Fuzzy matching catches the remaining edge cases without requiring prompt iteration. The 30% threshold prevents false positives (e.g., "דוד" won't match "דויד" would be distance 1, well within threshold for a 3-char name).

**Same approach applies to area lookup** — add Levenshtein fallback after the two-phase exact match.

### 3.5 Implementation Priority

| Priority | Change | Effort | Expected Impact |
|----------|--------|--------|----------------|
| **P0** | Add `language: "he"` to Whisper | 1 line | +5–10% raw transcription accuracy |
| **P0** | Hebrew context sentence in Whisper prompt | ~5 lines | +10–15% proper noun accuracy |
| **P1** | Phonetic correction rules in GPT-4o prompt | ~20 lines prompt text | +15–20% name matching accuracy |
| **P2** | Fuzzy matching fallback in lookup nodes | ~40 lines JS per node | Catches remaining 5–10% edge cases |

---

## 4. Manual Testing Plan

### 4.1 Test Voice Samples

Record 10 test voice notes covering these scenarios:

| # | Scenario | Script (Hebrew) | Expected Entities |
|---|----------|-----------------|-------------------|
| 1 | Single worker, simple | "אורי עבד שמונה שעות בזיתים" | אורי, 8, זיתים |
| 2 | Multiple workers | "דוד עבד חמש שעות ומשה שש שעות בשקדים" | דוד 5, משה 6, שקדים |
| 3 | Thai name | "סומצ'אי עבד תשע שעות בחממות" | סומצ'אי, 9, חממות |
| 4 | Half hours | "סיגל עבדה שלוש וחצי שעות במשתלה" | סיגל, 3.5, משתלה |
| 5 | Multi-area | "עידן עבד ארבע שעות בזיתים ושלוש בשקדים" | עידן 4 זיתים, עידן 3 שקדים |
| 6 | Area alias | "דוד עבד שבע שעות בזיתים למעלה" | דוד, 7, Olive Grove North |
| 7 | Background noise | (record outdoors with tractor/wind) | Baseline accuracy under noise |
| 8 | Fast speech | (speak quickly, slur names) | Stress test for phonetic correction |
| 9 | Mixed He/Thai | "סומצ'אי ו-[Thai name] עבדו ביחד" | Both names recognized |
| 10 | Unknown worker | "יוסי החדש עבד שש שעות בשדה חיטה" | יוסי, 6, Wheat Field (profile_id=NULL expected) |

### 4.2 Testing Procedure

For each test sample, record results at three pipeline stages:

```
Sample #__:
  Raw Whisper transcript: ___________________________
  GPT-4o extracted JSON:
    - שם_פועל: _____________  (correct? Y/N)
    - שעות_עבודה: __________  (correct? Y/N)
    - מיקום_עבודה: __________  (correct? Y/N)
  DB lookup result:
    - profile_id: ___________  (matched? Y/N)
    - area_id: ______________  (matched? Y/N)
  Notes: ____________________________________
```

### 4.3 Test Phases

- [ ] **Phase A — Baseline**: Run 10 samples against current pipeline (no changes). Record accuracy.
- [ ] **Phase B — Whisper fixes only**: Apply §3.1 + §3.2. Re-run same 10 samples. Measure delta.
- [ ] **Phase C — GPT-4o prompt fixes**: Apply §3.3. Re-run same 10 samples. Measure delta.
- [ ] **Phase D — Fuzzy matching**: Apply §3.4. Re-run same 10 samples. Measure delta.
- [ ] **Phase E — Full pipeline**: All changes active. Run 10 samples + 5 new samples. Final accuracy.

### 4.4 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Name recognition (known workers) | >90% | Correct profile_id from DB lookup / total known worker mentions |
| Name passthrough (unknown workers) | 100% | Unknown names output as-is, not discarded or mismatched |
| Area recognition | >90% | Correct area_id from DB lookup / total area mentions |
| Hours extraction | >95% | Correct numeric value / total hour mentions |
| End-to-end accuracy | >85% | Records with all three fields correct / total records |
| Regression: false matches | <2% | Fuzzy match returns wrong profile_id / total fuzzy matches |

---

## 5. Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Whisper prompt exceeds 224-token limit with Hebrew chars | Medium | Measure token count with tiktoken; implement token-aware truncation |
| Fuzzy matching creates false positives for short names (2-3 chars) | Medium | Set minimum name length for fuzzy matching (skip for names < 3 chars); require distance ≤ 1 for short names |
| GPT-4o over-corrects unknown names to known ones | Low | "If no phonetic match, output as-is" instruction + test with unknown name samples |
| Hebrew names stored in Latin script in DB | High (seed data shows Latin names) | Verify production DB; may need to add Hebrew name column or store both scripts |
| Thai worker names have no Hebrew phonetic model | High | Rely on exact Whisper prompt hints + very low fuzzy threshold for Thai names |

---

## 6. Open Questions for Jonny

1. **Are worker names in production Supabase stored in Hebrew or Latin script?** The seed data shows Latin (`David`, `Somchai`) but voice notes are in Hebrew. If the DB has `דוד` in production, the Whisper prompt should include Hebrew names. If it has `David`, we need a mapping.
2. **How many active workers are there currently?** This affects Whisper prompt token budget.
3. **Are there voice note recordings from past weeks we can use as test data?** The `voice-recordings` Supabase bucket should have real samples — more valuable than synthetic test recordings.
4. **What is the current failure rate?** How many `attendance_logs` records have `profile_id = NULL` (excluding truly unknown workers)? This gives us the baseline to beat.
