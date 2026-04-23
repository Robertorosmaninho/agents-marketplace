import { Pool } from "pg";

import { PostgresMarketplaceStore } from "@marketplace/shared";

import { createMarketplaceApi } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;
const adminToken = process.env.MARKETPLACE_ADMIN_TOKEN;
const secretsKey = process.env.MARKETPLACE_SECRETS_KEY;
const baseUrl = process.env.MARKETPLACE_BASE_URL ?? `http://localhost:${port}`;
const corsOrigin = process.env.CORS_ORIGIN ?? "*";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}
if (!adminToken) {
  throw new Error("MARKETPLACE_ADMIN_TOKEN is required.");
}
if (!secretsKey) {
  throw new Error("MARKETPLACE_SECRETS_KEY is required.");
}

const pool = new Pool({ connectionString: databaseUrl });
const store = new PostgresMarketplaceStore(pool);

await store.ensureSchema();

const app = createMarketplaceApi({
  store,
  adminToken,
  secretsKey,
  baseUrl,
  corsOrigin
});

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Marketplace API listening on ${baseUrl}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    server.close();
    await pool.end();
    process.exit(0);
  });
}
