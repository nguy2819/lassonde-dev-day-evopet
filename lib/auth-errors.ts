const AUTH_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up on this server yet. Please use email and password.",
  google_cancelled: "Google sign-in was cancelled.",
  google_state: "Your Google sign-in expired. Please try again.",
  google_failed: "We couldn't reach Google. Please try again.",
  google_unverified: "Your Google email isn't verified yet.",
  account_deleted: "This account has been scheduled for deletion.",
};

/** Maps `?error=` codes from the OAuth callback to friendly copy. */
export function authErrorMessage(code: string | null | undefined) {
  return code ? (AUTH_ERRORS[code] ?? null) : null;
}
