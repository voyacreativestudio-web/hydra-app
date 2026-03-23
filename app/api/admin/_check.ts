import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const ADMIN_ROLES = [
  "hr",
  "manager",
  "owner",
  "partner_manager",
  "assistant_manager",
];

export async function checkAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
      admin: null,
    };
  }

  const admin = getAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role ?? "")) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
      admin: null,
    };
  }

  return { ok: true, res: null, user, admin };
}
