/**
 * A real Postgres for local development, without Docker or a cloud account.
 * Runs PGlite (Postgres compiled to WASM) behind a Postgres wire-protocol socket.
 *
 *   npm run db:local     # then DATABASE_URL=postgresql://postgres@127.0.0.1:5433/postgres
 *
 * Data is kept in ./.pglite (git-ignored). Neon is still the target for deployment.
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.LOCAL_DB_PORT ?? 5433);

async function main() {
  const db = await PGlite.create(process.env.LOCAL_DB_DIR ?? "./.pglite", { extensions: { pgcrypto } });
  const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
  await server.start();
  console.log(`Local Postgres (PGlite) ready on postgresql://postgres@127.0.0.1:${port}/postgres`);
  const stop = async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
