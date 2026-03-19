import { FastProvider, FastWallet } from "@fastxyz/sdk";

import { rawToDecimalString } from "./amounts.js";
import { resolveMarketplaceNetworkConfig } from "./network.js";
import type { MarketplaceDeploymentNetwork } from "./network.js";
import type { PayoutService, RefundService } from "./types.js";

interface FastTreasuryServiceInput {
  deploymentNetwork?: MarketplaceDeploymentNetwork;
  rpcUrl?: string;
  privateKey?: string;
  keyfilePath?: string;
}

function createFastTreasurySender(input: FastTreasuryServiceInput) {
  const network = resolveMarketplaceNetworkConfig({
    deploymentNetwork: input.deploymentNetwork,
    rpcUrl: input.rpcUrl
  });
  const provider = new FastProvider({
    network: network.deploymentNetwork,
    networks: {
      [network.deploymentNetwork]: {
        rpc: network.rpcUrl,
        explorer: network.explorerUrl
      }
    }
  });

  let walletPromise: Promise<FastWallet> | null = null;

  const getWallet = async () => {
    if (!walletPromise) {
      if (input.privateKey) {
        walletPromise = FastWallet.fromPrivateKey(input.privateKey, provider);
      } else if (input.keyfilePath) {
        walletPromise = FastWallet.fromKeyfile(
          { keyFile: input.keyfilePath, createIfMissing: false },
          provider
        );
      } else {
        throw new Error(
          "Refund wallet is not configured. Set MARKETPLACE_TREASURY_PRIVATE_KEY or MARKETPLACE_TREASURY_KEYFILE."
        );
      }
    }

    return walletPromise;
  };

  return {
    async send(input: { wallet: string; amount: string }) {
      const treasuryWallet = await getWallet();
      const result = await treasuryWallet.send({
        to: input.wallet,
        amount: rawToDecimalString(input.amount, 6),
        token: network.tokenSymbol
      });

      return {
        txHash: result.txHash
      };
    }
  };
}

export function createFastRefundService(input: FastTreasuryServiceInput): RefundService {
  const treasury = createFastTreasurySender(input);

  return {
    async issueRefund({ wallet, amount }) {
      return treasury.send({ wallet, amount });
    }
  };
}

export function createFastPayoutService(input: FastTreasuryServiceInput): PayoutService {
  const treasury = createFastTreasurySender(input);

  return {
    async issuePayout({ wallet, amount }) {
      return treasury.send({ wallet, amount });
    }
  };
}
