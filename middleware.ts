import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/pending"];

// Paths that require an active profile (status check enabled)
const PROTECTED_PREFIX = "/dashboard";

async function fetchProfileStatus(userId: string): Promise<string | null> {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data } = await admin
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .single();
  return data?.status ?? null;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Only enforce the active-status check on protected dashboard routes
  if (pathname.startsWith(PROTECTED_PREFIX)) {
    let status = await fetchProfileStatus(user.id);

    if (status === null) {
      // Brief null — could be a cold-start DB hiccup. Retry once after 500 ms.
      await sleep(500);
      status = await fetchProfileStatus(user.id);
    }

    if (status !== "active") {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|icons|api).*)",
  ],
};
