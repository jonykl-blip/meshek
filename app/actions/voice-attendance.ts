"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "@/lib/auth-helpers";
import OpenAI from "openai";
import { randomUUID } from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface VoiceAttendanceResult {
  id: string;
  work_date: string;
  total_hours: number | null;
  raw_transcript: string;
  voice_ref_url: string;
  request_id: string;
  extracted_worker_name: string | null;
  extracted_area_name: string | null;
  matched_profile_id: string | null;
  matched_area_id: string | null;
  matched_worker_name: string | null;
  matched_area_name: string | null;
  status: string;
}

export interface WorkerAttendanceRecord {
  id: string;
  work_date: string;
  total_hours: number | null;
  status: string;
  area_name: string | null;
  created_at: string;
}

// ============================================================================
// Levenshtein distance (pure TypeScript — no external library)
// ============================================================================

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // Use two rows to save memory
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = Array.from({ length: n + 1 }, () => 0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// ============================================================================
// 3-phase name matching helpers
// ============================================================================

async function matchWorker(
  adminClient: ReturnType<typeof createAdminClient>,
  extractedName: string
): Promise<{ profile_id: string; full_name: string } | null> {
  if (!extractedName) return null;
  const name = extractedName.trim();

  // Phase 1: exact ILIKE match on profile_aliases
  const { data: aliasMatch } = await adminClient
    .from("profile_aliases")
    .select("profile_id")
    .ilike("alias", name)
    .limit(1)
    .maybeSingle();

  if (aliasMatch) {
    const { data: aliasProfile } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .eq("id", aliasMatch.profile_id)
      .single();
    if (aliasProfile) {
      return { profile_id: aliasProfile.id, full_name: aliasProfile.full_name };
    }
  }

  // Phase 2: exact ILIKE match on profiles.full_name
  const { data: nameMatch } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", name)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (nameMatch) {
    return { profile_id: nameMatch.id, full_name: nameMatch.full_name };
  }

  // Phase 3: Levenshtein fuzzy match (threshold: 30% of name length)
  const { data: allProfiles } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .eq("is_active", true);

  if (!allProfiles) return null;

  const threshold = Math.floor(name.length * 0.3);
  let bestMatch: { profile_id: string; full_name: string } | null = null;
  let bestDist = Infinity;

  for (const profile of allProfiles) {
    const dist = levenshtein(name.toLowerCase(), profile.full_name.toLowerCase());
    if (dist <= threshold && dist < bestDist) {
      bestDist = dist;
      bestMatch = { profile_id: profile.id, full_name: profile.full_name };
    }
  }

  // Also check aliases for fuzzy — join via separate query to avoid FK hint issues
  const { data: allAliases } = await adminClient
    .from("profile_aliases")
    .select("profile_id, alias");

  if (allAliases) {
    for (const alias of allAliases) {
      const dist = levenshtein(name.toLowerCase(), alias.alias.toLowerCase());
      if (dist <= threshold && dist < bestDist) {
        // Find the profile for this alias
        const matchedProfile = allProfiles?.find((p) => p.id === alias.profile_id);
        if (matchedProfile) {
          bestDist = dist;
          bestMatch = { profile_id: alias.profile_id, full_name: matchedProfile.full_name };
        }
      }
    }
  }

  return bestMatch;
}

