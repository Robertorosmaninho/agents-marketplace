import type { Express, Request, Response } from "express";
import express from "express";

import type { MarketplaceStore } from "@marketplace/shared";

import { registerCommerceRoutes } from "./commerce.js";

export interface MarketplaceApiOptions {
  store: MarketplaceStore;
  adminToken: string;
  secretsKey: string;
  baseUrl?: string;
  corsOrigin?: string;
}

/**
 * Phase-1 marketplace API — exposes the commerce discovery surface and the
 * admin endpoints for shop lifecycle. The upstream marketplace's data-API
 * proxy, payout, credit, and provider-service layers are intentionally
 * omitted; this fork serves commerce-phase-1 only.
 */
export function createMarketplaceApi(options: MarketplaceApiOptions): Express {
  if (!options.adminToken) {
    throw new Error("adminToken is required.");
  }
  if (!options.secretsKey) {
    throw new Error("secretsKey is required.");
  }

  const app = express();
  const baseUrl = options.baseUrl ?? "http://localhost:3000";

  app.use(express.json({ limit: "1mb" }));

  // Simple CORS — refine for production if you front the API with a web UI.
  app.use((req: Request, res: Response, next) => {
    const origin = req.header("origin");
    const allowed = options.corsOrigin;
    if (origin && (allowed === "*" || origin === allowed)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    return next();
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/.well-known/marketplace.json", (_req, res) => {
    res.json({
      name: "Fast Marketplace (commerce phase 1)",
      baseUrl,
      endpoints: {
        shops: `${baseUrl}/commerce/shops`,
        search: `${baseUrl}/commerce/search`,
        notify: `${baseUrl}/commerce/orders/notify`
      }
    });
  });

  registerCommerceRoutes(app, {
    store: options.store,
    secretsKey: options.secretsKey,
    adminToken: options.adminToken
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: unknown) => {
    // eslint-disable-next-line no-console
    console.error("[marketplace] unhandled error:", err);
    res.status(500).json({ error: "Internal marketplace error" });
  });

  return app;
}
