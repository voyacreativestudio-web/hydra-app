import Link from "next/link";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default async function AdminPage() {
  const admin = getAdminClient();

  const today = new Date();
  const monday = getMondayOfWeek(today);
  const mondayStr = toDateStr(monday);

  // Fetch stats in parallel
  const [pendingRes, activeRes, pezziRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("pezzi")
      .select("numero_pezzi, fail")
      .eq("settimana_inizio", mondayStr),
  ]);

  const pendingCount = pendingRes.count ?? 0;
  const activeCount = activeRes.count ?? 0;

  const pezziRows = pezziRes.data ?? [];
  const weekPezzi = pezziRows.reduce((s, r) => s + (r.numero_pezzi ?? 0), 0);
  const weekFail = pezziRows.reduce((s, r) => s + (r.fail ?? 0), 0);

  const navCards = [
    {
      href: "/admin/utenti",
      emoji: "👥",
      label: "Utenti",
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      href: "/admin/pezzi",
      emoji: "📋",
      label: "Pezzi & Fail",
      badge: null,
    },
    {
      href: "/admin/bonus",
      emoji: "⭐",
      label: "Bonus",
      badge: null,
    },
    {
      href: "/admin/contratti",
      emoji: "📄",
      label: "Contratti",
      badge: null,
    },
    {
      href: "/admin/eventi",
      emoji: "📅",
      label: "Piano Eventi",
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f8f8] pb-16">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[#1a1a1a]/6 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-medium text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </Link>
          <span className="text-[#1a1a1a]/20">/</span>
          <span className="text-sm font-semibold text-[#1a1a1a]">
            Admin Panel
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Admin Panel</h1>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="In Attesa" value={pendingCount} accent="#f2d3a3" />
          <StatCard label="Utenti Attivi" value={activeCount} accent="#c0dde0" />
          <StatCard label="Pezzi Settimana" value={weekPezzi} accent="#c0dde0" />
          <StatCard label="Fail Settimana" value={weekFail} accent="#f2d3a3" />
        </div>

        {/* Nav cards */}
        <section>
          <h2 className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider mb-3 px-1">
            Gestione
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {navCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-5 flex items-center gap-3 hover:border-[#c0dde0] hover:bg-[#c0dde0]/5 active:scale-[0.98] transition-all"
              >
                <span className="text-2xl">{card.emoji}</span>
                <span className="text-sm font-semibold text-[#1a1a1a] flex-1">
                  {card.label}
                </span>
                {card.badge !== null && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#f2d3a3] text-[10px] font-bold text-[#1a1a1a]">
                    {card.badge}
                  </span>
                )}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#1a1a1a]/25"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
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
      <p className="text-2xl font-bold text-[#1a1a1a] mt-1 leading-none">
        {value}
      </p>
    </div>
  );
}