async function matchArea(
  adminClient: ReturnType<typeof createAdminClient>,
  extractedName: string
): Promise<{ area_id: string; area_name: string } | null> {
  if (!extractedName) return null;
  const name = extractedName.trim();

  // Phase 1: exact ILIKE match on area_aliases
  const { data: aliasMatch } = await adminClient
    .from("area_aliases")
    .select("area_id")
    .ilike("alias", name)
    .limit(1)
    .maybeSingle();

  if (aliasMatch) {
    const { data: aliasArea } = await adminClient
      .from("areas")
      .select("id, name")
      .eq("id", aliasMatch.area_id)
      .single();
    if (aliasArea) {
      return { area_id: aliasArea.id, area_name: aliasArea.name };
    }
  }

  // Phase 2: exact ILIKE match on areas.name
  const { data: nameMatch } = await adminClient
    .from("areas")
    .select("id, name")
    .ilike("name", name)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (nameMatch) {
    return { area_id: nameMatch.id, area_name: nameMatch.name };
  }

  // Phase 3: Levenshtein fuzzy match
  const { data: allAreas } = await adminClient
    .from("areas")
    .select("id, name")
    .eq("is_active", true);

  if (!allAreas) return null;

  const threshold = Math.floor(name.length * 0.3);
  let bestMatch: { area_id: string; area_name: string } | null = null;
  let bestDist = Infinity;

  for (const area of allAreas) {
    const dist = levenshtein(name.toLowerCase(), area.name.toLowerCase());
    if (dist <= threshold && dist < bestDist) {
      bestDist = dist;
      bestMatch = { area_id: area.id, area_name: area.name };
    }
  }

  // Also check area aliases for fuzzy — join via allAreas map to avoid FK hint issues
  const { data: allAreaAliases } = await adminClient
    .from("area_aliases")
    .select("area_id, alias");

  if (allAreaAliases) {
    for (const alias of allAreaAliases) {
      const dist = levenshtein(name.toLowerCase(), alias.alias.toLowerCase());
      if (dist <= threshold && dist < bestDist) {
        const matchedArea = allAreas?.find((a) => a.id === alias.area_id);
        if (matchedArea) {
          bestDist = dist;
          bestMatch = { area_id: alias.area_id, area_name: matchedArea.name };
        }
      }
    }
  }

  return bestMatch;
}

// ============================================================================
// Main action: processVoiceAttendance
// ============================================================================

