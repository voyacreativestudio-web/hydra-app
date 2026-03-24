import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import UserMenu from "./UserMenu";
import BottomNav from "./BottomNav";
import MonthlyRecap from "./MonthlyRecap";

export const dynamic = "force-dynamic";

// ─── helpers ────────────────────────────────────────────────────────────────

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
  hr: "HR",
};

const BONUS_LABELS: Record<string, string> = {
  primo_pezzo: "Primo Pezzo",
  tripletta: "Tripletta",
  poker: "Poker",
  manita: "Manita",
  prime_due_settimane: "Prime 2 Settimane",
};

const WEEK_DAYS = [
  { label: "Martedì",   offset: 1 },
  { label: "Mercoledì", offset: 2 },
  { label: "Giovedì",   offset: 3 },
  { label: "Venerdì",   offset: 4 },
  { label: "Sabato",    offset: 5 },
];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(date: Date): string {
  // Use local date parts to avoid UTC offset shifting the date
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const LEADER_ROLES = [
  "core_leader", "team_leader", "assistant_manager",
  "partner_manager", "manager", "owner",
];

const ADMIN_ROLES = [
  "hr", "manager", "owner", "partner_manager", "assistant_manager",
];

// ─── types ───────────────────────────────────────────────────────────────────

type PezzoRow = {
  id: string;
  data: string;
  numero_pezzi: number;
  fail: number;
  commissione: number;
};

type BonusRow = {
  id: string;
  tipo: string;
  importo: number;
  verificato: boolean;
  data: string;
};

type TeamMemberRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  pezzi: number;
  fail: number;
  commissione: number;
};

