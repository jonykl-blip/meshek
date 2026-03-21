# n8n V2 Cowork — Add Client + Work Type Extraction

Follow these steps in the n8n UI to extend the bot to extract work type and client from voice notes.

---

## Node 1: Fetch Static Lists

Open the **"Fetch Static Lists"** Code node. Add two new fetches after the existing worker/area fetches.

### Add client names fetch

```javascript
// Add after the area_aliases fetch
let clientsResponse = [];
try {
  const clientsRaw = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?select=name,name_en,client_aliases(alias)&is_active=eq.true&is_own_farm=eq.false`,
    { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
  );
  clientsResponse = await clientsRaw.json();
} catch (e) { console.log('Fetch clients failed:', e.message); }
```

### Add work types fetch

```javascript
let workTypesResponse = [];
try {
  const wtRaw = await fetch(
    `${SUPABASE_URL}/rest/v1/work_types?select=id,name_he,name_en&is_active=eq.true`,
    { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
  );
  workTypesResponse = await wtRaw.json();
} catch (e) { console.log('Fetch work types failed:', e.message); }
```

### Build the output lists

```javascript
const client_names_list = clientsResponse
  .flatMap(c => [c.name, c.name_en, ...(c.client_aliases || []).map(a => a.alias)])
  .filter(Boolean)
  .join(', ');

const work_types_list = workTypesResponse
  .map(wt => wt.name_he)
  .join(', ');
```

### Update the return object

Add to the return `json` object:
```javascript
client_names_list,
work_types_list,
work_types_raw: workTypesResponse,
```

### Update the Whisper prompt

Add client names and work types to the existing `whisper_prompt` string so Whisper can better transcribe proper nouns:

```javascript
const whisper_prompt = `דיווח שעות עבודה חקלאי. שמות עובדים: ${worker_names_list}. שטחי עבודה: ${area_names_and_aliases_list}. לקוחות: ${client_names_list}. סוגי עבודה: ${work_types_list}`;
```

---

## Node 2: Entity Extraction (חילוץ פועלים ושטחים)

### Update the system prompt

Add this block **after** the existing extraction rules and **before** the JSON schema definition:

```
בנוסף, חלץ את הנתונים הבאים אם הם מוזכרים:

- "לקוח": שם הלקוח/מזמין אם מוזכר (לדוגמה: גדש העמק, קיבוץ יפעת). null אם לא צוין.
- "סוג_עבודה": סוג העבודה. חפש גם פעלים — הפועל מתאר את סוג העבודה:
  ריסס/מרסס/רוסס → ריסוס
  חרש/דיסקס/עיבד → עיבוד קרקע
  זרע/זורע → זריעה
  נטע/שתל → נטיעה
  קצר/קטף → קציר / קטיף
  גזם/מגזם → גיזום
  השקה/משקה → השקיה
  דישן/מדשן → דישון
  בדק/סקר → בדיקת שדה
  הוביל/העביר → הובלה
  התאם את הפועל לשם סוג העבודה מהרשימה. null אם לא צוין.
```

### Update the JSON schema in the prompt

Add to the expected output structure:
```json
{
  "מיקום_עבודה_כללי": "...",
  "לקוח": "client name or null",
  "סוג_עבודה": "work type name (noun form from list) or null",
  "דונם": "number or null",
  "פועלים_ודיווחים": [...]
}
```

### Update the user content (context)

Add these two lines after the existing known workers/areas lines:

```
Known clients (EXACT spelling required): {{ $('Fetch Static Lists').first().json.client_names_list }}
Known work types (use EXACT name from this list): {{ $('Fetch Static Lists').first().json.work_types_list }}
```

---

## Node 3: Prepare Data for Workers Log (Set node)

Add 2 new field assignments:

| Output Field | Expression |
|---|---|
| `לקוח` | `{{ $json.לקוח \|\| $parent.json.לקוח }}` |
| `סוג_עבודה` | `{{ $json.סוג_עבודה \|\| $parent.json.סוג_עבודה }}` |

(The `דונם` field should already be there from the existing setup.)

---

## Node 4: NEW — Lookup Work Type (Code node)

Create a new **Code** node. Place it **after** "Lookup Area by Alias" and **before** "Insert Attendance Log".

Name: `Lookup Work Type`

```javascript
const items = $input.all();
const workTypes = $('Fetch Static Lists').first().json.work_types_raw || [];

for (const item of items) {
  const extracted = item.json['סוג_עבודה'];
  item.json.work_type_id = null;

  if (extracted) {
    // Exact match first
    const exact = workTypes.find(wt => wt.name_he === extracted);
    if (exact) {
      item.json.work_type_id = exact.id;
    } else {
      // Partial match (extracted contains name or name contains extracted)
      const partial = workTypes.find(wt =>
        wt.name_he.includes(extracted) || extracted.includes(wt.name_he)
      );
      if (partial) {
        item.json.work_type_id = partial.id;
      }
    }
  }
}
return items;
```

Set **Execute Once for Each Item**: ON

---

## Node 5: NEW — Resolve Client (Code node)

Create a new **Code** node. Place it **after** "Lookup Work Type" and **before** "Insert Attendance Log".

Name: `Resolve Client`

This node handles client resolution with the following logic:
1. If voice note mentions a client name → try to match it
2. If area is resolved and belongs to only one client → auto-fill (implicit)
3. If no client mentioned and area is own-farm → leave null (own-farm work)

```javascript
const items = $input.all();
const SUPABASE_URL = '<SUPABASE_URL>';
const SERVICE_KEY = '<SUPABASE_SERVICE_ROLE_KEY>';
const headers = { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` };

for (const item of items) {
  const clientName = item.json['לקוח'];
  item.json.pending_client_name = null;
  item.json.resolved_client_id = null;

  // Case 1: Client explicitly mentioned in voice note
  if (clientName) {
    try {
      // Try exact match first, then ILIKE
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/clients?select=id,name&is_active=eq.true&is_own_farm=eq.false&or=(name.ilike.${encodeURIComponent(clientName)},name_en.ilike.${encodeURIComponent(clientName)})`,
        { headers }
      );
      const clients = await res.json();

      if (clients.length === 1) {
        item.json.resolved_client_id = clients[0].id;
      } else if (clients.length > 1) {
        // Multiple matches — try exact
        const exact = clients.find(c => c.name === clientName);
        item.json.resolved_client_id = exact ? exact.id : clients[0].id;
      } else {
        // Try alias match
        const aliasRes = await fetch(
          `${SUPABASE_URL}/rest/v1/client_aliases?select=client_id&alias.ilike.${encodeURIComponent(clientName)}`,
          { headers }
        );
        const aliases = await aliasRes.json();
        if (aliases.length > 0) {
          item.json.resolved_client_id = aliases[0].client_id;
        } else {
          // No match — store as pending for admin review
          item.json.pending_client_name = clientName;
        }
      }
    } catch (e) {
      console.log('Client lookup failed:', e.message);
      item.json.pending_client_name = clientName;
    }
    continue;
  }

  // Case 2: No client mentioned — check if area belongs to a single client
  const areaId = item.json.area_id;
  if (areaId) {
    try {
      const areaRes = await fetch(
        `${SUPABASE_URL}/rest/v1/areas?select=client_id,is_own_field,clients(id,name,is_own_farm)&id=eq.${areaId}`,
        { headers }
      );
      const areas = await areaRes.json();
      if (areas.length > 0 && !areas[0].is_own_field) {
        // Area belongs to a contractor client — auto-fill
        item.json.resolved_client_id = areas[0].client_id;
      }
      // If is_own_field=true, leave null (own-farm work, no client)
    } catch (e) {
      console.log('Area→client lookup failed:', e.message);
    }
  }
}
return items;
```

Set **Execute Once for Each Item**: ON

---

## Node 6: Insert Attendance Log

Add these fields to the insert payload object:

```javascript
work_type_id: item.json.work_type_id || null,
pending_client_name: item.json.pending_client_name || null,
```

**Note:** `dunam_covered` should already be in the insert from the existing V1 setup. If not, add:
```javascript
dunam_covered: item.json['דונם'] ? parseFloat(item.json['דונם']) : null,
```

---

## Node 7: Send Confirmation

Update the confirmation message template to include work type and client when available.

In the message-building loop, change the line format from:
```
[worker] · [area] · [hours]ש'
```
to:
```javascript
let line = `${workerName} · ${areaName}`;
if (item.json['סוג_עבודה']) line += ` · ${item.json['סוג_עבודה']}`;
line += ` · ${hours}ש'`;
if (item.json['לקוח']) line += ` (${item.json['לקוח']})`;
```

---

## Verb→Noun Reference Table

This is the complete mapping that the Entity Extraction prompt should handle:

| Verb forms (what farmers say) | Work type (noun in DB) |
|---|---|
| ריסס, מרסס, רוסס, ריססו | ריסוס |
| חרש, דיסקס, עיבד, חרשו, דיסקסו | עיבוד קרקע |
| זרע, זורע, זרעו | זריעה |
| נטע, שתל, נטעו, שתלו | נטיעה |
| קצר, קטף, קצרו, קטפו | קציר / קטיף |
| גזם, מגזם, גזמו | גיזום |
| השקה, משקה, השקו | השקיה |
| דישן, מדשן, דישנו | דישון |
| בדק, סקר, בדקו | בדיקת שדה |
| הוביל, העביר, הובילו | הובלה |

---

## Testing

After making all changes:

1. **Test verb extraction:** Send voice note "עידן ריסס 6 שעות בחלקה א׳ של גדש העמק"
   - Expected: work_type_id = ריסוס, client = גדש העמק

2. **Test implicit client:** Send "אורי חרש בגוש א׳ 5 שעות" (גוש א׳ belongs only to יפעת)
   - Expected: area_id matched, client auto-resolved to קיבוץ יפעת

3. **Test own-farm (no client):** Send "יוגב גזם בשקדים 4 שעות"
   - Expected: area = שקדים (own farm), no client, work_type = גיזום

4. **Test unknown client:** Send "קאי ריסס 3 שעות בשדה של מושב נווה"
   - Expected: pending_client_name = "מושב נווה", admin notified

5. Run the QA checklist scripts 1-5 from `tasks/qa-checklist.md`

After testing, export sanitized JSON from n8n UI and commit to `n8n/bot-workflow.json`.
