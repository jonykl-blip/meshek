import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["owner", "admin", "manager"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { path } = await params;
  const storagePath = path.join("/");

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.storage
    .from("voice-recordings")
    .download(storagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 }
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  let audioBytes: Uint8Array;

  try {
    const text = new TextDecoder().decode(arrayBuffer);
    const parsed = JSON.parse(text);
    if (parsed.type === "Buffer" && Array.isArray(parsed.data)) {
      audioBytes = new Uint8Array(parsed.data);
    } else {
      audioBytes = new Uint8Array(arrayBuffer);
    }
  } catch {
    audioBytes = new Uint8Array(arrayBuffer);
  }

  return new NextResponse(audioBytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "audio/ogg",
      "Content-Length": String(audioBytes.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
