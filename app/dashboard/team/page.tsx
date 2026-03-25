import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import TeamView from "./TeamView";

export const dynamic = "force-dynamic";

const LEADER_ROLES = [
  "core_leader", "team_leader", "assistant_manager",
  "partner_manager", "manager", "owner",
];

// Percentage of team profitto the leader earns
const TEAM_PCT: Record<string, number> = {
  core_leader: 5,
  team_leader: 7.5,
  assistant_manager: 10,
};

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// TL and above see direct reports + their CL's direct reports
const TWO_LEVEL_ROLES = ["team_leader", "assistant_manager", "partner_manager", "manager", "owner"];

export type MemberSummary = {
  id: string;
  full_name: string;
  role: string;
  pezziTotali: number;
  failTotali: number;
  commissione: number;    // sum of pezzi.commissione (starter rates)
  profittoTeam: number;   // computed at profitto_team_1/2 rates
  dayBreakdown: { data: string; pezzi: number; fail: number; commissione: number }[];
};

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role, status, team_id, teams!profiles_team_id_fkey(nome)")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") redirect("/pending");
  if (!LEADER_ROLES.includes(profile.role ?? "")) redirect("/dashboard");

  const teamName = profile.teams
    ? (profile.teams as unknown as { nome: string }).nome
    : "Team";

  const today = new Date();
  const monday = getMondayOfWeek(today);
  const mondayStr = toDateStr(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sundayStr = toDateStr(sunday);

  const isTwoLevel = TWO_LEVEL_ROLES.includes(profile.role ?? "");

  // ── Fetch members (sequential: TL needs CL ids first) ─────────────────────
  type ProfileRow = { id: string; full_name: string | null; role: string | null };

  // Always fetch direct reports (referente_id = current user)
  const { data: directReports } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("referente_id", user.id)
    .eq("status", "active")
    .order("full_name");

  let allMembers: ProfileRow[] = directReports ?? [];

  // TL+: also include members under each CL in direct reports
  if (isTwoLevel && allMembers.length > 0) {
    const clIds = allMembers
      .filter((m) => m.role === "core_leader")
      .map((m) => m.id);

    if (clIds.length > 0) {
      const { data: clReports } = await admin
        .from("profiles")
        .select("id, full_name, role")
        .in("referente_id", clIds)
        .eq("status", "active")
        .order("full_name");
      allMembers = [...allMembers, ...(clReports ?? [])];
    }
  }

  const members = allMembers;

  // ── Commissioni lookup + own pezzi in parallel ─────────────────────────────
  const [{ data: lookup }, { data: myPezziRaw }] = await Promise.all([
    admin
      .from("commissioni_lookup")
      .select("mix_value, profitto_team_1, profitto_team_2")
      .order("mix_value"),
    admin
      .from("pezzi")
      .select("commissione")
      .eq("user_id", user.id)
      .gte("data", mondayStr)
      .lte("data", sundayStr),
  ]);

  // ── Team member pezzi ──────────────────────────────────────────────────────
  let memberPezziRaw: {
    user_id: string; data: string; numero_pezzi: number;
    fail: number; commissione: number; mix_value: number; tipo: string;
  }[] = [];

  if (members.length > 0) {
    const { data } = await admin
      .from("pezzi")
      .select("user_id, data, numero_pezzi, fail, commissione, mix_value, tipo")
      .in("user_id", members.map((m) => m.id))
      .gte("data", mondayStr)
      .lte("data", sundayStr)
      .order("data");
    memberPezziRaw = data ?? [];
  }

  // ── Build commissioni rate map ─────────────────────────────────────────────
  const commMap = new Map<number, { street: number; evento: number }>();
  for (const c of lookup ?? []) {
    commMap.set(c.mix_value, {
      street: Number(c.profitto_team_1),
      evento: Number(c.profitto_team_2),
    });
  }

  // ── Build member summaries ─────────────────────────────────────────────────
  const memberSummaries: MemberSummary[] = members.map((m) => {
    const pezzi = memberPezziRaw.filter((p) => p.user_id === m.id);

    const pezziTotali = pezzi.reduce((s, p) => s + p.numero_pezzi, 0);
    const failTotali  = pezzi.reduce((s, p) => s + p.fail, 0);
    const commissione = pezzi.reduce((s, p) => s + Number(p.commissione), 0);

    const profittoTeam = pezzi.reduce((s, p) => {
      const rates = commMap.get(p.mix_value);
      if (!rates) return s;
      return s + p.numero_pezzi * (p.tipo === "street" ? rates.street : rates.evento);
    }, 0);

    // Day-by-day breakdown
    const dayMap = new Map<string, { pezzi: number; fail: number; commissione: number }>();
    for (const p of pezzi) {
      const cur = dayMap.get(p.data) ?? { pezzi: 0, fail: 0, commissione: 0 };
      dayMap.set(p.data, {
        pezzi: cur.pezzi + p.numero_pezzi,
        fail: cur.fail + p.fail,
        commissione: cur.commissione + Number(p.commissione),
      });
    }
    const dayBreakdown = Array.from(dayMap.entries())
      .map(([data, s]) => ({ data, ...s }))
      .sort((a, b) => a.data.localeCompare(b.data));

    return {
      id: m.id,
      full_name: m.full_name ?? "—",
      role: m.role ?? "starter",
      pezziTotali,
      failTotali,
      commissione,
      profittoTeam,
      dayBreakdown,
    };
  });

  const totalTeamProfitto = memberSummaries.reduce((s, m) => s + m.profittoTeam, 0);
  const myCommissione = (myPezziRaw ?? []).reduce((s, p) => s + Number(p.commissione), 0);
  const myPct = TEAM_PCT[profile.role ?? ""] ?? null;

  return (
    <TeamView
      teamName={teamName}
      myRole={profile.role ?? ""}
      myCommissione={myCommissione}
      myPct={myPct}
      members={memberSummaries}
      totalTeamProfitto={totalTeamProfitto}
      mondayStr={mondayStr}
      sundayStr={sundayStr}
    />
  );
}
