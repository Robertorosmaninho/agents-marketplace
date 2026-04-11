import { Pool } from "pg";

import {
  DEFAULT_JOB_POLL_INTERVAL_MS,
  PostgresMarketplaceStore,
  createFastPayoutService,
  createFastRefundService,
  createX402UpstreamPaymentService,
  normalizeMarketplaceDeploymentNetwork,
  resolveMarketplaceNetworkConfig
} from "@marketplace/shared";

import { runMarketplaceWorkerCycle } from "./worker.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const secretsKey = process.env.MARKETPLACE_SECRETS_KEY;
if (!secretsKey) {
  throw new Error("MARKETPLACE_SECRETS_KEY is required.");
}
const runtimeSecretsKey: string = secretsKey;

const pool = new Pool({ connectionString: databaseUrl });
const store = new PostgresMarketplaceStore(pool);
await store.ensureSchema();
const network = resolveMarketplaceNetworkConfig({
  deploymentNetwork: normalizeMarketplaceDeploymentNetwork(process.env.MARKETPLACE_FAST_NETWORK),
  rpcUrl: process.env.FAST_RPC_URL
});

const refundService = createFastRefundService({
  deploymentNetwork: network.deploymentNetwork,
  rpcUrl: network.rpcUrl,
  privateKey: process.env.MARKETPLACE_TREASURY_PRIVATE_KEY,
  keyfilePath: process.env.MARKETPLACE_TREASURY_KEYFILE
});
const payoutService = createFastPayoutService({
  deploymentNetwork: network.deploymentNetwork,
  rpcUrl: network.rpcUrl,
  privateKey: process.env.MARKETPLACE_TREASURY_PRIVATE_KEY,
  keyfilePath: process.env.MARKETPLACE_TREASURY_KEYFILE
});
const upstreamEvmPrivateKey = process.env.MARKETPLACE_UPSTREAM_EVM_PRIVATE_KEY as `0x${string}` | undefined;
const upstreamEvmAddress = process.env.MARKETPLACE_UPSTREAM_EVM_ADDRESS as `0x${string}` | undefined;
const upstreamPaymentService = upstreamEvmPrivateKey && upstreamEvmAddress
  ? createX402UpstreamPaymentService({
      evmPrivateKey: upstreamEvmPrivateKey,
      evmAddress: upstreamEvmAddress,
      verbose: process.env.MARKETPLACE_UPSTREAM_X402_VERBOSE === "true"
    })
  : undefined;

const intervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? DEFAULT_JOB_POLL_INTERVAL_MS);
let stopped = false;
let timer: NodeJS.Timeout | null = null;

async function runCycle() {
  if (stopped) {
    return;
  }

  try {
    await runMarketplaceWorkerCycle({
      store,
      refundService,
      payoutService,
      upstreamPaymentService,
      secretsKey: runtimeSecretsKey
    });
  } catch (error) {
    console.error("Worker cycle failed:", error);
  } finally {
    if (!stopped) {
      timer = setTimeout(() => {
        void runCycle();
      }, intervalMs);
    }
  }
}

void runCycle();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
    }
    await pool.end();
    process.exit(0);
  });
}
