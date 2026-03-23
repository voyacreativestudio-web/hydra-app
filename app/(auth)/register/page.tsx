"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ROLE_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "leader", label: "Leader" },
  { value: "supporter", label: "Supporter" },
  { value: "core_leader", label: "Core Leader" },
  { value: "team_leader", label: "Team Leader" },
  { value: "assistant_manager", label: "Assistant Manager" },
  { value: "partner_manager", label: "Partner Manager" },
];

type Team = { id: string; nome: string };

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTeams() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("teams")
        .select("id, nome")
        .order("nome");
      if (error || !data) {
        setTeamsError(true);
      } else {
        setTeams(data);
      }
      setTeamsLoading(false);
    }
    loadTeams();
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Errore durante la registrazione. Riprova.");
      setLoading(false);
      return;
    }

    // Update profile via server-side API route (uses admin client, bypasses RLS)
    const res = await fetch("/api/auth/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: data.user.id,
        fullName,
        role,
        teamId: teamId || null,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json();
      setError(error ?? "Errore nel salvataggio del profilo. Contatta il tuo HR.");
      setLoading(false);
      return;
    }

    // Sign out immediately — account needs HR approval
    await supabase.auth.signOut();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <>
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c0dde0] mb-4">
            <span className="text-[#1a1a1a] text-xl font-bold tracking-widest">H</span>
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-[#1a1a1a] uppercase">Hydra</h1>
        </div>

        <div className="bg-white border border-[#1a1a1a]/8 rounded-2xl p-6 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#c0dde0]/50 flex items-center justify-center mx-auto mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-[#1a1a1a] mb-2">Registrazione inviata!</h2>
          <p className="text-sm text-[#1a1a1a]/50 leading-relaxed">
            Attendi l&apos;approvazione dell&apos;HR prima di accedere.
          </p>
        </div>

        <p className="text-center text-xs text-[#1a1a1a]/40 mt-6">
          <Link
            href="/login"
            className="text-[#1a1a1a] font-medium underline underline-offset-2 hover:text-[#333]"
          >
            Torna al login
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c0dde0] mb-4">
          <span className="text-[#1a1a1a] text-xl font-bold tracking-widest">H</span>
        </div>
        <h1 className="text-2xl font-bold tracking-widest text-[#1a1a1a] uppercase">Hydra</h1>
        <p className="text-xs text-[#1a1a1a]/40 mt-1 tracking-wide">Sales Team Portal</p>
      </div>

      {/* Card */}
      <div className="bg-white border border-[#1a1a1a]/8 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#1a1a1a] mb-5">Crea il tuo account</h2>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5 tracking-wide uppercase">
              Nome completo
            </label>
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Mario Rossi"
              className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a]/12 bg-[#fafafa] text-[#1a1a1a] text-sm placeholder:text-[#1a1a1a]/30 focus:outline-none focus:ring-2 focus:ring-[#c0dde0] focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5 tracking-wide uppercase">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@email.com"
              className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a]/12 bg-[#fafafa] text-[#1a1a1a] text-sm placeholder:text-[#1a1a1a]/30 focus:outline-none focus:ring-2 focus:ring-[#c0dde0] focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5 tracking-wide uppercase">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a]/12 bg-[#fafafa] text-[#1a1a1a] text-sm placeholder:text-[#1a1a1a]/30 focus:outline-none focus:ring-2 focus:ring-[#c0dde0] focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5 tracking-wide uppercase">
              Ruolo
            </label>
            <select
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a]/12 bg-[#fafafa] text-[#1a1a1a] text-sm focus:outline-none focus:ring-2 focus:ring-[#c0dde0] focus:border-transparent transition appearance-none"
            >
              <option value="" disabled>Seleziona il tuo ruolo</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#1a1a1a]/60 mb-1.5 tracking-wide uppercase">
              Team
            </label>
            {teamsError ? (
              <p className="text-xs text-[#1a1a1a]/40 px-1">
                Impossibile caricare i team. Contatta il tuo HR.
              </p>
            ) : (
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                disabled={teamsLoading}
                className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a]/12 bg-[#fafafa] text-[#1a1a1a] text-sm focus:outline-none focus:ring-2 focus:ring-[#c0dde0] focus:border-transparent transition appearance-none disabled:opacity-50"
              >
                <option value="">
                  {teamsLoading ? "Caricamento team..." : "Nessun team (opzionale)"}
                </option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-[#f2d3a3]/40 border border-[#f2d3a3]">
              <p className="text-xs text-[#1a1a1a]/70">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-[#1a1a1a] text-white text-sm font-semibold rounded-xl hover:bg-[#333] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? "Registrazione in corso..." : "Registrati"}
          </button>
        </form>
      </div>

      {/* Login link */}
      <p className="text-center text-xs text-[#1a1a1a]/40 mt-6">
        Hai già un account?{" "}
        <Link
          href="/login"
          className="text-[#1a1a1a] font-medium underline underline-offset-2 hover:text-[#333]"
        >
          Accedi
        </Link>
      </p>
    </>
  );
}
