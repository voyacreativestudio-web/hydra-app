import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

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

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)} ${sunday.getFullYear()}`;
}

function formatDayFull(d: Date): string {
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(t: string): string {
  // t is "HH:MM:SS" from Postgres time
  return t.slice(0, 5);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// ─── types ────────────────────────────────────────────────────────────────────

type EventRow = {
  id: string;
  nome: string;
  indirizzo: string;
  lat: number | null;
  lng: number | null;
  data: string;
  orario_inizio: string;
  orario_fine: string | null;
  note: string | null;
};

type CoworkerRow = {
  id: string;
  full_name: string | null;
};

type DayEvent = EventRow & { coworkers: CoworkerRow[] };

type DayPlan = {
  date: Date;
  dateStr: string;
  events: DayEvent[];
};

// ─── page ────────────────────────────────────────────────────────────────────

type Props = { searchParams: Promise<{ week?: string }> };

export default async function PlanPage({ searchParams }: Props) {
  const params = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") redirect("/pending");

  // domicilio columns may not exist yet — fetch separately so a missing column
  // doesn't break the status check above
  let domicilioData: { domicilio_lat?: number | null; domicilio_lng?: number | null } | null = null;
  try {
    const { data } = await admin
      .from("profiles")
      .select("domicilio_lat, domicilio_lng")
      .eq("id", user.id)
      .single();
    domicilioData = data;
  } catch {
    // columns don't exist yet — distance feature disabled until migration runs
  }

  // Resolve week from URL param or current week
  let monday: Date;
  if (params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)) {
    monday = getMondayOfWeek(new Date(params.week + "T00:00:00"));
  } else {
    monday = getMondayOfWeek(new Date());
  }

  const prevMondayStr = toDateStr(addDays(monday, -7));
  const nextMondayStr = toDateStr(addDays(monday, 7));

  // Days to show: Tue–Sat (offsets 1–5)
  const DAYS = [1, 2, 3, 4, 5].map((offset) => {
    const d = addDays(monday, offset);
    return { date: d, dateStr: toDateStr(d) };
  });

  const domicilioLat = domicilioData?.domicilio_lat ?? null;
  const domicilioLng = domicilioData?.domicilio_lng ?? null;

  // ── Fetch events for this week ─────────────────────────────────────────────
  // Gracefully handle missing table
  let dayPlans: DayPlan[] = DAYS.map((d) => ({ ...d, events: [] }));

  try {
    const weekDateStrs = new Set(DAYS.map((d) => d.dateStr));

    const { data: assignmentsRaw, error: assignErr } = await admin
      .from("evento_assignments")
      .select("event_id, eventi(id, nome, indirizzo, lat, lng, data, orario_inizio, orario_fine, note)")
      .eq("user_id", user.id);

    if (!assignErr && assignmentsRaw) {
      // Collect events that fall within the current week
      const events: EventRow[] = assignmentsRaw
        .map((a) => (a as unknown as { eventi: EventRow | null }).eventi)
        .filter((e): e is EventRow => e !== null && weekDateStrs.has(e.data));

      if (events.length > 0) {
        // Fetch all assignments for these events to get coworkers
        const { data: allAssignments } = await admin
          .from("evento_assignments")
          .select("event_id, profiles(id, full_name)")
          .in("event_id", events.map((e) => e.id))
          .neq("user_id", user.id);

        const coworkerMap = new Map<string, CoworkerRow[]>();
        for (const a of allAssignments ?? []) {
          const p = (a as unknown as { profiles: CoworkerRow | null }).profiles;
          if (!p) continue;
          const cur = coworkerMap.get(a.event_id) ?? [];
          coworkerMap.set(a.event_id, [...cur, p]);
        }

        const dayEvents: DayEvent[] = events.map((e) => ({
          ...e,
          coworkers: coworkerMap.get(e.id) ?? [],
        }));

        dayPlans = DAYS.map((d) => ({
          ...d,
          events: dayEvents
            .filter((e) => e.data === d.dateStr)
            .sort((a, b) => a.orario_inizio.localeCompare(b.orario_inizio)),
        }));
      }
    }
  } catch {
    // evento_assignments/eventi tables don't exist yet — show empty state
  }

  const isCurrentWeek = toDateStr(getMondayOfWeek(new Date())) === toDateStr(monday);

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
          <div>
            <h1 className="text-base font-bold text-[#1a1a1a] leading-tight">Piano Settimanale</h1>
            <p className="text-[11px] text-[#1a1a1a]/40">{formatWeekRange(monday)}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-3">

        {/* Week navigator */}
        <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-3 flex items-center justify-between">
          <Link
            href={`/dashboard/plan?week=${prevMondayStr}`}
            className="flex items-center gap-1 text-xs font-semibold text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors px-2 py-1.5 rounded-xl hover:bg-[#f5f5f5]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prec.
          </Link>

          <div className="text-center">
            <p className="text-sm font-bold text-[#1a1a1a]">{formatWeekRange(monday)}</p>
            {isCurrentWeek && (
              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                Settimana corrente
              </span>
            )}
          </div>

          <Link
            href={`/dashboard/plan?week=${nextMondayStr}`}
            className="flex items-center gap-1 text-xs font-semibold text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors px-2 py-1.5 rounded-xl hover:bg-[#f5f5f5]"
          >
            Succ.
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {/* Day cards */}
        {dayPlans.map(({ date, events }) => {
          const isToday = toDateStr(date) === toDateStr(new Date());
          return (
            <div
              key={toDateStr(date)}
              className={`bg-white rounded-2xl border overflow-hidden ${
                isToday ? "border-[#c0dde0]" : "border-[#1a1a1a]/6"
              }`}
            >
              {/* Day header */}
              <div className={`flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/6 ${
                isToday ? "bg-[#c0dde0]/10" : ""
              }`}>
                <p className={`text-sm font-bold capitalize ${isToday ? "text-[#1a1a1a]" : "text-[#1a1a1a]/70"}`}>
                  {formatDayFull(date)}
                </p>
                {isToday && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#c0dde0]/50 text-[10px] font-semibold text-[#1a1a1a]">
                    Oggi
                  </span>
                )}
              </div>

              {/* Events or empty */}
              {events.length === 0 ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-[#1a1a1a]/25">Nessun evento assegnato</p>
                </div>
              ) : (
                <div className="divide-y divide-[#1a1a1a]/4">
                  {events.map((ev) => {
                    const distKm =
                      domicilioLat != null &&
                      domicilioLng != null &&
                      ev.lat != null &&
                      ev.lng != null
                        ? haversineKm(domicilioLat, domicilioLng, ev.lat, ev.lng)
                        : null;

                    return (
                      <div key={ev.id} className="px-4 py-4 space-y-3">
                        {/* Event name + time */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-[#1a1a1a]">📍 {ev.nome}</p>
                            <p className="text-xs text-[#1a1a1a]/50 mt-0.5">{ev.indirizzo}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-[#1a1a1a]">
                              🕐 {formatTime(ev.orario_inizio)}
                              {ev.orario_fine ? ` – ${formatTime(ev.orario_fine)}` : ""}
                            </p>
                            {distKm !== null && (
                              <p className="text-[11px] text-[#1a1a1a]/40 mt-0.5">
                                📏 ~{distKm.toFixed(1)} km da casa
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Coworkers */}
                        {ev.coworkers.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-1.5">
                              👥 Con te
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {ev.coworkers.map((c) => (
                                <span
                                  key={c.id}
                                  className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#f5f5f5] text-xs font-medium text-[#1a1a1a]/70"
                                >
                                  {c.full_name ?? "—"}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Note */}
                        {ev.note && (
                          <p className="text-xs text-[#1a1a1a]/50 italic">{ev.note}</p>
                        )}

                        {/* Maps button */}
                        <a
                          href={mapsUrl(ev.indirizzo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a1a] text-white text-xs font-semibold hover:bg-[#333] transition-colors"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          🗺️ Apri in Maps
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

      </div>
    </div>
  );
}
