import { Pool } from "pg";

import { DEFAULT_JOB_POLL_INTERVAL_MS, PostgresMarketplaceStore } from "@marketplace/shared";

import { createFastRefundService, runMarketplaceWorkerCycle } from "./worker.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const pool = new Pool({ connectionString: databaseUrl });
const store = new PostgresMarketplaceStore(pool);
await store.ensureSchema();

const refundService = createFastRefundService({
  rpcUrl: process.env.FAST_RPC_URL ?? "https://api.fast.xyz/proxy",
  privateKey: process.env.MARKETPLACE_TREASURY_PRIVATE_KEY,
  keyfilePath: process.env.MARKETPLACE_TREASURY_KEYFILE
});

const intervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? DEFAULT_JOB_POLL_INTERVAL_MS);

const timer = setInterval(() => {
  void runMarketplaceWorkerCycle({
    store,
    refundService
  }).catch((error) => {
    console.error("Worker cycle failed:", error);
  });
}, intervalMs);

void runMarketplaceWorkerCycle({ store, refundService }).catch((error) => {
  console.error("Initial worker cycle failed:", error);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    clearInterval(timer);
    await pool.end();
    process.exit(0);
  });
}
