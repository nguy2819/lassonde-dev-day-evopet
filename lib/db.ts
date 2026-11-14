import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * One pool per server instance. Works with Neon (pooled connection string),
 * Vercel serverless (Node runtime) and any local Postgres.
 */
const g = globalThis as unknown as { __evoPool?: Pool };

function pool() {
  if (!g.__evoPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__evoPool = new Pool({
      connectionString: url,
      // Local PGlite has a single backend session, so it needs DATABASE_POOL_MAX=1.
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      ssl: /sslmode=(require|verify)/.test(url) || url.includes("neon.tech") ? { rejectUnauthorized: true } : undefined,
    });
  }
  return g.__evoPool;
}

export type Sql = <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<T[]>;

const bind = (c: Pool | PoolClient): Sql => async (text, params) => (await c.query(text, params as unknown[])).rows;

/**
 * Privileged query as the database owner. RLS does NOT apply.
 * Only for authentication (accounts/sessions) and sign-up bootstrapping.
 */
export const systemSql: Sql = (text, params) => bind(pool())(text, params);

/**
 * Runs `fn` in a transaction as the non-privileged `app_user` role with
 * app.user_id set, so every Row Level Security policy applies.
 */
export async function withUser<T>(userId: string, fn: (sql: Sql) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("set local role app_user");
    await client.query("select set_config('app.user_id', $1, true)", [userId]);
    const result = await fn(bind(client));
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
