"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type CommissionRow = {
  mix_value: number;
  starter_street: number;
  starter_evento: number;
  profitto_team_1: number;
  profitto_team_2: number;
};

type Props = {
  userId: string;
  userRole: string;
  defaultTipo: string;
  commissioni: CommissionRow[];
};

type Riga = {
  id: number;
  mixValue: number;
  numeroPezzi: string;
};

const MIX_VALUES = [15, 17, 20, 25, 30];

let nextId = 1;

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function getRatePerPezzo(
  commissioni: CommissionRow[],
  mixValue: number,
  tipo: string
): number {
  const row = commissioni.find((c) => c.mix_value === mixValue);
  if (!row) return 0;
  return tipo === "street" ? row.starter_street : row.starter_evento;
}

export default function NuovoPezziForm({ userId, defaultTipo, commissioni }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [tipo, setTipo] = useState<"street" | "evento">(
    defaultTipo === "evento" ? "evento" : "street"
  );
  const [righe, setRighe] = useState<Riga[]>([
    { id: nextId++, mixValue: 17, numeroPezzi: "1" },
  ]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addRiga() {
    setRighe((prev) => [...prev, { id: nextId++, mixValue: 17, numeroPezzi: "1" }]);
  }

  function removeRiga(id: number) {
    setRighe((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRiga(id: number, patch: Partial<Omit<Riga, "id">>) {
    setRighe((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const totals = useMemo(() => {
    let pezzi = 0;
    let commissione = 0;
    for (const r of righe) {
      const n = parseInt(r.numeroPezzi, 10);
      if (!isNaN(n) && n > 0) {
        pezzi += n;
        commissione += getRatePerPezzo(commissioni, r.mixValue, tipo) * n;
      }
    }
    return { pezzi, commissione };
  }, [righe, tipo, commissioni]);

  async function handleSubmit() {
    setError(null);

    const validRighe = righe.filter((r) => {
      const n = parseInt(r.numeroPezzi, 10);
      return !isNaN(n) && n > 0;
    });

    if (validRighe.length === 0) {
      setError("Inserisci almeno una riga con pezzi validi.");
      return;
    }

    setLoading(true);

    const settimana_inizio = getMondayOfWeek(date);
    const supabase = createClient();

    const inserts = validRighe.map((r) => {
      const n = parseInt(r.numeroPezzi, 10);
      const commissione = getRatePerPezzo(commissioni, r.mixValue, tipo) * n;
      return {
        user_id: userId,
        data: date,
        numero_pezzi: n,
        tipo,
        mix_value: r.mixValue,
        commissione,
        note: note.trim() || null,
        settimana_inizio,
      };
    });

    const { error: insertError } = await supabase.from("pezzi").insert(inserts);

    if (insertError) {
      setError("Errore nel salvataggio. Riprova.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
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
          <h1 className="text-base font-bold text-[#1a1a1a]">Inserisci Pezzi</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-10 space-y-4">

        {/* Date + Tipo */}
        <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a1a1a]/6">
            <label className="block text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-2">
              Data
            </label>
            <input
              type="date"
              required
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-sm font-medium text-[#1a1a1a] bg-transparent focus:outline-none"
            />
          </div>
          <div className="px-5 py-4">
            <label className="block text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-3">
              Tipo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["street", "evento"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    tipo === t
                      ? "bg-[#1a1a1a] text-white"
                      : "bg-[#f5f5f5] text-[#1a1a1a]/50 hover:bg-[#ececec]"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Righe pezzi */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide px-1">
            Righe Pezzi
          </p>

          {righe.map((riga, index) => {
            const rate = getRatePerPezzo(commissioni, riga.mixValue, tipo);
            const n = parseInt(riga.numeroPezzi, 10);
            const comm = !isNaN(n) && n > 0 ? rate * n : 0;

            return (
              <div
                key={riga.id}
                className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden"
              >
                {/* Row header */}
                <div className="flex items-center justify-between px-4 pt-3 pb-0">
                  <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide">
                    Riga {index + 1}
                  </span>
                  {righe.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRiga(riga.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#1a1a1a]/30 hover:text-[#1a1a1a]/70 hover:bg-[#f5f5f5] transition-colors"
                      aria-label="Rimuovi riga"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* MIX selector */}
                <div className="px-4 pt-2 pb-3 border-b border-[#1a1a1a]/6">
                  <p className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide mb-2">
                    Valore MIX
                  </p>
                  <div className="flex gap-1.5">
                    {MIX_VALUES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => updateRiga(riga.id, { mixValue: v })}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                          riga.mixValue === v
                            ? "bg-[#1a1a1a] text-white"
                            : "bg-[#f5f5f5] text-[#1a1a1a]/50 hover:bg-[#ececec]"
                        }`}
                      >
                        {v}€
                      </button>
                    ))}
                  </div>
                </div>

                {/* Numero pezzi + commissione */}
                <div className="flex items-center px-4 py-3 gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide mb-1">
                      Pezzi
                    </p>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      placeholder="1"
                      value={riga.numeroPezzi}
                      onChange={(e) => updateRiga(riga.id, { numeroPezzi: e.target.value })}
                      className="w-full text-2xl font-bold text-[#1a1a1a] bg-transparent focus:outline-none placeholder:text-[#1a1a1a]/15"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wide mb-1">
                      Commissione
                    </p>
                    <p className={`text-lg font-bold ${comm > 0 ? "text-[#1a1a1a]" : "text-[#1a1a1a]/20"}`}>
                      € {comm > 0 ? comm.toFixed(2) : "—"}
                    </p>
                    {rate > 0 && (
                      <p className="text-[10px] text-[#1a1a1a]/30">€{rate} × {!isNaN(n) && n > 0 ? n : "—"}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add row button */}
          <button
            type="button"
            onClick={addRiga}
            className="w-full py-3.5 border-2 border-dashed border-[#1a1a1a]/12 rounded-2xl text-sm font-semibold text-[#1a1a1a]/40 hover:border-[#1a1a1a]/25 hover:text-[#1a1a1a]/60 hover:bg-white transition-all flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Aggiungi altro MIX
          </button>
        </div>

        {/* Note */}
        <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4">
          <label className="block text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-2">
            Note (opzionale)
          </label>
          <textarea
            rows={2}
            placeholder="Aggiungi una nota..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full text-sm text-[#1a1a1a] bg-transparent focus:outline-none placeholder:text-[#1a1a1a]/25 resize-none"
          />
        </div>

        {/* Totale giornata */}
        <div className="bg-[#c0dde0]/20 border border-[#c0dde0] rounded-2xl px-5 py-4">
          <p className="text-xs font-semibold text-[#1a1a1a]/50 uppercase tracking-wide mb-3">
            Totale Giornata
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-[#1a1a1a]/40 mb-0.5">Pezzi totali</p>
              <p className="text-2xl font-bold text-[#1a1a1a]">{totals.pezzi}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#1a1a1a]/40 mb-0.5">Commissione totale</p>
              <p className="text-2xl font-bold text-[#1a1a1a]">€ {totals.commissione.toFixed(2)}</p>
            </div>
          </div>
          {righe.length > 1 && (
            <div className="mt-3 pt-3 border-t border-[#c0dde0]/60 space-y-1">
              {righe.map((r) => {
                const n = parseInt(r.numeroPezzi, 10);
                const rate = getRatePerPezzo(commissioni, r.mixValue, tipo);
                const comm = !isNaN(n) && n > 0 ? rate * n : 0;
                if (!(!isNaN(n) && n > 0)) return null;
                return (
                  <p key={r.id} className="text-xs text-[#1a1a1a]/40">
                    {n} pez. × {r.mixValue}€ MIX ({tipo}) = <span className="font-semibold text-[#1a1a1a]/60">€{comm.toFixed(2)}</span>
                  </p>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[#f2d3a3]/40 border border-[#f2d3a3]">
            <p className="text-xs text-[#1a1a1a]/70">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || totals.pezzi === 0}
          className="w-full py-4 bg-[#1a1a1a] text-white text-sm font-bold rounded-2xl hover:bg-[#333] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Salvataggio..." : `Salva ${totals.pezzi > 0 ? `${totals.pezzi} Pezzi` : "Pezzi"}`}
        </button>

      </div>
    </div>
  );
}
