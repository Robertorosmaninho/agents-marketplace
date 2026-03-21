import express, { type Express } from "express";

export interface TavilyServiceOptions {
  tavilyApiKey: string;
  upstreamUrl?: string;
  verificationToken?: string | null;
}

const DEFAULT_TAVILY_UPSTREAM_URL = "https://api.tavily.com/search";

export function createTavilyServiceApp(options: TavilyServiceOptions): Express {
  const app = express();
  const upstreamUrl = options.upstreamUrl ?? DEFAULT_TAVILY_UPSTREAM_URL;

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      upstreamUrl
    });
  });

  app.get("/.well-known/fast-marketplace-verification.txt", (_req, res) => {
    if (!options.verificationToken) {
      return res.status(404).type("text/plain").send("Verification token is not configured.");
    }

    return res.type("text/plain").send(options.verificationToken);
  });

  app.post("/search", async (req, res) => {
    let response: globalThis.Response;
    try {
      response = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${options.tavilyApiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify(req.body ?? {})
      });
    } catch (error) {
      return res.status(502).json({
        error: error instanceof Error ? error.message : "Tavily request failed."
      });
    }

    const body = await safeResponseBody(response);
    const contentType = response.headers.get("content-type") ?? "application/json";
    return res.status(response.status).type(contentType).send(body);
  });

  return app;
}

async function safeResponseBody(response: globalThis.Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}
