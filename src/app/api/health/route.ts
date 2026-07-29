import { NextResponse } from "next/server";
import { aiBuildLimit } from "@/lib/ai-quota";
import { pingBuilderHealth } from "@/lib/builder-client";
import { isLlmConfigured } from "@/lib/llm";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  const builderUrl = process.env.BUILDER_API_URL?.trim() || "";
  const builder = builderUrl
    ? await pingBuilderHealth()
    : { ok: false, detail: "not_configured" };

  return NextResponse.json({
    ok: true,
    product: "baiolo",
    mode: isSupabaseConfigured() ? "supabase" : "mock",
    time: new Date().toISOString(),
    ai: {
      llm: isLlmConfigured(),
      builderConfigured: Boolean(builderUrl),
      builderOk: builder.ok,
      builderDetail: builder.detail,
    },
    quota: {
      freeMonthly: aiBuildLimit("free"),
      proMonthly: aiBuildLimit("pro"),
      studioMonthly: aiBuildLimit("studio"),
    },
    notify: {
      resend: Boolean(process.env.RESEND_API_KEY?.trim()),
    },
  });
}
