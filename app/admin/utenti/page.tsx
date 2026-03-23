"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const ALL_ROLES = [
  { value: "starter", label: "Starter" },
  { value: "leader", label: "Leader" },
  { value: "supporter", label: "Supporter" },
  { value: "core_leader", label: "Core Leader" },
  { value: "team_leader", label: "Team Leader" },
  { value: "assistant_manager", label: "Assistant Manager" },
  { value: "partner_manager", label: "Partner Manager" },
  { value: "manager", label: "Manager" },
  { value: "owner", label: "Owner" },
  { value: "hr", label: "HR" },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ALL_ROLES.map((r) => [r.value, r.label])
);

type Team = { id: string; nome: string };

type UserRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  status: string | null;
  data_inizio: string | null;
  team_id: string | null;
  teams: { nome: string } | null;
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

export default function UtentiPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tab, setTab] = useState<"pending" | "active">("pending");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    role: string;
    team_id: string;
    status: string;
  }>({ role: "", team_id: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const [usersRes, teamsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          'id, full_name, role, status, data_inizio, team_id, teams!profiles_team_id_fkey(nome)'
        )
        .order("full_name"),
      supabase.from("teams").select("id, nome").order("nome"),
    ]);

    if (usersRes.error) setError(usersRes.error.message);
    else setUsers((usersRes.data as unknown as UserRow[]) ?? []);

    if (!teamsRes.error) setTeams(teamsRes.data ?? []);
    setLoading(false);
  }

  async function updateUser(
    id: string,
    patch: Record<string, string | null>
  ) {
    setSaving(id);
    setError(null);
    const res = await fetch(`/api/admin/utenti/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
      );
      setEditingId(null);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Errore durante il salvataggio");
    }
    setSaving(null);
  }

  const pending = users.filter(
    (u) =>
      u.status === "pending" &&
      (search === "" ||
        (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()))
  );
  const active = users.filter(
    (u) =>
      u.status === "active" &&
      (search === "" ||
        (u.full_name ?? "").toLowerCase().includes(search.toLowerCase()))
  );

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
          <span className="text-sm font-semibold text-[#1a1a1a]">Utenti</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-4">
        {error && (
          <div className="bg-[#f2d3a3]/40 border border-[#f2d3a3] rounded-xl px-4 py-3 text-sm text-[#1a1a1a]">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1a1a]/30"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Cerca utente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] placeholder-[#1a1a1a]/30 focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
          />
        </div>

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
            In Attesa ({pending.length})
          </button>
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === "active"
                ? "bg-[#c0dde0] text-[#1a1a1a]"
                : "bg-white border border-[#1a1a1a]/10 text-[#1a1a1a]/60 hover:text-[#1a1a1a]"
            }`}
          >
            Attivi ({active.length})
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-10 text-center">
            <p className="text-sm text-[#1a1a1a]/30">Caricamento...</p>
          </div>
        ) : tab === "pending" ? (
          <PendingList
            users={pending}
            saving={saving}
            onApprove={(id) => updateUser(id, { status: "active" })}
            onReject={(id) => updateUser(id, { status: "rejected" })}
          />
        ) : (
          <ActiveList
            users={active}
            teams={teams}
            editingId={editingId}
            editData={editData}
            saving={saving}
            onEdit={(user) => {
              setEditingId(user.id);
              setEditData({
                role: user.role ?? "",
                team_id: user.team_id ?? "",
                status: user.status ?? "active",
              });
            }}
            onCancelEdit={() => setEditingId(null)}
            onEditChange={(field, value) =>
              setEditData((prev) => ({ ...prev, [field]: value }))
            }
            onSave={(id) =>
              updateUser(id, {
                role: editData.role || null,
                team_id: editData.team_id || null,
                status: editData.status,
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string | null }) {
  return (
    <div className="w-9 h-9 rounded-full bg-[#c0dde0]/50 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-[#1a1a1a]">
        {getInitials(name)}
      </span>
    </div>
  );
}

function PendingList({
  users,
  saving,
  onApprove,
  onReject,
}: {
  users: UserRow[];
  saving: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-10 text-center">
        <p className="text-sm text-[#1a1a1a]/30">Nessun utente in attesa</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div
          key={u.id}
          className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <Avatar name={u.full_name} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1a1a1a] truncate">
                {u.full_name ?? "—"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {u.role && (
                  <span className="text-xs text-[#1a1a1a]/40">
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                )}
                {u.data_inizio && (
                  <span className="text-xs text-[#1a1a1a]/30">
                    dal{" "}
                    {new Date(u.data_inizio + "T00:00:00").toLocaleDateString(
                      "it-IT",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onApprove(u.id)}
                disabled={saving === u.id}
                className="px-3 py-1.5 rounded-lg bg-[#c0dde0] text-[#1a1a1a] text-xs font-semibold hover:bg-[#a8cdd0] transition-colors disabled:opacity-50"
              >
                ✓ Approva
              </button>
              <button
                onClick={() => onReject(u.id)}
                disabled={saving === u.id}
                className="px-3 py-1.5 rounded-lg bg-[#f2d3a3]/60 text-[#1a1a1a] text-xs font-semibold hover:bg-[#f2d3a3] transition-colors disabled:opacity-50"
              >
                ✗ Rifiuta
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActiveList({
  users,
  teams,
  editingId,
  editData,
  saving,
  onEdit,
  onCancelEdit,
  onEditChange,
  onSave,
}: {
  users: UserRow[];
  teams: Team[];
  editingId: string | null;
  editData: { role: string; team_id: string; status: string };
  saving: string | null;
  onEdit: (user: UserRow) => void;
  onCancelEdit: () => void;
  onEditChange: (field: string, value: string) => void;
  onSave: (id: string) => void;
}) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-10 text-center">
        <p className="text-sm text-[#1a1a1a]/30">Nessun utente attivo</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div
          key={u.id}
          className="bg-white rounded-2xl border border-[#1a1a1a]/6 overflow-hidden"
        >
          <button
            onClick={() =>
              editingId === u.id ? onCancelEdit() : onEdit(u)
            }
            className="w-full text-left px-4 py-4 hover:bg-[#f8f8f8] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar name={u.full_name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1a1a1a] truncate">
                  {u.full_name ?? "—"}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {u.role && (
                    <span className="text-xs text-[#1a1a1a]/40">
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  )}
                  {u.teams && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-[#f2d3a3]/40 text-[#1a1a1a]/60">
                      {u.teams.nome}
                    </span>
                  )}
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`text-[#1a1a1a]/25 transition-transform ${
                  editingId === u.id ? "rotate-90" : ""
                }`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>

          {editingId === u.id && (
            <div className="px-4 pb-4 pt-0 border-t border-[#1a1a1a]/6 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <div>
                  <label className="text-xs font-medium text-[#1a1a1a]/50 mb-1 block">
                    Ruolo
                  </label>
                  <select
                    value={editData.role}
                    onChange={(e) => onEditChange("role", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                  >
                    <option value="">— Nessuno —</option>
                    {ALL_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a1a1a]/50 mb-1 block">
                    Team
                  </label>
                  <select
                    value={editData.team_id}
                    onChange={(e) => onEditChange("team_id", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                  >
                    <option value="">— Nessuno —</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a1a1a]/50 mb-1 block">
                    Stato
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => onEditChange("status", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                  >
                    <option value="active">Attivo</option>
                    <option value="inactive">Inattivo</option>
                    <option value="pending">In Attesa</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSave(u.id)}
                  disabled={saving === u.id}
                  className="px-4 py-2 rounded-lg bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {saving === u.id ? "Salvataggio..." : "Salva"}
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-4 py-2 rounded-lg border border-[#1a1a1a]/10 text-sm font-medium text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
