"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const WEEK_DAYS = [
  { label: "Martedì", offset: 1 },
  { label: "Mercoledì", offset: 2 },
  { label: "Giovedì", offset: 3 },
  { label: "Venerdì", offset: 4 },
  { label: "Sabato", offset: 5 },
];

type UserProfile = { id: string; full_name: string | null };

type EventRow = {
  id: string;
  nome: string;
  indirizzo: string;
  lat?: number | null;
  lng?: number | null;
  data: string;
  orario_inizio: string;
  orario_fine?: string | null;
  note?: string | null;
  evento_assignments?: { count: number }[];
};

type Assignment = {
  id: string;
  user_id: string;
  profiles: { full_name: string | null } | null;
};

type CreateFormData = {
  nome: string;
  indirizzo: string;
  data: string;
  orario_inizio: string;
  orario_fine: string;
  note: string;
};

const EMPTY_FORM: CreateFormData = {
  nome: "",
  indirizzo: "",
  data: "",
  orario_inizio: "",
  orario_fine: "",
  note: "",
};

export default function EventiAdminPage() {
  const [week, setWeek] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [events, setEvents] = useState<EventRow[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateFormData>(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>(
    {}
  );
  const [assigningEventId, setAssigningEventId] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (monday: Date) => {
    setLoading(true);
    setError(null);
    const mondayStr = toDateStr(monday);
    const res = await fetch(`/api/admin/eventi?week=${mondayStr}`);
    if (res.ok) {
      const data = await res.json();
      setEvents(data);
    } else {
      setError("Errore caricamento eventi");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => setUsers(data ?? []));
  }, []);

  useEffect(() => {
    fetchEvents(week);
  }, [week, fetchEvents]);

  async function fetchAssignments(eventId: string) {
    const res = await fetch(`/api/admin/eventi/${eventId}/assignments`);
    if (res.ok) {
      const data: Assignment[] = await res.json();
      setAssignments((prev) => ({ ...prev, [eventId]: data }));
    }
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/eventi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: formData.nome,
        indirizzo: formData.indirizzo,
        data: formData.data,
        orario_inizio: formData.orario_inizio,
        orario_fine: formData.orario_fine || undefined,
        note: formData.note || undefined,
      }),
    });

    if (res.ok) {
      const newEvent: EventRow = await res.json();
      setEvents((prev) => [...prev, newEvent].sort((a, b) =>
        a.data.localeCompare(b.data) || a.orario_inizio.localeCompare(b.orario_inizio)
      ));
      setFormData(EMPTY_FORM);
      setShowCreateForm(false);
      setSelectedEventId(newEvent.id);
      await fetchAssignments(newEvent.id);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Errore creazione evento");
    }
    setFormSubmitting(false);
  }

  async function addUserToEvent(eventId: string, userId: string) {
    if (!userId) return;
    const current = assignments[eventId] ?? [];
    if (current.some((a) => a.user_id === userId)) return;

    setAssigningEventId(eventId);
    const newUserIds = [...current.map((a) => a.user_id), userId];
    const res = await fetch(`/api/admin/eventi/${eventId}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: newUserIds }),
    });

    if (res.ok) {
      await fetchAssignments(eventId);
      setAddUserId((prev) => ({ ...prev, [eventId]: "" }));
      // Update count in events
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? {
                ...ev,
                evento_assignments: [{ count: newUserIds.length }],
              }
            : ev
        )
      );
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Errore aggiunta utente");
    }
    setAssigningEventId(null);
  }

  async function removeUserFromEvent(eventId: string, userId: string) {
    const current = assignments[eventId] ?? [];
    const newUserIds = current
      .map((a) => a.user_id)
      .filter((id) => id !== userId);

    setAssigningEventId(eventId);
    const res = await fetch(`/api/admin/eventi/${eventId}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: newUserIds }),
    });

    if (res.ok) {
      await fetchAssignments(eventId);
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId
            ? {
                ...ev,
                evento_assignments: [{ count: newUserIds.length }],
              }
            : ev
        )
      );
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Errore rimozione utente");
    }
    setAssigningEventId(null);
  }

  async function handleSelectEvent(eventId: string) {
    if (selectedEventId === eventId) {
      setSelectedEventId(null);
      return;
    }
    setSelectedEventId(eventId);
    if (!assignments[eventId]) {
      await fetchAssignments(eventId);
    }
  }

  const mondayStr = toDateStr(week);
  const sundayStr = toDateStr(addDays(week, 6));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1a1a1a]">Piano Eventi</h1>
      <div className="space-y-4">
        {error && (
          <div className="bg-[#f2d3a3]/40 border border-[#f2d3a3] rounded-xl px-4 py-3 text-sm text-[#1a1a1a]">
            {error}
          </div>
        )}

        {/* Week selector + Create button */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-[#1a1a1a]/10 rounded-xl px-3 py-2">
            <button
              onClick={() => setWeek((d) => addDays(d, -7))}
              className="text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
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
            </button>
            <span className="text-sm font-medium text-[#1a1a1a] min-w-[140px] text-center">
              {mondayStr} → {sundayStr}
            </span>
            <button
              onClick={() => setWeek((d) => addDays(d, 7))}
              className="text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors"
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
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#333] transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Crea Evento
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-5 py-5">
            <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">
              Nuovo Evento
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#1a1a1a]/50 mb-1 block">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, nome: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a1a1a]/50 mb-1 block">
                    Indirizzo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.indirizzo}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        indirizzo: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a1a1a]/50 mb-1 block">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    min={mondayStr}
                    max={sundayStr}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, data: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a1a1a]/50 mb-1 block">
                    Orario Inizio *
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.orario_inizio}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        orario_inizio: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a1a1a]/50 mb-1 block">
                    Orario Fine
                  </label>
                  <input
                    type="time"
                    value={formData.orario_fine}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        orario_fine: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1a1a1a]/50 mb-1 block">
                    Note
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, note: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0] resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50"
                >
                  {formSubmitting ? "Creazione..." : "Crea Evento"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData(EMPTY_FORM);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#1a1a1a]/10 text-sm font-medium text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Events grouped by day */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-10 text-center">
            <p className="text-sm text-[#1a1a1a]/30">Caricamento...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {WEEK_DAYS.map(({ label, offset }) => {
              const dayDate = addDays(week, offset);
              const dayStr = toDateStr(dayDate);
              const dayEvents = events.filter((ev) => ev.data === dayStr);

              return (
                <section key={dayStr}>
                  <h3 className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider mb-2 px-1">
                    {label} —{" "}
                    {dayDate.toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                    })}
                    {dayEvents.length > 0 && (
                      <span className="ml-2 text-[#1a1a1a]/30">
                        ({dayEvents.length})
                      </span>
                    )}
                  </h3>

                  {dayEvents.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#1a1a1a]/6 px-4 py-4 text-center">
                      <p className="text-xs text-[#1a1a1a]/25">
                        Nessun evento
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayEvents.map((ev) => {
                        const count =
                          ev.evento_assignments?.[0]?.count ?? 0;
                        const isExpanded = selectedEventId === ev.id;
                        const evAssignments = assignments[ev.id] ?? [];

                        return (
                          <div
                            key={ev.id}
                            className={`bg-white rounded-2xl border overflow-hidden transition-colors ${
                              isExpanded
                                ? "border-[#c0dde0]"
                                : "border-[#1a1a1a]/6"
                            }`}
                          >
                            <button
                              onClick={() => handleSelectEvent(ev.id)}
                              className="w-full text-left px-4 py-4 hover:bg-[#f8f8f8] transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-[#1a1a1a]">
                                    {ev.nome}
                                  </p>
                                  <p className="text-xs text-[#1a1a1a]/50 mt-0.5 truncate">
                                    {ev.indirizzo}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-[#1a1a1a]/40">
                                      {ev.orario_inizio}
                                      {ev.orario_fine &&
                                        ` → ${ev.orario_fine}`}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#c0dde0]/30 text-xs text-[#1a1a1a]/60">
                                      <svg
                                        width="10"
                                        height="10"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      >
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" />
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                      </svg>
                                      {count}
                                    </span>
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
                                  className={`text-[#1a1a1a]/25 shrink-0 mt-1 transition-transform ${
                                    isExpanded ? "rotate-90" : ""
                                  }`}
                                >
                                  <polyline points="9 18 15 12 9 6" />
                                </svg>
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-4 border-t border-[#1a1a1a]/6 pt-3 space-y-3">
                                {ev.note && (
                                  <p className="text-xs text-[#1a1a1a]/50 italic">
                                    {ev.note}
                                  </p>
                                )}

                                {/* Current assignees */}
                                <div>
                                  <p className="text-xs font-semibold text-[#1a1a1a]/40 uppercase tracking-wider mb-2">
                                    Assegnati ({evAssignments.length})
                                  </p>
                                  {evAssignments.length === 0 ? (
                                    <p className="text-xs text-[#1a1a1a]/30">
                                      Nessun utente assegnato
                                    </p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {evAssignments.map((a) => (
                                        <span
                                          key={a.id}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#c0dde0]/30 text-xs font-medium text-[#1a1a1a]"
                                        >
                                          {a.profiles?.full_name ?? a.user_id}
                                          <button
                                            onClick={() =>
                                              removeUserFromEvent(
                                                ev.id,
                                                a.user_id
                                              )
                                            }
                                            disabled={
                                              assigningEventId === ev.id
                                            }
                                            className="text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors disabled:opacity-50"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Add user */}
                                <div className="flex items-center gap-2">
                                  <select
                                    value={addUserId[ev.id] ?? ""}
                                    onChange={(e) =>
                                      setAddUserId((prev) => ({
                                        ...prev,
                                        [ev.id]: e.target.value,
                                      }))
                                    }
                                    className="flex-1 px-3 py-2 rounded-lg border border-[#1a1a1a]/10 bg-white text-sm text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#c0dde0]"
                                  >
                                    <option value="">
                                      Aggiungi utente...
                                    </option>
                                    {users
                                      .filter(
                                        (u) =>
                                          !evAssignments.some(
                                            (a) => a.user_id === u.id
                                          )
                                      )
                                      .map((u) => (
                                        <option key={u.id} value={u.id}>
                                          {u.full_name ?? u.id}
                                        </option>
                                      ))}
                                  </select>
                                  <button
                                    onClick={() =>
                                      addUserToEvent(
                                        ev.id,
                                        addUserId[ev.id] ?? ""
                                      )
                                    }
                                    disabled={
                                      !addUserId[ev.id] ||
                                      assigningEventId === ev.id
                                    }
                                    className="px-3 py-2 rounded-lg bg-[#1a1a1a] text-white text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-40"
                                  >
                                    {assigningEventId === ev.id ? "..." : "Aggiungi"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