// ─── page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("full_name, role, status, data_inizio, team_id, teams!profiles_team_id_fkey(nome)")
    .eq("id", user.id)
    .single();

  console.log("[dashboard] user.id:", user.id, "| profile:", profile, "| error:", profileError?.message ?? null);

  if (!profile || profile.status !== "active") redirect("/pending");

  const teamName = profile.teams
    ? (profile.teams as unknown as { nome: string }).nome
    : null;

  const isLeader = LEADER_ROLES.includes(profile.role ?? "");
  const isAdmin = ADMIN_ROLES.includes(profile.role ?? "");
  const TEAM_PCT: Record<string, number> = { core_leader: 5, team_leader: 7.5, assistant_manager: 10 };
  const myPct = TEAM_PCT[profile.role ?? ""] ?? null;

  const fullName = profile.full_name || user.email?.split("@")[0] || "Utente";
  const initials = getInitials(fullName);

  // ── week range ──────────────────────────────────────────────────────────────
  const today = new Date();
  const monday = getMondayOfWeek(today);
  const mondayStr = toDateStr(monday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sundayStr = toDateStr(sunday);

  // ── pezzi ──────────────────────────────────────────────────────────────────
  // Filter by actual `data` date range (Mon–Sun) instead of settimana_inizio.
  // This is robust against any historical mismatch in stored settimana_inizio values.
  const { data: pezziRaw } = await admin
    .from("pezzi")
    .select("id, data, numero_pezzi, fail, commissione")
    .eq("user_id", user.id)
    .gte("data", mondayStr)
    .lte("data", sundayStr)
    .order("data");

  const pezzi: PezzoRow[] = pezziRaw ?? [];

  // ── bonus ──────────────────────────────────────────────────────────────────
  const { data: bonusRaw } = await admin
    .from("bonus")
    .select("id, tipo, importo, verificato, data")
    .eq("user_id", user.id)
    .gte("data", mondayStr)
    .lte("data", sundayStr)
    .order("data", { ascending: false });

  const bonus: BonusRow[] = bonusRaw ?? [];

  // ── team members ───────────────────────────────────────────────────────────
  let teamMembers: TeamMemberRow[] = [];
  if (isLeader) {
    const { data: membersRaw } = await admin
      .from("profiles")
      .select("id, full_name, role")
      .eq("referente_id", user.id)
      .eq("status", "active")
      .order("full_name");

    if (membersRaw && membersRaw.length > 0) {
      const memberIds = membersRaw.map((m) => m.id);
      const { data: memberPezzi } = await admin
        .from("pezzi")
        .select("user_id, numero_pezzi, fail, commissione")
        .in("user_id", memberIds)
        .gte("data", mondayStr)
        .lte("data", sundayStr);

      teamMembers = membersRaw.map((m) => {
        const mp = (memberPezzi ?? []).filter((p) => p.user_id === m.id);
        return {
          id: m.id,
          full_name: m.full_name,
          role: m.role,
          pezzi: mp.reduce((s, p) => s + p.numero_pezzi, 0),
          fail: mp.reduce((s, p) => s + p.fail, 0),
          commissione: mp.reduce((s, p) => s + Number(p.commissione), 0),
        };
      });
    }
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const pezziLordi = pezzi.reduce((s, p) => s + p.numero_pezzi, 0);
  const failTotali = pezzi.reduce((s, p) => s + p.fail, 0);
  const percentFail = pezziLordi > 0 ? Math.round((failTotali / pezziLordi) * 100) : 0;
  const guadagno = pezzi.reduce((s, p) => s + Number(p.commissione), 0);

  // ── daily breakdown ────────────────────────────────────────────────────────
  const pezziByDay = new Map<string, PezzoRow[]>();
  pezzi.forEach((p) => {
    if (!pezziByDay.has(p.data)) pezziByDay.set(p.data, []);
    pezziByDay.get(p.data)!.push(p);
  });

  return (
    <div className="min-h-screen bg-[#f8f8f8] pb-24">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 bg-white border-b border-[#1a1a1a]/6 z-30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c0dde0] flex items-center justify-center shrink-0">
              <span className="text-[#1a1a1a] text-sm font-bold tracking-widest">H</span>
            </div>
            <span className="text-sm font-bold tracking-widest text-[#1a1a1a] uppercase">Hydra</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#1a1a1a] text-white text-xs font-semibold hover:bg-[#333] transition-colors"
              >
                Admin
              </Link>
            )}
            <UserMenu initials={initials} />
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ── Welcome card ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl px-5 py-5 border border-[#1a1a1a]/6">
          <p className="text-xl font-bold text-[#1a1a1a]">
            Ciao, {fullName.split(" ")[0]}! 👋
          </p>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            {profile.role && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#c0dde0]/40 text-xs font-semibold text-[#1a1a1a]">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
            )}
            {teamName && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f2d3a3]/50 text-xs font-semibold text-[#1a1a1a]">
                {teamName}
              </span>
            )}
          </div>
          {profile.data_inizio && (
            <p className="text-xs text-[#1a1a1a]/40 mt-2">
              Inizio:{" "}
              {new Date(profile.data_inizio + "T00:00:00").toLocaleDateString("it-IT", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* ── KPI cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Pezzi settimana"
            value={pezziLordi.toString()}
            accent="#c0dde0"
          />
          <KpiCard
            label="Fail settimana"
            value={failTotali.toString()}
            accent="#f2d3a3"
          />
          <KpiCard
            label="% Fail"
            value={`${percentFail}%`}
            accent={percentFail > 20 ? "#f2d3a3" : "#c0dde0"}
          />
          <KpiCard
            label="Guadagno settimana"
            value={`€ ${guadagno.toFixed(2)}`}
            accent="#c0dde0"
          />
        </div>

        {/* ── Insert pezzi button ─────────────────────────────────────────────── */}
        <Link
          href="/dashboard/pezzi/nuovo"
          className="flex items-center justify-center gap-2 w-full py-4 bg-[#1a1a1a] text-white text-sm font-semibold rounded-2xl hover:bg-[#333] active:scale-[0.98] transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Inserisci Pezzi
        </Link>

        {/* ── Weekly breakdown ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider mb-2 px-1">
            Settimana corrente
          </h2>
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
            <div className="grid grid-cols-4 px-4 py-2 border-b border-[#1a1a1a]/6">
              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">Giorno</span>
              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-center">Pezzi</span>
              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-center">Fail</span>
              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-right">€</span>
            </div>
            {WEEK_DAYS.map(({ label, offset }) => {
              const dayDate = new Date(monday);
              dayDate.setDate(monday.getDate() + offset);
              const dayStr = toDateStr(dayDate);
              const dayPezzi = pezziByDay.get(dayStr) ?? [];
              const totPezzi = dayPezzi.reduce((s, p) => s + p.numero_pezzi, 0);
              const totFail = dayPezzi.reduce((s, p) => s + p.fail, 0);
              const totComm = dayPezzi.reduce((s, p) => s + Number(p.commissione), 0);
              const isToday = toDateStr(today) === dayStr;
              const hasPezzi = dayPezzi.length > 0;
              const href = hasPezzi
                ? `/dashboard/pezzi/${dayStr}`
                : `/dashboard/pezzi/nuovo`;

              return (
                <Link
                  key={dayStr}
                  href={href}
                  className={`grid grid-cols-4 px-4 py-3 border-b border-[#1a1a1a]/4 last:border-0 transition-colors hover:bg-[#f5f5f5] active:bg-[#f0f0f0] ${
                    isToday ? "bg-[#c0dde0]/10 hover:bg-[#c0dde0]/20" : ""
                  }`}
                >
                  <span className={`text-sm flex items-center gap-1.5 ${isToday ? "font-semibold text-[#1a1a1a]" : "text-[#1a1a1a]/60"}`}>
                    {label.slice(0, 3)}
                    {isToday && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#c0dde0]" />
                    )}
                  </span>
                  <span className={`text-sm text-center ${hasPezzi ? "font-semibold text-[#1a1a1a]" : "text-[#1a1a1a]/20"}`}>
                    {hasPezzi ? totPezzi : "—"}
                  </span>
                  <span className={`text-sm text-center ${hasPezzi && totFail > 0 ? "font-semibold text-[#1a1a1a]" : "text-[#1a1a1a]/20"}`}>
                    {hasPezzi ? totFail : "—"}
                  </span>
                  <span className={`text-sm text-right flex items-center justify-end gap-1.5 ${hasPezzi && totComm > 0 ? "font-semibold text-[#1a1a1a]" : "text-[#1a1a1a]/20"}`}>
                    {hasPezzi && totComm > 0 ? `€${totComm.toFixed(0)}` : "—"}
                    {hasPezzi && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#1a1a1a]/25 shrink-0">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Team section ───────────────────────────────────────────────────── */}
        {isLeader && (
          <section>
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider">
                Il Mio Team{teamName ? ` — ${teamName}` : ""}
              </h2>
              <Link
                href="/dashboard/team"
                className="flex items-center gap-1 text-xs font-semibold text-[#1a1a1a] hover:opacity-70 transition-opacity"
              >
                Vedi tutto
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            {teamMembers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-6 text-center">
                <p className="text-sm text-[#1a1a1a]/30">Nessun membro nel team</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
                {/* Column headers */}
                <div className="grid grid-cols-4 px-4 py-2 border-b border-[#1a1a1a]/6">
                  <span className="col-span-2 text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">Membro</span>
                  <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-center">Pezzi</span>
                  <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-right">€</span>
                </div>

                {teamMembers.map((m, i) => (
                  <div
                    key={m.id}
                    className={`grid grid-cols-4 items-center px-4 py-3 ${
                      i < teamMembers.length - 1 ? "border-b border-[#1a1a1a]/4" : ""
                    }`}
                  >
                    <div className="col-span-2 min-w-0">
                      <p className="text-sm font-semibold text-[#1a1a1a] truncate">
                        {m.full_name ?? "—"}
                      </p>
                      <p className="text-[10px] text-[#1a1a1a]/40">
                        {ROLE_LABELS[m.role ?? ""] ?? m.role ?? "—"}
                      </p>
                    </div>
                    <span className={`text-sm text-center ${m.pezzi > 0 ? "font-semibold text-[#1a1a1a]" : "text-[#1a1a1a]/20"}`}>
                      {m.pezzi > 0 ? m.pezzi : "—"}
                    </span>
                    <span className={`text-sm text-right ${m.commissione > 0 ? "font-semibold text-[#1a1a1a]" : "text-[#1a1a1a]/20"}`}>
                      {m.commissione > 0 ? `€${m.commissione.toFixed(0)}` : "—"}
                    </span>
                  </div>
                ))}

                {/* Totale row */}
                {(() => {
                  const totPezzi = teamMembers.reduce((s, m) => s + m.pezzi, 0);
                  const totFail  = teamMembers.reduce((s, m) => s + m.fail, 0);
                  const totComm  = teamMembers.reduce((s, m) => s + m.commissione, 0);
                  return (
                    <div className="grid grid-cols-4 items-center px-4 py-3 bg-[#f8f8f8] border-t border-[#1a1a1a]/8">
                      <div className="col-span-2">
                        <p className="text-xs font-bold text-[#1a1a1a]">Totale Team</p>
                        {totFail > 0 && (
                          <p className="text-[10px] text-[#1a1a1a]/40">{totFail} fail</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-[#1a1a1a] text-center">{totPezzi}</span>
                      <span className="text-sm font-bold text-[#1a1a1a] text-right">€{totComm.toFixed(0)}</span>
                    </div>
                  );
                })()}
              </div>
            )}
          </section>
        )}

        {/* ── Bonus section ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider">
              Bonus questa settimana
            </h2>
            <Link
              href="/dashboard/bonus/nuovo"
              className="flex items-center gap-1 text-xs font-semibold text-[#1a1a1a] hover:opacity-70 transition-opacity"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Dichiara
            </Link>
          </div>

          {bonus.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-6 text-center">
              <p className="text-sm text-[#1a1a1a]/30">Nessun bonus questa settimana</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
              {bonus.map((b, i) => (
                <div
                  key={b.id}
                  className={`flex items-center justify-between px-4 py-3.5 ${
                    i < bonus.length - 1 ? "border-b border-[#1a1a1a]/4" : ""
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a1a]">
                      {BONUS_LABELS[b.tipo] ?? b.tipo}
                    </p>
                    <p className="text-xs text-[#1a1a1a]/40 mt-0.5">
                      {new Date(b.data + "T00:00:00").toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.verificato ? (
                      <>
                        <span className="text-sm font-bold text-[#1a1a1a]">
                          € {Number(b.importo).toFixed(2)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#c0dde0]/40 text-[10px] font-semibold text-[#1a1a1a]">
                          ✓ Verificato
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#f2d3a3]/50 text-[10px] font-semibold text-[#1a1a1a]">
                        In attesa
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Monthly recap ───────────────────────────────────────────────────── */}
        <MonthlyRecap isLeader={isLeader} myPct={myPct} />

      </div>

      <BottomNav />
    </div>
  );
}

// ─── KPI card subcomponent ───────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl px-4 py-4 border border-[#1a1a1a]/6"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <p className="text-[11px] font-medium text-[#1a1a1a]/40 uppercase tracking-wide leading-tight">
        {label}
      </p>
      <p className="text-2xl font-bold text-[#1a1a1a] mt-1 leading-none">{value}</p>
    </div>
  );
}
