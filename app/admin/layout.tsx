import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["hr", "manager", "owner", "partner_manager", "assistant_manager"];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = getAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role ?? "")) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
