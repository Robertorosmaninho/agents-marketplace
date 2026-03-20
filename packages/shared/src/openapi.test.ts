import { describe, expect, it } from "vitest";

import { parseOpenApiImportDocument } from "./openapi.js";

describe("parseOpenApiImportDocument", () => {
  it("extracts POST operations, resolves local refs, and infers auth", () => {
    const preview = parseOpenApiImportDocument({
      documentUrl: "https://provider.example.com/openapi.json",
      document: {
        openapi: "3.0.3",
        info: {
          title: "Provider API",
          version: "1.2.3"
        },
        servers: [
          {
            url: "https://api.provider.example.com/v1"
          }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer"
            }
          },
          schemas: {
            SearchRequest: {
              type: "object",
              properties: {
                query: {
                  type: "string"
                }
              },
              required: ["query"],
              additionalProperties: false
            },
            SearchResponse: {
              type: "object",
              properties: {
                query: {
                  type: "string"
                },
                items: {
                  type: "array",
                  items: {
                    type: "string"
                  }
                }
              },
              required: ["query", "items"],
              additionalProperties: false
            }
          }
        },
        security: [{ bearerAuth: [] }],
        paths: {
          "/search": {
            post: {
              operationId: "CreateSearch",
              summary: "Create search",
              description: "Run a provider search.",
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/SearchRequest"
                    }
                  }
                }
              },
              responses: {
                "200": {
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/SearchResponse"
                      }
                    }
                  }
                }
              }
            }
          },
          "/health": {
            get: {
              summary: "Health"
            }
          }
        }
      }
    });

    expect(preview.title).toBe("Provider API");
    expect(preview.version).toBe("1.2.3");
    expect(preview.warnings).toContain("Skipped 1 non-POST operation because provider imports are POST-only in v1.");
    expect(preview.endpoints).toHaveLength(1);

    const endpoint = preview.endpoints[0];
    expect(endpoint).toMatchObject({
      operation: "create-search",
      title: "Create search",
      description: "Run a provider search.",
      upstreamBaseUrl: "https://api.provider.example.com/v1",
      upstreamPath: "/search",
      upstreamAuthMode: "bearer",
      upstreamAuthHeaderName: null
    });
    expect(endpoint.requestSchemaJson).toMatchObject({
      type: "object",
      required: ["query"]
    });
    expect(endpoint.responseSchemaJson).toMatchObject({
      type: "object",
      required: ["query", "items"]
    });
    expect(endpoint.requestExample).toEqual({
      query: "string"
    });
    expect(endpoint.responseExample).toEqual({
      query: "string",
      items: ["string"]
    });
    expect(endpoint.warnings).toContain("Add the upstream secret before creating this draft.");
  });
});
