import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const DEMO_ROLE_COOKIE = "evo_demo_role";

/**
 * Optimistic route guard + Supabase session refresh. Real authorization happens
 * in Route Handlers / Server Components (getActor) and in Postgres RLS.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const supabaseOn = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  let response = NextResponse.next({ request });
  let signedIn = false;
  let role: string | undefined;

  if (supabaseOn) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }
  if (!signedIn) {
    role = request.cookies.get(DEMO_ROLE_COOKIE)?.value;
    signedIn = Boolean(role);
  }

  const protectedArea = ["/app", "/care", "/support", "/onboarding"].some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (protectedArea && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Demo-mode role routing (Supabase mode checks roles server-side).
  if (role && pathname.startsWith("/care") && !["clinician", "organization_admin"].includes(role)) {
    return NextResponse.redirect(new URL(role === "supporter" ? "/support" : "/app/home", request.url));
  }
  if (role && pathname.startsWith("/app") && role !== "patient") {
    return NextResponse.redirect(new URL(role === "supporter" ? "/support" : "/care", request.url));
  }

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
