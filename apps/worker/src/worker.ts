import { FastProvider, FastWallet } from "@fastxyz/sdk";
import {
  createDefaultProviderRegistry,
  findMarketplaceRouteById,
  rawToDecimalString,
  type JobRecord,
  type MarketplaceStore,
  type ProviderRegistry,
  type RefundService
} from "@marketplace/shared";

export interface MarketplaceWorkerOptions {
  store: MarketplaceStore;
  refundService: RefundService;
  providers?: ProviderRegistry;
  limit?: number;
}

export async function runMarketplaceWorkerCycle(options: MarketplaceWorkerOptions): Promise<void> {
  const providers = options.providers ?? createDefaultProviderRegistry();
  const jobs = await options.store.listPendingJobs(options.limit ?? 10);

  for (const job of jobs) {
    const route = findMarketplaceRouteById(job.routeId);
    if (!route) {
      await options.store.failJob(job.jobToken, `Missing route registry entry: ${job.routeId}`);
      continue;
    }

    const provider = providers[route.provider];
    if (!provider) {
      await options.store.failJob(job.jobToken, `Missing provider adapter: ${route.provider}`);
      continue;
    }

    const pollResult = await provider.poll({ route, job });
    await options.store.recordProviderAttempt({
      jobToken: job.jobToken,
      phase: "poll",
      status: pollResult.status === "failed" ? "failed" : "succeeded",
      requestPayload: {
        providerJobId: job.providerJobId,
        state: job.providerState
      },
      responsePayload: pollResult,
      errorMessage: pollResult.status === "failed" ? pollResult.error : undefined
    });

    if (pollResult.status === "pending") {
      await options.store.updateJobPending(job.jobToken, pollResult.state);
      continue;
    }

    if (pollResult.status === "completed") {
      await options.store.completeJob(job.jobToken, pollResult.body);
      continue;
    }

    if (!pollResult.permanent) {
      await options.store.updateJobPending(job.jobToken, pollResult.state);
      continue;
    }

    await options.store.failJob(job.jobToken, pollResult.error);
    const refund = await options.store.createRefund({
      jobToken: job.jobToken,
      paymentId: job.paymentId,
      wallet: job.buyerWallet,
      amount: job.quotedPrice
    });

    try {
      const receipt = await options.refundService.issueRefund({
        wallet: job.buyerWallet,
        amount: job.quotedPrice,
        reason: pollResult.error
      });

      await options.store.recordProviderAttempt({
        jobToken: job.jobToken,
        phase: "refund",
        status: "succeeded",
        requestPayload: {
          wallet: job.buyerWallet,
          amount: job.quotedPrice
        },
        responsePayload: receipt
      });
      await options.store.markRefundSent(refund.id, receipt.txHash);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown refund failure.";
      await options.store.recordProviderAttempt({
        jobToken: job.jobToken,
        phase: "refund",
        status: "failed",
        requestPayload: {
          wallet: job.buyerWallet,
          amount: job.quotedPrice
        },
        errorMessage: message
      });
      await options.store.markRefundFailed(refund.id, message);
    }
  }
}

export function createFastRefundService(input: {
  rpcUrl?: string;
  privateKey?: string;
  keyfilePath?: string;
}): RefundService {
  const provider = new FastProvider({
    network: "mainnet",
    networks: {
      mainnet: {
        rpc: input.rpcUrl ?? "https://api.fast.xyz/proxy",
        explorer: "https://explorer.fast.xyz"
      }
    }
  });

  let walletPromise: Promise<FastWallet> | null = null;

  const getWallet = async () => {
    if (!walletPromise) {
      if (input.privateKey) {
        walletPromise = FastWallet.fromPrivateKey(input.privateKey, provider);
      } else if (input.keyfilePath) {
        walletPromise = FastWallet.fromKeyfile(
          { keyFile: input.keyfilePath, createIfMissing: false },
          provider
        );
      } else {
        throw new Error("Refund wallet is not configured. Set MARKETPLACE_TREASURY_PRIVATE_KEY or MARKETPLACE_TREASURY_KEYFILE.");
      }
    }

    return walletPromise;
  };

  return {
    async issueRefund({ wallet, amount, reason }) {
      const treasuryWallet = await getWallet();
      const result = await treasuryWallet.send({
        to: wallet,
        amount: rawToDecimalString(amount, 6),
        token: "fastUSDC"
      });

      return {
        txHash: result.txHash
      };
    }
  };
}
