import React from "react";

import { cn } from "@/lib/utils";

export interface VolumePoint {
  date: string;
  amount: string;
}

export function VolumeChart({
  points,
  tokenSymbol = "USDC",
  className
}: {
  points: VolumePoint[];
  tokenSymbol?: string;
  className?: string;
}) {
  if (points.length === 0) {
    return <div className={cn("text-sm text-muted-foreground", className)}>No activity yet.</div>;
  }

  return (
    <ul className={className}>
      {points.map((point) => (
        <li key={point.date}>
          {point.date}: {point.amount} {tokenSymbol}
        </li>
      ))}
    </ul>
  );
}
