import { createHash } from "node:crypto";

import type { MarketplaceRoute } from "./types.js";

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, innerValue]) => [key, sortValue(innerValue)])
    );
  }

  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashNormalizedRequest(route: MarketplaceRoute, body: unknown): string {
  return sha256(
    canonicalJson({
      routeId: route.routeId,
      routeVersion: route.version,
      body
    })
  );
}

export function createOpaqueToken(prefix: string): string {
  return `${prefix}_${createHash("sha256")
    .update(`${Date.now()}_${Math.random()}_${prefix}`)
    .digest("hex")
    .slice(0, 24)}`;
}
