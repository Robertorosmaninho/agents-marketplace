import request from "supertest";
import { describe, expect, it, vi, afterEach } from "vitest";

import { createTavilyServiceApp } from "./app.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tavily service", () => {
  it("forwards search requests to Tavily with the configured bearer token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ query: "fast", results: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );
    const app = createTavilyServiceApp({
      tavilyApiKey: "tvly-test-key"
    });

    const response = await request(app)
      .post("/search")
      .send({
        query: "fast"
      });

    expect(response.status).toBe(200);
    expect(response.body.query).toBe("fast");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.tavily.com/search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer tvly-test-key",
          "content-type": "application/json"
        }),
        body: JSON.stringify({
          query: "fast"
        })
      })
    );
  });

  it("serves the marketplace verification token when configured", async () => {
    const app = createTavilyServiceApp({
      tavilyApiKey: "tvly-test-key",
      verificationToken: "verify-me"
    });

    const response = await request(app).get("/.well-known/fast-marketplace-verification.txt");

    expect(response.status).toBe(200);
    expect(response.text).toBe("verify-me");
  });
});
