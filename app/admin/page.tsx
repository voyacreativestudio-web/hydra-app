import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

type RecentPezzo = {
  id: string;
  data: string;
  numero_pezzi: number;
  tipo: string | null;
  commissione: number;
  profiles: { full_name: string | null } | null;
};

export default async function AdminPage() {
  const admin = getAdminClient();

  const today = new Date();
  const monday = getMondayOfWeek(today);
  const mondayStr = toLocalDateStr(monday);
  const sundayStr = toLocalDateStr(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6));

  const [pendingRes, activeRes, pezziWeekRes, bonusPendingRes, recentRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("pezzi").select("numero_pezzi, fail").gte("data", mondayStr).lte("data", sundayStr),
    admin.from("bonus").select("id", { count: "exact", head: true }).eq("verificato", false),
    admin.from("pezzi")
      .select("id, data, numero_pezzi, tipo, commissione, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const pendingCount = pendingRes.count ?? 0;
  const activeCount = activeRes.count ?? 0;
  const pezziRows = pezziWeekRes.data ?? [];
  const weekPezzi = pezziRows.reduce((s, r) => s + (r.numero_pezzi ?? 0), 0);
  const weekFail = pezziRows.reduce((s, r) => s + (r.fail ?? 0), 0);
  const bonusPending = bonusPendingRes.count ?? 0;
  const recentPezzi = (recentRes.data as unknown as RecentPezzo[]) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Dashboard Admin</h1>
        <p className="text-sm text-[#1a1a1a]/40 mt-1">Panoramica attività del team</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Utenti Attivi" value={activeCount} accent="#c0dde0" />
        <StatCard label="In Attesa" value={pendingCount} accent="#f2d3a3" href="/admin/utenti" />
        <StatCard label="Pezzi Settimana" value={weekPezzi} accent="#c0dde0" href="/admin/pezzi" />
        <StatCard label="Fail Settimana" value={weekFail} accent="#f2d3a3" href="/admin/pezzi" />
      </div>

      {/* Quick actions */}
      {(pendingCount > 0 || bonusPending > 0) && (
        <section>
          <h2 className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider mb-3">
            Azioni richieste
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingCount > 0 && (
              <ActionCard
                href="/admin/utenti"
                label={`${pendingCount} utent${pendingCount === 1 ? "e" : "i"} in attesa di approvazione`}
                cta="Approva ora"
                accent="#f2d3a3"
              />
            )}
            {bonusPending > 0 && (
              <ActionCard
                href="/admin/bonus"
                label={`${bonusPending} bonus da verificare`}
                cta="Verifica"
                accent="#c0dde0"
              />
            )}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <h2 className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider mb-3">
          Ultimi pezzi inseriti
        </h2>
        {recentPezzi.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-8 text-center">
            <p className="text-sm text-[#1a1a1a]/30">Nessun dato</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a]/6 bg-[#f8f8f8]">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide">Utente</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide">Tipo</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide">Pezzi</th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide">€</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPezzi.map((p) => (
                    <tr key={p.id} className="border-b border-[#1a1a1a]/4 last:border-0 hover:bg-[#f8f8f8] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#1a1a1a] max-w-[160px] truncate">
                        {p.profiles?.full_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[#1a1a1a]/50 whitespace-nowrap">
                        {new Date(p.data + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                          p.tipo === "street" ? "bg-[#c0dde0]/40 text-[#1a1a1a]" : "bg-[#f2d3a3]/40 text-[#1a1a1a]"
                        }`}>
                          {p.tipo ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1a1a1a]">{p.numero_pezzi}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#1a1a1a]">€ {Number(p.commissione).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";

function StatCard({ label, value, accent, href }: { label: string; value: number; accent: string; href?: string }) {
  const inner = (
    <div className="bg-white rounded-2xl px-5 py-5 border border-[#1a1a1a]/6 hover:border-[#1a1a1a]/12 transition-colors" style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>
      <p className="text-[11px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide leading-tight">{label}</p>
      <p className="text-3xl font-bold text-[#1a1a1a] mt-1 leading-none">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>;
}

function ActionCard({ href, label, cta, accent }: { href: string; label: string; cta: string; accent: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4 hover:border-[#1a1a1a]/12 transition-colors"
      style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
    >
      <p className="text-sm text-[#1a1a1a]/70">{label}</p>
      <span className="text-sm font-semibold text-[#1a1a1a] shrink-0">{cta} →</span>
    </Link>
  );
}
