"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const BONUS_LABELS: Record<string, string> = {
  primo_pezzo: "Primo Pezzo",
  tripletta: "Tripletta",
  poker: "Poker",
  manita: "Manita",
  prime_due_settimane: "Prime 2 Settimane",
};

type BonusRow = {
  id: string;
  tipo: string;
  data: string;
  importo: number | null;
  verificato: boolean;
  note: string | null;
  profiles: { full_name: string | null } | null;
};

export default function BonusAdminPage() {
  const [bonus, setBonus] = useState<BonusRow[]>([]);
  const [tab, setTab] = useState<"pending" | "verified">("pending");
  const [editingImporti, setEditingImporti] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBonus();
  }, []);

  async function fetchBonus() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("bonus")
      .select("id, tipo, data, importo, verificato, note, profiles(full_name)")
      .order("data", { ascending: false });

    if (err) setError(err.message);
    else {
      const rows = (data as unknown as BonusRow[]) ?? [];
      setBonus(rows);
      // Initialize editing importi for pending
      const initial: Record<string, string> = {};
      rows
        .filter((b) => !b.verificato)
        .forEach((b) => {
          initial[b.id] = b.importo !== null ? String(b.importo) : "";
        });
      setEditingImporti(initial);
    }
    setLoading(false);
  }

  async function verificaBonus(id: string) {
    const importoStr = editingImporti[id] ?? "";
    const importo = parseFloat(importoStr);
    if (isNaN(importo)) {
      setError("Inserisci un importo valido prima di verificare");
      return;
    }

    setSaving(id);
    setError(null);
    const res = await fetch(`/api/admin/bonus/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importo, verificato: true }),
    });

    if (res.ok) {
      const updated = await res.json();
      setBonus((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updated } : b))
      );
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Errore durante la verifica");
    }
    setSaving(null);
  }

  const pendingBonus = bonus.filter((b) => !b.verificato);
  const verifiedBonus = bonus.filter((b) => b.verificato);
  const displayed = tab === "pending" ? pendingBonus : verifiedBonus;

  return (
    <div className="min-h-screen bg-[#f8f8f8] pb-16">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-[#1a1a1a]/6 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/admin"
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
            Admin
          </Link>
          <span className="text-[#1a1a1a]/20">/</span>
          <span className="text-sm font-semibold text-[#1a1a1a]">Bonus</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-4">
        {error && (
          <div className="bg-[#f2d3a3]/40 border border-[#f2d3a3] rounded-xl px-4 py-3 text-sm text-[#1a1a1a]">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("pending")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === "pending"
                ? "bg-[#f2d3a3] text-[#1a1a1a]"
                : "bg-white border border-[#1a1a1a]/10 text-[#1a1a1a]/60 hover:text-[#1a1a1a]"
            }`}
          >
            Da Verificare ({pendingBonus.length})
          </button>
          <button
            onClick={() => setTab("verified")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === "verified"
                ? "bg-[#c0dde0] text-[#1a1a1a]"
                : "bg-white border border-[#1a1a1a]/10 text-[#1a1a1a]/60 hover:text-[#1a1a1a]"
            }`}
          >
            Verificati ({verifiedBonus.length})
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-10 text-center">
            <p className="text-sm text-[#1a1a1a]/30">Caricamento...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-10 text-center">
            <p className="text-sm text-[#1a1a1a]/30">
              {tab === "pending"
                ? "Nessun bonus da verificare"
                : "Nessun bonus verificato"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[#1a1a1a]">
                        {b.profiles?.full_name ?? "—"}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#c0dde0]/30 text-xs font-medium text-[#1a1a1a]">
                        {BONUS_LABELS[b.tipo] ?? b.tipo}
                      </span>
                    </div>
                    <p className="text-xs text-[#1a1a1a]/40 mt-0.5">
                      {new Date(b.data + "T00:00:00").toLocaleDateString(
                        "it-IT",
                        { day: "numeric", month: "short", year: "numeric" }
                      )}
                      {b.note && (
                        <span className="ml-2 text-[#1a1a1a]/30">
                          — {b.note}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {tab === "pending" ? (
                      <>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-[#1a1a1a]/40">€</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editingImporti[b.id] ?? ""}
                            onChange={(e) =>
                              setEditingImporti((prev) => ({
                                ...prev,
                                [b.id]: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            className="w-20 px-2 py-1.5 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-right text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                          />
                        </div>
                        <button
                          onClick={() => verificaBonus(b.id)}
                          disabled={saving === b.id}
                          className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-white text-xs font-semibold hover:bg-[#333] transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {saving === b.id ? "..." : "Verifica ✓"}
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1a1a1a]">
                          € {Number(b.importo ?? 0).toFixed(2)}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#c0dde0]/40 text-[10px] font-semibold text-[#1a1a1a]">
                          ✓ Verificato
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
