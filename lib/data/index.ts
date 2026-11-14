import "server-only";
import { isDatabaseConfigured } from "../env";
import { demoRepo } from "./demo-repo";
import type { Repo } from "./repo";

export async function getRepo(): Promise<Repo> {
  if (isDatabaseConfigured()) {
    const { postgresRepo } = await import("./postgres-repo");
    return postgresRepo;
  }
  return demoRepo;
}

export { ForbiddenError } from "./repo";
