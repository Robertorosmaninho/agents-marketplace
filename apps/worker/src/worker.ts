import {
  createDefaultProviderRegistry,
  createFastRefundService,
  type MarketplaceStore,
  type MarketplaceDeploymentNetwork,
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
    const route = job.routeSnapshot;

    if (route.executorKind !== "mock") {
      await options.store.failJob(job.jobToken, `Unsupported async executor: ${route.executorKind}`);
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
