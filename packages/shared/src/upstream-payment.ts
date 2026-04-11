import { randomBytes } from "node:crypto";

import { parse402Response, type PaymentDetails, type PaymentRequired, type PaymentRequirement } from "@fastxyz/x402-client";
import { privateKeyToAccount } from "viem/accounts";

import { isFixedX402Billing, isPrepaidCreditBilling, isTopupX402Billing, quotedPriceRaw } from "./billing.js";
import { rawToDecimalString } from "./amounts.js";
import type { MarketplaceRoute } from "./types.js";

export const BASE_USDC_ASSET = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

const BASE_NETWORKS = new Set(["base", "eip155:8453"]);
const SUPPORTED_EVM_NETWORKS = new Set([
  "ethereum-sepolia",
  "eip155:11155111",
  "arbitrum",
  "eip155:42161",
  "arbitrum-sepolia",
  "eip155:421614",
  "base",
  "eip155:8453",
  "base-sepolia",
  "eip155:84532"
]);

export interface UpstreamPaidHttpResult {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  payment?: PaymentDetails;
}

export interface UpstreamPaymentPolicy {
  network: "base";
  asset: `0x${string}`;
  maxAmountRaw: string;
  payToAllowlist?: `0x${string}`[];
}

export interface UpstreamPaymentService {
  payHttp(input: {
    url: string;
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
    policy: UpstreamPaymentPolicy;
  }): Promise<UpstreamPaidHttpResult>;
}

export function buildBaseUsdcUpstreamPaymentPolicy(input: {
  route: MarketplaceRoute | { billing: MarketplaceRoute["billing"]; routeId: string };
  requestInput?: unknown;
  maxAmountRaw?: string | null;
  payToAllowlist?: `0x${string}`[];
}): UpstreamPaymentPolicy | null {
  const maxAmountRaw = input.maxAmountRaw ?? maxRawAmountForRoute(input.route, input.requestInput);
  if (!maxAmountRaw) {
    return null;
  }

  return {
    network: "base",
    asset: BASE_USDC_ASSET,
    maxAmountRaw,
    ...(input.payToAllowlist ? { payToAllowlist: input.payToAllowlist } : {})
  };
}

export function validateUpstreamPaymentRequirements(
  accepts: PaymentRequirement[] | undefined,
  policy: UpstreamPaymentPolicy
): PaymentRequirement {
  if (!accepts || accepts.length === 0) {
    throw new Error("No payment requirements in upstream 402 response.");
  }

  const supportedEvmRequirements = accepts.filter((requirement) => SUPPORTED_EVM_NETWORKS.has(requirement.network));
  if (supportedEvmRequirements.length === 0) {
    throw new Error("Upstream 402 response did not include a supported EVM payment requirement.");
  }

  const validRequirement = supportedEvmRequirements.find((requirement) => isRequirementAllowed(requirement, policy));
  if (!validRequirement) {
    throw new Error("Upstream 402 response did not match the route payment policy.");
  }

  return validRequirement;
}

export function createX402UpstreamPaymentService(input: {
  evmPrivateKey: `0x${string}`;
  evmAddress: `0x${string}`;
  verbose?: boolean;
}): UpstreamPaymentService {
  const account = privateKeyToAccount(input.evmPrivateKey);
  if (account.address.toLowerCase() !== input.evmAddress.toLowerCase()) {
    throw new Error("MARKETPLACE_UPSTREAM_EVM_ADDRESS does not match MARKETPLACE_UPSTREAM_EVM_PRIVATE_KEY.");
  }

  return {
    async payHttp(request) {
      const preflight = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        ...(request.body ? { body: request.body } : {})
      });

      const paymentRequired = await parse402Response(preflight);
      const requirement = validateUpstreamPaymentRequirements(paymentRequired.accepts, request.policy);

      const result = await payWithValidatedBaseUsdcRequirement({
        url: request.url,
        method: request.method,
        headers: request.headers,
        ...(request.body ? { body: request.body } : {}),
        paymentRequired,
        requirement,
        account
      });

      return {
        statusCode: result.statusCode,
        headers: result.headers,
        body: result.body,
        ...(result.payment ? { payment: result.payment } : {})
      };
    }
  };
}

async function payWithValidatedBaseUsdcRequirement(input: {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
  paymentRequired: PaymentRequired;
  requirement: PaymentRequirement;
  account: ReturnType<typeof privateKeyToAccount>;
}) {
  const authorization = {
    from: input.account.address,
    to: input.requirement.payTo as `0x${string}`,
    value: input.requirement.maxAmountRequired,
    validAfter: "0",
    validBefore: String(Math.floor(Date.now() / 1000) + 3600),
    nonce: `0x${randomBytes(32).toString("hex")}` as `0x${string}`
  };
  const signature = await input.account.signTypedData({
    domain: {
      name: typeof input.requirement.extra?.name === "string" ? input.requirement.extra.name : "USD Coin",
      version: typeof input.requirement.extra?.version === "string" ? input.requirement.extra.version : "2",
      chainId: 8453,
      verifyingContract: input.requirement.asset as `0x${string}`
    },
    types: {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    },
    primaryType: "TransferWithAuthorization",
    message: {
      from: authorization.from,
      to: authorization.to,
      value: BigInt(authorization.value),
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      nonce: authorization.nonce
    }
  });
  const paymentPayload = {
    x402Version: input.paymentRequired.x402Version ?? 1,
    scheme: "exact",
    network: input.requirement.network,
    payload: {
      signature,
      authorization
    }
  };
  const response = await fetch(input.url, {
    method: input.method,
    headers: {
      ...input.headers,
      "X-PAYMENT": Buffer.from(JSON.stringify(paymentPayload)).toString("base64")
    },
    ...(input.body ? { body: input.body } : {})
  });
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const body = await safeResponseBody(response);
  const txHash = body && typeof body === "object" && typeof (body as Record<string, unknown>).txHash === "string"
    ? (body as Record<string, string>).txHash
    : signature.slice(0, 66);

  return {
    statusCode: response.status,
    headers,
    body,
    payment: {
      network: input.requirement.network,
      amount: rawToDecimalString(input.requirement.maxAmountRequired, 6),
      recipient: input.requirement.payTo,
      txHash
    }
  };
}

function maxRawAmountForRoute(
  route: MarketplaceRoute | { billing: MarketplaceRoute["billing"]; routeId: string },
  requestInput: unknown
): string | null {
  if (isFixedX402Billing(route)) {
    return quotedPriceRaw(route as MarketplaceRoute, requestInput);
  }

  if (isTopupX402Billing(route)) {
    return quotedPriceRaw(route as MarketplaceRoute, requestInput);
  }

  if (isPrepaidCreditBilling(route)) {
    return null;
  }

  return null;
}

function isRequirementAllowed(requirement: PaymentRequirement, policy: UpstreamPaymentPolicy): boolean {
  if (requirement.scheme !== "exact") {
    return false;
  }

  if (!BASE_NETWORKS.has(requirement.network) || requirement.network !== policy.network) {
    return false;
  }

  if (!requirement.asset || requirement.asset.toLowerCase() !== policy.asset.toLowerCase()) {
    return false;
  }

  if (!/^\d+$/.test(requirement.maxAmountRequired)) {
    return false;
  }

  if (BigInt(requirement.maxAmountRequired) > BigInt(policy.maxAmountRaw)) {
    return false;
  }

  if (policy.payToAllowlist && !policy.payToAllowlist.map((payTo) => payTo.toLowerCase()).includes(requirement.payTo.toLowerCase())) {
    return false;
  }

  return true;
}

async function safeResponseBody(response: globalThis.Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}
