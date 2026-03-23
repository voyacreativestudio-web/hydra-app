"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ─── types ────────────────────────────────────────────────────────────────────

type SlotValue =
  | "full"
  | "mattina"
  | "pomeriggio"
  | "mezzo_turno"
  | "ufficio"
  | "assente";

type DayKey = "martedi" | "mercoledi" | "giovedi" | "venerdi" | "sabato" | "domenica";

type Week = Record<DayKey, SlotValue>;

// ─── constants ────────────────────────────────────────────────────────────────

const DAY_KEYS: DayKey[] = [
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  "sabato",
  "domenica",
];

const DAY_LABELS: Record<DayKey, string> = {
  martedi: "Martedì",
  mercoledi: "Mercoledì",
  giovedi: "Giovedì",
  venerdi: "Venerdì",
  sabato: "Sabato",
  domenica: "Domenica",
};

// offset from Monday (index 0)
const DAY_OFFSET: Record<DayKey, number> = {
  martedi: 1,
  mercoledi: 2,
  giovedi: 3,
  venerdi: 4,
  sabato: 5,
  domenica: 6,
};

const SLOTS: { value: SlotValue; label: string; emoji: string }[] = [
  { value: "full",        label: "Full",        emoji: "🟢" },
  { value: "mattina",     label: "Mattina",     emoji: "🌅" },
  { value: "pomeriggio",  label: "Pomeriggio",  emoji: "🌆" },
  { value: "mezzo_turno", label: "Mezzo Turno", emoji: "⚡" },
  { value: "ufficio",     label: "Ufficio",     emoji: "🏢" },
  { value: "assente",     label: "Assente",     emoji: "❌" },
];

const DEFAULT_WEEK: Week = {
  martedi: "assente",
  mercoledi: "assente",
  giovedi: "assente",
  venerdi: "assente",
  sabato: "assente",
  domenica: "assente",
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addWeeks(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n * 7);
  return copy;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  const year = sunday.getFullYear();
  return `${fmt(monday)} – ${fmt(sunday)} ${year}`;
}

function formatDayDate(monday: Date, offset: number): string {
  const d = new Date(monday);
  d.setDate(monday.getDate() + offset);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

// ─── component ────────────────────────────────────────────────────────────────

export default function DisponibilitaPage() {
  const [monday, setMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [week, setWeek] = useState<Week>(DEFAULT_WEEK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mondayStr = toDateStr(monday);

  const loadWeek = useCallback(async (mondayDate: Date) => {
    setLoading(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { data } = await supabase
      .from("disponibilita")
      .select("martedi, mercoledi, giovedi, venerdi, sabato, domenica")
      .eq("settimana_inizio", toDateStr(mondayDate))
      .maybeSingle();

    setWeek(data ? (data as Week) : { ...DEFAULT_WEEK });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWeek(monday);
  }, [monday, loadWeek]);

  function setSlot(day: DayKey, value: SlotValue) {
    setSaved(false);
    setWeek((prev) => ({ ...prev, [day]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sessione scaduta. Effettua di nuovo il login.");
      setSaving(false);
      return;
    }

    const { error: upsertError } = await supabase
      .from("disponibilita")
      .upsert(
        { user_id: user.id, settimana_inizio: mondayStr, ...week },
        { onConflict: "user_id,settimana_inizio" }
      );

    if (upsertError) {
      setError("Errore nel salvataggio. Riprova.");
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
  }

  const isCurrentWeek =
    toDateStr(getMondayOfWeek(new Date())) === mondayStr;

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
          <h1 className="text-base font-bold text-[#1a1a1a]">Disponibilità Settimanale</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-4">

        {/* Week selector */}
        <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMonday((m) => addWeeks(m, -1))}
            className="flex items-center gap-1 text-xs font-semibold text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors px-2 py-1.5 rounded-xl hover:bg-[#f5f5f5]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Prec.
          </button>

          <div className="text-center">
            <p className="text-sm font-bold text-[#1a1a1a]">{formatWeekRange(monday)}</p>
            {isCurrentWeek && (
              <span className="text-[10px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide">
                Settimana corrente
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMonday((m) => addWeeks(m, 1))}
            className="flex items-center gap-1 text-xs font-semibold text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors px-2 py-1.5 rounded-xl hover:bg-[#f5f5f5]"
          >
            Succ.
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Availability grid */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-8 text-center">
            <p className="text-sm text-[#1a1a1a]/30">Caricamento...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {DAY_KEYS.map((day) => {
              const selected = week[day];
              const selectedSlot = SLOTS.find((s) => s.value === selected)!;
              const dayDate = formatDayDate(monday, DAY_OFFSET[day]);

              return (
                <div
                  key={day}
                  className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden"
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between px-4 pt-3 pb-2">
                    <div>
                      <p className="text-sm font-bold text-[#1a1a1a]">
                        {DAY_LABELS[day]}
                      </p>
                      <p className="text-[11px] text-[#1a1a1a]/40">{dayDate}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        selected === "assente"
                          ? "bg-[#f5f5f5] text-[#1a1a1a]/40"
                          : selected === "full"
                          ? "bg-[#c0dde0]/40 text-[#1a1a1a]"
                          : "bg-[#f2d3a3]/40 text-[#1a1a1a]"
                      }`}
                    >
                      {selectedSlot.emoji} {selectedSlot.label}
                    </span>
                  </div>

                  {/* Slot pills */}
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    {SLOTS.map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => setSlot(day, slot.value)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          selected === slot.value
                            ? "bg-[#1a1a1a] text-white"
                            : "bg-[#f5f5f5] text-[#1a1a1a]/50 hover:bg-[#ececec] hover:text-[#1a1a1a]/70"
                        }`}
                      >
                        <span>{slot.emoji}</span>
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-[#f2d3a3]/40 border border-[#f2d3a3]">
            <p className="text-xs text-[#1a1a1a]/70">{error}</p>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className={`w-full py-4 text-sm font-bold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            saved
              ? "bg-[#c0dde0] text-[#1a1a1a]"
              : "bg-[#1a1a1a] text-white hover:bg-[#333]"
          }`}
        >
          {saving
            ? "Salvataggio..."
            : saved
            ? "Disponibilità salvata! ✓"
            : "Salva Disponibilità"}
        </button>

      </div>
    </div>
  );
}
