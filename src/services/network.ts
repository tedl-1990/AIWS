/* eslint-disable @typescript-eslint/no-explicit-any */
import chainsMini from "@/const/chains_mini.json";

export interface INetwork {
  label: string;
  value: ENetwork;
  icon?: string;
  price: number;
  unit: string;
  unitName: number;
  contractAddr: string;
}

export const enum ENetwork {
  SepoliaTest = 11155111,
  Ethereum = 1,
  Polygon = 137,
  Optimism = 10,
  BNB = 56,
  Avalanche = 43114,
  Arbitrum = 42161,
  Base = 8453,
  FileCoin = 314,
  Mantle = 5000,
  Scroll = 534352,
}

export const networks: INetwork[] = [
  // {
  //   label: "SepoliaTest",
  //   value: ENetwork.SepoliaTest,
  //   price: 0.01,
  //   unit: "ETH",
  //   unitName: 18,
  //   contractAddr: "0xb028123909eb45be96f3bec9582f67255930577d",
  // },
  {
    label: "Ethereum",
    value: ENetwork.Ethereum,
    price: 0.01,
    unit: "ETH",
    unitName: 18,
    // https://etherscan.io/address/0x29e78bfd54c15c811bdd6560c10215c0ef687966
    contractAddr: "0x071e5993a7fa46ccaa7135ff07e840c7b9c5073c",
  },
];

export const switchNetworkMetaMask = async (
  chainId: number
): Promise<{
  status: boolean;
  message?: string;
}> => {
  const networkChainId = Number(chainId);
  console.log(networkChainId, "networkChainId");
  if (window.ethereum) {
    try {
      const nowChainId = await window.ethereum.request({
        method: "eth_chainId",
      });
      console.log(nowChainId, "nowChainId");
      console.log(
        networkChainId !== Number(nowChainId),
        "networkChainId !== Number(nowChainId)"
      );
      if (networkChainId !== Number(nowChainId)) {
        const chainId = chainIdNumberToHex(networkChainId);
        console.log(chainId, "chainId");

        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainId }],
        });
        return {
          status: true,
        };
      }
      return {
        status: true,
        message: "Network already selected",
      };
    } catch (error: any) {
      console.error("Switching network:", error);
      const errroCode = [4902, -32603];
      // https://docs.metamask.io/wallet/reference/wallet_switchethereumchain/
      // 4902	Unrecognized chain ID. Try adding the chain using wallet_addEthereumChain first.
      // IN MetaMask Application:
      // -32603	Unrecognized chain ID. Try adding the chain using wallet_addEthereumChain first.
      if (error && errroCode.includes(error.code)) {
        const res = await addNetworkMetaMask(networkChainId);
        return {
          status: res,
          message:
            "Unrecognized chain ID. Try adding the chain using wallet_addEthereumChain first.",
        };
      } else {
        let chainInfo: any = null;
        chainsMini.forEach((item) => {
          if (item.chainId === networkChainId) {
            chainInfo = item;
          }
        });
        return {
          status: false,
          message: `Please connect to ${chainInfo?.name}, chainID: ${chainInfo?.chainId}`,
        };
      }
    }
  } else {
    return {
      status: false,
      message: "MetaMask not detected.",
    };
  }
};

export const chainIdNumberToHex = (chainId: number) => {
  return `0x${chainId.toString(16)}`;
};

export const addNetworkMetaMask = async (chainId: number): Promise<boolean> => {
  const networkChainId = Number(chainId);

  let chainInfo: any = null;
  chainsMini.forEach((item) => {
    if (item.chainId === networkChainId) {
      chainInfo = item;
    }
  });

  try {
    if (chainInfo) {
      const chainId = chainIdNumberToHex(networkChainId);
      const params = {
        chainId,
        chainName: chainInfo.name,
        nativeCurrency: chainInfo.nativeCurrency,
        rpcUrls: chainInfo.rpc,
        blockExplorerUrls:
          chainInfo.faucets && chainInfo.faucets.length > 0
            ? chainInfo.faucets
            : null,
      };
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [params],
        });
        return true;
      } catch (error: any) {
        console.warn("Adding network:", error);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.log(
      "🚀 ~ file: metaMask.ts:78 ~ switchNetworkMetaMask ~ error",
      error
    );
    return false;
  }
};
