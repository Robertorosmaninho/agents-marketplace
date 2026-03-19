import { FastProvider, FastWallet } from "@fastxyz/sdk";

import { rawToDecimalString } from "./amounts.js";
import { resolveMarketplaceNetworkConfig } from "./network.js";
import type { MarketplaceDeploymentNetwork } from "./network.js";
import type { RefundService } from "./types.js";

export function createFastRefundService(input: {
  deploymentNetwork?: MarketplaceDeploymentNetwork;
  rpcUrl?: string;
  privateKey?: string;
  keyfilePath?: string;
}): RefundService {
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
    async issueRefund({ wallet, amount }) {
      const treasuryWallet = await getWallet();
      const result = await treasuryWallet.send({
        to: wallet,
        amount: rawToDecimalString(amount, 6),
        token: network.tokenSymbol
      });

      return {
        txHash: result.txHash
      };
    }
  };
}
