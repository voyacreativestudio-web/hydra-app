"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  badge?: number | null;
  icon: React.ReactNode;
};

type Props = {
  children: React.ReactNode;
  fullName: string;
  role: string;
  pendingCount: number;
};

const NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/admin/utenti",
    label: "Utenti",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/pezzi",
    label: "Pezzi & Fail",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    href: "/admin/bonus",
    label: "Bonus",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: "/admin/contratti",
    label: "Contratti",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/eventi",
    label: "Piano Eventi",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
];

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function SidebarContent({
  pathname,
  pendingCount,
  fullName,
  role,
  onClose,
}: {
  pathname: string;
  pendingCount: number;
  fullName: string;
  role: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#c0dde0] flex items-center justify-center shrink-0">
            <span className="text-[#1a1a1a] text-sm font-bold tracking-widest">H</span>
          </div>
          <div>
            <p className="text-white text-sm font-bold tracking-widest uppercase">Hydra</p>
            <p className="text-white/40 text-[10px] font-medium uppercase tracking-wider">Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const badge = item.href === "/admin/utenti" ? (pendingCount > 0 ? pendingCount : null) : null;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className={isActive ? "text-[#c0dde0]" : ""}>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {badge !== null && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#f2d3a3] text-[10px] font-bold text-[#1a1a1a]">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-white/10" />

      {/* Back to app */}
      <div className="px-3 py-3">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Torna all&apos;app
        </Link>
      </div>

      {/* User */}
      <div className="px-3 pb-4 pt-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
          <div className="w-8 h-8 rounded-full bg-[#c0dde0]/30 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{getInitials(fullName)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{fullName}</p>
            <p className="text-white/40 text-[10px] capitalize">{role.replace(/_/g, " ")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminShell({ children, fullName, role, pendingCount }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Desktop sidebar — fixed left, hidden on mobile */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 bg-[#1a1a1a] flex-col z-30">
        <SidebarContent
          pathname={pathname}
          pendingCount={pendingCount}
          fullName={fullName}
          role={role}
        />
      </aside>

      {/* Mobile top header — visible on mobile only */}
      <header className="md:hidden sticky top-0 bg-white border-b border-[#1a1a1a]/8 z-20 h-14 flex items-center justify-between px-4">
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#f0f0f0] transition-colors"
          aria-label="Apri menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#c0dde0] flex items-center justify-center">
            <span className="text-[#1a1a1a] text-xs font-bold">H</span>
          </div>
          <span className="text-sm font-bold text-[#1a1a1a] tracking-widest uppercase">Hydra</span>
          <span className="text-[10px] font-semibold text-[#1a1a1a]/30 uppercase tracking-wider ml-0.5">Admin</span>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#c0dde0]/40 flex items-center justify-center">
          <span className="text-[#1a1a1a] text-xs font-bold">{getInitials(fullName)}</span>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-72 bg-[#1a1a1a] z-50 transform transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <SidebarContent
          pathname={pathname}
          pendingCount={pendingCount}
          fullName={fullName}
          role={role}
          onClose={() => setDrawerOpen(false)}
        />
      </aside>

      {/* Main content — offset by sidebar on desktop */}
      <main className="md:ml-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
