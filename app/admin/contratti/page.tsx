"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ContrattoRow = {
  id: string;
  data: string;
  mix_value: string | null;
  tipo: string | null;
  numero_pezzi: number;
  foto_contratto_url: string | null;
  foto_contratto_processata: boolean | null;
  profiles: { full_name: string | null } | null;
};

export default function ContrattiAdminPage() {
  const [contratti, setContratti] = useState<ContrattoRow[]>([]);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContratti();
  }, []);

  async function fetchContratti() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("pezzi")
      .select(
        "id, data, mix_value, tipo, numero_pezzi, foto_contratto_url, foto_contratto_processata, profiles(full_name)"
      )
      .not("foto_contratto_url", "is", null)
      .order("data", { ascending: false });

    if (err) setError(err.message);
    else setContratti((data as unknown as ContrattoRow[]) ?? []);
    setLoading(false);
  }

  async function toggleProcessata(id: string, current: boolean | null) {
    setProcessing((prev) => ({ ...prev, [id]: true }));
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("pezzi")
      .update({ foto_contratto_processata: !current })
      .eq("id", id);

    if (err) {
      setError(err.message);
    } else {
      setContratti((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, foto_contratto_processata: !current } : c
        )
      );
    }
    setProcessing((prev) => ({ ...prev, [id]: false }));
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1a1a1a]">Contratti</h1>
      <div className="space-y-4">
        {error && (
          <div className="bg-[#f2d3a3]/40 border border-[#f2d3a3] rounded-xl px-4 py-3 text-sm text-[#1a1a1a]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-10 text-center">
            <p className="text-sm text-[#1a1a1a]/30">Caricamento...</p>
          </div>
        ) : contratti.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-10 text-center">
            <p className="text-sm text-[#1a1a1a]/30">
              Nessun contratto caricato
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {contratti.map((c) => (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border overflow-hidden ${
                  c.foto_contratto_processata
                    ? "border-[#c0dde0]"
                    : "border-[#1a1a1a]/6"
                }`}
              >
                <div className="px-4 py-4 flex items-center gap-3">
                  {/* Thumbnail */}
                  {c.foto_contratto_url && (
                    <div className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.foto_contratto_url}
                        alt="Contratto"
                        width={50}
                        height={50}
                        className="w-[50px] h-[50px] object-cover rounded-lg border border-[#1a1a1a]/10"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1a1a1a] truncate">
                      {c.profiles?.full_name ?? "—"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-[#1a1a1a]/40">
                        {new Date(c.data + "T00:00:00").toLocaleDateString(
                          "it-IT",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </span>
                      {c.mix_value && (
                        <span className="text-xs text-[#1a1a1a]/40">
                          MIX {c.mix_value}
                        </span>
                      )}
                      {c.tipo && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                            c.tipo === "street"
                              ? "bg-[#c0dde0]/40 text-[#1a1a1a]"
                              : "bg-[#f2d3a3]/40 text-[#1a1a1a]"
                          }`}
                        >
                          {c.tipo}
                        </span>
                      )}
                      <span className="text-xs text-[#1a1a1a]/40">
                        {c.numero_pezzi} pezzi
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {c.foto_contratto_url && (
                      <a
                        href={c.foto_contratto_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a1a1a]/10 text-xs font-medium text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:border-[#1a1a1a]/20 transition-colors"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Download
                      </a>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!c.foto_contratto_processata}
                        disabled={processing[c.id]}
                        onChange={() =>
                          toggleProcessata(c.id, c.foto_contratto_processata)
                        }
                        className="w-4 h-4 rounded border-[#1a1a1a]/20 accent-[#c0dde0]"
                      />
                      <span className="text-xs font-medium text-[#1a1a1a]/60">
                        Processato
                      </span>
                    </label>
                  </div>
                </div>

                {c.foto_contratto_processata && (
                  <div className="px-4 py-2 bg-[#c0dde0]/10 border-t border-[#c0dde0]/30">
                    <span className="text-xs font-medium text-[#1a1a1a]/50">
                      ✓ Processato
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
