import { zodToJsonSchema } from "zod-to-json-schema";

import {
  MARKETPLACE_NAME,
  MARKETPLACE_VERSION,
  PAYMENT_IDENTIFIER_HEADER,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_SIGNATURE_HEADER
} from "./constants.js";
import { marketplaceRoutes } from "./routes.js";

export function buildOpenApiDocument(baseUrl = "http://localhost:3000") {
  const paths: Record<string, unknown> = {
    "/auth/challenge": {
      post: {
        summary: "Create a wallet challenge for a previously paid resource.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["wallet", "resourceType", "resourceId"],
                properties: {
                  wallet: { type: "string" },
                  resourceType: { type: "string", enum: ["job"] },
                  resourceId: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Challenge created." }
        }
      }
    },
    "/auth/session": {
      post: {
        summary: "Exchange a wallet challenge signature for a short-lived access token.",
        responses: {
          "200": { description: "Session created." }
        }
      }
    },
    "/api/jobs/{jobToken}": {
      get: {
        summary: "Retrieve a previously paid async job using a wallet-bound session.",
        parameters: [
          {
            in: "path",
            name: "jobToken",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": { description: "Job status or result." },
          "401": { description: "Missing or invalid session token." }
        }
      }
    },
    "/openapi.json": {
      get: {
        summary: "OpenAPI document."
      }
    },
    "/llms.txt": {
      get: {
        summary: "Agent-facing marketplace summary."
      }
    },
    "/.well-known/marketplace.json": {
      get: {
        summary: "Machine-readable marketplace catalog."
      }
    }
  };

  for (const route of marketplaceRoutes) {
    paths[`/api/${route.provider}/${route.operation}`] = {
      post: {
        summary: route.title,
        description: route.description,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: zodToJsonSchema(route.inputSchema, `${route.routeId}.input`)
            }
          }
        },
        responses: {
          "200": {
            description: "Paid sync response.",
            content: {
              "application/json": {
                schema: zodToJsonSchema(route.outputSchema, `${route.routeId}.output`)
              }
            }
          },
          "202": {
            description: "Paid async job accepted."
          },
          "402": {
            description: "Payment required.",
            headers: {
              [PAYMENT_REQUIRED_HEADER]: {
                schema: { type: "string" }
              }
            }
          }
        },
        parameters: [
          {
            in: "header",
            name: PAYMENT_IDENTIFIER_HEADER,
            required: false,
            schema: { type: "string" }
          },
          {
            in: "header",
            name: PAYMENT_SIGNATURE_HEADER,
            required: false,
            schema: { type: "string" }
          },
          {
            in: "header",
            name: PAYMENT_RESPONSE_HEADER,
            required: false,
            schema: { type: "string" }
          }
        ]
      }
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: MARKETPLACE_NAME,
      version: MARKETPLACE_VERSION
    },
    servers: [{ url: baseUrl }],
    paths
  };
}

export function buildLlmsTxt(baseUrl = "http://localhost:3000"): string {
  const lines = [
    `# ${MARKETPLACE_NAME}`,
    "",
    "Fast-only x402 paid API marketplace.",
    "",
    `Base URL: ${baseUrl}`,
    "Payment protocol: x402 over HTTP",
    `Payment headers: ${PAYMENT_REQUIRED_HEADER}, ${PAYMENT_SIGNATURE_HEADER}, ${PAYMENT_RESPONSE_HEADER}`,
    "Repeat retrieval auth: wallet challenge session",
    "",
    "## Routes"
  ];

  for (const route of marketplaceRoutes) {
    lines.push(
      `- POST /api/${route.provider}/${route.operation}`,
      `  routeId: ${route.routeId}`,
      `  mode: ${route.mode}`,
      `  network: ${route.network}`,
      `  price: ${route.price}`,
      `  description: ${route.description}`
    );
  }

  lines.push("", "## Free Retrieval", "- GET /api/jobs/{jobToken} with a wallet-bound bearer token");

  return lines.join("\n");
}

export function buildMarketplaceCatalog(baseUrl = "http://localhost:3000") {
  return {
    name: MARKETPLACE_NAME,
    version: MARKETPLACE_VERSION,
    baseUrl,
    payment: {
      protocol: "x402",
      headers: {
        required: PAYMENT_REQUIRED_HEADER,
        signature: PAYMENT_SIGNATURE_HEADER,
        response: PAYMENT_RESPONSE_HEADER,
        paymentIdentifier: PAYMENT_IDENTIFIER_HEADER
      }
    },
    auth: {
      type: "wallet-challenge",
      challengeEndpoint: "/auth/challenge",
      sessionEndpoint: "/auth/session"
    },
    routes: marketplaceRoutes.map((route) => ({
      routeId: route.routeId,
      provider: route.provider,
      operation: route.operation,
      method: "POST",
      path: `/api/${route.provider}/${route.operation}`,
      mode: route.mode,
      network: route.network,
      price: route.price,
      description: route.description
    }))
  };
}
