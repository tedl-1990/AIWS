/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosError } from "axios";
import { message } from "antd";
import { ethers } from "ethers";
import { UPLOAD_ABI } from "@/abis/uploadAbi";
import { importer, ImportCandidate } from "ipfs-unixfs-importer";
import {
  ENetwork,
  INetwork,
  networks,
  switchNetworkMetaMask,
} from "@/services/network";
import { readFileAsUint8Array } from "@/utils";
import { nanoid } from "nanoid";
import { StepData } from "@/types";

// Glitter IPFS API endpoint
const GLITTER_IPFS_API_URL = "https://ipfs.glitterprotocol.dev/api/v0";
// RPC
const MAINNET_RPC =
  "https://eth-mainnet.g.alchemy.com/v2/R3tcNhC28ASQj99HY5D4JCVrCKGybkIx";

/**
 * Interface for IPFS upload response
 */
interface IUploadRes {
  Hash: string;
  Size: string;
}

/**
 * Interface for AI agent data
 */
export interface IAgentData {
  name: string;
  agent_type: number;
  functionDesc: string;
  behaviorDesc: string;
  did: string;
  dataset: string;
  blogPrompt: string;
  hasBlog: boolean;
  hasRAG: boolean;
  avatar?: string;
  id?: string;
  agentId: string;
  network: string;
}

export interface IFile {
  filename: string;
  contenthash: string;
  filesize: number;
  timestamp: number;
}

export interface IRecord {
  filename: string;
  contenthash: string;
  timestamp: number;
  did: string;
  creator_address: string;
  agent_name: string;
  agent_intro: string;
  avatar: string;
  network: ENetwork;
}

// get Provider
const getProvider = async (needSigner = false) => {
  if (needSigner) {
    if (!window.ethereum) throw new Error("MetaMask not found");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    if (network.chainId === ENetwork.Ethereum) {
      await switchNetworkMetaMask(ENetwork.Ethereum);
    }
    return provider;
  }

  // if (window.ethereum) {
  //   return new ethers.providers.Web3Provider(window.ethereum);
  // }

  return new ethers.providers.JsonRpcProvider(MAINNET_RPC);
};

export const getAllSolanaRecords = async (): Promise<{
  total: number;
  records: IRecord[];
}> => {
  try {
    const provider = await getProvider();
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== ENetwork.Solana) {
      const { status } = await switchNetworkMetaMask(ENetwork.Solana);
      if (status) {
        console.log("switch network success");
        return getAllSolanaRecords();
      }
    }
    const contractAddress = networks.find(
      (item: INetwork) => item.value === Number(network.chainId)
    )?.contractAddr;
    if (!contractAddress) throw new Error("Contract address not found");
    const contract = new ethers.Contract(contractAddress, UPLOAD_ABI, provider);
    const count = await contract.getRecordCount();
    if (count === 0) {
      return {
        total: 0,
        records: [],
      };
    }
    const records = await contract.fetchData(0, count);
    const formattedRecords: IRecord[] = records
      .map((record: any) => ({
        did: record.ensName,
        contenthash: record.contenthash,
        timestamp: record.timestamp?.toNumber(),
        creator_address: record.creator_address,
        avatar: record.avatarContentHash,
        agent_name: record.agent_name,
        agent_intro: record.agent_intro,
        optionalField: record.optionalField,
        extension: record.extension,
      }))
      .sort((a: IRecord, b: IRecord) => b.timestamp - a.timestamp);
    return {
      total: count.toNumber(),
      records: formattedRecords,
    };
  } catch (error) {
    console.error("Get records error:", error);
    throw error;
  }
};

export const getAllRecords = async (): Promise<{
  total: number;
  records: IRecord[];
}> => {
  try {
    const provider = await getProvider();
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== ENetwork.Ethereum) {
      const { status } = await switchNetworkMetaMask(ENetwork.Ethereum);
      if (status) {
        console.log("switch network success");
        return getAllRecords();
      }
    }
    const contractAddress = networks.find(
      (item: INetwork) => item.value === Number(network.chainId)
    )?.contractAddr;
    if (!contractAddress) throw new Error("Contract address not found");
    const contract = new ethers.Contract(contractAddress, UPLOAD_ABI, provider);

    try {
      const count = await contract.getRecordCount();
      if (count === 0) {
        return {
          total: 0,
          records: [],
        };
      }

      // get all records
      const records = await contract.fetchData(0, count);
      // format records
      const formattedRecords: IRecord[] = records
        .map((record: any) => ({
          did: record.ensName,
          contenthash: record.contenthash,
          timestamp: record.timestamp?.toNumber(),
          creator_address: record.creator_address,
          avatar: record.avatarContentHash,
          agent_name: record.agent_name,
          agent_intro: record.agent_intro,
          optionalField: record.optionalField,
          extension: record.extension,
          network: ENetwork.Ethereum,
        }))
        .sort((a: IRecord, b: IRecord) => b.timestamp - a.timestamp);
      return {
        total: count.toNumber(),
        records: formattedRecords,
      };
    } catch (error) {
      console.error("Contract call error:", error);
      throw new Error("Failed to fetch records from contract");
    }
  } catch (error) {
    console.error("Get records error:", error);
    message.error(
      error instanceof Error ? error.message : "Failed to get records"
    );
    throw error;
  }
};

