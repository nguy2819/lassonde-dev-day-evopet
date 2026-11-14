import { NextResponse, type NextRequest } from "next/server";

const DEMO_ROLE_COOKIE = "evo_demo_role";
const SESSION_COOKIE = "evo_session";

/**
 * Optimistic route guard. It only checks that a session cookie exists; real
 * authorization happens in Route Handlers / Server Components (getActor) and
 * in Postgres Row Level Security.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get(DEMO_ROLE_COOKIE)?.value;
  const signedIn = Boolean(role || request.cookies.get(SESSION_COOKIE)?.value);

  const protectedArea = ["/app", "/care", "/support", "/onboarding"].some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (protectedArea && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Demo-mode role routing (database mode checks roles server-side in the layouts).
  if (role && pathname.startsWith("/care") && !["clinician", "organization_admin"].includes(role)) {
    return NextResponse.redirect(new URL(role === "supporter" ? "/support" : "/app/home", request.url));
  }
  if (role && pathname.startsWith("/app") && role !== "patient") {
    return NextResponse.redirect(new URL(role === "supporter" ? "/support" : "/care", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
