/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";
import { encode } from "@ensdomains/content-hash";
import { createEnsPublicClient } from "@ensdomains/ensjs";
import { mainnet } from "viem/chains";
import { http } from "viem";
import { switchNetworkMetaMask } from "./network";

// Mainnet configuration
const MAINNET_CHAIN_ID = 1;
// const MAINNET_RPC_URL =
//   "https://eth-mainnet.g.alchemy.com/v2/UbtuzKb8VNANh8a-B0g0tNU7sXrjwZS6";
const ENS_ADDRESS = "0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e";

const ENS_ABI = [
  "function resolver(bytes32 node) external view returns (address)",
  "function owner(bytes32 node) external view returns (address)",
];

const RESOLVER_ABI = [
  "function setText(bytes32 node, string key, string value) public",
  "function text(bytes32 node, string key) public view returns (string)",
  "function setContenthash(bytes32 node, bytes hash) public",
  "function contenthash(bytes32 node) public view returns (bytes)",
];

export const setEnsRecord = async (ensName: string, ipfsHash: string) => {
  try {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Check and switch network
    const network = await provider.getNetwork();
    if (network.chainId !== MAINNET_CHAIN_ID) {
      await switchNetworkMetaMask(MAINNET_CHAIN_ID);
    }

    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const namehash = ethers.utils.namehash(ensName);

    // Get ENS contract instance
    const ensContract = new ethers.Contract(ENS_ADDRESS, ENS_ABI, provider);

    // Get Resolver address
    const resolverAddress = await ensContract.resolver(namehash);

    if (!resolverAddress || resolverAddress === ethers.constants.AddressZero) {
      throw new Error("No resolver found for this ENS name");
    }

    // Create Resolver contract instance
    const resolverContract = new ethers.Contract(
      resolverAddress,
      RESOLVER_ABI,
      signer
    );

    // Set IPFS contenthash
    const contentHash = "0x" + encode("ipfs", ipfsHash);

    const contentTx = await resolverContract.setContenthash(
      namehash,
      contentHash
    );
    const contentReceipt = await contentTx.wait();
    if (!contentReceipt.status) {
      throw new Error("Failed to set content hash");
    }

    return true;
  } catch (error) {
    console.error("Error setting ENS record:", error);
    throw error;
  }
};

export const getUserENSDomains = async (address: string): Promise<string[]> => {
  try {
    if (!window.ethereum) {
      console.warn("MetaMask not installed");
      return [];
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);

    const network = await provider.getNetwork();
    if (network.chainId !== 1) {
      console.warn("Please switch to Ethereum mainnet");
      return [];
    }

    const ensReverseRecordsAddress =
      "0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C";
    const ensReverseRecordsABI = [
      "function getNames(address[] addresses) external view returns (string[] memory)",
    ];

    const reverseRecords = new ethers.Contract(
      ensReverseRecordsAddress,
      ensReverseRecordsABI,
      provider
    );

    const timeoutPromise = new Promise<string[]>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), 10000);
    });

    const namesPromise = reverseRecords.getNames([address]);
    const names = await Promise.race([namesPromise, timeoutPromise]);

    return Array.isArray(names)
      ? names.filter((name: string) => name && name !== "")
      : [];
  } catch (error) {
    console.error("Failed to fetch ENS domains:", error);
    return [];
  }
};

const createSharedEnsClient = () =>
  createEnsPublicClient({
    chain: mainnet,
    transport: http(),
    pollingInterval: 1000,
    batch: {
      multicall: {
        batchSize: 100,
        wait: 1000,
      },
    },
  });

export async function getENSSubdomains(
  parentDomain: string
): Promise<string[]> {
  const ens = createSharedEnsClient();

  try {
    const subnames = await ens.getSubnames({
      name: parentDomain,
      pageSize: 100,
      orderBy: "createdAt",
    });

    return subnames.map((subname) => subname.name || "");
  } catch (error) {
    console.error("Error fetching ENS subdomains:", error);
    return [];
  }
}

export async function getAllOwnedENSDomains(
  address: string
): Promise<string[]> {
  const ens = createSharedEnsClient();
  const allNames: string[] = [];

  try {
    const ownedNames = await ens.getNamesForAddress({
      address: address as `0x${string}`,
    });

    allNames.push(...ownedNames.map((name) => name.name || ""));

    const primaryDomains = await getUserENSDomains(address);

    const subdomainPromises = primaryDomains.map((domain) =>
      getENSSubdomains(domain)
    );
    const subdomains = await Promise.all(subdomainPromises);

    return [...new Set([...allNames, ...primaryDomains, ...subdomains.flat()])];
  } catch (error) {
    console.error("Error fetching all ENS domains:", error);
    return [];
  }
}

/**
 * Get ENS social accounts for a given ENS name
 * @param ensName ENS name
 * @returns Object containing social accounts
 */
export const getEnsSocialAccounts = async (ensName: string) => {
  
  try {
    console.log(ensName, "ensName");
    if (!ensName) {
      return {
        twitter: "",
        telegram: "",
        github: "",
      };
    }
    const client = await createSharedEnsClient();

    // Get text records for social accounts
    const twitter = await client.getTextRecord({
      name: ensName,
      key: "com.twitter",
    });

    const telegram = await client.getTextRecord({
      name: ensName,
      key: "org.telegram",
    });

    const github = await client.getTextRecord({
      name: ensName,
      key: "com.github",
    });

    return {
      twitter: twitter || "",
      telegram: telegram || "",
      github: github || "",
    };
  } catch (error) {
    console.error("Failed to get ENS social accounts:", error);
    return {
      twitter: "",
      telegram: "",
      github: "",
    };
  }
};
