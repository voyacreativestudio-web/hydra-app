import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { userId, fullName, role, teamId } = await request.json();

  if (!userId || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { error } = await getAdminClient()
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      team_id: teamId || null,
      data_inizio: new Date().toISOString().split("T")[0],
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
