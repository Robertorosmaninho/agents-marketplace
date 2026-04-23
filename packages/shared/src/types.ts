/**
 * Phase-1 commerce types.
 *
 * The upstream marketplace had a much richer type surface (jobs, routes,
 * providers, credits, refunds, etc.). This fork keeps only the commerce
 * abstraction needed to power merchant discovery.
 */

export type CommerceShopStatus = "active" | "paused" | "archived";

export interface CommerceShopRecord {
  shopId: string;
  displayName: string;
  baseUrl: string;
  platform: string;
  status: CommerceShopStatus;
  hintSecretCiphertext: string;
  hintSecretIv: string;
  hintSecretAuthTag: string;
  acceptedCurrency: string;
  fulfillmentRegions: string[];
  searchTimeoutMs: number;
  rateLimitPerMin: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCommerceShopInput {
  shopId: string;
  displayName: string;
  baseUrl: string;
  platform: string;
  status?: CommerceShopStatus;
  hintSecretCiphertext: string;
  hintSecretIv: string;
  hintSecretAuthTag: string;
  acceptedCurrency?: string;
  fulfillmentRegions?: string[];
  searchTimeoutMs?: number;
  rateLimitPerMin?: number;
}

export interface CommerceShopSummary {
  shopId: string;
  displayName: string;
  platform: string;
  fulfillmentRegions: string[];
}

export interface MerchantHandleHint {
  merchantHandle: string;
  merchantBaseUrl: string;
  hintExp: string;
  hintSig: string;
}

export interface CommerceSearchHit extends MerchantHandleHint {
  shopId: string;
  shopName: string;
  productId: string;
  title: string;
  priceUsd: string;
  imageUrl?: string;
}

export interface CommerceSearchResponse {
  partial: boolean;
  timedOutShops: string[];
  hits: CommerceSearchHit[];
}

export interface CommerceOrderNotification {
  orderId: string;
  buyerWallet: string;
  amountUsd: string;
  status: string;
  createdAt: string;
}

export interface MarketplaceStore {
  ensureSchema(): Promise<void>;
  listActiveCommerceShops(): Promise<CommerceShopRecord[]>;
  listCommerceShops(filter?: { status?: CommerceShopStatus }): Promise<CommerceShopRecord[]>;
  getCommerceShop(shopId: string): Promise<CommerceShopRecord | null>;
  upsertCommerceShop(input: UpsertCommerceShopInput): Promise<CommerceShopRecord>;
}
