"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs font-medium text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#1a1a1a]/5"
    >
      Esci
    </button>
  );
}
