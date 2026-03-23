import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import NuovoPezziForm from "./NuovoPezziForm";

export const dynamic = "force-dynamic";

export default async function NuovoPezziPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role, tipo_contratto, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status !== "active") redirect("/pending");

  const { data: lookup } = await admin
    .from("commissioni_lookup")
    .select("mix_value, starter_street, starter_evento, profitto_team_1, profitto_team_2")
    .order("mix_value");

  return (
    <NuovoPezziForm
      userId={user.id}
      userRole={profile.role}
      defaultTipo={profile.tipo_contratto ?? "street"}
      commissioni={lookup ?? []}
    />
  );
}
