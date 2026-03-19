import React from "react";
import Link from "next/link";
import type { MarketplaceDeploymentNetwork } from "@marketplace/shared";

import { ModeToggle } from "@/components/mode-toggle";
import { WalletLoginButton } from "@/components/wallet-login-button";

export function SiteHeader({
  apiBaseUrl,
  deploymentNetwork,
  networkLabel
}: {
  apiBaseUrl: string;
  deploymentNetwork: MarketplaceDeploymentNetwork;
  networkLabel: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-4 md:px-10 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" aria-label="Fast Marketplace" className="flex items-center">
          <img
            src="/brand/fast-logo-dark.svg"
            alt=""
            aria-hidden="true"
            width={146}
            height={52}
            className="block h-9 w-auto dark:hidden"
          />
          <img
            src="/brand/fast-logo-light.svg"
            alt=""
            aria-hidden="true"
            width={146}
            height={52}
            className="hidden h-9 w-auto dark:block"
          />
          <span className="sr-only">Fast Marketplace</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href="/"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Marketplace
          </Link>
          <Link
            href="/stats"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Stats
          </Link>
          <Link
            href="/suggest"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Suggest
          </Link>
          <Link
            href="/providers/onboard"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            List your service
          </Link>
          <Link
            href="/skill.md"
            className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            SKILL.md
          </Link>
        </nav>

        <div className="flex self-stretch items-start justify-end gap-2 lg:self-auto">
          <ModeToggle />
          <WalletLoginButton
            apiBaseUrl={apiBaseUrl}
            deploymentNetwork={deploymentNetwork}
            networkLabel={networkLabel}
          />
        </div>
      </div>
    </header>
  );
}
