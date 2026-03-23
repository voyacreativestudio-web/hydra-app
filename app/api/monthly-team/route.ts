import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

const TEAM_PCT: Record<string, number> = {
  core_leader: 5,
  team_leader: 7.5,
  assistant_manager: 10,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year  = parseInt(searchParams.get("year")  ?? "");
  const month = parseInt(searchParams.get("month") ?? ""); // 0-indexed

  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 403 });

  const firstStr = new Date(year, month, 1).toISOString().split("T")[0];
  const lastStr  = new Date(year, month + 1, 0).toISOString().split("T")[0];

  // Fetch referrals
  const { data: referrals } = await admin
    .from("profiles")
    .select("id")
    .eq("referente_id", user.id)
    .eq("status", "active");

  if (!referrals || referrals.length === 0) {
    return NextResponse.json({ totalTeamProfitto: 0, teamBonus: null, weeklyBreakdown: [] });
  }

  const [{ data: pezziRaw }, { data: lookup }] = await Promise.all([
    admin
      .from("pezzi")
      .select("settimana_inizio, numero_pezzi, mix_value, tipo")
      .in("user_id", referrals.map((r) => r.id))
      .gte("data", firstStr)
      .lte("data", lastStr),
    admin
      .from("commissioni_lookup")
      .select("mix_value, profitto_team_1, profitto_team_2"),
  ]);

  // Build rate map
  const commMap = new Map<number, { street: number; evento: number }>();
  for (const c of lookup ?? []) {
    commMap.set(c.mix_value, {
      street: Number(c.profitto_team_1),
      evento: Number(c.profitto_team_2),
    });
  }

  // Weekly profitto
  const weekMap = new Map<string, number>();
  for (const p of pezziRaw ?? []) {
    const rates = commMap.get(p.mix_value);
    if (!rates) continue;
    const rate = p.tipo === "street" ? rates.street : rates.evento;
    weekMap.set(p.settimana_inizio, (weekMap.get(p.settimana_inizio) ?? 0) + p.numero_pezzi * rate);
  }

  const totalTeamProfitto = Array.from(weekMap.values()).reduce((s, v) => s + v, 0);

  const weeklyBreakdown = Array.from(weekMap.entries())
    .map(([settimana_inizio, profitto]) => ({ settimana_inizio, profitto }))
    .sort((a, b) => a.settimana_inizio.localeCompare(b.settimana_inizio));

  const myPct = TEAM_PCT[profile.role ?? ""] ?? null;
  const teamBonus = myPct !== null ? (totalTeamProfitto * myPct) / 100 : null;

  return NextResponse.json({ totalTeamProfitto, teamBonus, weeklyBreakdown });
}
