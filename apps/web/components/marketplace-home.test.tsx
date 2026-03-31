// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { MarketplaceHome } from "./marketplace-home";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

describe("MarketplaceHome", () => {
  it("renders services and filters them by search", async () => {
    const user = userEvent.setup();

    render(
      <MarketplaceHome
        services={[
          {
            serviceType: "marketplace_proxy",
            slug: "mock-research-signals",
            name: "Amazon Product Scraper",
            ownerName: "Fast Marketplace",
            tagline: "Synthetic paid research endpoints.",
            categories: ["Research", "Testing"],
            settlementMode: "verified_escrow",
            settlementLabel: "Verified",
            settlementDescription: "Marketplace escrow, refunds, and payout reconciliation.",
            priceRange: "$0.0001 USDC",
            settlementToken: "USDC",
            endpointCount: 2,
            totalCalls: 12,
            revenue: "0.42",
            successRate30d: 66.7,
            volume30d: [],
            websiteUrl: "https://www.amazon.com"
          },
          {
            serviceType: "external_registry",
            slug: "instagram-scraper",
            name: "Instagram Scraper",
            ownerName: "Fast Marketplace",
            tagline: "Scrape public Instagram data.",
            categories: ["Social"],
            settlementMode: null,
            settlementLabel: "External API",
            settlementDescription: "Calls go directly to the provider. The marketplace lists discovery metadata only.",
            priceRange: "See provider docs",
            settlementToken: null,
            endpointCount: 1,
            totalCalls: null,
            revenue: null,
            successRate30d: null,
            volume30d: [],
            accessModelLabel: "External API",
            accessModelDescription: "Calls go directly to the provider. The marketplace only lists docs and direct endpoints.",
            websiteUrl: "https://www.instagram.com"
          },
          {
            serviceType: "external_registry",
            slug: "stableenrich-apollo-api",
            name: "StableEnrich Apollo API",
            ownerName: "StableEnrich",
            tagline: "Apollo enrichment proxy.",
            categories: ["Sales"],
            settlementMode: null,
            settlementLabel: "External API",
            settlementDescription: "Calls go directly to the provider. The marketplace lists discovery metadata only.",
            priceRange: "See provider docs",
            settlementToken: null,
            endpointCount: 1,
            totalCalls: null,
            revenue: null,
            successRate30d: null,
            volume30d: [],
            accessModelLabel: "External API",
            accessModelDescription: "Calls go directly to the provider. The marketplace only lists docs and direct endpoints.",
            websiteUrl: "https://www.apollo.io"
          }
        ]}
      />
    );

    expect(screen.getByRole("heading", { name: "APIs for agents" })).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /service/i })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: /pricing/i })).toBeTruthy();
    expect(screen.getByText("Amazon Product Scraper")).toBeTruthy();
    expect(screen.getByText("Instagram Scraper")).toBeTruthy();
    expect(screen.getByText("StableEnrich Apollo API")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Amazon Product Scraper favicon" }).getAttribute("src")).toBe("https://www.google.com/s2/favicons?domain=www.amazon.com&sz=64");
    expect(screen.getByRole("img", { name: "Instagram Scraper favicon" }).getAttribute("src")).toBe("https://www.google.com/s2/favicons?domain=www.instagram.com&sz=64");
    expect(screen.getByRole("img", { name: "StableEnrich Apollo API favicon" }).getAttribute("src")).toBe("https://www.google.com/s2/favicons?domain=www.apollo.io&sz=64");

    await user.type(screen.getByPlaceholderText("Search services, owners, or categories"), "instagram");

    await waitFor(() => {
      expect(screen.queryByText("Amazon Product Scraper")).toBeNull();
    });

    expect(screen.getByText("Instagram Scraper")).toBeTruthy();
  });
});
