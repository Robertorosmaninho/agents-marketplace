// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderServiceEditor } from "./provider-service-editor";

const fetchProviderService = vi.fn();
const updateProviderService = vi.fn();
const createProviderEndpoint = vi.fn();
const createProviderVerificationChallenge = vi.fn();
const verifyProviderService = vi.fn();
const submitProviderService = vi.fn();
const deleteProviderEndpoint = vi.fn();
const updateProviderEndpoint = vi.fn();
const fetchProviderRuntimeKey = vi.fn();
const importProviderOpenApi = vi.fn();
const rotateProviderRuntimeKey = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchProviderService: (...args: unknown[]) => fetchProviderService(...args),
  fetchProviderRuntimeKey: (...args: unknown[]) => fetchProviderRuntimeKey(...args),
  updateProviderService: (...args: unknown[]) => updateProviderService(...args),
  createProviderEndpoint: (...args: unknown[]) => createProviderEndpoint(...args),
  createProviderVerificationChallenge: (...args: unknown[]) => createProviderVerificationChallenge(...args),
  verifyProviderService: (...args: unknown[]) => verifyProviderService(...args),
  submitProviderService: (...args: unknown[]) => submitProviderService(...args),
  deleteProviderEndpoint: (...args: unknown[]) => deleteProviderEndpoint(...args),
  updateProviderEndpoint: (...args: unknown[]) => updateProviderEndpoint(...args),
  importProviderOpenApi: (...args: unknown[]) => importProviderOpenApi(...args),
  rotateProviderRuntimeKey: (...args: unknown[]) => rotateProviderRuntimeKey(...args)
}));

function buildServiceDetail() {
  return {
    service: {
      id: "service_1",
      providerAccountId: "provider_1",
      settlementMode: "community_direct" as const,
      slug: "signal-labs",
      apiNamespace: "signals",
      name: "Signal Labs",
      tagline: "Short-form market signals",
      about: "Provider-authored signal endpoints.",
      categories: ["Research"],
      promptIntro: "Prompt intro",
      setupInstructions: ["Use a funded Fast wallet."],
      websiteUrl: "https://provider.example.com",
      payoutWallet: "fast1provider000000000000000000000000000000000000000000000000000000",
      featured: false,
      status: "draft" as const,
      createdAt: "2026-03-20T00:00:00.000Z",
      updatedAt: "2026-03-20T00:00:00.000Z"
    },
    account: {
      id: "provider_1",
      ownerWallet: "fast1provider000000000000000000000000000000000000000000000000000000",
      displayName: "Signal Labs",
      bio: null,
      websiteUrl: "https://provider.example.com",
      contactEmail: null,
      createdAt: "2026-03-20T00:00:00.000Z",
      updatedAt: "2026-03-20T00:00:00.000Z"
    },
    endpoints: [],
    verification: null,
    latestReview: null,
    latestPublishedVersionId: null
  };
}

describe("ProviderServiceEditor", () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchProviderService.mockReset();
    updateProviderService.mockReset();
    createProviderEndpoint.mockReset();
    createProviderVerificationChallenge.mockReset();
    verifyProviderService.mockReset();
    submitProviderService.mockReset();
    deleteProviderEndpoint.mockReset();
    updateProviderEndpoint.mockReset();
    fetchProviderRuntimeKey.mockReset();
    importProviderOpenApi.mockReset();
    rotateProviderRuntimeKey.mockReset();
    fetchProviderRuntimeKey.mockResolvedValue(null);

    window.localStorage.setItem(
      "fast-marketplace-wallet-session",
      JSON.stringify({
        accessToken: "provider_token",
        wallet: "fast1provider000000000000000000000000000000000000000000000000000000",
        deploymentNetwork: "mainnet",
        resourceId: window.location.origin
      })
    );
  });

  it("shows an unavailable state when the service draft no longer exists", async () => {
    fetchProviderService.mockResolvedValue(null);

    render(
      <ProviderServiceEditor
        apiBaseUrl="https://api.marketplace.example.com"
        deploymentNetwork="mainnet"
        serviceId="missing_service"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Service draft unavailable")).toBeTruthy();
    });

    expect(screen.getByText(/no longer accessible from the connected wallet session/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /back to drafts/i })).toBeTruthy();
  });

  it("loads an imported OpenAPI candidate into the new endpoint form", async () => {
    const user = userEvent.setup();
    fetchProviderService.mockResolvedValue(buildServiceDetail());
    importProviderOpenApi.mockResolvedValue({
      documentUrl: "https://docs.provider.example.com/openapi.json",
      title: "Provider API",
      version: "1.0.0",
      warnings: [],
      endpoints: [
        {
          operation: "search",
          title: "Search",
          description: "Search provider data.",
          requestSchemaJson: {
            type: "object",
            properties: {
              query: { type: "string" }
            },
            required: ["query"],
            additionalProperties: false
          },
          responseSchemaJson: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["items"],
            additionalProperties: false
          },
          requestExample: {
            query: "fast"
          },
          responseExample: {
            items: ["alpha"]
          },
          usageNotes: null,
          upstreamBaseUrl: "https://api.provider.example.com",
          upstreamPath: "/search",
          upstreamAuthMode: "none",
          upstreamAuthHeaderName: null,
          warnings: []
        }
      ]
    });

    render(
      <ProviderServiceEditor
        apiBaseUrl="https://api.marketplace.example.com"
        deploymentNetwork="mainnet"
        serviceId="service_1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Endpoint drafts")).toBeTruthy();
    });

    await user.type(screen.getByLabelText(/openapi json url/i), "https://docs.provider.example.com/openapi.json");
    await user.click(screen.getByRole("button", { name: /load openapi/i }));

    await waitFor(() => {
      expect(importProviderOpenApi).toHaveBeenCalledWith(
        "https://api.marketplace.example.com",
        "provider_token",
        "service_1",
        "https://docs.provider.example.com/openapi.json"
      );
    });

    await user.click(screen.getByRole("button", { name: /load into new draft/i }));

    expect(screen.getByDisplayValue("search")).toBeTruthy();
    expect(screen.getByDisplayValue("Search")).toBeTruthy();
    expect(screen.getByDisplayValue("https://api.provider.example.com")).toBeTruthy();
    expect(screen.getByDisplayValue("/search")).toBeTruthy();
  });
});