export interface ISocialMediaData {
  twitter_user_id: string;
  twitter_api_key: string;
  twitter_api_secret: string;
  twitter_access_token: string;
  twitter_access_secret: string;
}

/**
 * Upload file to Glitter IPFS
 * @param file File or Blob to upload
 * @param onProgress Progress callback
 * @returns Upload response
 */
export const uploadToGlitter = async (
  fileList: File[],
  txId: string,
  chainId: string,
  socialMediaData?: ISocialMediaData,
  onProgress?: (percent: number) => void
): Promise<IUploadRes> => {
  try {
    const formData = new FormData();
    fileList.forEach((file) => {
      formData.append(`files[${file.name}]`, file);
    });

    if (socialMediaData) {
      const arr = [1];
      formData.append("social_type", arr.join(","));
      formData.append("twitter_user_id", socialMediaData?.twitter_user_id);
      formData.append("twitter_api_key", socialMediaData?.twitter_api_key);
      formData.append(
        "twitter_api_secret",
        socialMediaData?.twitter_api_secret
      );
      formData.append(
        "twitter_access_token",
        socialMediaData?.twitter_access_token
      );
      formData.append(
        "twitter_access_secret",
        socialMediaData?.twitter_access_secret
      );
    }

    const { data } = await axios.post(
      `${GLITTER_IPFS_API_URL}/upagent?tx_id=${txId}&chainid=${chainId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress(progressEvent) {
          const { loaded, total } = progressEvent;
          onProgress?.((loaded / total) * 100);
        },
      }
    );

    if (!data.data?.[0]) {
      throw new Error("Upload failed: No response data");
    }

    const item = data.data.find((item: any) => !item.Name.includes("/"));
    return {
      Hash: item.Hash,
      Size: item.Size,
    };
  } catch (err) {
    const error = err as Error | AxiosError;
    console.error("Upload error:", error);

    if (error.message === "MetaMask not found") {
      message.error("Please install MetaMask first");
    } else if (error.message.includes("Login failed")) {
      message.error("Authentication failed, please try again");
    } else {
      message.error("Upload failed, please try again");
    }

    throw error;
  }
};

export const ipfsUnixfsImporterBlock = {
  blocks: new Map(),
  get: async (cid: any) => {
    const bytes = ipfsUnixfsImporterBlock.blocks.get(cid.toString());
    if (!bytes) throw new Error(`block not found: ${cid}`);
    return bytes;
  },
  put: async (bytes: Uint8Array) => {
    const cid = await bytes;
    ipfsUnixfsImporterBlock.blocks.set(cid.toString(), bytes);
    return cid;
  },
};

export const createAvatarCid = async (file: File) => {
  const avatarCid = [];
  const { content: uint8Array } = await readFileAsUint8Array(file);

  let fileCid: any = "";
  const source: ImportCandidate[] = [{ content: uint8Array }];
  for await (const entry of importer(source, ipfsUnixfsImporterBlock, {
    cidVersion: 0,
    onlyHash: true,
  })) {
    fileCid = entry.cid;
  }

  avatarCid.push({
    name: file.name,
    size: file.size,
    cid: fileCid.toString(),
  });

  return avatarCid;
};

/**
 * Create HTML file from content
 * @param content HTML content string
 * @returns HTML File object
 */
export const createHtmlFile = async (content: string): Promise<File> => {
  try {
    const blob = new Blob([content], { type: "text/html" });
    const file = new File([blob], "index.html", {
      type: "text/html",
      lastModified: Date.now(),
    });

    return file;
  } catch (error) {
    console.error("Create HTML file error:", error);
    throw error;
  }
};

/**
 * Create JSON file from content
 * @param content JSON content string
 * @returns JSON File object
 */
export const createJsonFile = async (content: object): Promise<File> => {
  try {
    const jsonString = JSON.stringify(content, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const file = new File([blob], "agent.json", {
      type: "application/json",
      lastModified: Date.now(),
    });

    return file;
  } catch (error) {
    console.error("Create json file error:", error);
    throw error;
  }
};

export const uploadFolderToIPFS = async (dirFileList: File[]) => {
  const list: IFile[] = [];
  const folderName = `agent_${Date.now()}`;

  const sourcePromises = dirFileList.map(async (file) => {
    const content = await readFileAsUint8Array(file);
    return {
      path: `${folderName}/${file.name}`,
      content: content.content,
    } as ImportCandidate;
  });

  const source = await Promise.all(sourcePromises);

  for await (const entry of importer(source, ipfsUnixfsImporterBlock, {
    cidVersion: 0,
    onlyHash: true,
    wrapWithDirectory: true,
  })) {
    const data = {
      filename: entry.path || "",
      contenthash: entry.cid.toString(),
      filesize: entry.size,
      timestamp: Date.now(),
    };

    list.push(data);
  }

  return list;
};

/**
 * upload file params
 */
interface IRecordDataParam {
  contenthash: string;
  timestamp: number;
  agent_name: string;
  agent_intro: string;
  ensName: string;
  avatarContentHash: string;
  extension: string;
  optionalField: string;
}

export interface IUploadData {
  name: string;
  avatar: File;
  agent_type: number;
  functionDesc: string;
  behaviorDesc: string;
  dataset: string;
  blogPrompt: string;
  blog_dataset: string;
  hasBlog: boolean;
  hasRAG: boolean;
  did: string;
  website?: string;
  website1?: string;
  website2?: string;
}

export const createContractRecord = async (
  formData: IUploadData
): Promise<{
  txHash: string;
  fileList: File[];
  ipfsInfo: {
    avatarHash: string;
    contentHash: string;
    agentId: string;
  };
}> => {
  try {
    const provider = await getProvider(true);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();

    if (Number(network.chainId) !== ENetwork.Ethereum) {
      const { status } = await switchNetworkMetaMask(ENetwork.Ethereum);
      if (!status) {
        throw new Error("Failed to switch network");
      }
    }

    const contractAddress = networks.find(
      (item: INetwork) => item.value === Number(network.chainId)
    )?.contractAddr;

    if (!contractAddress) throw new Error("Contract address not found");

    const contract = new ethers.Contract(contractAddress, UPLOAD_ABI, signer);

    const avatarCid = await createAvatarCid(formData.avatar);
    const agentId = nanoid();
    const chatKnowledgeBase = [
      formData.website,
      formData.website1,
      formData.website2,
    ].filter((url) => url && url.trim() !== "");

    const { htmlString } = generateHTML({
      name: formData.name,
      avatar: avatarCid[0].cid,
      functionDesc: formData.functionDesc,
      behaviorDesc: formData.behaviorDesc,
      did: formData.did,
      network: "ETH",
      dataset: formData.dataset,
      blogPrompt: formData.blogPrompt,
      hasBlog: formData.hasBlog,
      agent_type: formData.agent_type,
      hasRAG: formData.hasRAG,
      agentId: agentId,
    });

    const JSON_DATA = {
      version: 1,
      agent_type: formData.agent_type,
      agent_id: agentId,
      agent_name: formData.name,
      agent_avatar: avatarCid[0].cid,
      agent_intro: formData.functionDesc,
      did: formData.did,
      network: "ETH",
      detail: {
        chat_prompt: formData.behaviorDesc,
        chat_dataset: formData.dataset,
        chat_knowledge_base: {
          website: chatKnowledgeBase,
        },
        blog_prompt: formData.blogPrompt,
        blog_dataset: formData.blog_dataset,
      },
    };

    const htmlFile = await createHtmlFile(htmlString);
    const jsonFile = await createJsonFile(JSON_DATA);
    const fileList = [htmlFile, formData.avatar, jsonFile];
    const ipfsHashCids = await uploadFolderToIPFS(fileList);

    const findCid = ipfsHashCids.find(
      (item: IFile) => !item.filename.includes("/")
    );

    const data: IRecordDataParam = {
      contenthash: findCid ? findCid.contenthash : "",
      timestamp: Date.now(),
      agent_name: formData.name,
      agent_intro: formData.functionDesc,
      ensName: formData.did,
      avatarContentHash: avatarCid[0].cid,
      extension: JSON.stringify({ agentId }),
      optionalField: "{}",
    };

    const price = await contract.priceEth();
    const tx = await contract.recordData(
      data.contenthash,
      data.timestamp,
      data.agent_name,
      data.agent_intro,
      data.ensName,
      data.avatarContentHash,
      data.extension,
      data.optionalField,
      {
        value: price,
        gasLimit: 900000,
      }
    );

    const receipt = await tx.wait();
    return {
      txHash: receipt.transactionHash,
      fileList,
      ipfsInfo: {
        avatarHash: avatarCid[0].cid,
        contentHash: findCid ? findCid.contenthash : "",
        agentId,
      },
    };
  } catch (error: any) {
    console.error("Contract step error:", error);
    throw error;
  }
};

// step 2: upload to IPFS
export const uploadToIPFS = async (
  stepData: StepData,
  network: string,
  socialMediaData?: ISocialMediaData,
  onProgress?: (percent: number) => void
): Promise<{ contentHash: string; avatarHash: string }> => {
  try {
    const { contractData, ipfsData, fileList } = stepData;
    if (!fileList) throw new Error("fileList not found");
    const dirFileList = await createFolderWithFiles(fileList);

    if (!contractData?.txHash || !ipfsData?.avatarHash)
      throw new Error("txHash not found");

    // upload to Glitter
    const glitterHash = await uploadToGlitter(
      dirFileList,
      contractData.txHash,
      network, // Ethereum mainnet
      socialMediaData,
      onProgress
    );

    return {
      contentHash: glitterHash.Hash,
      avatarHash: ipfsData?.avatarHash,
    };
  } catch (error: any) {
    console.error("IPFS step error:", error);
    throw error;
  }
};

enum EAgentType {
  NORMAL = 2,
  NOUNS = 3,
}

/**
 * Generate HTML content for AI agent
 * @param data Agent data
 * @returns Generated HTML string
 */
export const generateHTML = (data: IAgentData) => {
  const avatarUrl =
    typeof data.avatar === "string" && data.avatar
      ? data.avatar.startsWith("http")
        ? data.avatar
        : `https://ipfs.glitterprotocol.dev/ipfs/${data.avatar}`
      : "";
  const metaData = {
    name: data.name,
    functionDesc: data.functionDesc,
    behaviorDesc: data.behaviorDesc,
    did: data.did,
    id: Date.now(),
    dataset: data.dataset,
    blogPrompt: data.blogPrompt,
    hasBlog: data.hasBlog,
    hasRAG: data.hasRAG,
    avatar: avatarUrl,
    agentType: data.agent_type,
    agentId: data.agentId,
    network: data.network,
  };

  const htmlString = `
<!DOCTYPE html>
<html>
<head>
  <title>${data.name}</title>
  <link rel="icon" href="${avatarUrl}" type="image/x-icon" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="UTF-8">
  <meta name="description" content="${data.functionDesc}">
  <script>
    window.aiData = ${JSON.stringify(metaData, null, 2)};
  </script>
  ${
    data.agent_type === EAgentType.NOUNS
      ? `
  <script type="module" crossorigin src="https://aipfs.glitterprotocol.tech/nouns/nouns.js"></script>
  <link rel="stylesheet" crossorigin href="https://aipfs.glitterprotocol.tech/nouns/nouns.css">
  `
      : `
  <script type="module" crossorigin src="https://aipfs.glitterprotocol.tech/agent/agent.js"></script>
  <link rel="stylesheet" crossorigin href="https://aipfs.glitterprotocol.tech/agent/agent.css">
  `
  }
</head>
<body>
  <div id="root-ai-agent"></div>
</body>
</html>
  `.trim();
  return {
    htmlString,
    metaData,
  };
};

const createFolderWithFiles = async (fileList: File[]): Promise<File[]> => {
  try {
    const timestamp = Date.now();
    const folderName = `agent_${timestamp}`;
    const dirFileList: File[] = [];

    const folderMetadata = {
      timestamp,
      files: fileList.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),
    };

    const folder = new Blob([JSON.stringify(folderMetadata)], {
      type: "application/x-directory",
    });

    const folderFile = new File([folder], folderName, {
      type: "application/x-directory",
      lastModified: timestamp,
    });
    dirFileList.push(folderFile);

    // add files to folder
    fileList.forEach((file) => {
      const newFile = new File([file], `${folderName}/${file.name}`, {
        type: file.type,
        lastModified: timestamp,
      });
      dirFileList.push(newFile);
    });

    return dirFileList;
  } catch (error) {
    console.error("Create folder error:", error);
    throw error;
  }
};
