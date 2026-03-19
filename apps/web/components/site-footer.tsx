import React from "react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-10">
        <div className="space-y-1">
          <div className="text-sm font-medium">Fast Marketplace</div>
          <p className="text-sm text-muted-foreground">
            Discovery, docs, and request intake for Fast-native agent APIs.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/providers/onboard"
            className="rounded-md border px-4 py-2 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            List your service
          </Link>
          <Link
            href="/suggest?type=endpoint"
            className="rounded-md border px-4 py-2 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Suggest an endpoint
          </Link>
          <Link
            href="/suggest?type=source"
            className="rounded-md border px-4 py-2 font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Suggest a source
          </Link>
        </nav>
      </div>
    </footer>
  );
}
