import { createTavilyServiceApp } from "./app.js";

const port = Number(process.env.TAVILY_SERVICE_PORT ?? process.env.PORT ?? 4030);
const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!tavilyApiKey) {
  throw new Error("TAVILY_API_KEY is required.");
}

const app = createTavilyServiceApp({
  tavilyApiKey,
  upstreamUrl: process.env.TAVILY_UPSTREAM_URL,
  verificationToken: process.env.MARKETPLACE_VERIFICATION_TOKEN
});

app.listen(port, () => {
  console.log(`Tavily service listening on http://localhost:${port}`);
});
