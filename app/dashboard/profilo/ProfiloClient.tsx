"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MEZZI_OPTIONS = [
  { value: "auto",    label: "🚗 Auto" },
  { value: "mezzi",  label: "🚇 Mezzi" },
  { value: "moto",   label: "🛵 Moto" },
  { value: "bici",   label: "🚲 Bici" },
  { value: "a_piedi",label: "🚶 A piedi" },
];

type Props = {
  userId: string;
  initialFullName: string;
  initialTelefono: string;
  initialDomicilio: string;
  initialMezzi: string[];
};

export default function ProfiloClient({
  userId,
  initialFullName,
  initialTelefono,
  initialDomicilio,
  initialMezzi,
}: Props) {
  const [fullName, setFullName]     = useState(initialFullName);
  const [telefono, setTelefono]     = useState(initialTelefono);
  const [domicilio, setDomicilio]   = useState(initialDomicilio);
  const [mezzi, setMezzi]           = useState<string[]>(initialMezzi);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  function toggleMezzo(value: string) {
    setMezzi((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name:        fullName.trim() || null,
        telefono:         telefono.trim() || null,
        domicilio:        domicilio.trim() || null,
        mezzi_trasporto:  mezzi,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="space-y-4">

      {/* Editable section */}
      <section className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1a1a1a]/6">
          <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider">
            I miei dati
          </p>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-1.5">
              Nome completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Es. Mario Rossi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#1a1a1a]/12 text-sm text-[#1a1a1a] bg-[#f8f8f8] focus:outline-none focus:ring-2 focus:ring-[#c0dde0] focus:border-transparent"
            />
          </div>

          {/* Telefono */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-1.5">
              Numero di telefono
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Es. +39 333 1234567"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#1a1a1a]/12 text-sm text-[#1a1a1a] bg-[#f8f8f8] focus:outline-none focus:ring-2 focus:ring-[#c0dde0] focus:border-transparent"
            />
          </div>

          {/* Domicilio */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-1.5">
              Domicilio
            </label>
            <input
              type="text"
              value={domicilio}
              onChange={(e) => setDomicilio(e.target.value)}
              placeholder="Es. Via Roma 1, Milano"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#1a1a1a]/12 text-sm text-[#1a1a1a] bg-[#f8f8f8] focus:outline-none focus:ring-2 focus:ring-[#c0dde0] focus:border-transparent"
            />
          </div>

          {/* Mezzi di trasporto */}
          <div>
            <label className="block text-[11px] font-semibold text-[#1a1a1a]/40 uppercase tracking-wide mb-2">
              Mezzi di trasporto
            </label>
            <div className="flex flex-wrap gap-2">
              {MEZZI_OPTIONS.map((opt) => {
                const active = mezzi.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleMezzo(opt.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      active
                        ? "bg-[#c0dde0] text-[#1a1a1a]"
                        : "bg-[#f5f5f5] text-[#1a1a1a]/50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {saveError && (
            <p className="text-xs text-red-500">{saveError}</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-[#1a1a1a] text-white text-sm font-semibold disabled:opacity-50 transition-opacity"
          >
            {saving ? "Salvataggio..." : saved ? "✓ Salvato" : "Salva modifiche"}
          </button>
        </div>
      </section>

      {/* Logout */}
      <section className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full px-4 py-4 text-sm font-semibold text-red-500 text-left"
        >
          Esci dall&apos;account
        </button>
      </section>

    </div>
  );
}
