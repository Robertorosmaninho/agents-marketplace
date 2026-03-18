import { Pool } from "pg";

import { PostgresMarketplaceStore } from "@marketplace/shared";

import { createMarketplaceApi, createX402FacilitatorClient } from "./app.js";

const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;
const payTo = process.env.MARKETPLACE_TREASURY_ADDRESS;
const facilitatorUrl = process.env.MARKETPLACE_FACILITATOR_URL ?? "http://localhost:4020";
const sessionSecret = process.env.MARKETPLACE_SESSION_SECRET ?? "development-marketplace-secret";
const baseUrl = process.env.MARKETPLACE_BASE_URL ?? `http://localhost:${port}`;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (!payTo) {
  throw new Error("MARKETPLACE_TREASURY_ADDRESS is required.");
}

const pool = new Pool({ connectionString: databaseUrl });
const store = new PostgresMarketplaceStore(pool);

await store.ensureSchema();

const app = createMarketplaceApi({
  store,
  payTo,
  sessionSecret,
  facilitatorClient: createX402FacilitatorClient(facilitatorUrl),
  baseUrl
});

const server = app.listen(port, () => {
  console.log(`Marketplace API listening on ${baseUrl}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    server.close();
    await pool.end();
    process.exit(0);
  });
}
