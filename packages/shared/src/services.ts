import { buildSeededPublishedServiceVersion } from "./seed.js";
import type { ServiceDefinition } from "./types.js";

export const marketplaceServices: ServiceDefinition[] = [buildSeededPublishedServiceVersion()];

export function listServiceDefinitions(): ServiceDefinition[] {
  return marketplaceServices;
}

export function findMarketplaceServiceBySlug(slug: string): ServiceDefinition | undefined {
  return marketplaceServices.find((service) => service.slug === slug);
}
