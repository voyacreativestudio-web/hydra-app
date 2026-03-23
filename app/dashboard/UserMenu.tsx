"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu({ initials }: { initials: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-[#c0dde0] flex items-center justify-center text-sm font-bold text-[#1a1a1a] shrink-0"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-44 bg-white border border-[#1a1a1a]/8 rounded-xl shadow-lg overflow-hidden z-50">
          <Link
            href="/dashboard/profilo"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Profilo
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors border-t border-[#1a1a1a]/6"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Esci
          </button>
        </div>
      )}
    </div>
  );
}
