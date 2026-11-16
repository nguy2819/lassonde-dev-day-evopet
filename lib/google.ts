import "server-only";

/** "Continue with Google" is enabled when both OAuth credentials are set. */
export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export const OAUTH_STATE_COOKIE = "evo_oauth_state";

/** Public origin used for the OAuth redirect URI. APP_URL wins behind proxies. */
export function appOrigin(req: Request) {
  return (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, "");
}

export function googleRedirectUri(req: Request) {
  return `${appOrigin(req)}/api/auth/google/callback`;
}

export interface GoogleUser {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

/** Exchanges the authorization code and reads the user's OpenID profile. */
export async function fetchGoogleUser(code: string, redirectUri: string): Promise<GoogleUser> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) throw new Error(`google token exchange failed (${tokenRes.status})`);
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error("google token exchange returned no access token");

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${access_token}` },
    cache: "no-store",
  });
  if (!infoRes.ok) throw new Error(`google userinfo failed (${infoRes.status})`);
  const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!info.sub || !info.email) throw new Error("google userinfo missing sub/email");
  return { sub: info.sub, email: info.email.toLowerCase(), emailVerified: info.email_verified === true, name: info.name?.trim() || null };
}
