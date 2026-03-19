// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderServicesDashboard } from "./provider-services-dashboard";

const fetchProviderAccount = vi.fn();
const fetchProviderServices = vi.fn();
const createProviderService = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchProviderAccount: (...args: unknown[]) => fetchProviderAccount(...args),
  fetchProviderServices: (...args: unknown[]) => fetchProviderServices(...args),
  createProviderService: (...args: unknown[]) => createProviderService(...args)
}));

describe("ProviderServicesDashboard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    fetchProviderAccount.mockReset();
    fetchProviderServices.mockReset();
    createProviderService.mockReset();

    window.localStorage.setItem(
      "fast-marketplace-wallet-session",
      JSON.stringify({
        accessToken: "provider_token",
        wallet: "fast1provider000000000000000000000000000000000000000000000000000000",
        deploymentNetwork: "mainnet",
        resourceId: "https://fast.8o.vc"
      })
    );
  });

  it("loads provider drafts for the connected wallet session", async () => {
    fetchProviderAccount.mockResolvedValue({
      id: "account_1",
      ownerWallet: "fast1provider000000000000000000000000000000000000000000000000000000",
      displayName: "Signal Labs",
      bio: null,
      websiteUrl: "https://provider.example.com",
      contactEmail: null,
      createdAt: "2026-03-19T00:00:00.000Z",
      updatedAt: "2026-03-19T00:00:00.000Z"
    });
    fetchProviderServices.mockResolvedValue([
      {
        service: {
          id: "service_1",
          providerAccountId: "account_1",
          slug: "signal-labs",
          apiNamespace: "signals",
          name: "Signal Labs",
          tagline: "Short-form market signals",
          about: "Provider-authored signal endpoints.",
          categories: ["Research"],
          promptIntro: "Prompt intro",
          setupInstructions: ["Step 1"],
          websiteUrl: "https://provider.example.com",
          payoutWallet: "fast1provider000000000000000000000000000000000000000000000000000000",
          featured: false,
          status: "draft",
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z"
        },
        account: {
          id: "account_1",
          ownerWallet: "fast1provider000000000000000000000000000000000000000000000000000000",
          displayName: "Signal Labs",
          bio: null,
          websiteUrl: "https://provider.example.com",
          contactEmail: null,
          createdAt: "2026-03-19T00:00:00.000Z",
          updatedAt: "2026-03-19T00:00:00.000Z"
        },
        endpoints: [],
        verification: null,
        latestReview: null,
        latestPublishedVersionId: null
      }
    ]);

    render(
      <ProviderServicesDashboard
        apiBaseUrl="https://fastapi.8o.vc"
        deploymentNetwork="mainnet"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Your service drafts")).toBeTruthy();
    });

    expect(screen.getByText("Signal Labs")).toBeTruthy();
    expect(screen.getByText("New service draft")).toBeTruthy();
    expect(screen.getByRole("button", { name: /creat/i })).toBeTruthy();
  });
});
