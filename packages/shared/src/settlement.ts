import type { SettlementMode } from "./types.js";

export function usesMarketplaceTreasurySettlement(mode: SettlementMode): boolean {
  return mode === "verified_escrow";
}

export function settlementModeLabel(_mode: SettlementMode): string {
  return "Verified";
}

export function settlementModeDescription(_mode: SettlementMode): string {
  return "Marketplace escrow, refunds, and payout reconciliation.";
}
