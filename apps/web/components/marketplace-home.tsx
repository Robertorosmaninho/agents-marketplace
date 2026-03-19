"use client";

import React from "react";
import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import type { ServiceSummary } from "@marketplace/shared";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function MarketplaceHome({ services }: { services: ServiceSummary[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const deferredQuery = useDeferredValue(query);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(services.flatMap((service) => service.categories))).sort()],
    [services]
  );

  const filtered = useMemo(() => {
    const search = deferredQuery.trim().toLowerCase();

    return services.filter((service) => {
      const matchesCategory = category === "All" || service.categories.includes(category);
      const haystack = [service.name, service.ownerName, service.tagline, ...service.categories]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!search || haystack.includes(search));
    });
  }, [category, deferredQuery, services]);

  const totals = useMemo(
    () =>
      services.reduce(
        (summary, service) => {
          summary.endpoints += service.endpointCount;
          summary.calls += service.totalCalls;
          summary.revenue += Number(service.revenue);
          return summary;
        },
        { endpoints: 0, calls: 0, revenue: 0 }
      ),
    [services]
  );

  return (
    <main className="page-shell">
      <section className="section-sep">
        <div className="section-container section-stack">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="page-intro">
              <Badge variant="eyebrow">Go Fast</Badge>
              <div className="space-y-6">
                <h1 className="page-title">
                  Payments for agents
                  <span
                    className="ml-3 inline-block h-[0.9em] w-3 rounded-pill bg-foreground align-[-0.1em]"
                    style={{ animation: "blink 1.2s infinite" }}
                  />
                </h1>
                <p className="body-copy">
                  Paid APIs for agents, presented like a real marketplace. Browse live Fast-native services, compare
                  pricing and performance, and route demand toward the next supply providers should ship.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="#catalog" className="btn-fast btn-fast-primary">
                  Explore marketplace
                </Link>
                <Link href="/suggest" className="btn-fast btn-fast-secondary">
                  Suggest supply
                </Link>
              </div>
            </div>

            <Card variant="frosted" className="h-full">
              <CardHeader>
                <Badge variant="eyebrow">Live marketplace</Badge>
                <CardTitle className="text-3xl">FAST-native supply snapshot</CardTitle>
                <CardDescription>
                  The current public catalog and transaction surface, updated from live marketplace data.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <Metric label="Services" value={String(services.length)} compact />
                <Metric label="Endpoints" value={String(totals.endpoints)} compact />
                <Metric label="Call volume" value={String(totals.calls)} compact />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="catalog" className="section-sep">
        <div className="section-container section-stack">
          <div className="page-intro">
            <Badge variant="eyebrow">Marketplace catalog</Badge>
            <div className="space-y-4">
              <h2 className="section-title">Explore live Fast services</h2>
              <p className="body-copy">
                Search provider supply, compare throughput and pricing, and open the exact service pages agents can use
                right now.
              </p>
            </div>
          </div>

          <div className="glass-panel p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <label className="relative block">
                <span className="sr-only">Search services, owners, or categories</span>
                <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search services, owners, or categories"
                  className="pl-12"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={item === category ? "filter-chip filter-chip-active" : "filter-chip"}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {filtered.map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group">
                <Card variant="frosted" className="h-full transition-transform duration-300 ease-out group-hover:-translate-y-1">
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{service.ownerName}</Badge>
                      <span className="text-sm tracking-headline text-muted-foreground">{service.priceRange}</span>
                    </div>
                    <div className="space-y-3">
                      <CardTitle className="text-3xl">{service.name}</CardTitle>
                      <CardDescription>{service.tagline}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      {service.categories.map((item) => (
                        <Badge key={item} variant="secondary">
                          {item}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <Metric label="Calls" value={String(service.totalCalls)} compact />
                      <Metric label="Revenue" value={`$${service.revenue}`} compact />
                      <Metric label="Endpoints" value={String(service.endpointCount)} compact />
                      <Metric label="30d success" value={`${service.successRate30d.toFixed(1)}%`} compact />
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-5 text-sm tracking-headline text-muted-foreground">
                      <span>Open service</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="mt-8 rounded-card border border-border px-6 py-8 text-sm text-muted-foreground">
              No services matched your current search and category filters.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  compact = false
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="metric-label">{label}</div>
      <div className={compact ? "text-2xl font-medium tracking-m" : "metric-value"}>{value}</div>
    </div>
  );
}
