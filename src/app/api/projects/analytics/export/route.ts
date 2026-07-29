import { NextResponse } from "next/server";
import {
  analyticsRowsForExport,
  toCsv,
} from "@/lib/creator-analytics";
import { analyticsTierAtLeast } from "@/lib/plans.config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { rowToSubmission } from "@/lib/supabase/map";
import { createSupabaseServer } from "@/lib/supabase/server-auth";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Cloud auth is off — export needs Supabase." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const {
    data: { user },
  } = (await supabase.auth.getUser()) ?? { data: { user: null } };
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  if (!analyticsTierAtLeast(profile?.plan, "export_api")) {
    return NextResponse.json(
      {
        error: "CSV export is available on Studio. Request an upgrade on /pricing.",
        code: "plan_required",
      },
      { status: 403 },
    );
  }

  const { data: rows, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Couldn’t load projects.", detail: error.message },
      { status: 502 },
    );
  }

  const items = (rows ?? []).map((row) => rowToSubmission(row));
  const exportRows = analyticsRowsForExport(items);
  const format = new URL(request.url).searchParams.get("format") || "csv";

  if (format === "json") {
    return NextResponse.json({ items: exportRows });
  }

  const csv = toCsv(exportRows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="baiolo-analytics.csv"',
    },
  });
}
