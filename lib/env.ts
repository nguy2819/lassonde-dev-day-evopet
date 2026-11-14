/** Supabase is optional: without it the app runs on an in-memory demo store. */
export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export const DEMO_ROLE_COOKIE = "evo_demo_role";
