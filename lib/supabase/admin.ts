import { createClient } from "@supabase/supabase-js";

// Returns a fresh admin client on each call so env vars are always resolved
// at call time — never at module load time (which can be before .env is injected).
// Only use server-side: middleware, server components, API routes.
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
