import { NextResponse } from "next/server";
import type { AdminAccount } from "@/lib/admin-accounts";
import { requireAdmin } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Body = { id?: string };

/** List accounts (auth users + profiles). Real admin session required. */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      mode: "mock",
      items: [] as AdminAccount[],
      message: "Cloud auth is off — no remote accounts to list.",
    });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.listUsers({ perPage: 200 });
  if (authError) {
    return NextResponse.json(
      {
        error: "Couldn't load auth users. Is SUPABASE_SERVICE_ROLE_KEY set?",
        detail: authError.message,
      },
      { status: 502 },
    );
  }

  const { data: profiles } = await supabase.from("profiles").select("*");
  const profileById = new Map(
    (profiles ?? []).map((p: { id: string }) => [p.id, p]),
  );

  const items: AdminAccount[] = (authData.users ?? []).map((u) => {
    const profile = profileById.get(u.id) as
      | {
          name?: string;
          avatar?: string;
          role?: string;
          email?: string | null;
          plan?: string | null;
        }
      | undefined;
    const provider =
      u.app_metadata?.provider ||
      u.identities?.[0]?.provider ||
      null;
    return {
      id: u.id,
      email: u.email ?? u.phone ?? profile?.email ?? null,
      name:
        profile?.name ||
        u.user_metadata?.full_name ||
        u.user_metadata?.name ||
        "Friend",
      avatar: profile?.avatar || "🟣",
      role: profile?.role || "explorer",
      provider: typeof provider === "string" ? provider : null,
      plan: profile?.plan ?? null,
      createdAt: u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
    };
  });

  items.sort((a, b) => {
    const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
    const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
    return tb - ta;
  });

  return NextResponse.json({
    mode: "supabase",
    items,
  });
}

/** Delete an auth user (cascades profile). Real admin session required. */
export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Missing account id." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      mode: "mock",
      deleted: body.id,
      message: "Cloud auth is off — nothing remote to delete.",
    });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
  }

  const { error } = await supabase.auth.admin.deleteUser(body.id);
  if (error) {
    return NextResponse.json(
      {
        error: "Couldn't delete that account.",
        detail: error.message,
      },
      { status: 502 },
    );
  }

  await supabase.from("profiles").delete().eq("id", body.id);
  await supabase
    .from("projects")
    .update({ owner_id: null })
    .eq("owner_id", body.id);

  return NextResponse.json({ mode: "supabase", deleted: body.id });
}
