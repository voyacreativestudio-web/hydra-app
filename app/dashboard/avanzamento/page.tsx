import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ─── constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  starter: "Starter",
  leader: "Leader",
  supporter: "Supporter",
  core_leader: "Core Leader",
  team_leader: "Team Leader",
  assistant_manager: "Assistant Manager",
  partner_manager: "Partner Manager",
  manager: "Manager",
  owner: "Owner",
};

// Roles that have an avanzamento path defined
const TRACKED_ROLES = ["starter", "leader", "supporter", "core_leader", "team_leader"];

// ─── helpers ──────────────────────────────────────────────────────────────────

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

function clamp(v: number, max: number): number {
  return Math.min(v, max);
}

function pct(v: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((v / max) * 100);
}

function motivational(progress: number): string {
  if (progress >= 100) return "OBIETTIVO RAGGIUNTO! Parla con il tuo manager! 🏆";
  if (progress >= 90)  return "UN ALTRO PASSO! 🚀";
  if (progress >= 60)  return "Ci sei quasi! ⚡";
  if (progress >= 30)  return "Stai andando alla grande! 🔥";
  return "Inizia forte! 💪";
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max, label, suffix = "" }: {
  value: number; max: number; label: string; suffix?: string;
}) {
  const p = pct(clamp(value, max), max);
  const done = p >= 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#1a1a1a]/60">{label}</span>
        <span className={`text-xs font-bold ${done ? "text-[#1a1a1a]" : "text-[#1a1a1a]/50"}`}>
          {suffix}{value.toFixed(suffix === "€" ? 0 : 0)} / {suffix}{max}{done ? " ✓" : ""}
        </span>
      </div>
      <div className="h-2.5 bg-[#f0f0f0] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-[#1a1a1a]" : "bg-[#c0dde0]"}`}
          style={{ width: `${p}%` }}
        />
      </div>
      <p className="text-[10px] text-[#1a1a1a]/30 text-right">{p}%</p>
    </div>
  );
}

function ReferralChip({ count, target, label }: {
  count: number; target: number; label: string;
}) {
  const done = count >= target;
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
      done ? "bg-[#c0dde0]/20 border-[#c0dde0]" : "bg-[#f5f5f5] border-[#1a1a1a]/8"
    }`}>
      <span className="text-sm text-[#1a1a1a]/70">{label}</span>
      <span className={`text-sm font-bold ${done ? "text-[#1a1a1a]" : "text-[#1a1a1a]/40"}`}>
        {count} / {target} {done ? "✓" : ""}
      </span>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function AvanzamentoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role, status, team_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") redirect("/pending");

  const role = profile.role ?? "starter";

  const today = new Date();
  const monday = getMondayOfWeek(today);
  const mondayStr = toDateStr(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sundayStr = toDateStr(sunday);

  // ── Current month start ────────────────────────────────────────────────────
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartStr = toDateStr(monthStart);

  // ── Fetch week pezzi (all tracked roles need it) ───────────────────────────
  const { data: weekPezziRaw } = await admin
    .from("pezzi")
    .select("numero_pezzi, commissione")
    .eq("user_id", user.id)
    .gte("data", mondayStr)
    .lte("data", sundayStr);

  const weekPezzi    = (weekPezziRaw ?? []).reduce((s, p) => s + p.numero_pezzi, 0);
  const weekGuadagno = (weekPezziRaw ?? []).reduce((s, p) => s + Number(p.commissione), 0);

  // ── Month pezzi (LEADER+) ──────────────────────────────────────────────────
  let monthPezzi = 0;
  let monthGuadagno = 0;
  if (role === "leader" || role === "supporter") {
    const { data: monthRaw } = await admin
      .from("pezzi")
      .select("numero_pezzi, commissione")
      .eq("user_id", user.id)
      .gte("data", monthStartStr);
    monthPezzi    = (monthRaw ?? []).reduce((s, p) => s + p.numero_pezzi, 0);
    monthGuadagno = (monthRaw ?? []).reduce((s, p) => s + Number(p.commissione), 0);
  }

  // ── Referral stats (SUPPORTER+) ───────────────────────────────────────────
  type ReferralRow = { id: string; role: string | null };
  let referrals: ReferralRow[] = [];
  let weekTeamProfitto = 0;

  if (["supporter", "core_leader", "team_leader"].includes(role) && profile.team_id) {
    const { data: refRaw } = await admin
      .from("profiles")
      .select("id, role")
      .eq("team_id", profile.team_id)
      .neq("id", user.id)
      .eq("status", "active");

    referrals = refRaw ?? [];

    // Compute week team profitto
    if (referrals.length > 0) {
      const [{ data: refPezzi }, { data: lookup }] = await Promise.all([
        admin
          .from("pezzi")
          .select("numero_pezzi, mix_value, tipo")
          .in("user_id", referrals.map((r) => r.id))
          .gte("data", mondayStr)
          .lte("data", sundayStr),
        admin
          .from("commissioni_lookup")
          .select("mix_value, profitto_team_1, profitto_team_2"),
      ]);

      const commMap = new Map<number, { street: number; evento: number }>();
      for (const c of lookup ?? []) {
        commMap.set(c.mix_value, {
          street: Number(c.profitto_team_1),
          evento: Number(c.profitto_team_2),
        });
      }

      weekTeamProfitto = (refPezzi ?? []).reduce((s, p) => {
        const rates = commMap.get(p.mix_value);
        if (!rates) return s;
        return s + p.numero_pezzi * (p.tipo === "street" ? rates.street : rates.evento);
      }, 0);
    }
  }

  // ── Derived counts ─────────────────────────────────────────────────────────
  const leaderCount     = referrals.filter((r) => ["leader", "supporter", "core_leader", "team_leader", "assistant_manager"].includes(r.role ?? "")).length;
  const coreLeaderCount = referrals.filter((r) => ["core_leader", "team_leader", "assistant_manager"].includes(r.role ?? "")).length;

  // ── Level configs ──────────────────────────────────────────────────────────
  // Overall progress: for OR-conditions (starter/leader), take the max bar.
  // For multi-bar conditions (supporter+), compute minimum.

  let overallProgress = 0;

  const isUntracked = !TRACKED_ROLES.includes(role);

  if (role === "starter") {
    overallProgress = Math.max(pct(weekPezzi, 8), pct(weekGuadagno, 300));
  } else if (role === "leader") {
    overallProgress = Math.max(pct(monthPezzi, 32), pct(monthGuadagno, 1200));
  } else if (role === "supporter") {
    overallProgress = Math.min(
      pct(leaderCount, 1),
      pct(clamp(weekTeamProfitto, 750), 750)
    );
  } else if (role === "core_leader") {
    overallProgress = Math.min(
      pct(clamp(leaderCount, 2), 2),
      pct(clamp(weekTeamProfitto, 1000), 1000)
    );
  } else if (role === "team_leader") {
    overallProgress = Math.min(
      pct(clamp(leaderCount, 4), 4),
      pct(clamp(coreLeaderCount, 1), 1),
      pct(clamp(weekTeamProfitto, 2500), 2500)
    );
  }

  overallProgress = Math.min(overallProgress, 100);
  const message = motivational(overallProgress);

  const nextRole: Record<string, string> = {
    starter: "Leader",
    leader: "Supporter",
    supporter: "Core Leader",
    core_leader: "Team Leader",
    team_leader: "Assistant Manager",
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[#1a1a1a]/6 z-30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#f0f0f0] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="text-base font-bold text-[#1a1a1a]">Avanzamento</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-4">

        {/* Current role card */}
        <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-5">
          <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-2">
            Ruolo attuale
          </p>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[#c0dde0]/40 text-sm font-bold text-[#1a1a1a]">
              {ROLE_LABELS[role] ?? role}
            </span>
            {!isUntracked && nextRole[role] && (
              <div className="flex items-center gap-2 text-[#1a1a1a]/40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span className="text-sm font-semibold">{nextRole[role]}</span>
              </div>
            )}
          </div>
        </div>

        {/* No progress path for high roles */}
        {isUntracked && (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-8 text-center">
            <p className="text-2xl mb-2">🏆</p>
            <p className="text-sm font-semibold text-[#1a1a1a]">
              Hai raggiunto un livello avanzato.
            </p>
            <p className="text-xs text-[#1a1a1a]/40 mt-1">
              Parla con il tuo manager per i prossimi obiettivi.
            </p>
          </div>
        )}

        {/* ── STARTER ────────────────────────────────────────────────────────── */}
        {role === "starter" && (
          <>
            <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4 space-y-1">
              <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-3">
                Questa settimana
              </p>
              <div className="flex gap-4">
                <div className="flex-1 bg-[#f8f8f8] rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-[#1a1a1a]">{weekPezzi}</p>
                  <p className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-wide mt-0.5">Pezzi</p>
                </div>
                <div className="flex-1 bg-[#f8f8f8] rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-[#1a1a1a]">€{weekGuadagno.toFixed(0)}</p>
                  <p className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-wide mt-0.5">Guadagno</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-0.5">
                  🎯 Obiettivo Leader
                </p>
                <p className="text-[11px] text-[#1a1a1a]/40">
                  8 pezzi in una settimana <span className="font-bold">oppure</span> €300 di guadagno
                </p>
              </div>
              <ProgressBar value={weekPezzi} max={8} label="Pezzi" />
              <ProgressBar value={weekGuadagno} max={300} label="Guadagno" suffix="€" />
            </div>
          </>
        )}

        {/* ── LEADER ─────────────────────────────────────────────────────────── */}
        {role === "leader" && (
          <>
            <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4">
              <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-3">
                Questo mese
              </p>
              <div className="flex gap-4">
                <div className="flex-1 bg-[#f8f8f8] rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-[#1a1a1a]">{monthPezzi}</p>
                  <p className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-wide mt-0.5">Pezzi</p>
                </div>
                <div className="flex-1 bg-[#f8f8f8] rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-[#1a1a1a]">€{monthGuadagno.toFixed(0)}</p>
                  <p className="text-[10px] text-[#1a1a1a]/40 uppercase tracking-wide mt-0.5">Guadagno</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-0.5">
                  🎯 Obiettivo Supporter
                </p>
                <p className="text-[11px] text-[#1a1a1a]/40">
                  32 pezzi in un mese <span className="font-bold">oppure</span> €1.200 di guadagno
                </p>
              </div>
              <ProgressBar value={monthPezzi} max={32} label="Pezzi nel mese" />
              <ProgressBar value={monthGuadagno} max={1200} label="Guadagno nel mese" suffix="€" />
            </div>
          </>
        )}

        {/* ── SUPPORTER ──────────────────────────────────────────────────────── */}
        {role === "supporter" && (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-0.5">
                🎯 Obiettivo Core Leader
              </p>
              <p className="text-[11px] text-[#1a1a1a]/40">
                Sviluppare 1 Leader + €750 profitto team × 2 settimane consecutive
              </p>
            </div>
            <ReferralChip count={leaderCount} target={1} label="Leader sviluppati" />
            <ProgressBar value={weekTeamProfitto} max={750} label="Profitto team questa settimana" suffix="€" />
            <p className="text-[11px] text-[#1a1a1a]/30">
              * Il profitto team deve raggiungere €750 per 2 settimane consecutive.
            </p>
          </div>
        )}

        {/* ── CORE LEADER ────────────────────────────────────────────────────── */}
        {role === "core_leader" && (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-0.5">
                🎯 Obiettivo Team Leader
              </p>
              <p className="text-[11px] text-[#1a1a1a]/40">
                2 Leader promossi + €1.000 profitto team × 2 settimane consecutive
              </p>
            </div>
            <ReferralChip count={leaderCount} target={2} label="Leader promossi" />
            <ProgressBar value={weekTeamProfitto} max={1000} label="Profitto team questa settimana" suffix="€" />
            <p className="text-[11px] text-[#1a1a1a]/30">
              * Il profitto team deve raggiungere €1.000 per 2 settimane consecutive.
            </p>
          </div>
        )}

        {/* ── TEAM LEADER ────────────────────────────────────────────────────── */}
        {role === "team_leader" && (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-0.5">
                🎯 Obiettivo Assistant Manager
              </p>
              <p className="text-[11px] text-[#1a1a1a]/40">
                4 Leader + 1 Core Leader + €2.500 profitto team × 2 settimane consecutive
              </p>
            </div>
            <ReferralChip count={leaderCount} target={4} label="Leader sviluppati" />
            <ReferralChip count={coreLeaderCount} target={1} label="Core Leader sviluppati" />
            <ProgressBar value={weekTeamProfitto} max={2500} label="Profitto team questa settimana" suffix="€" />
            <p className="text-[11px] text-[#1a1a1a]/30">
              * Il profitto team deve raggiungere €2.500 per 2 settimane consecutive.
            </p>
          </div>
        )}

        {/* Motivational banner */}
        {!isUntracked && (
          <div className={`rounded-2xl px-5 py-4 text-center ${
            overallProgress >= 100
              ? "bg-[#c0dde0]/30 border border-[#c0dde0]"
              : "bg-[#f2d3a3]/30 border border-[#f2d3a3]"
          }`}>
            <p className="text-sm font-bold text-[#1a1a1a]">{message}</p>
            {overallProgress < 100 && (
              <p className="text-[11px] text-[#1a1a1a]/40 mt-1">
                Progresso complessivo: {overallProgress}%
              </p>
            )}
          </div>
        )}

        {/* Crea squadra CTA — shown when criteria met for squad-creating roles */}
        {overallProgress >= 100 && ["supporter", "core_leader", "team_leader"].includes(role) && (
          <a
            href="/dashboard/crea-squadra"
            className="flex items-center justify-between px-5 py-4 rounded-2xl bg-[#1a1a1a] text-white hover:bg-[#333] active:scale-[0.98] transition-all"
          >
            <div>
              <p className="text-sm font-bold">🎉 Criterio raggiunto!</p>
              <p className="text-xs text-white/60 mt-0.5">Crea la tua squadra</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        )}

      </div>
    </div>
  );
}