export async function processVoiceAttendance(
  formData: FormData
): Promise<ActionResult<VoiceAttendanceResult>> {
  // 1. Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "לא מאומת" };
  }

  // Accept any authenticated user (workers submitting their own attendance)
  const adminClient = createAdminClient();

  // 2. Extract audio blob from FormData
  const audioFile = formData.get("audio");
  if (!audioFile || !(audioFile instanceof Blob)) {
    return { success: false, error: "לא נמצא קובץ שמע" };
  }

  // 3. Upload to Supabase Storage
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const timestamp = now.getTime();
  const fileUuid = randomUUID();
  const storagePath = `web-app/${year}/${month}/${timestamp}-${fileUuid}.webm`;

  const audioBuffer = await audioFile.arrayBuffer();
  const audioUint8 = new Uint8Array(audioBuffer);

  const { error: uploadError } = await adminClient.storage
    .from("voice-recordings")
    .upload(storagePath, audioUint8, {
      contentType: audioFile.type || "audio/webm",
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: `העלאת קובץ שמע נכשלה: ${uploadError.message}` };
  }

  // 4. Load worker and area names for the Whisper prompt
  const [workersResult, areasResult, aliasesResult, areaAliasesResult] =
    await Promise.all([
      adminClient.from("profiles").select("full_name").eq("is_active", true),
      adminClient.from("areas").select("name").eq("is_active", true),
      adminClient.from("profile_aliases").select("alias"),
      adminClient.from("area_aliases").select("alias"),
    ]);

  const workerNames = (workersResult.data ?? []).map((p) => p.full_name);
  const workerAliases = (aliasesResult.data ?? []).map((a) => a.alias);
  const areaNames = (areasResult.data ?? []).map((a) => a.name);
  const areaAliases = (areaAliasesResult.data ?? []).map((a) => a.alias);

  const whisperPrompt = [
    "שמות עובדים:",
    [...new Set([...workerNames, ...workerAliases])].join(", "),
    "שמות שטחים:",
    [...new Set([...areaNames, ...areaAliases])].join(", "),
  ].join(" ");

  // 5. Transcribe with Whisper
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let transcript = "";
  try {
    const audioBlob = new Blob([audioUint8], {
      type: audioFile.type || "audio/webm",
    });
    const audioFileForApi = new File([audioBlob], `recording-${fileUuid}.webm`, {
      type: audioFile.type || "audio/webm",
    });

    const transcriptionResponse = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFileForApi,
      language: "he",
      prompt: whisperPrompt,
    });
    transcript = transcriptionResponse.text;
  } catch (whisperErr) {
    console.error("[processVoiceAttendance] Whisper error:", whisperErr);
    return { success: false, error: "תמלול הקלטה נכשל" };
  }

  // 6. Extract entities with GPT-4o (using exact system prompt from n8n bot)
  const systemPrompt = `אתה עוזר ומומחה לחילוץ מידע מדוחות קוליים חקלאיים.
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

## תיקון פונטי לשמות
Whisper עושה שגיאות שכיחות בעברית. בעת חילוץ שמות, בצע תיקונים פונטיים:

כללי תיקון:
1. החלפות עיצורים שכיחות: ה↔א, ע↔א, ש↔ס, כ↔ח, ט↔ת, ב↔ו, כ↔ק
2. שמות תאילנדיים: Whisper לרוב משנה צלילים תאילנדיים — תמיד העדף את הגרסה מרשימת העובדים המוכרים
3. אם שם בתמלול דומה פונטית לשם ברשימת העובדים (הבדל של 1-2 אותיות), נרמל לשם המוכר
4. דוגמאות לתיקונים:
   - "הורי" → "אורי" (ה→א)
   - "אידן" → "עידן" (א→ע)
   - "קרם" → "כרם" (ק→כ)
   - "סקדים" → "שקדים" (ס→ש)

אם לאחר התיקון הפונטי יש התאמה לשם ברשימה — השתמש בשם מהרשימה.
אם אין התאמה גם אחרי תיקון — פלוט את השם כפי שהוא (אל תמציא שמות).

תמיד תן פלט JSON תקין.`;

  const userPrompt = `Content: ${transcript}

Known workers (use EXACT spelling from this list when matching): ${[...new Set([...workerNames, ...workerAliases])].join(", ")}
Known areas (use EXACT spelling from this list when matching): ${[...new Set([...areaNames, ...areaAliases])].join(", ")}

IMPORTANT: Whisper often misrecognizes Hebrew names. Apply phonetic correction before matching.
For each extracted name, if it sounds like a known worker/area (within 1-2 consonant differences), output the known spelling.
If a name is not on the list and no phonetic match exists, output it as-is — do not discard.`;

  interface GptPayload {
    מיקום_עבודה_כללי?: string;
    פועלים_ודיווחים?: Array<{
      שם_פועל?: string;
      שעות_עבודה?: number | string | null;
      מיקום_עבודה_ספציפי?: string;
    }>;
  }

  let gptPayload: GptPayload = {};
  try {
    const gptResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const rawJson = gptResponse.choices[0]?.message?.content ?? "{}";
    gptPayload = JSON.parse(rawJson) as GptPayload;
  } catch (gptErr) {
    console.error("[processVoiceAttendance] GPT-4o error:", gptErr);
    return { success: false, error: "חילוץ נתונים נכשל" };
  }

  // Extract first worker/area report
  const firstReport = gptPayload["פועלים_ודיווחים"]?.[0];
  const extractedWorkerName = firstReport?.["שם_פועל"] ?? null;
  const extractedAreaName =
    firstReport?.["מיקום_עבודה_ספציפי"] ??
    gptPayload["מיקום_עבודה_כללי"] ??
    null;

  const rawHours = firstReport?.["שעות_עבודה"];
  const totalHours =
    rawHours !== null && rawHours !== undefined
      ? parseFloat(String(rawHours))
      : null;
  const validHours =
    totalHours !== null && !isNaN(totalHours) && totalHours >= 0 && totalHours <= 24
      ? totalHours
      : null;

  // 7. Match worker (3-phase)
  const workerMatch = extractedWorkerName
    ? await matchWorker(adminClient, extractedWorkerName)
    : null;

  // 8. Match area (3-phase)
  const areaMatch = extractedAreaName
    ? await matchArea(adminClient, extractedAreaName)
    : null;

  // 9. Insert into attendance_logs
  const workDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
  const requestId = randomUUID();

  // Use the authenticated user's profile_id as a fallback if no match
  // (the worker is reporting their own attendance)
  const profileId = workerMatch?.profile_id ?? null;

  const { data: inserted, error: insertError } = await adminClient
    .from("attendance_logs")
    .insert({
      profile_id: profileId,
      area_id: areaMatch?.area_id ?? null,
      work_date: workDate,
      start_time: new Date(`${workDate}T00:00:00`).toISOString(),
      total_hours: validHours,
      status: "pending",
      source: "web-app",
      raw_transcript: transcript,
      voice_ref_url: storagePath,
      request_id: requestId,
    })
    .select("id, work_date, total_hours, status, created_at")
    .single();

  if (insertError) {
    console.error("[processVoiceAttendance] Insert error:", insertError);
    return { success: false, error: `שמירת רשומה נכשלה: ${insertError.message}` };
  }

  // 10. Audit log
  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId: inserted.id,
      action: "create",
      before: null,
      after: {
        profile_id: profileId,
        area_id: areaMatch?.area_id ?? null,
        work_date: workDate,
        total_hours: validHours,
        status: "pending",
        source: "web-app",
        request_id: requestId,
      },
    });
  } catch (auditErr) {
    console.error("[processVoiceAttendance] Audit log failed:", auditErr);
    // Don't fail the whole operation for audit failures
  }

  return {
    success: true,
    data: {
      id: inserted.id,
      work_date: inserted.work_date,
      total_hours: inserted.total_hours,
      raw_transcript: transcript,
      voice_ref_url: storagePath,
      request_id: requestId,
      extracted_worker_name: extractedWorkerName,
      extracted_area_name: extractedAreaName,
      matched_profile_id: workerMatch?.profile_id ?? null,
      matched_area_id: areaMatch?.area_id ?? null,
      matched_worker_name: workerMatch?.full_name ?? null,
      matched_area_name: areaMatch?.area_name ?? null,
      status: inserted.status,
    },
  };
}

