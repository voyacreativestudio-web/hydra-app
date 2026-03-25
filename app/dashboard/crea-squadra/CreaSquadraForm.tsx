"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type EligibleUser = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type Props = {
  userId: string;
  userTeamId: string | null;
  eligibleUsers: EligibleUser[];
};

const ROLE_LABELS: Record<string, string> = {
  leader: "Leader",
  supporter: "Supporter",
};

export default function CreaSquadraForm({ userId, userTeamId, eligibleUsers }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return eligibleUsers;
    return eligibleUsers.filter((u) =>
      (u.full_name ?? "").toLowerCase().includes(q)
    );
  }, [search, eligibleUsers]);

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!nome.trim()) { setError("Inserisci un nome per la squadra."); return; }
    if (selectedIds.size === 0) { setError("Seleziona almeno un membro."); return; }

    setLoading(true);
    setError(null);
    const supabase = createClient();

    // 1. Create team
    const { data: newTeam, error: teamErr } = await supabase
      .from("teams")
      .insert({ nome: nome.trim(), created_by: userId, parent_team_id: userTeamId })
      .select("id")
      .single();

    if (teamErr || !newTeam) {
      setError("Errore nella creazione della squadra. Riprova.");
      setLoading(false);
      return;
    }

    // 2. Update selected users: assign to new sub-team and set referente
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ team_id: newTeam.id, referente_id: userId })
      .in("id", Array.from(selectedIds));

    if (updateErr) {
      setError("Squadra creata ma errore nell'aggiornamento dei membri. Riprova.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] pb-24">
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
          <h1 className="text-base font-bold text-[#1a1a1a]">Crea Squadra</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-6 space-y-4">

        {/* Team name */}
        <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-4">
          <label className="block text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-2">
            Nome Squadra
          </label>
          <input
            type="text"
            placeholder="Es. Team Rossi"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full text-sm font-medium text-[#1a1a1a] bg-transparent focus:outline-none placeholder:text-[#1a1a1a]/25"
          />
        </div>

        {/* User search + select */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wide px-1">
            Aggiungi Membri ({selectedIds.size} selezionati)
          </p>

          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-3">
            <input
              type="text"
              placeholder="Cerca per nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm text-[#1a1a1a] bg-transparent focus:outline-none placeholder:text-[#1a1a1a]/30"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-6 text-center">
              <p className="text-sm text-[#1a1a1a]/30">Nessun utente trovato</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
              {filtered.map((u, i) => {
                const selected = selectedIds.has(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleUser(u.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
                      i < filtered.length - 1 ? "border-b border-[#1a1a1a]/4" : ""
                    } ${selected ? "bg-[#c0dde0]/10" : "hover:bg-[#f9f9f9]"}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a1a]">
                        {u.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-[#1a1a1a]/40 mt-0.5">
                        {ROLE_LABELS[u.role ?? ""] ?? u.role ?? "—"}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                      selected
                        ? "bg-[#1a1a1a] border-[#1a1a1a]"
                        : "border-[#1a1a1a]/20"
                    }`}>
                      {selected && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected chips preview */}
        {selectedIds.size > 0 && (
          <div className="bg-[#c0dde0]/20 border border-[#c0dde0] rounded-2xl px-5 py-4">
            <p className="text-xs font-semibold text-[#1a1a1a]/50 uppercase tracking-wide mb-2">
              Membri selezionati
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedIds).map((id) => {
                const u = eligibleUsers.find((u) => u.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#c0dde0] text-xs font-medium text-[#1a1a1a]"
                  >
                    {u?.full_name ?? id}
                    <button
                      type="button"
                      onClick={() => toggleUser(id)}
                      className="text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl bg-[#f2d3a3]/40 border border-[#f2d3a3]">
            <p className="text-xs text-[#1a1a1a]/70">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !nome.trim() || selectedIds.size === 0}
          className="w-full py-4 bg-[#1a1a1a] text-white text-sm font-bold rounded-2xl hover:bg-[#333] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? "Creazione..."
            : `Crea Squadra con ${selectedIds.size} ${selectedIds.size === 1 ? "membro" : "membri"}`}
        </button>

      </div>
    </div>
  );
}
