"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

type Profile = { id: string; full_name: string | null };

type PezzoRow = {
  id: string;
  data: string;
  numero_pezzi: number;
  fail: number;
  mix_value: string | null;
  tipo: string | null;
  commissione: number;
  settimana_inizio: string;
  profiles: { full_name: string | null } | null;
};

export default function PezziAdminPage() {
  const [pezzi, setPezzi] = useState<PezzoRow[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [weekMonday, setWeekMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [editingFailId, setEditingFailId] = useState<string | null>(null);
  const [failInput, setFailInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPezzi = useCallback(async (monday: Date, userId: string) => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const mondayStr = toDateStr(monday);

    const sundayStr = toDateStr(addDays(monday, 6));
    let query = supabase
      .from("pezzi")
      .select(
        "id, data, numero_pezzi, fail, mix_value, tipo, commissione, settimana_inizio, profiles(full_name)"
      )
      .gte("data", mondayStr)
      .lte("data", sundayStr)
      .order("data")
      .order("created_at");

    if (userId) query = query.eq("user_id", userId);

    const { data, error: err } = await query;
    if (err) setError(err.message);
    else setPezzi((data as unknown as PezzoRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => setUsers(data ?? []));
  }, []);

  useEffect(() => {
    fetchPezzi(weekMonday, selectedUserId);
  }, [weekMonday, selectedUserId, fetchPezzi]);

  async function saveFail(id: string, fail: number) {
    const res = await fetch(`/api/admin/pezzi/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fail }),
    });
    if (res.ok) {
      const { fail: newFail, commissione } = await res.json();
      setPezzi((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, fail: newFail, commissione } : p
        )
      );
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Errore aggiornamento fail");
    }
    setEditingFailId(null);
  }

  const totalPezzi = pezzi.reduce((s, p) => s + p.numero_pezzi, 0);
  const totalFail = pezzi.reduce((s, p) => s + p.fail, 0);
  const totalNetti = totalPezzi - totalFail;
  const totalComm = pezzi.reduce((s, p) => s + Number(p.commissione), 0);

  const mondayStr = toDateStr(weekMonday);
  const sundayStr = toDateStr(addDays(weekMonday, 6));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1a1a1a]">Pezzi & Fail</h1>
      <div className="space-y-4">
        {error && (
          <div className="bg-[#f2d3a3]/40 border border-[#f2d3a3] rounded-xl px-4 py-3 text-sm text-[#1a1a1a]">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Week selector */}
          <div className="flex items-center gap-2 bg-white border border-[#1a1a1a]/10 rounded-xl px-3 py-2">
            <button
              onClick={() => setWeekMonday((d) => addDays(d, -7))}
              className="text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
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
            </button>
            <span className="text-sm font-medium text-[#1a1a1a] min-w-[140px] text-center">
              {mondayStr} → {sundayStr}
            </span>
            <button
              onClick={() => setWeekMonday((d) => addDays(d, 7))}
              className="text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
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
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* User filter */}
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
          >
            <option value="">Tutti gli utenti</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ?? u.id}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-10 text-center">
            <p className="text-sm text-[#1a1a1a]/30">Caricamento...</p>
          </div>
        ) : pezzi.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-10 text-center">
            <p className="text-sm text-[#1a1a1a]/30">
              Nessun dato per questa settimana
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a]/6">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                      Utente
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                      Data
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                      MIX
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                      Pezzi
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                      Fail
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                      Netti
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                      Commissione
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pezzi.map((p, i) => {
                    const netti = p.numero_pezzi - p.fail;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-[#1a1a1a]/4 last:border-0 ${
                          i % 2 === 1 ? "bg-[#f8f8f8]/50" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-[#1a1a1a] max-w-[140px] truncate">
                          {p.profiles?.full_name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[#1a1a1a]/60 whitespace-nowrap">
                          {new Date(p.data + "T00:00:00").toLocaleDateString(
                            "it-IT",
                            { day: "numeric", month: "short" }
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                              p.tipo === "street"
                                ? "bg-[#c0dde0]/40 text-[#1a1a1a]"
                                : "bg-[#f2d3a3]/40 text-[#1a1a1a]"
                            }`}
                          >
                            {p.tipo ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#1a1a1a]/60">
                          {p.mix_value ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1a1a1a]">
                          {p.numero_pezzi}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingFailId === p.id ? (
                            <input
                              type="number"
                              min="0"
                              max={p.numero_pezzi}
                              value={failInput}
                              onChange={(e) => setFailInput(e.target.value)}
                              onBlur={() => {
                                const v = parseInt(failInput, 10);
                                if (!isNaN(v)) saveFail(p.id, v);
                                else setEditingFailId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = parseInt(failInput, 10);
                                  if (!isNaN(v)) saveFail(p.id, v);
                                  else setEditingFailId(null);
                                } else if (e.key === "Escape") {
                                  setEditingFailId(null);
                                }
                              }}
                              autoFocus
                              className="w-16 text-right px-2 py-1 rounded-lg border border-[#c0dde0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                            />
                          ) : (
                            <button
                              onClick={() => {
                                setEditingFailId(p.id);
                                setFailInput(String(p.fail));
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm font-medium hover:bg-[#f2d3a3]/40 transition-colors ${
                                p.fail > 0
                                  ? "text-[#1a1a1a] font-semibold"
                                  : "text-[#1a1a1a]/30"
                              }`}
                            >
                              {p.fail}
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="opacity-40"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1a1a1a]">
                          {netti}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1a1a1a]">
                          € {Number(p.commissione).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f8f8f8] border-t border-[#1a1a1a]/8">
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-xs font-bold text-[#1a1a1a] uppercase tracking-wide"
                    >
                      Totale
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#1a1a1a]">
                      {totalPezzi}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#1a1a1a]">
                      {totalFail}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#1a1a1a]">
                      {totalNetti}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-[#1a1a1a]">
                      € {totalComm.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
