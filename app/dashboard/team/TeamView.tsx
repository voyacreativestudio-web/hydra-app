"use client";

import { useState } from "react";
import Link from "next/link";
import type { MemberSummary } from "./page";

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

type Props = {
  teamName: string;
  myRole: string;
  myCommissione: number;
  myPct: number | null;
  members: MemberSummary[];
  totalTeamProfitto: number;
  mondayStr: string;
  sundayStr: string;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

function formatWeekRange(mondayStr: string, sundayStr: string): string {
  const fmt = (s: string) =>
    new Date(s + "T00:00:00").toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
    });
  const year = new Date(sundayStr + "T00:00:00").getFullYear();
  return `${fmt(mondayStr)} – ${fmt(sundayStr)} ${year}`;
}

function formatDayLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function TeamView({
  teamName,
  myRole,
  myCommissione,
  myPct,
  members,
  totalTeamProfitto,
  mondayStr,
  sundayStr,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totPezzi = members.reduce((s, m) => s + m.pezziTotali, 0);
  const totFail  = members.reduce((s, m) => s + m.failTotali, 0);
  const totComm  = members.reduce((s, m) => s + m.commissione, 0);

  const myTeamBonus = myPct !== null ? (totalTeamProfitto * myPct) / 100 : null;
  const myTotal = myCommissione + (myTeamBonus ?? 0);

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
            <h1 className="text-base font-bold text-[#1a1a1a] leading-tight">
              Il Mio Team — {teamName}
            </h1>
            <p className="text-[11px] text-[#1a1a1a]/40">
              {formatWeekRange(mondayStr, sundayStr)}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-4">

        {/* ── Team profit card ───────────────────────────────────────────────── */}
        <div className="bg-[#c0dde0]/20 border border-[#c0dde0] rounded-2xl px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-[#1a1a1a]/50 uppercase tracking-wide">
            Profitto Team
          </p>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-[#1a1a1a]/40 mb-0.5">Totale commissioni team</p>
              <p className="text-3xl font-bold text-[#1a1a1a]">
                € {totalTeamProfitto.toFixed(2)}
              </p>
            </div>
            {myPct !== null && (
              <div className="text-right">
                <p className="text-[11px] text-[#1a1a1a]/40 mb-0.5">
                  La mia % ({ROLE_LABELS[myRole] ?? myRole})
                </p>
                <p className="text-lg font-bold text-[#1a1a1a]">{myPct}%</p>
              </div>
            )}
          </div>

          {myPct !== null && myTeamBonus !== null && (
            <div className="pt-3 border-t border-[#c0dde0]/60">
              <p className="text-[11px] text-[#1a1a1a]/40 mb-1">Il mio bonus team</p>
              <p className="text-xl font-bold text-[#1a1a1a]">
                € {myTeamBonus.toFixed(2)}
              </p>
              <p className="text-xs text-[#1a1a1a]/40 mt-0.5">
                €{totalTeamProfitto.toFixed(0)} × {myPct}% = €{myTeamBonus.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* ── Member list ────────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide px-1 mb-2">
            Membri ({members.length})
          </p>

          {members.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-8 text-center">
              <p className="text-sm text-[#1a1a1a]/30">Nessun membro nel team</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const isOpen = expanded.has(m.id);
                return (
                  <div key={m.id} className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
                    {/* Member row */}
                    <button
                      type="button"
                      onClick={() => toggle(m.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-[#f9f9f9]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1a1a1a] truncate">
                            {m.full_name}
                          </p>
                          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md bg-[#c0dde0]/40 text-[10px] font-semibold text-[#1a1a1a]">
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs ${m.pezziTotali > 0 ? "text-[#1a1a1a]/70 font-medium" : "text-[#1a1a1a]/25"}`}>
                            {m.pezziTotali > 0 ? `${m.pezziTotali} pezzi` : "0 pezzi"}
                          </span>
                          {m.failTotali > 0 && (
                            <span className="text-xs text-[#1a1a1a]/40">
                              {m.failTotali} fail
                            </span>
                          )}
                          <span className={`text-xs font-semibold ${m.commissione > 0 ? "text-[#1a1a1a]" : "text-[#1a1a1a]/25"}`}>
                            € {m.commissione.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`shrink-0 ml-2 text-[#1a1a1a]/30 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* Day breakdown (expanded) */}
                    {isOpen && (
                      <div className="border-t border-[#1a1a1a]/6">
                        {m.dayBreakdown.length === 0 ? (
                          <p className="px-4 py-3 text-xs text-[#1a1a1a]/30">
                            Nessun pezzo questa settimana
                          </p>
                        ) : (
                          <>
                            <div className="grid grid-cols-4 px-4 py-2 bg-[#f8f8f8]">
                              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide col-span-2">Giorno</span>
                              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-center">Pezzi</span>
                              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-right">€</span>
                            </div>
                            {m.dayBreakdown.map((day, i) => (
                              <div
                                key={day.data}
                                className={`grid grid-cols-4 items-center px-4 py-2.5 ${
                                  i < m.dayBreakdown.length - 1 ? "border-b border-[#1a1a1a]/4" : ""
                                }`}
                              >
                                <span className="col-span-2 text-xs text-[#1a1a1a]/60 capitalize">
                                  {formatDayLabel(day.data)}
                                </span>
                                <span className="text-xs font-semibold text-[#1a1a1a] text-center">
                                  {day.pezzi}
                                  {day.fail > 0 && (
                                    <span className="ml-1 text-[#1a1a1a]/40">({day.fail}✗)</span>
                                  )}
                                </span>
                                <span className="text-xs font-semibold text-[#1a1a1a] text-right">
                                  € {day.commissione.toFixed(0)}
                                </span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Totale team ────────────────────────────────────────────────────── */}
        {members.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
            <div className="grid grid-cols-3 px-4 py-2 border-b border-[#1a1a1a]/6">
              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">Totale Team</span>
              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-center">Pezzi</span>
              <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide text-right">€</span>
            </div>
            <div className="grid grid-cols-3 items-center px-4 py-3">
              <span className="text-xs text-[#1a1a1a]/50">
                {totFail > 0 ? `${totFail} fail totali` : `${members.length} membri`}
              </span>
              <span className="text-lg font-bold text-[#1a1a1a] text-center">{totPezzi}</span>
              <span className="text-lg font-bold text-[#1a1a1a] text-right">€{totComm.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* ── Totale guadagno personale ──────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide px-1 mb-2">
            Totale Guadagno Personale
          </p>
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/6">
              <span className="text-sm text-[#1a1a1a]/60">Le mie commissioni</span>
              <span className="text-sm font-semibold text-[#1a1a1a]">
                € {myCommissione.toFixed(2)}
              </span>
            </div>
            {myTeamBonus !== null && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]/6">
                <div>
                  <span className="text-sm text-[#1a1a1a]/60">Il mio bonus team</span>
                  {myPct !== null && (
                    <p className="text-[11px] text-[#1a1a1a]/30">
                      €{totalTeamProfitto.toFixed(0)} × {myPct}%
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-[#1a1a1a]">
                  + € {myTeamBonus.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-4 bg-[#f8f8f8]">
              <span className="text-sm font-bold text-[#1a1a1a]">Totale</span>
              <span className="text-xl font-bold text-[#1a1a1a]">
                € {myTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
