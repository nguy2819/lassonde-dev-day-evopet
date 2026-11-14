/** Postgres (Neon) is optional: without DATABASE_URL the app runs on an in-memory demo store. */
export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/** Persona buttons: always on in demo mode, opt-in when a database is configured. */
export function isDemoLoginEnabled() {
  return !isDatabaseConfigured() || process.env.ENABLE_DEMO_LOGIN === "true";
}

export const DEMO_ROLE_COOKIE = "evo_demo_role";
export const SESSION_COOKIE = "evo_session";
