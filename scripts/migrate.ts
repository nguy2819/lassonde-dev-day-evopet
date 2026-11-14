/**
 * Applies db/migrations/*.sql in filename order, once each.
 *   npm run db:migrate
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (.env.local)");
  const client = new Client({ connectionString: url, ssl: url.includes("neon.tech") || /sslmode=require/.test(url) ? { rejectUnauthorized: true } : undefined });
  await client.connect();
  try {
    await client.query(`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
    const done = new Set((await client.query<{ name: string }>(`select name from schema_migrations`)).rows.map((r) => r.name));
    const dir = path.join(process.cwd(), "db", "migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const f of files) {
      if (done.has(f)) {
        console.log(`  skip   ${f}`);
        continue;
      }
      await client.query("begin");
      try {
        await client.query(readFileSync(path.join(dir, f), "utf8"));
        await client.query(`insert into schema_migrations (name) values ($1)`, [f]);
        await client.query("commit");
        console.log(`  apply  ${f}`);
      } catch (e) {
        await client.query("rollback");
        throw new Error(`${f}: ${(e as Error).message}`);
      }
    }
    console.log("Migrations up to date.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
