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
  private readonly syncResponses = new Map<string, { statusCode: number; body: unknown }>();
  private readonly asyncResponses = new Map<
    string,
    { providerJobId: string; pollAfterMs: number; state: Record<string, unknown> }
  >();

  async execute(context: ProviderExecuteContext) {
    if (context.route.operation === "quick-insight") {
      const existing = this.syncResponses.get(context.requestId);
      if (existing) {
        return {
          kind: "sync" as const,
          statusCode: existing.statusCode,
          body: existing.body
        };
      }

      const input = context.input as { query: string };
      const response = {
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
      this.syncResponses.set(context.requestId, {
        statusCode: response.statusCode,
        body: response.body
      });
      return response;
    }

    if (context.route.operation === "async-report") {
      const existing = this.asyncResponses.get(context.requestId);
      if (existing) {
        return {
          kind: "async" as const,
          providerJobId: existing.providerJobId,
          pollAfterMs: existing.pollAfterMs,
          state: existing.state
        };
      }

      const input = context.input as { topic: string; delayMs?: number; shouldFail?: boolean };
      const response = {
        kind: "async" as const,
        providerJobId: createOpaqueToken("provider"),
        pollAfterMs: input.delayMs ?? 5_000,
        state: {
          topic: input.topic,
          shouldFail: Boolean(input.shouldFail),
          readyAt: Date.now() + (input.delayMs ?? 5_000)
        }
      };
      this.asyncResponses.set(context.requestId, {
        providerJobId: response.providerJobId,
        pollAfterMs: response.pollAfterMs ?? 5_000,
        state: response.state ?? {}
      });
      return response;
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
