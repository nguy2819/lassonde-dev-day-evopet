import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { getActor } from "./auth";
import { ForbiddenError, getRepo } from "./data";
import type { Repo } from "./data/repo";
import type { Actor } from "./types";
import { validationError } from "./validation";

type Handler = (ctx: { actor: Actor; repo: Repo }) => Promise<Response>;

/** Wraps a route: requires a session, maps permission errors to 403, hides internals. */
export async function withActor(handler: Handler): Promise<Response> {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return await handler({ actor, repo: await getRepo() });
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: "forbidden", message: err.message }, { status: 403 });
    console.error("[api]", err);
    return NextResponse.json({ error: "server_error", message: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    json = {};
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { ok: false, response: NextResponse.json(validationError(parsed.error), { status: 400 }) };
  return { ok: true, data: parsed.data };
}
