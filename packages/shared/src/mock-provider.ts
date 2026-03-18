import { createOpaqueToken } from "./hashing.js";
import type {
  PollResult,
  ProviderAdapter,
  ProviderExecuteContext,
  ProviderPollContext,
  ProviderRegistry
} from "./types.js";

function isoNow(): string {
  return new Date().toISOString();
}

export class MockProviderAdapter implements ProviderAdapter {
  async execute(context: ProviderExecuteContext) {
    if (context.route.operation === "quick-insight") {
      const input = context.input as { query: string };
      return {
        kind: "sync" as const,
        statusCode: 200,
        body: {
          provider: "mock",
          operation: "quick-insight",
          query: input.query,
          summary: `Mock alpha signal for "${input.query}" generated for ${context.buyerWallet.slice(0, 16)}...`,
          generatedAt: isoNow()
        }
      };
    }

    if (context.route.operation === "async-report") {
      const input = context.input as { topic: string; delayMs?: number; shouldFail?: boolean };
      return {
        kind: "async" as const,
        providerJobId: createOpaqueToken("provider"),
        pollAfterMs: input.delayMs ?? 5_000,
        state: {
          topic: input.topic,
          shouldFail: Boolean(input.shouldFail),
          readyAt: Date.now() + (input.delayMs ?? 5_000)
        }
      };
    }

    throw new Error(`Unsupported mock operation: ${context.route.operation}`);
  }

  async poll(context: ProviderPollContext): Promise<PollResult> {
    if (context.route.operation !== "async-report") {
      return { status: "completed", body: context.job.resultBody };
    }

    const state = context.job.providerState ?? {};
    const readyAt = Number(state.readyAt ?? 0);
    if (Date.now() < readyAt) {
      return {
        status: "pending",
        state,
        pollAfterMs: Math.max(1_000, readyAt - Date.now())
      };
    }

    if (Boolean(state.shouldFail)) {
      return {
        status: "failed",
        permanent: true,
        error: `Mock provider failed report generation for "${state.topic ?? "unknown"}".`,
        state
      };
    }

    return {
      status: "completed",
      body: {
        provider: "mock",
        operation: "async-report",
        topic: state.topic ?? "unknown",
        report: `Mock report body for "${state.topic ?? "unknown"}".`,
        completedAt: isoNow()
      }
    };
  }
}

export function createDefaultProviderRegistry(): ProviderRegistry {
  return {
    mock: new MockProviderAdapter()
  };
}
