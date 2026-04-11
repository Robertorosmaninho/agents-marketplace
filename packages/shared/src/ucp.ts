import {
  MARKETPLACE_NAME,
  MARKETPLACE_VERSION
} from "./constants.js";
import type {
  ExternalEndpointMethod,
  PublishedServiceEndpointVersionRecord,
  ServiceDefinition
} from "./types.js";

const UCP_VERSION = "2026-01-01";
const UCP_SHOPPING_SERVICE = "dev.ucp.shopping";
const UCP_CATALOG_SEARCH = "dev.ucp.shopping.catalog.search";

type PublishedCatalogService = {
  service: ServiceDefinition;
  endpoints: PublishedServiceEndpointVersionRecord[];
};

export interface UcpImportRequest {
  profileUrl: string;
}

export interface UcpImportCandidate {
  endpointType: "external_registry";
  title: string;
  description: string;
  method: ExternalEndpointMethod;
  publicUrl: string;
  docsUrl: string;
  authNotes: string | null;
  requestExample: unknown;
  responseExample: unknown;
  usageNotes: string | null;
  warnings: string[];
}

export interface UcpImportPreview {
  profileUrl: string;
  version: string | null;
  services: string[];
  capabilities: string[];
  endpoints: UcpImportCandidate[];
  warnings: string[];
}

export function buildUcpDiscoveryProfile(input: {
  baseUrl?: string;
  services: PublishedCatalogService[];
}) {
  const baseUrl = input.baseUrl ?? "http://localhost:3000";
  const marketplaceServices = input.services
    .filter((serviceDetail) => serviceDetail.service.serviceType === "marketplace_proxy")
    .map((serviceDetail) => ({
      version: UCP_VERSION,
      id: serviceDetail.service.slug,
      spec: `${baseUrl}/catalog/services/${serviceDetail.service.slug}`,
      schema: `${baseUrl}/openapi.json`,
      transport: "rest",
      endpoint: baseUrl,
      config: {
        serviceType: serviceDetail.service.serviceType,
        marketplaceCatalogUrl: `${baseUrl}/catalog/services/${serviceDetail.service.slug}`
      }
    }));
  const commerceServices = input.services
    .filter((serviceDetail) =>
      serviceDetail.service.serviceType === "external_registry"
      && serviceDetail.service.categories.some((category) => category.toLowerCase() === "commerce" || category.toLowerCase() === "shopping")
    )
    .flatMap((serviceDetail) =>
      serviceDetail.endpoints
        .filter((endpoint) => endpoint.endpointType === "external_registry")
        .map((endpoint) => ({
          version: UCP_VERSION,
          id: `${serviceDetail.service.slug}:${slugifyUcpId(endpoint.title)}`,
          spec: endpoint.docsUrl,
          schema: endpoint.docsUrl,
          transport: "rest",
          endpoint: endpoint.publicUrl,
          config: {
            serviceType: serviceDetail.service.serviceType,
            marketplaceCatalogUrl: `${baseUrl}/catalog/services/${serviceDetail.service.slug}`
          }
        }))
    );

  return {
    ucp: {
      version: UCP_VERSION,
      services: {
        [UCP_SHOPPING_SERVICE]: [...commerceServices],
        "xyz.fast.marketplace": [...marketplaceServices]
      },
      capabilities: {
        [UCP_CATALOG_SEARCH]: [
          {
            version: UCP_VERSION,
            spec: "https://ucp.dev/latest/specification/catalog/search/",
            schema: "https://ucp.dev/schemas/shopping/catalog_search.json"
          }
        ]
      },
      payment_handlers: {
        "xyz.fast.usdc": [
          {
            version: UCP_VERSION,
            spec: `${baseUrl}/.well-known/marketplace.json`,
            schema: `${baseUrl}/.well-known/marketplace.json`,
            config: {
              network: "fast",
              settlementAsset: "USDC",
              paymentProtocol: "x402"
            }
          }
        ]
      }
    },
    marketplace: {
      name: MARKETPLACE_NAME,
      version: MARKETPLACE_VERSION,
      baseUrl,
      catalogUrl: `${baseUrl}/catalog/services`,
      llmsTxtUrl: `${baseUrl}/llms.txt`
    }
  };
}

export function parseUcpImportProfile(input: {
  profile: unknown;
  profileUrl: string;
}): UcpImportPreview {
  const root = expectObject(input.profile, "UCP profile");
  const ucp = expectObject(root.ucp, "UCP profile.ucp");
  const version = readOptionalString(ucp, "version");
  const services = readRegistry(ucp.services);
  const capabilities = readRegistry(ucp.capabilities);
  const warnings: string[] = [];
  const endpoints: UcpImportCandidate[] = [];

  for (const [serviceName, serviceBindings] of services.entries()) {
    for (const binding of serviceBindings) {
      const transport = readOptionalString(binding, "transport");
      const endpoint = readOptionalString(binding, "endpoint");
      if (transport !== "rest") {
        warnings.push(`Skipped ${serviceName} ${transport ?? "unknown"} binding because only REST imports are supported.`);
        continue;
      }
      if (!endpoint) {
        warnings.push(`Skipped ${serviceName} REST binding because it does not include an endpoint URL.`);
        continue;
      }

      endpoints.push({
        endpointType: "external_registry",
        title: titleFromUcpService(serviceName, binding),
        description: `UCP ${serviceName} REST binding imported as a discovery-only endpoint.`,
        method: "POST",
        publicUrl: endpoint,
        docsUrl: readOptionalString(binding, "spec") ?? input.profileUrl,
        authNotes: "Review the provider UCP profile for auth, checkout, consent, and payment requirements.",
        requestExample: {
          ucp: {
            version
          }
        },
        responseExample: {
          ucp: {
            version,
            status: "success"
          }
        },
        usageNotes: "Imported from UCP discovery. The marketplace lists this endpoint but does not proxy or charge for it.",
        warnings: []
      });
    }
  }

  if (endpoints.length === 0) {
    warnings.push("No importable UCP REST service bindings were found.");
  }

  return {
    profileUrl: input.profileUrl,
    version: version ?? null,
    services: [...services.keys()],
    capabilities: [...capabilities.keys()],
    endpoints,
    warnings
  };
}

function readRegistry(value: unknown): Map<string, Record<string, unknown>[]> {
  const registry = new Map<string, Record<string, unknown>[]>();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return registry;
  }

  for (const [name, entries] of Object.entries(value)) {
    if (!Array.isArray(entries)) {
      continue;
    }

    registry.set(name, entries.flatMap((entry) =>
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? [entry as Record<string, unknown>]
        : []
    ));
  }

  return registry;
}

function expectObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function readOptionalString(value: Record<string, unknown>, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

function titleFromUcpService(serviceName: string, binding: Record<string, unknown>): string {
  const id = readOptionalString(binding, "id");
  if (id) {
    return titleCase(id.replace(/[:_.]+/g, " "));
  }

  return titleCase(serviceName.split(".").slice(-2).join(" "));
}

function slugifyUcpId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "endpoint";
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}