// ============================================================================
// confirmVoiceAttendance — re-affirm pending status (future workflow hook)
// ============================================================================

export async function confirmVoiceAttendance(
  recordId: string
): Promise<ActionResult<{ id: string; status: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "לא מאומת" };

  const adminClient = createAdminClient();

  const { data: record } = await adminClient
    .from("attendance_logs")
    .select("id, status")
    .eq("id", recordId)
    .single();

  if (!record) return { success: false, error: "רשומה לא נמצאה" };

  // Ensure status stays 'pending' for admin review
  const { error } = await adminClient
    .from("attendance_logs")
    .update({ status: "pending" })
    .eq("id", recordId);

  if (error) return { success: false, error: error.message };

  try {
    await logAudit({
      actorId: user.id,
      tableName: "attendance_logs",
      recordId,
      action: "edit",
      before: { status: record.status },
      after: { status: "pending" },
    });
  } catch (auditErr) {
    console.error("[confirmVoiceAttendance] Audit log failed:", auditErr);
  }

  return { success: true, data: { id: recordId, status: "pending" } };
}

// ============================================================================
// getWorkerOwnAttendance — show a worker their recent records
// ============================================================================

export async function getWorkerOwnAttendance(
  workerId: string,
  limit: number = 5
): Promise<ActionResult<WorkerAttendanceRecord[]>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "לא מאומת" };

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("attendance_logs")
    .select("id, work_date, total_hours, status, created_at, area_id")
    .eq("profile_id", workerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { success: false, error: error.message };

  // Collect unique area IDs and fetch their names
  const areaIds = [...new Set((data ?? []).map((r) => r.area_id).filter(Boolean))] as string[];
  let areaNameMap: Record<string, string> = {};

  if (areaIds.length > 0) {
    const { data: areasData } = await adminClient
      .from("areas")
      .select("id, name")
      .in("id", areaIds);
    if (areasData) {
      areaNameMap = Object.fromEntries(areasData.map((a) => [a.id, a.name]));
    }
  }

  const records: WorkerAttendanceRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    work_date: row.work_date,
    total_hours: row.total_hours,
    status: row.status,
    area_name: row.area_id ? (areaNameMap[row.area_id] ?? null) : null,
    created_at: row.created_at,
  }));

  return { success: true, data: records };
}
