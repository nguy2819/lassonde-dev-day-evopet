import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/env";
import { OAUTH_STATE_COOKIE, appOrigin, googleRedirectUri, isGoogleConfigured } from "@/lib/google";

/** Starts "Continue with Google": redirects to Google's consent screen. */
export async function GET(req: Request) {
  if (!isDatabaseConfigured() || !isGoogleConfigured()) {
    return NextResponse.redirect(`${appOrigin(req)}/?auth=in&error=google_unavailable`);
  }
  const state = randomBytes(24).toString("base64url");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
