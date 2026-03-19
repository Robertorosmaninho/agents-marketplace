import { getDefaultMarketplaceNetworkConfig, type MarketplaceNetworkConfig } from "./network.js";
import { buildSeededMarketplaceRoutes } from "./seed.js";
import type { MarketplaceRoute } from "./types.js";

export function buildMarketplaceRoutes(
  config: MarketplaceNetworkConfig = getDefaultMarketplaceNetworkConfig()
): MarketplaceRoute[] {
  return buildSeededMarketplaceRoutes(config);
}

export const marketplaceRoutes: MarketplaceRoute[] = buildMarketplaceRoutes();

export function findMarketplaceRoute(provider: string, operation: string): MarketplaceRoute | undefined {
  return marketplaceRoutes.find((route) => route.provider === provider && route.operation === operation);
}

export function findMarketplaceRouteById(routeId: string): MarketplaceRoute | undefined {
  return marketplaceRoutes.find((route) => route.routeId === routeId);
}
