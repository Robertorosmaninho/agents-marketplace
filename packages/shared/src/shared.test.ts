import { FastProvider, FastWallet } from "@fastxyz/sdk";
import { describe, expect, it } from "vitest";

import {
  buildOpenApiDocument,
  createChallenge,
  hashNormalizedRequest,
  marketplaceRoutes,
  normalizeFastWalletAddress,
  normalizePaymentHeaders,
  verifyWalletChallenge
} from "./index.js";

const TEST_PRIVATE_KEY = "11".repeat(32);

async function createTestWallet() {
  const provider = new FastProvider({
    network: "mainnet",
    networks: {
      mainnet: {
        rpc: "https://api.fast.xyz/proxy",
        explorer: "https://explorer.fast.xyz"
      }
    }
  });

  const wallet = await FastWallet.fromPrivateKey(TEST_PRIVATE_KEY, provider);
  const exported = await wallet.exportKeys();
  return {
    wallet,
    address: wallet.address,
    publicKey: exported.publicKey
  };
}

describe("shared marketplace helpers", () => {
  it("normalizes payment headers across new and legacy names", () => {
    expect(
      normalizePaymentHeaders({
        "payment-signature": "new-header",
        "x-payment-identifier": "legacy-id"
      })
    ).toEqual({
      paymentId: "legacy-id",
      paymentPayload: "new-header"
    });

    expect(
      normalizePaymentHeaders({
        "x-payment": "legacy-header",
        "payment-identifier": "new-id"
      })
    ).toEqual({
      paymentId: "new-id",
      paymentPayload: "legacy-header"
    });
  });

  it("hashes normalized requests deterministically", () => {
    const route = marketplaceRoutes[0];
    const first = hashNormalizedRequest(route, {
      query: "alpha",
      nested: {
        b: 2,
        a: 1
      }
    });
    const second = hashNormalizedRequest(route, {
      nested: {
        a: 1,
        b: 2
      },
      query: "alpha"
    });

    expect(first).toBe(second);
  });

  it("normalizes a hex Fast payer into a canonical bech32 address", async () => {
    const testWallet = await createTestWallet();
    expect(normalizeFastWalletAddress(`0x${testWallet.publicKey}`)).toBe(testWallet.address);
  });

  it("verifies a wallet challenge signature", async () => {
    const testWallet = await createTestWallet();
    const challenge = createChallenge({
      wallet: testWallet.address,
      resourceType: "job",
      resourceId: "job_123"
    });
    const signed = await testWallet.wallet.sign({ message: challenge.message });

    await expect(
      verifyWalletChallenge({
        wallet: testWallet.address,
        signature: signed.signature,
        challenge
      })
    ).resolves.toBe(true);
  });

  it("builds route entries into the OpenAPI document", () => {
    const document = buildOpenApiDocument("http://localhost:3000");
    expect(document.paths["/api/mock/quick-insight"]).toBeDefined();
    expect(document.paths["/api/mock/async-report"]).toBeDefined();
  });
});
