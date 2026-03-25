import { DEFAULT_JOB_POLL_INTERVAL_MS } from "./constants.js";
import { requiresX402Payment } from "./billing.js";
import type {
  JobRecord,
  MarketplaceRoute,
  MarketplaceStore,
  RefundRecord,
  RefundService
} from "./types.js";

function nextDate(now: Date, deltaMs: number): string {
  return new Date(now.getTime() + deltaMs).toISOString();
}

export function computeNextPollAt(pollAfterMs?: number | null, now: Date = new Date()): string {
  return nextDate(now, Math.max(1_000, pollAfterMs ?? DEFAULT_JOB_POLL_INTERVAL_MS));
}

export function computeTimeoutAt(route: Pick<MarketplaceRoute, "asyncConfig">, now: Date = new Date()): string | null {
  if (!route.asyncConfig) {
    return null;
  }

  return nextDate(now, route.asyncConfig.timeoutMs);
}

export async function resolveAsyncJobFailure(input: {
  store: MarketplaceStore;
  refundService: RefundService;
  job: JobRecord;
  error: string;
}): Promise<{ job: JobRecord; refund: RefundRecord | null }> {
  const job = await input.store.failJob(input.job.jobToken, input.error);
  if (!job.payoutSplit.usesTreasurySettlement || !requiresX402Payment(job.routeSnapshot)) {
    return { job, refund: null };
  }
  if (!job.paymentId) {
    throw new Error(`Missing paymentId for refundable async job ${job.jobToken}.`);
  }

  const refund = await input.store.createRefund({
    jobToken: job.jobToken,
    paymentId: job.paymentId,
    wallet: job.buyerWallet,
    amount: job.quotedPrice
  });

  try {
    const receipt = await input.refundService.issueRefund({
      wallet: job.buyerWallet,
      amount: job.quotedPrice,
      reason: input.error
    });
    return {
      job: await input.store.failJob(job.jobToken, input.error),
      refund: await input.store.markRefundSent(refund.id, receipt.txHash)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refund failure.";
    return {
      job: await input.store.failJob(job.jobToken, input.error),
      refund: await input.store.markRefundFailed(refund.id, message)
    };
  }
}
