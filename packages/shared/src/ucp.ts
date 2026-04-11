import {
  MARKETPLACE_NAME,
  MARKETPLACE_VERSION
} from "./constants.js";
import type {
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

function slugifyUcpId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "endpoint";
}
