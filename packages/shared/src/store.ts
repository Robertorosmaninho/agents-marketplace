import { Pool } from "pg";

import type {
  CommerceShopRecord,
  CommerceShopStatus,
  MarketplaceStore,
  UpsertCommerceShopInput
} from "./types.js";

/**
 * Minimal phase-1 marketplace store.
 *
 * Two implementations:
 *   - InMemoryMarketplaceStore — used by tests and local dev.
 *   - PostgresMarketplaceStore — used in deployed environments.
 *
 * Backed by a single table `commerce_shops`. The upstream marketplace's
 * provider/credit/refund/job schema is intentionally omitted; this fork
 * powers commerce-phase-1 discovery only.
 */

function timestamp(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mapCommerceShopRow(row: Record<string, unknown>): CommerceShopRecord {
  return {
    shopId: row.shop_id as string,
    displayName: row.display_name as string,
    baseUrl: row.base_url as string,
    platform: row.platform as string,
    status: row.status as CommerceShopStatus,
    hintSecretCiphertext: row.hint_secret_ciphertext as string,
    hintSecretIv: row.hint_secret_iv as string,
    hintSecretAuthTag: row.hint_secret_auth_tag as string,
    acceptedCurrency: (row.accepted_currency as string) ?? "USDC",
    fulfillmentRegions: (row.fulfillment_regions as string[] | null) ?? [],
    searchTimeoutMs: Number(row.search_timeout_ms ?? 2500),
    rateLimitPerMin: Number(row.rate_limit_per_min ?? 60),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

export class InMemoryMarketplaceStore implements MarketplaceStore {
  private readonly commerceShopsById = new Map<string, CommerceShopRecord>();

  async ensureSchema(): Promise<void> {
    // No-op for in-memory; the Postgres impl runs the DDL.
  }

  async listActiveCommerceShops(): Promise<CommerceShopRecord[]> {
    return Array.from(this.commerceShopsById.values())
      .filter((shop) => shop.status === "active")
      .sort((a, b) => a.shopId.localeCompare(b.shopId))
      .map((shop) => clone(shop));
  }

  async listCommerceShops(filter?: { status?: CommerceShopStatus }): Promise<CommerceShopRecord[]> {
    return Array.from(this.commerceShopsById.values())
      .filter((shop) => (filter?.status ? shop.status === filter.status : true))
      .sort((a, b) => a.shopId.localeCompare(b.shopId))
      .map((shop) => clone(shop));
  }

  async getCommerceShop(shopId: string): Promise<CommerceShopRecord | null> {
    const shop = this.commerceShopsById.get(shopId);
    return shop ? clone(shop) : null;
  }

  async upsertCommerceShop(input: UpsertCommerceShopInput): Promise<CommerceShopRecord> {
    const existing = this.commerceShopsById.get(input.shopId);
    const now = timestamp();
    const record: CommerceShopRecord = {
      shopId: input.shopId,
      displayName: input.displayName,
      baseUrl: input.baseUrl,
      platform: input.platform,
      status: input.status ?? "active",
      hintSecretCiphertext: input.hintSecretCiphertext,
      hintSecretIv: input.hintSecretIv,
      hintSecretAuthTag: input.hintSecretAuthTag,
      acceptedCurrency: input.acceptedCurrency ?? "USDC",
      fulfillmentRegions: input.fulfillmentRegions ?? [],
      searchTimeoutMs: input.searchTimeoutMs ?? 2500,
      rateLimitPerMin: input.rateLimitPerMin ?? 60,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    this.commerceShopsById.set(input.shopId, record);
    return clone(record);
  }
}

export class PostgresMarketplaceStore implements MarketplaceStore {
  constructor(private readonly pool: Pool) {}

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS commerce_shops (
        shop_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        platform TEXT NOT NULL,
        status TEXT NOT NULL,
        hint_secret_ciphertext TEXT NOT NULL,
        hint_secret_iv TEXT NOT NULL,
        hint_secret_auth_tag TEXT NOT NULL,
        accepted_currency TEXT NOT NULL DEFAULT 'USDC',
        fulfillment_regions TEXT[] NOT NULL DEFAULT '{}',
        search_timeout_ms INTEGER NOT NULL DEFAULT 2500,
        rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS commerce_shops_status_idx ON commerce_shops(status);
    `);
  }

  async listActiveCommerceShops(): Promise<CommerceShopRecord[]> {
    const result = await this.pool.query(
      "SELECT * FROM commerce_shops WHERE status = 'active' ORDER BY shop_id"
    );
    return result.rows.map(mapCommerceShopRow);
  }

  async listCommerceShops(filter?: { status?: CommerceShopStatus }): Promise<CommerceShopRecord[]> {
    if (filter?.status) {
      const result = await this.pool.query(
        "SELECT * FROM commerce_shops WHERE status = $1 ORDER BY shop_id",
        [filter.status]
      );
      return result.rows.map(mapCommerceShopRow);
    }
    const result = await this.pool.query(
      "SELECT * FROM commerce_shops ORDER BY shop_id"
    );
    return result.rows.map(mapCommerceShopRow);
  }

  async getCommerceShop(shopId: string): Promise<CommerceShopRecord | null> {
    const result = await this.pool.query(
      "SELECT * FROM commerce_shops WHERE shop_id = $1",
      [shopId]
    );
    return result.rowCount ? mapCommerceShopRow(result.rows[0]) : null;
  }

  async upsertCommerceShop(input: UpsertCommerceShopInput): Promise<CommerceShopRecord> {
    const result = await this.pool.query(
      `
      INSERT INTO commerce_shops (
        shop_id, display_name, base_url, platform, status,
        hint_secret_ciphertext, hint_secret_iv, hint_secret_auth_tag,
        accepted_currency, fulfillment_regions, search_timeout_ms, rate_limit_per_min
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (shop_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        base_url = EXCLUDED.base_url,
        platform = EXCLUDED.platform,
        status = EXCLUDED.status,
        hint_secret_ciphertext = EXCLUDED.hint_secret_ciphertext,
        hint_secret_iv = EXCLUDED.hint_secret_iv,
        hint_secret_auth_tag = EXCLUDED.hint_secret_auth_tag,
        accepted_currency = EXCLUDED.accepted_currency,
        fulfillment_regions = EXCLUDED.fulfillment_regions,
        search_timeout_ms = EXCLUDED.search_timeout_ms,
        rate_limit_per_min = EXCLUDED.rate_limit_per_min,
        updated_at = NOW()
      RETURNING *
      `,
      [
        input.shopId,
        input.displayName,
        input.baseUrl,
        input.platform,
        input.status ?? "active",
        input.hintSecretCiphertext,
        input.hintSecretIv,
        input.hintSecretAuthTag,
        input.acceptedCurrency ?? "USDC",
        input.fulfillmentRegions ?? [],
        input.searchTimeoutMs ?? 2500,
        input.rateLimitPerMin ?? 60
      ]
    );
    return mapCommerceShopRow(result.rows[0]);
  }
}
