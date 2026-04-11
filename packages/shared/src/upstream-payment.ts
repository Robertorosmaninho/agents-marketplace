import { x402Pay, type EvmWallet, type PaymentDetails } from "@fastxyz/x402-client";

export interface UpstreamPaidHttpResult {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  payment?: PaymentDetails;
}

export interface UpstreamPaymentService {
  payHttp(input: {
    url: string;
    method: "GET" | "POST";
    headers: Record<string, string>;
    body?: string;
  }): Promise<UpstreamPaidHttpResult>;
}

export function createX402UpstreamPaymentService(input: {
  evmPrivateKey: `0x${string}`;
  evmAddress: `0x${string}`;
  verbose?: boolean;
}): UpstreamPaymentService {
  const wallet: EvmWallet = {
    type: "evm",
    privateKey: input.evmPrivateKey,
    address: input.evmAddress
  };

  return {
    async payHttp(request) {
      const result = await x402Pay({
        url: request.url,
        method: request.method,
        headers: request.headers,
        ...(request.body ? { body: request.body } : {}),
        wallet,
        verbose: input.verbose
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
