import {
  createPaymentRequired,
  createPaymentRequirement,
  encodePaymentResponse,
  encodePayload,
  parsePrice,
  type PaymentRequirement,
  type PaymentResponse
} from "@fastxyz/x402-server";

import {
  LEGACY_PAYMENT_HEADER,
  LEGACY_PAYMENT_IDENTIFIER_HEADER,
  LEGACY_PAYMENT_RESPONSE_HEADER,
  PAYMENT_IDENTIFIER_HEADER,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_SIGNATURE_HEADER
} from "./constants.js";
import type { MarketplaceRoute } from "./types.js";

export interface NormalizedPaymentHeaders {
  paymentId: string | null;
  paymentPayload: string | null;
}

export function normalizePaymentHeaders(headers: Record<string, string | string[] | undefined>): NormalizedPaymentHeaders {
  const getHeader = (name: string): string | null => {
    const match = Object.entries(headers).find(
      ([candidate]) => candidate.toLowerCase() === name.toLowerCase()
    );

    if (!match) {
      return null;
    }

    const value = Array.isArray(match[1]) ? match[1][0] : match[1];
    return value ?? null;
  };

  return {
    paymentId: getHeader(PAYMENT_IDENTIFIER_HEADER) ?? getHeader(LEGACY_PAYMENT_IDENTIFIER_HEADER),
    paymentPayload: getHeader(PAYMENT_SIGNATURE_HEADER) ?? getHeader(LEGACY_PAYMENT_HEADER)
  };
}

export function buildPaymentRequirementForRoute(route: MarketplaceRoute, payTo: string): PaymentRequirement {
  return createPaymentRequirement(
    payTo,
    {
      price: route.price,
      network: route.network,
      config: {
        description: route.description,
        mimeType: "application/json"
      }
    },
    `/api/${route.provider}/${route.operation}`
  );
}

export function buildPaymentRequiredResponse(route: MarketplaceRoute, payTo: string) {
  return createPaymentRequired(
    payTo,
    {
      price: route.price,
      network: route.network,
      config: {
        description: route.description,
        mimeType: "application/json"
      }
    },
    `/api/${route.provider}/${route.operation}`
  );
}

export function buildPaymentRequiredHeaders(route: MarketplaceRoute, payTo: string): Record<string, string> {
  const body = buildPaymentRequiredResponse(route, payTo);
  return {
    [PAYMENT_REQUIRED_HEADER]: encodePayload(body)
  };
}

export function buildPaymentResponseHeaders(response: PaymentResponse): Record<string, string> {
  const encoded = encodePaymentResponse(response);
  return {
    [PAYMENT_RESPONSE_HEADER]: encoded,
    [LEGACY_PAYMENT_RESPONSE_HEADER]: encoded
  };
}

export function quotedPriceRaw(route: MarketplaceRoute): string {
  return parsePrice(route.price, 6);
}
