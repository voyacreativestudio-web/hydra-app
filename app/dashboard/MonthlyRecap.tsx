"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── types ────────────────────────────────────────────────────────────────────

type WeekRow = {
  settimana_inizio: string;
  pezzi: number;
  fail: number;
  commissione: number;
};

type MonthData = {
  totalPezzi: number;
  totalFail: number;
  totalGuadagno: number;
  totalBonusVerificati: number;
  weeks: WeekRow[];
};

type TeamMonthData = {
  totalTeamProfitto: number;
  teamBonus: number | null;
};

// ─── constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatWeekRange(mondayStr: string, index: number): string {
  const monday = new Date(mondayStr + "T00:00:00");
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `Sett. ${index + 1}  (${fmt(monday)} – ${fmt(sunday)})`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f8f8f8] rounded-xl px-3 py-3 text-center">
      <p className="text-[10px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide leading-tight mb-1">
        {label}
      </p>
      <p className="text-lg font-bold text-[#1a1a1a] leading-none">{value}</p>
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

type Props = {
  isLeader: boolean;
  myPct: number | null;
};

export default function MonthlyRecap({ isLeader, myPct }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [data, setData] = useState<MonthData | null>(null);
  const [teamData, setTeamData] = useState<TeamMonthData | null>(null);
  const [loading, setLoading] = useState(true);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setData(null);
    setTeamData(null);

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstStr = firstDay.toISOString().split("T")[0];
    const lastStr = lastDay.toISOString().split("T")[0];

    const supabase = createClient();

    const [{ data: pezziRaw }, { data: bonusRaw }] = await Promise.all([
      supabase
        .from("pezzi")
        .select("settimana_inizio, numero_pezzi, fail, commissione")
        .gte("data", firstStr)
        .lte("data", lastStr),
      supabase
        .from("bonus")
        .select("importo, verificato")
        .gte("data", firstStr)
        .lte("data", lastStr),
    ]);

    // Group pezzi by settimana_inizio
    const weekMap = new Map<string, WeekRow>();
    for (const p of pezziRaw ?? []) {
      const cur = weekMap.get(p.settimana_inizio) ?? {
        settimana_inizio: p.settimana_inizio,
        pezzi: 0,
        fail: 0,
        commissione: 0,
      };
      weekMap.set(p.settimana_inizio, {
        settimana_inizio: p.settimana_inizio,
        pezzi: cur.pezzi + p.numero_pezzi,
        fail: cur.fail + (p.fail ?? 0),
        commissione: cur.commissione + Number(p.commissione),
      });
    }

    const weeks = Array.from(weekMap.values()).sort((a, b) =>
      a.settimana_inizio.localeCompare(b.settimana_inizio)
    );

    const totalPezzi = weeks.reduce((s, w) => s + w.pezzi, 0);
    const totalFail = weeks.reduce((s, w) => s + w.fail, 0);
    const totalGuadagno = weeks.reduce((s, w) => s + w.commissione, 0);
    const totalBonusVerificati = (bonusRaw ?? [])
      .filter((b) => b.verificato)
      .reduce((s, b) => s + Number(b.importo), 0);

    setData({ totalPezzi, totalFail, totalGuadagno, totalBonusVerificati, weeks });

    // Fetch team data for leaders
    if (isLeader) {
      try {
        const res = await fetch(`/api/monthly-team?year=${year}&month=${month}`);
        if (res.ok) {
          const td = await res.json();
          setTeamData(td);
        }
      } catch {
        // silently ignore
      }
    }

    setLoading(false);
  }, [year, month, isLeader]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pctFail = data && data.totalPezzi > 0
    ? Math.round((data.totalFail / data.totalPezzi) * 100)
    : 0;

  const totalNetto = (data?.totalGuadagno ?? 0) + (data?.totalBonusVerificati ?? 0);
  const totalComplessivo = totalNetto + (teamData?.teamBonus ?? 0);

  return (
    <section>
      {/* Section header + month selector */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider">
          📅 Riepilogo Mensile
        </h2>
      </div>

      <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">

        {/* Month navigator */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/6">
          <button
            type="button"
            onClick={prevMonth}
            className="flex items-center gap-1 text-xs font-semibold text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors px-2 py-1.5 rounded-xl hover:bg-[#f5f5f5]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {MONTH_NAMES[month === 0 ? 11 : month - 1].slice(0, 3)}.
          </button>

          <div className="text-center">
            <p className="text-sm font-bold text-[#1a1a1a]">
              {MONTH_NAMES[month]} {year}
            </p>
            {isCurrentMonth && (
              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                Mese corrente
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={nextMonth}
            className="flex items-center gap-1 text-xs font-semibold text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors px-2 py-1.5 rounded-xl hover:bg-[#f5f5f5]"
          >
            {MONTH_NAMES[month === 11 ? 0 : month + 1].slice(0, 3)}.
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[#1a1a1a]/30">Caricamento...</p>
          </div>
        ) : data ? (
          <>
            {/* KPI grid */}
            <div className="px-4 pt-4 pb-3 grid grid-cols-3 gap-2">
              <MiniKpi label="Pezzi" value={data.totalPezzi.toString()} />
              <MiniKpi label="Fail" value={data.totalFail.toString()} />
              <MiniKpi label="% Fail" value={`${pctFail}%`} />
              <MiniKpi label="Guadagno" value={`€${data.totalGuadagno.toFixed(0)}`} />
              <MiniKpi label="Bonus ✓" value={`€${data.totalBonusVerificati.toFixed(0)}`} />
              <MiniKpi label="Totale Netto" value={`€${totalNetto.toFixed(0)}`} />
            </div>

            {/* Weekly breakdown */}
            {data.weeks.length > 0 && (
              <div className="border-t border-[#1a1a1a]/6">
                <div className="grid grid-cols-3 px-4 py-2 bg-[#f8f8f8]">
                  <span className="col-span-1 text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">Settimana</span>
                  <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-center">Pezzi</span>
                  <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-right">€</span>
                </div>
                {data.weeks.map((w, i) => (
                  <div
                    key={w.settimana_inizio}
                    className="grid grid-cols-3 items-center px-4 py-2.5 border-b border-[#1a1a1a]/4 last:border-0"
                  >
                    <span className="col-span-1 text-[11px] text-[#1a1a1a]/50 pr-2 leading-tight">
                      {formatWeekRange(w.settimana_inizio, i)}
                    </span>
                    <span className="text-sm font-semibold text-[#1a1a1a] text-center">{w.pezzi}</span>
                    <span className="text-sm font-semibold text-[#1a1a1a] text-right">€{w.commissione.toFixed(0)}</span>
                  </div>
                ))}
                {/* Totale mese row */}
                <div className="grid grid-cols-3 items-center px-4 py-3 bg-[#f8f8f8] border-t border-[#1a1a1a]/8">
                  <span className="text-xs font-bold text-[#1a1a1a]">Totale mese</span>
                  <span className="text-sm font-bold text-[#1a1a1a] text-center">{data.totalPezzi}</span>
                  <span className="text-sm font-bold text-[#1a1a1a] text-right">€{data.totalGuadagno.toFixed(0)}</span>
                </div>
              </div>
            )}

            {data.weeks.length === 0 && (
              <div className="px-4 py-6 text-center border-t border-[#1a1a1a]/6">
                <p className="text-sm text-[#1a1a1a]/30">Nessun dato per questo mese</p>
              </div>
            )}

            {/* Team section for leaders */}
            {isLeader && teamData && (teamData.totalTeamProfitto > 0 || teamData.teamBonus !== null) && (
              <div className="border-t border-[#1a1a1a]/6 px-4 py-4 space-y-2.5">
                <p className="text-[10px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide">
                  Team del mese
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#1a1a1a]/60">Commissioni team</span>
                  <span className="text-sm font-semibold text-[#1a1a1a]">
                    € {teamData.totalTeamProfitto.toFixed(2)}
                  </span>
                </div>
                {teamData.teamBonus !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#1a1a1a]/60">
                      Mio bonus team ({myPct}%)
                    </span>
                    <span className="text-sm font-semibold text-[#1a1a1a]">
                      + € {teamData.teamBonus.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-[#1a1a1a]/8">
                  <span className="text-sm font-bold text-[#1a1a1a]">Totale complessivo</span>
                  <span className="text-base font-bold text-[#1a1a1a]">
                    € {totalComplessivo.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
