"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email o password errati. Riprova.");
      setLoading(false);
      return;
    }

    // Explicitly persist the session so it survives dev-server restarts
    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <>
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c0dde0] mb-4">
          <span className="text-[#1a1a1a] text-xl font-bold tracking-widest">H</span>
        </div>
        <h1 className="text-2xl font-bold tracking-widest text-[#1a1a1a] uppercase">
          Hydra
        </h1>
        <p className="text-xs text-[#1a1a1a]/40 mt-1 tracking-wide">Sales Team Portal</p>
      </div>

      {/* Card */}
      <div className="bg-white border border-[#1a1a1a]/8 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#1a1a1a] mb-5">Accedi al tuo account</h2>

        <form onSubmit={handleLogin} className="space-y-4">
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-[#1a1a1a]/12 bg-[#fafafa] text-[#1a1a1a] text-sm placeholder:text-[#1a1a1a]/30 focus:outline-none focus:ring-2 focus:ring-[#c0dde0] focus:border-transparent transition"
            />
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
            {loading ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>
      </div>

      {/* Register link */}
      <p className="text-center text-xs text-[#1a1a1a]/40 mt-6">
        Non hai un account?{" "}
        <Link
          href="/register"
          className="text-[#1a1a1a] font-medium underline underline-offset-2 hover:text-[#333]"
        >
          Registrati
        </Link>
      </p>
    </>
  );
}
