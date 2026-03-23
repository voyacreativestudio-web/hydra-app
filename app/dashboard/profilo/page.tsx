import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProfiloClient from "./ProfiloClient";

export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = {
  starter: "Starter",
  leader: "Leader",
  supporter: "Supporter",
  core_leader: "Core Leader",
  team_leader: "Team Leader",
  assistant_manager: "Assistant Manager",
  partner_manager: "Partner Manager",
  manager: "Manager",
  owner: "Owner",
  hr: "HR",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Attivo",
  pending: "In attesa",
  inactive: "Inattivo",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Only columns that are guaranteed to exist on the profiles table.
// domicilio, mezzi_trasporto, telefono are optional — handled gracefully below.
type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  status: string | null;
  data_inizio: string | null;
  team_id: string | null;
  domicilio?: string | null;
  mezzi_trasporto?: string[] | null;
  telefono?: string | null;
};

export default async function ProfiloPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Use the SSR client (user's own session, RLS applies).
  // Never redirect to /pending here — middleware already handles that.
  // If the query fails for any reason, fall back to a minimal profile object.
  let profile: ProfileRow | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role, status, data_inizio, team_id, domicilio, mezzi_trasporto, telefono")
      .eq("id", user.id)
      .single();
    profile = data as ProfileRow | null;
  } catch {
    // Columns may not exist yet or query failed — show page with auth-only data
  }

  const fullName = profile?.full_name ?? null;
  const initials = getInitials(fullName);
  const roleLabel = ROLE_LABELS[profile?.role ?? ""] ?? profile?.role ?? "—";
  const statusLabel = STATUS_LABELS[profile?.status ?? ""] ?? profile?.status ?? "—";
  const isActive = profile?.status === "active";

  const initialMezzi = Array.isArray(profile?.mezzi_trasporto)
    ? (profile!.mezzi_trasporto as string[])
    : [];

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
          <h1 className="text-base font-bold text-[#1a1a1a]">Profilo</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-6 space-y-4">

        {/* Avatar section */}
        <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-6 flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-[#c0dde0] flex items-center justify-center">
            <span className="text-2xl font-bold text-[#1a1a1a]">{initials}</span>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-[#1a1a1a]">{fullName ?? user.email}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {profile?.role && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#c0dde0]/40 text-xs font-semibold text-[#1a1a1a]">
                {roleLabel}
              </span>
            )}
          </div>
        </div>

        {/* Info section (read-only) */}
        <section className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a]/6">
            <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider">
              Informazioni account
            </p>
          </div>
          <div className="divide-y divide-[#1a1a1a]/4">
            <InfoRow label="Email" value={user.email ?? "—"} />
            <InfoRow label="Ruolo" value={roleLabel} />
            <InfoRow label="Data inizio" value={formatDate(profile?.data_inizio)} />
            <InfoRow
              label="Stato"
              value={statusLabel}
              valueClass={isActive ? "text-green-600 font-semibold" : "text-amber-500 font-semibold"}
            />
          </div>
        </section>

        {/* Editable section + logout */}
        <ProfiloClient
          userId={user.id}
          initialFullName={fullName ?? ""}
          initialTelefono={profile?.telefono ?? ""}
          initialDomicilio={profile?.domicilio ?? ""}
          initialMezzi={initialMezzi}
        />

      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-4">
      <span className="text-sm text-[#1a1a1a]/50 shrink-0">{label}</span>
      <span className={`text-sm text-right truncate ${valueClass ?? "text-[#1a1a1a]"}`}>
        {value}
      </span>
    </div>
  );
}
