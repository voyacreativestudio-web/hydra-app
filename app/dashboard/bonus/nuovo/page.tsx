"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const BONUS_OPTIONS = [
  { value: "primo_pezzo",        label: "Primo Pezzo" },
  { value: "tripletta",          label: "Tripletta" },
  { value: "poker",              label: "Poker" },
  { value: "manita",             label: "Manita" },
  { value: "prime_due_settimane", label: "Prime Due Settimane" },
];

export default function NuovoBonusPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [tipo, setTipo] = useState("");
  const [importo, setImporto] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) {
      setError("Seleziona il tipo di bonus.");
      return;
    }
    const importoNum = parseFloat(importo);
    if (!importo || isNaN(importoNum) || importoNum <= 0) {
      setError("Inserisci l'importo comunicato dal manager.");
      return;
    }
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { error: insertError } = await supabase.from("bonus").insert({
      user_id: user.id,
      tipo,
      data: date,
      note: note.trim() || null,
      verificato: false,
      importo: importoNum,
    });

    if (insertError) {
      setError("Errore nel salvataggio. Riprova.");
      setLoading(false);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex flex-col">
        <header className="bg-white border-b border-[#1a1a1a]/6">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <Link
              href="/dashboard"
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#f0f0f0] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <h1 className="text-base font-bold text-[#1a1a1a]">Dichiara Bonus</h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#c0dde0]/50 flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1a1a1a]">Bonus dichiarato!</h2>
              <p className="text-sm text-[#1a1a1a]/50 mt-1 leading-relaxed">
                L&apos;HR verificherà l&apos;importo dichiarato.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-block w-full py-3.5 bg-[#1a1a1a] text-white text-sm font-bold rounded-2xl hover:bg-[#333] transition-colors"
            >
              Torna alla Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
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
          <h1 className="text-base font-bold text-[#1a1a1a]">Dichiara Bonus</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-10 space-y-4">

        {/* Tipo bonus selector */}
        <div>
          <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-3 px-1">
            Tipo Bonus
          </p>
          <div className="space-y-2">
            {BONUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTipo(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border transition-all text-left ${
                  tipo === opt.value
                    ? "bg-[#1a1a1a] border-[#1a1a1a] text-white"
                    : "bg-white border-[#1a1a1a]/6 text-[#1a1a1a] hover:border-[#1a1a1a]/20"
                }`}
              >
                <span className="text-sm font-semibold">{opt.label}</span>
                {tipo === opt.value && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Importo */}
        <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4">
          <label className="block text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-1">
            Importo comunicato dal manager
          </label>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-2xl font-bold text-[#1a1a1a]/30">€</span>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={importo}
              onChange={(e) => setImporto(e.target.value)}
              className="flex-1 text-2xl font-bold text-[#1a1a1a] bg-transparent focus:outline-none placeholder:text-[#1a1a1a]/15"
            />
          </div>
          <p className="text-[11px] text-[#1a1a1a]/30 mt-2">
            L&apos;HR confermerà l&apos;importo finale.
          </p>
        </div>

        {/* Date + Note */}
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
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[#f2d3a3]/40 border border-[#f2d3a3]">
            <p className="text-xs text-[#1a1a1a]/70">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          disabled={loading || !tipo}
          className="w-full py-4 bg-[#1a1a1a] text-white text-sm font-bold rounded-2xl hover:bg-[#333] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Salvataggio..." : "Dichiara Bonus"}
        </button>

      </div>
    </div>
  );
}
