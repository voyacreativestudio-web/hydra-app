import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import EditPezziForm from "./EditPezziForm";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ data: string }>;
};

export default async function EditPezziPage({ params }: Props) {
  const { data: dateParam } = await params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) redirect("/dashboard");

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

  const [{ data: pezziRaw }, { data: lookup }] = await Promise.all([
    admin
      .from("pezzi")
      .select("id, mix_value, numero_pezzi, commissione, note")
      .eq("user_id", user.id)
      .eq("data", dateParam)
      .order("mix_value"),
    admin
      .from("commissioni_lookup")
      .select("mix_value, starter_street, starter_evento, profitto_team_1, profitto_team_2")
      .order("mix_value"),
  ]);

  // Infer tipo from first existing row (default to tipo_contratto)
  const defaultTipo =
    (pezziRaw?.[0] as { tipo?: string } | undefined)?.tipo ??
    profile.tipo_contratto ??
    "street";

  return (
    <EditPezziForm
      userId={user.id}
      date={dateParam}
      defaultTipo={defaultTipo}
      existingPezzi={pezziRaw ?? []}
      commissioni={lookup ?? []}
    />
  );
}
