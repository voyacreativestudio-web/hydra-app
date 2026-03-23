import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.status === "pending") {
    redirect("/pending");
  }

  if (profile.status === "suspended") {
    redirect("/login");
  }

  redirect("/dashboard");
}
