# n8n Voice Parser — V2 Update Guide

## Overview
Update the bot workflow to extract and store: work type, dunam, and client from voice notes.

## Node Changes

### 1. Fetch Static Lists (Code node)
Add a 3rd HTTP request after the existing worker/area fetches:

```javascript
// Add after existing area fetch
let clientsResponse = [];
try {
  const clientsRaw = await fetch(
    `${SUPABASE_URL}/rest/v1/clients?select=name,name_en,client_aliases(alias)&is_active=eq.true&is_own_farm=eq.false`,
    { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
  );
  clientsResponse = await clientsRaw.json();
} catch (e) { console.log('Fetch clients failed:', e.message); }

let workTypesResponse = [];
try {
  const wtRaw = await fetch(
    `${SUPABASE_URL}/rest/v1/work_types?select=id,name_he,name_en&is_active=eq.true`,
    { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
  );
  workTypesResponse = await wtRaw.json();
} catch (e) { console.log('Fetch work types failed:', e.message); }
```

Add to output:
```javascript
const client_names_list = clientsResponse
  .flatMap(c => [c.name, c.name_en, ...(c.client_aliases || []).map(a => a.alias)])
  .filter(Boolean)
  .join(', ');

const work_types_list = workTypesResponse
  .map(wt => `${wt.name_he} (${wt.name_en || ''})`)
  .join(', ');

// Add to return items
return [{
  json: {
    ...existingFields,
    client_names_list,
    work_types_list,
    work_types_raw: workTypesResponse, // for lookup later
  }
}];
```

### 2. Entity Extraction Prompt (חילוץ פועלים ושטחים)
Add to the **system message** (after existing extraction rules):

```
בנוסף, חלץ את הנתונים הבאים אם הם מוזכרים:
- "לקוח": שם הלקוח/מזמין אם מוזכר (לדוגמה: קיבוץ פת, מושב נווה). null אם לא צוין (=עבודה עצמית).
- "סוג_עבודה": סוג העבודה אם מוזכר. התאם לרשימה: {{ $('Fetch Static Lists').first().json.work_types_list }}. null אם לא צוין.
- "דונם": מספר הדונמים שעובדו, אם צוין. null אם לא צוין.
```

Add to **user content**:
```
Known clients: {{ $('Fetch Static Lists').first().json.client_names_list }}
Known work types: {{ $('Fetch Static Lists').first().json.work_types_list }}
```

Update the expected JSON schema:
```json
{
  "מיקום_עבודה_כללי": "...",
  "לקוח": "client name or null",
  "סוג_עבודה": "work type name or null",
  "דונם": "number or null",
  "פועלים_ודיווחים": [...]
}
```

### 3. Prepare Data for Workers Log (Set node)
Add 3 new field assignments:

| Output Field | Source |
|---|---|
| `לקוח` | `{{ $json.לקוח \|\| $parent.json.לקוח }}` |
| `סוג_עבודה` | `{{ $json.סוג_עבודה \|\| $parent.json.סוג_עבודה }}` |
| `דונם` | `{{ $json.דונם \|\| $parent.json.דונם }}` |

### 4. New Node: Lookup Work Type (Code node)
Add AFTER "Prepare Data" and BEFORE "Insert Attendance Log":

```javascript
const items = $input.all();
const SUPABASE_URL = '...';
const SERVICE_KEY = '<SUPABASE_SERVICE_ROLE_KEY>';
const workTypes = $('Fetch Static Lists').first().json.work_types_raw || [];

for (const item of items) {
  const extracted = item.json['סוג_עבודה'];
  item.json.work_type_id = null;

  if (extracted) {
    const match = workTypes.find(wt =>
      wt.name_he === extracted ||
      wt.name_en?.toLowerCase() === extracted.toLowerCase() ||
      wt.name_he.includes(extracted) ||
      extracted.includes(wt.name_he)
    );
    if (match) {
      item.json.work_type_id = match.id;
    }
  }
}
return items;
```

### 5. New Node: Lookup Client (Code node)
Add AFTER "Lookup Work Type" and BEFORE "Insert Attendance Log":

```javascript
const items = $input.all();
const SUPABASE_URL = '...';
const SERVICE_KEY = '<SUPABASE_SERVICE_ROLE_KEY>';

for (const item of items) {
  const clientName = item.json['לקוח'];
  item.json.pending_client_name = null;
  item.json.resolved_client_id = null;

  if (!clientName) continue; // Own-farm work, no client

  // Try to match client
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?select=id,name&or=(name.ilike.*${encodeURIComponent(clientName)}*,name_en.ilike.*${encodeURIComponent(clientName)}*)&is_active=eq.true&is_own_farm=eq.false`,
      { headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` } }
    );
    const clients = await res.json();

    if (clients.length > 0) {
      item.json.resolved_client_id = clients[0].id;
    } else {
      // No match — set pending for admin review
      item.json.pending_client_name = clientName;
    }
  } catch (e) {
    item.json.pending_client_name = clientName;
  }
}
return items;
```

### 6. Insert Attendance Log (Code node)
Add these fields to the insert payload:

```javascript
// Add to the insert object:
work_type_id: item.json.work_type_id || null,
dunam_covered: item.json['דונם'] ? parseFloat(item.json['דונם']) : null,
pending_client_name: item.json.pending_client_name || null,
```

## Testing
After making changes:
1. Test with: "אורי ועידן עבדו 5 שעות ריסוס בקיבוץ פת 400 דונם"
2. Expected: work_type_id matched to "ריסוס", dunam=400, pending_client_name="קיבוץ פת" (or resolved if client exists)
3. Test with: "סיגל עבדה 3 שעות גיזום" — no client, no dunam
4. Export sanitized JSON and commit
