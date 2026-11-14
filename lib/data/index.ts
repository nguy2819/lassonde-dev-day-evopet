import "server-only";
import { isSupabaseConfigured } from "../env";
import { demoRepo } from "./demo-repo";
import type { Repo } from "./repo";

export async function getRepo(): Promise<Repo> {
  if (isSupabaseConfigured()) {
    const { supabaseRepo } = await import("./supabase-repo");
    return supabaseRepo;
  }
  return demoRepo;
}

export { ForbiddenError } from "./repo";
