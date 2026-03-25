import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import CreaSquadraForm from "./CreaSquadraForm";

export const dynamic = "force-dynamic";

export default async function CreaSquadraPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role, status, team_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") redirect("/pending");

  // Eligible users: same top team, leader or supporter, not self
  const { data: eligibleUsers } = profile.team_id
    ? await admin
        .from("profiles")
        .select("id, full_name, role")
        .eq("team_id", profile.team_id)
        .in("role", ["leader", "supporter"])
        .eq("status", "active")
        .neq("id", user.id)
        .order("full_name")
    : { data: [] as { id: string; full_name: string | null; role: string | null }[] };

  return (
    <CreaSquadraForm
      userId={user.id}
      userTeamId={profile.team_id}
      eligibleUsers={eligibleUsers ?? []}
    />
  );
}
