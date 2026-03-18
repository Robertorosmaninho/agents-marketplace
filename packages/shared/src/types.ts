import type { ZodTypeAny } from "zod";

export type RouteMode = "sync" | "async";
export type ResourceType = "job";
export type JobStatus = "pending" | "completed" | "failed";
export type RefundStatus = "not_required" | "pending" | "sent" | "failed";

export interface RoutePayoutConfig {
  providerAccountId: string;
  providerWallet: string | null;
  providerBps: number;
}

export interface PersistedPayoutSplit {
  currency: "fastUSDC";
  marketplaceWallet: string;
  marketplaceBps: number;
  marketplaceAmount: string;
  providerAccountId: string;
  providerWallet: string | null;
  providerBps: number;
  providerAmount: string;
}

export interface MarketplaceRoute<
  TInput extends ZodTypeAny = ZodTypeAny,
  TOutput extends ZodTypeAny = ZodTypeAny
> {
  routeId: string;
  provider: string;
  operation: string;
  version: string;
  mode: RouteMode;
  network: "fast-mainnet";
  price: string;
  title: string;
  description: string;
  payout: RoutePayoutConfig;
  inputSchema: TInput;
  outputSchema: TOutput;
}

export interface SyncExecuteResult {
  kind: "sync";
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface AsyncExecuteResult {
  kind: "async";
  providerJobId: string;
  state?: Record<string, unknown>;
  pollAfterMs?: number;
}

export type ExecuteResult = SyncExecuteResult | AsyncExecuteResult;

export interface PollPendingResult {
  status: "pending";
  state?: Record<string, unknown>;
  pollAfterMs?: number;
}

export interface PollCompletedResult {
  status: "completed";
  body: unknown;
}

export interface PollFailedResult {
  status: "failed";
  error: string;
  permanent: boolean;
  state?: Record<string, unknown>;
}

export type PollResult = PollPendingResult | PollCompletedResult | PollFailedResult;

export interface ProviderExecuteContext {
  route: MarketplaceRoute;
  input: unknown;
  buyerWallet: string;
  paymentId: string;
}

export interface ProviderPollContext {
  route: MarketplaceRoute;
  job: JobRecord;
}

export interface ProviderAdapter {
  execute(context: ProviderExecuteContext): Promise<ExecuteResult>;
  poll(context: ProviderPollContext): Promise<PollResult>;
}

export type ProviderRegistry = Record<string, ProviderAdapter>;

export interface FacilitatorVerifyResult {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
  network?: string;
}

export interface FacilitatorClient {
  verify(paymentPayload: string, paymentRequirement: unknown): Promise<FacilitatorVerifyResult>;
}

export interface RefundReceipt {
  txHash: string;
}

export interface RefundService {
  issueRefund(input: { wallet: string; amount: string; reason: string }): Promise<RefundReceipt>;
}

export interface IdempotencyRecord {
  paymentId: string;
  normalizedRequestHash: string;
  buyerWallet: string;
  routeId: string;
  routeVersion: string;
  quotedPrice: string;
  payoutSplit: PersistedPayoutSplit;
  paymentPayload: string;
  facilitatorResponse: unknown;
  responseKind: "sync" | "job";
  responseStatusCode: number;
  responseBody: unknown;
  responseHeaders: Record<string, string>;
  jobToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobRecord {
  jobToken: string;
  paymentId: string;
  routeId: string;
  provider: string;
  operation: string;
  buyerWallet: string;
  quotedPrice: string;
  payoutSplit: PersistedPayoutSplit;
  providerJobId: string;
  requestBody: unknown;
  providerState: Record<string, unknown> | null;
  status: JobStatus;
  resultBody: unknown;
  errorMessage: string | null;
  refundStatus: RefundStatus;
  refundId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderAttemptRecord {
  id: string;
  jobToken: string;
  phase: "execute" | "poll" | "refund";
  status: "succeeded" | "failed";
  requestPayload: unknown;
  responsePayload: unknown;
  errorMessage: string | null;
  createdAt: string;
}

export interface AccessGrantRecord {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  wallet: string;
  paymentId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  jobToken: string;
  paymentId: string;
  wallet: string;
  amount: string;
  status: "pending" | "sent" | "failed";
  txHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSyncIdempotencyInput {
  paymentId: string;
  normalizedRequestHash: string;
  buyerWallet: string;
  routeId: string;
  routeVersion: string;
  quotedPrice: string;
  payoutSplit: PersistedPayoutSplit;
  paymentPayload: string;
  facilitatorResponse: unknown;
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface SaveAsyncAcceptanceInput {
  paymentId: string;
  normalizedRequestHash: string;
  buyerWallet: string;
  route: MarketplaceRoute;
  quotedPrice: string;
  payoutSplit: PersistedPayoutSplit;
  paymentPayload: string;
  facilitatorResponse: unknown;
  jobToken: string;
  providerJobId: string;
  requestBody: unknown;
  providerState?: Record<string, unknown>;
  responseBody: unknown;
  responseHeaders?: Record<string, string>;
}

export interface MarketplaceStore {
  ensureSchema(): Promise<void>;
  getIdempotencyByPaymentId(paymentId: string): Promise<IdempotencyRecord | null>;
  saveSyncIdempotency(input: SaveSyncIdempotencyInput): Promise<IdempotencyRecord>;
  saveAsyncAcceptance(input: SaveAsyncAcceptanceInput): Promise<{ idempotency: IdempotencyRecord; job: JobRecord }>;
  getJob(jobToken: string): Promise<JobRecord | null>;
  listPendingJobs(limit: number): Promise<JobRecord[]>;
  updateJobPending(jobToken: string, providerState?: Record<string, unknown>): Promise<JobRecord>;
  completeJob(jobToken: string, body: unknown): Promise<JobRecord>;
  failJob(jobToken: string, error: string): Promise<JobRecord>;
  createAccessGrant(input: {
    resourceType: ResourceType;
    resourceId: string;
    wallet: string;
    paymentId: string;
    metadata?: Record<string, unknown>;
  }): Promise<AccessGrantRecord>;
  getAccessGrant(resourceType: ResourceType, resourceId: string, wallet: string): Promise<AccessGrantRecord | null>;
  recordProviderAttempt(input: {
    jobToken: string;
    phase: "execute" | "poll" | "refund";
    status: "succeeded" | "failed";
    requestPayload?: unknown;
    responsePayload?: unknown;
    errorMessage?: string;
  }): Promise<ProviderAttemptRecord>;
  createRefund(input: {
    jobToken: string;
    paymentId: string;
    wallet: string;
    amount: string;
  }): Promise<RefundRecord>;
  markRefundSent(refundId: string, txHash: string): Promise<RefundRecord>;
  markRefundFailed(refundId: string, errorMessage: string): Promise<RefundRecord>;
  getRefundByJobToken(jobToken: string): Promise<RefundRecord | null>;
}

export interface ChallengePayload {
  wallet: string;
  resourceType: ResourceType;
  resourceId: string;
  nonce: string;
  expiresAt: string;
}

export interface SessionTokenPayload {
  wallet: string;
  resourceType: ResourceType;
  resourceId: string;
  expiresAt: string;
}
