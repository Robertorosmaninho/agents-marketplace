import { describe, expect, it } from "vitest";

import { InMemoryMarketplaceStore, createDefaultProviderRegistry } from "@marketplace/shared";

import { runMarketplaceWorkerCycle } from "./worker.js";

describe("marketplace worker", () => {
  it("refunds a permanently failed async job", async () => {
    const store = new InMemoryMarketplaceStore();
    const registry = createDefaultProviderRegistry();
    const route = registry.mock;

    const buyerWallet = "fast1x0g58phuf0pf32e9uvp3mv6hak4z37ytpqyfzjzhfsehua9kmegqwzv0td";

    await store.saveAsyncAcceptance({
      paymentId: "worker_payment_1",
      normalizedRequestHash: "hash",
      buyerWallet,
      route: {
        routeId: "mock.async-report.v1",
        provider: "mock",
        operation: "async-report",
        version: "v1",
        mode: "async",
        network: "fast-mainnet",
        price: "$0.15",
        title: "Async Report",
        description: "desc",
        inputSchema: null as never,
        outputSchema: null as never
      },
      quotedPrice: "150000",
      paymentPayload: "payload",
      facilitatorResponse: { isValid: true },
      jobToken: "job_worker_1",
      providerJobId: "provider_worker_1",
      requestBody: { topic: "failing report" },
      providerState: {
        topic: "failing report",
        shouldFail: true,
        readyAt: Date.now() - 10
      },
      responseBody: {
        jobToken: "job_worker_1",
        status: "pending"
      },
      responseHeaders: {}
    });

    await runMarketplaceWorkerCycle({
      store,
      providers: registry,
      refundService: {
        async issueRefund() {
          return { txHash: "0xrefund" };
        }
      }
    });

    const job = await store.getJob("job_worker_1");
    const refund = await store.getRefundByJobToken("job_worker_1");

    expect(job?.status).toBe("failed");
    expect(job?.refundStatus).toBe("sent");
    expect(refund?.txHash).toBe("0xrefund");
  });
});
