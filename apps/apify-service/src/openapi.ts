export interface BuildApifyOpenApiDocumentInput {
  serviceName: string;
  serviceDescription: string;
  operationId: string;
  requestExample: Record<string, unknown>;
  responseExample: Record<string, unknown>;
}

export function buildApifyOpenApiDocument(input: BuildApifyOpenApiDocumentInput): Record<string, unknown> {
  return {
    openapi: "3.0.3",
    info: {
      title: `${input.serviceName} Provider API`,
      version: "1.0.0",
      description: input.serviceDescription
    },
    servers: [
      {
        url: "/"
      }
    ],
    paths: {
      "/run": {
        post: {
          operationId: input.operationId,
          summary: `Run ${input.serviceName}`,
          description: input.serviceDescription,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: true
                },
                example: input.requestExample
              }
            }
          },
          responses: {
            "202": {
              description: "Async run accepted.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["status", "providerJobId"],
                    properties: {
                      status: {
                        type: "string",
                        enum: ["accepted"]
                      },
                      providerJobId: {
                        type: "string"
                      },
                      pollAfterMs: {
                        type: "integer"
                      },
                      providerState: {
                        type: "object",
                        additionalProperties: true
                      }
                    },
                    additionalProperties: false
                  },
                  example: {
                    status: "accepted",
                    providerJobId: "apify_run_123",
                    pollAfterMs: 5000,
                    providerState: input.responseExample
                  }
                }
              }
            },
            "502": {
              description: "Upstream Apify request failure.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["error"],
                    properties: {
                      error: {
                        type: "string"
                      }
                    },
                    additionalProperties: false
                  }
                }
              }
            }
          }
        }
      }
    }
  };
}
