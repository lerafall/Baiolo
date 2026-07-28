import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Upload a ZIP into the private storage bucket. */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      mode: "mock",
      skipped: true,
      message: "Storage needs Supabase — kept local label only.",
    });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ mode: "mock", skipped: true });
  }

  const form = await request.formData();
  const file = form.get("file");
  const projectId = String(form.get("projectId") || "");
  const ownerId = String(form.get("ownerId") || "");

  if (!projectId || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Add a ZIP and project id." },
      { status: 400 },
    );
  }

  if (file.size > 80 * 1024 * 1024) {
    return NextResponse.json(
      { error: "That ZIP is a bit big. Try under 80 MB." },
      { status: 400 },
    );
  }

  const path = `${ownerId || "anon"}/${projectId}/package.zip`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from("project-private")
    .upload(path, bytes, {
      contentType: "application/zip",
      upsert: true,
    });

  if (error) {
    return NextResponse.json(
      {
        error: "We couldn’t store the ZIP yet. Create the project-private bucket?",
        detail: error.message,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    mode: "supabase",
    storagePath: path,
    sourceLabel: file.name,
  });
}
