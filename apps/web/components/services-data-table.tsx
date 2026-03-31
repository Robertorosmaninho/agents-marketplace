"use client";

import React from "react";
import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState
} from "@tanstack/react-table";
import type { ServiceSummary } from "@marketplace/shared";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatSummaryPriceRange(priceRange: string): string {
  return priceRange === "Free" ? priceRange : `${priceRange} per call`;
}

function serviceAccessLabel(service: ServiceSummary): string {
  return service.serviceType === "marketplace_proxy" ? service.settlementLabel : service.accessModelLabel;
}

function servicePricingLabel(service: ServiceSummary): string {
  return service.serviceType === "marketplace_proxy"
    ? formatSummaryPriceRange(service.priceRange)
    : "Provider-defined";
}

function serviceTrafficLabel(service: ServiceSummary): string {
  return service.serviceType === "marketplace_proxy" ? String(service.totalCalls) : "Direct";
}

function serviceWebsiteUrl(service: ServiceSummary): string | null {
  return "websiteUrl" in service ? service.websiteUrl ?? null : null;
}

function inferWebsiteUrlFromServiceName(serviceName: string): string | null {
  const normalized = serviceName.toLowerCase();

  const exactMappings: Array<[string, string]> = [
    ["cheerio scraper", "https://cheerio.js.org"],
    ["tweet scraper", "https://x.com"],
    ["tavily proxy", "https://tavily.com"],
    ["zapper x402 api", "https://zapper.com"],
    ["stableenrich apollo api", "https://www.apollo.io"],
    ["stableenrich clado api", "https://clado.ai"],
    ["stableenrich exa api", "https://exa.ai"],
    ["stableenrich firecrawl api", "https://firecrawl.dev"],
    ["stableenrich google maps api", "https://www.google.com"],
    ["stableenrich hunter api", "https://hunter.io"],
    ["stableenrich reddit api", "https://www.reddit.com"],
    ["stableenrich serper api", "https://serper.dev"],
    ["stableenrich whitepages api", "https://www.whitepages.com"],
    ["stablesocial facebook api", "https://www.facebook.com"],
    ["stablesocial instagram api", "https://www.instagram.com"],
    ["stablesocial reddit api", "https://www.reddit.com"],
    ["stablesocial tiktok api", "https://www.tiktok.com"]
  ];

  for (const [serviceFragment, websiteUrl] of exactMappings) {
    if (normalized.includes(serviceFragment)) {
      return websiteUrl;
    }
  }

  if (normalized.includes("linkedin")) return "https://www.linkedin.com";
  if (normalized.includes("amazon")) return "https://www.amazon.com";
  if (normalized.includes("facebook")) return "https://www.facebook.com";
  if (normalized.includes("instagram")) return "https://www.instagram.com";
  if (normalized.includes("tiktok")) return "https://www.tiktok.com";
  if (normalized.includes("youtube")) return "https://www.youtube.com";
  if (normalized.includes("google")) return "https://www.google.com";
  if (normalized.includes("indeed")) return "https://www.indeed.com";
  if (normalized.includes("reddit")) return "https://www.reddit.com";
  if (normalized.includes("g2")) return "https://www.g2.com";
  if (normalized.includes("x.com") || normalized.includes("tweet")) return "https://x.com";

  return null;
}

function faviconUrlFromWebsiteUrl(websiteUrl: string): string | null {
  try {
    const hostname = new URL(websiteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
  } catch {
    return null;
  }
}

const columns: ColumnDef<ServiceSummary>[] = [
  {
    accessorKey: "name",
    header: "Service",
    cell: ({ row }) => {
      const service = row.original;
      const websiteUrl = serviceWebsiteUrl(service) ?? inferWebsiteUrlFromServiceName(service.name);

      return (
        <div className="flex items-center gap-3">
          <ServiceFavicon
            serviceName={service.name}
            websiteUrl={websiteUrl}
          />
          <div>
            <div>{service.name}</div>
            <div>{service.tagline}</div>
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: "ownerName",
    header: "Provider",
    cell: ({ row }) => {
      const service = row.original;

      return <span>{service.ownerName}</span>;
    }
  },
  {
    id: "access",
    header: "Access",
    accessorFn: serviceAccessLabel
  },
  {
    id: "pricing",
    header: "Pricing",
    accessorFn: servicePricingLabel
  },
  {
    accessorKey: "endpointCount",
    header: "Endpoints"
  },
  {
    id: "traffic",
    header: "Calls",
    accessorFn: serviceTrafficLabel
  },
  {
    id: "open",
    header: "Open",
    cell: ({ row }) => (
      <Link href={`/services/${row.original.slug}`}>
        View
      </Link>
    )
  }
];

export function ServicesDataTable({ services }: { services: ServiceSummary[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "name", desc: false }]);

  const table = useReactTable({
    data: services,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <Table className="w-full">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const canSort = header.column.getCanSort();
              const sort = header.column.getIsSorted();

              return (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : canSort ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {String(flexRender(header.column.columnDef.header, header.getContext()))}
                      {sort === "asc" ? " ↑" : sort === "desc" ? " ↓" : ""}
                    </Button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length}>No services found.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function ServiceFavicon({ serviceName, websiteUrl }: { serviceName: string; websiteUrl: string | null }) {
  const [imageFailed, setImageFailed] = React.useState(false);

  const faviconUrl = websiteUrl && !imageFailed ? faviconUrlFromWebsiteUrl(websiteUrl) : null;

  return (
    <div className="flex items-center gap-3">
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt={`${serviceName} favicon`}
          width={16}
          height={16}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] font-medium uppercase"
        >
          {serviceName.slice(0, 1)}
        </div>
      )}
    </div>
  );
}
