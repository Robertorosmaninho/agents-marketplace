import { z } from "zod";

import type { MarketplaceRoute } from "./types.js";

export const quickInsightInputSchema = z.object({
  query: z.string().min(1).max(240)
});

export const quickInsightOutputSchema = z.object({
  provider: z.literal("mock"),
  operation: z.literal("quick-insight"),
  query: z.string(),
  summary: z.string(),
  generatedAt: z.string()
});

export const asyncReportInputSchema = z.object({
  topic: z.string().min(1).max(240),
  delayMs: z.number().int().min(1_000).max(60_000).optional(),
  shouldFail: z.boolean().optional()
});

export const asyncReportOutputSchema = z.object({
  provider: z.literal("mock"),
  operation: z.literal("async-report"),
  topic: z.string(),
  report: z.string(),
  completedAt: z.string()
});

export const marketplaceRoutes: MarketplaceRoute[] = [
  {
    routeId: "mock.quick-insight.v1",
    provider: "mock",
    operation: "quick-insight",
    version: "v1",
    mode: "sync",
    network: "fast-mainnet",
    price: "$0.05",
    title: "Quick Insight",
    description: "Return a paid single-shot mock insight response.",
    inputSchema: quickInsightInputSchema,
    outputSchema: quickInsightOutputSchema
  },
  {
    routeId: "mock.async-report.v1",
    provider: "mock",
    operation: "async-report",
    version: "v1",
    mode: "async",
    network: "fast-mainnet",
    price: "$0.15",
    title: "Async Report",
    description: "Create a paid async mock report job and return a job token.",
    inputSchema: asyncReportInputSchema,
    outputSchema: asyncReportOutputSchema
  }
];

export function findMarketplaceRoute(provider: string, operation: string): MarketplaceRoute | undefined {
  return marketplaceRoutes.find(
    (route) => route.provider === provider && route.operation === operation
  );
}

export function findMarketplaceRouteById(routeId: string): MarketplaceRoute | undefined {
  return marketplaceRoutes.find((route) => route.routeId === routeId);
}
