/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import { getAllOwnedENSDomains, setEnsRecord } from "../ens";
import {
  getDomainKeysWithReverses,
  //   findSubdomains,
  getRecordV2Key,
  serializeRecordV2Content,
  Record,
  createRecordV2Instruction,
  updateRecordV2Instruction,
  validateRecordV2Content,
} from "@bonfida/spl-name-service";
import {
  createContractRecord,
  getAllRecords as getRecordsFromUpload,
  IFile,
  IRecord,
  IUploadData,
} from "@/services/upload";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import idl from "@/const/solana.json";
import { ethers } from "ethers";
import { nanoid } from "nanoid";
import {
  createAvatarCid,
  createJsonFile,
  createHtmlFile,
  generateHTML,
  uploadFolderToIPFS,
} from "@/services/upload";

import buffer from "buffer";
import { ENetwork } from "@/services/network";
import { NETWORK_TYPE } from "@/utils/constants";

window.Buffer = buffer.Buffer;

interface WalletInfo {
  address: string;
  network: ENetwork;
  balance?: string;
}

export interface ISnsProfile {
  snsName: string;
  contenthash: string;
  timestamp: BN;
  agentName: string;
  agentIntro: string;
  agentId: string;
  avatarContentHash: string;
  extension: string;
  optionalField: string;
  creatorAddress: BN;
}

class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

type StateChangeListener = () => void;

interface SolanaWallet {
  connect(): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
}

interface EthereumProvider {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  selectedAddress?: string;
}

const recordAccountSize = 2008;
const programID = new PublicKey(idl.address);
const PDASeeds = "state";
const RPC_URL = {
  mainnet:
    "https://solana-mainnet.g.alchemy.com/v2/omJBXWIY1zRbJPFZziPcaWLckUpBER7L",
  devnet:
    "https://solana-devnet.g.alchemy.com/v2/omJBXWIY1zRbJPFZziPcaWLckUpBER7L",
};

export class WalletService {
  private static instance: WalletService;
  private walletInfo: WalletInfo | null = null;
  private listeners: Set<StateChangeListener> = new Set();

  private constructor() {}

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  private getMetaMaskProvider(): EthereumProvider | null {
    if (window.ethereum?.providers) {
      const provider = window.ethereum.providers.find(
        (p: EthereumProvider) => p.isMetaMask
      );
      if (provider) return provider;
    }

    if (window.ethereum?.isMetaMask) {
      return window.ethereum;
    }

    return null;
  }

  public switchAccount(network: ENetwork): void {
    if (network === ENetwork.Ethereum) {
      this.connectEthereumWallet();
    } else {
      this.connectSolanaWallet();
    }
  }

  private async connectEthereumWallet(): Promise<WalletInfo> {
    const provider = this.getMetaMaskProvider();
    if (!provider) {
      throw new WalletError("Please install or enable MetaMask");
    }

    try {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new WalletError("Failed to get wallet address");
      }

      this.walletInfo = {
        address: accounts[0],
        network: ENetwork.Ethereum,
      };

      return this.walletInfo;
    } catch (error) {
      console.error("MetaMask connection failed:", error);
      throw new WalletError("Failed to connect MetaMask");
    }
  }

  public async connectWallet(network: ENetwork): Promise<WalletInfo> {
    try {
      const result =
        network === ENetwork.Ethereum
          ? await this.connectEthereumWallet()
          : await this.connectSolanaWallet();

      this.notifyListeners();
      return result;
    } catch (error) {
      console.error("Wallet connection failed:", error);
      throw new WalletError(
        error instanceof Error ? error.message : "Failed to connect wallet"
      );
    }
  }

  private async connectSolanaWallet(): Promise<WalletInfo> {
    if (!window.solana) {
      throw new WalletError("Please install Phantom");
    }

    try {
      const wallet = window.solana as SolanaWallet;
      const resp = await wallet.connect();

      if (!resp?.publicKey) {
        throw new WalletError("Failed to get Solana wallet address");
      }

      this.walletInfo = {
        address: resp.publicKey.toString(),
        network: ENetwork.Solana,
      };

      return this.walletInfo;
    } catch (_error) {
      console.error("Phantom connection failed:", _error);
      throw new WalletError("Failed to connect Phantom");
    }
  }

  public async disconnectWallet(): Promise<void> {
    try {
      if (
        this.walletInfo?.network === ENetwork.Ethereum &&
        window.ethereum?.selectedAddress
      ) {
        await window.ethereum.request({
          method: "eth_requestAccounts",
          params: [{ eth_accounts: {} }],
        });
      } else if (
        this.walletInfo?.network === ENetwork.Solana &&
        window.solana?.isConnected
      ) {
        await window.solana.disconnect();
      }

      this.reset();
      localStorage.removeItem("Authentication-Tokens");
      localStorage.removeItem("Token_address");

      this.walletInfo = null;
      this.notifyListeners();
    } catch (error) {
      window.location.reload();
      console.error("Failed to disconnect wallet:", error);
      throw new WalletError("Failed to disconnect wallet");
    }
  }

  public reset(): void {
    this.walletInfo = null;
    this.notifyListeners();
  }

  public getWalletInfo(): WalletInfo | null {
    return this.walletInfo;
  }

  public isConnected(): boolean {
    return this.walletInfo !== null;
  }

  public getCurrentNetwork(): ENetwork | null {
    return this.walletInfo?.network || null;
  }

  private uint8ArrayToHex(arr: Uint8Array): string {
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  public async signMessage(message: string): Promise<string> {
    if (!this.walletInfo) {
      throw new WalletError("Please connect wallet first");
    }

    if (this.walletInfo.network === ENetwork.Ethereum) {
      const provider = this.getMetaMaskProvider();
      if (!provider) {
        throw new WalletError("Please install MetaMask");
      }
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, this.walletInfo.address],
      });
      return signature;
    } else {
      if (!window.solana) {
        throw new WalletError("Please install Phantom");
      }
      const wallet = window.solana as SolanaWallet;
      const encodedMessage = new TextEncoder().encode(message);
      const { signature } = await wallet.signMessage(encodedMessage);
      return this.uint8ArrayToHex(signature);
    }
  }

  public async getAllOwnedDomains(): Promise<string[]> {
    if (!this.walletInfo) {
      throw new WalletError("Please connect wallet first");
    }

    try {
      if (this.walletInfo.network === ENetwork.Ethereum) {
        return this.getEthereumDomains();
      } else {
        return this.getSolanaDomains();
      }
    } catch (error) {
      console.error("Failed to get domains:", error);
      return [];
    }
  }

  private async getEthereumDomains(): Promise<string[]> {
    if (!window.ethereum) {
      throw new WalletError("Please install MetaMask");
    }
    if (!this.walletInfo?.address) {
      throw new WalletError("Failed to get wallet address");
    }

    try {
      const res = await getAllOwnedENSDomains(this.walletInfo.address);
      return res;
    } catch (error) {
      console.error("Failed to get ENS domains:", error);
      throw new WalletError("Failed to get ENS domains");
    }
  }

  private async get_all_domains_by_addr(): Promise<string[]> {
    const provider = this.getProvider(RPC_URL.mainnet);
    const userAddr = provider.wallet.publicKey;
    const connection = provider.connection;

    const results = await getDomainKeysWithReverses(connection, userAddr);
    const allDomains = results.map((item) => item.domain?.toString() || "");
    // for (let i = 0; i < results.length; i++) {
    //   const subdomains = await findSubdomains(connection, results[i].pubKey);
    //   if (subdomains.length > 0) {
    //     allDomains.push(`${subdomains}.${results[i].domain}`);
    //   }
    // }
    return allDomains;
  }

  private async getSolanaDomains(): Promise<string[]> {
    try {
      const allDomains = await this.get_all_domains_by_addr();
      console.log(allDomains, "allDomains");
      return allDomains.map((item) => item.toString());
    } catch (error) {
      console.error("Failed to get Solana domains:", error);
      return [];
    }
  }

  private getProvider(url: string): AnchorProvider {
    const connection = new Connection(url, "confirmed");
    return new AnchorProvider(connection, window.solana, {
      preflightCommitment: "confirmed",
    });
  }

  private async getAllSolanaRecords(): Promise<{
    total: number;
    records: IRecord[];
  }> {
    const connection = new Connection(RPC_URL.mainnet);
    try {
      const provider = this.getProvider(RPC_URL.mainnet);
      const program: any = new Program(idl as any, provider);

      const programId = new PublicKey(programID);

      const accounts = await connection.getProgramAccounts(programId, {
        encoding: "jsonParsed" as any,
        dataSlice: {
          offset: 0,
          length: 0,
        },
        filters: [
          {
            dataSize: recordAccountSize,
          },
        ],
      });
      const pageAccountAddress = accounts.map((item) => item.pubkey);
      const pageRecord: any[] =
        await program.account.recordAccount.fetchMultipleAndContext(
          pageAccountAddress
        );

      return {
        total: pageRecord.length,
        records: pageRecord
          .map(({ data }: { data: ISnsProfile }) => ({
            did: data.snsName,
            contenthash: data.contenthash,
            agentId: data.agentId,
            timestamp: data.timestamp.toNumber(),
            creator_address: data.creatorAddress.toString(),
            avatar: data.avatarContentHash,
            agent_name: data.agentName,
            agent_intro: data.agentIntro,
            filename: data.snsName,
            network: ENetwork.Solana,
          }))
          .sort((a, b) => b.timestamp - a.timestamp),
      };
    } catch (error) {
      console.error("Failed to fetch Solana records:", error);
      throw error;
    }
  }

  async getAllRecords(): Promise<{
    total: number;
    records: IRecord[];
  }> {
    // const walletType = Number(localStorage.getItem(NETWORK_TYPE));
    const solana = await this.getAllSolanaRecords();
    const ethereum = await getRecordsFromUpload();
    const records = [...solana.records, ...ethereum.records];
    return {
      total: records.length,
      records,
    };
  }

  private async createSolanaRecord(data: IUploadData): Promise<{
    txHash: string;
    fileList: File[];
    ipfsInfo: {
      avatarHash: string;
      contentHash: string;
      agentId: string;
    };
  }> {
    try {
      if (!window.solana) {
        throw new Error("Please connect Phantom wallet first");
      }

      const provider = this.getProvider(RPC_URL.mainnet);
      console.log(provider, "provider");

      const connection = provider.connection;
      const signer = provider.wallet.publicKey;

      const programId = new PublicKey(programID);
      const program: any = new Program(idl as any, provider);

      const seeds = [Buffer.from(PDASeeds)];
      const [statusPDA] = PublicKey.findProgramAddressSync(seeds, programId);

      const snsName = data.did;
      const agentId = nanoid();
      const [recordPDA] = PublicKey.findProgramAddressSync(
        [provider.wallet.publicKey.toBuffer(), Buffer.from(agentId)],
        program.programId
      );

      console.log("Creating Solana record with data:", {
        name: data.name,
        functionDesc: data.functionDesc,
        avatar: data.avatar.name,
        did: data.did,
      });

      const avatarCid = await createAvatarCid(data.avatar);

      const { htmlString } = generateHTML({
        name: data.name,
        avatar: avatarCid[0].cid,
        functionDesc: data.functionDesc,
        behaviorDesc: data.behaviorDesc,
        did: data.did,
        agent_type: data.agent_type,
        dataset: data.dataset,
        blogPrompt: data.blogPrompt,
        hasBlog: data.hasBlog,
        hasRAG: data.hasRAG,
        agentId: agentId,
        network: "SOLANA",
      });

      const jsonData = {
        version: 1,
        agent_type: data.hasBlog ? 2 : 1,
        agent_id: agentId,
        agent_name: data.name,
        agent_avatar: avatarCid[0].cid,
        agent_intro: data.functionDesc,
        did: data.did + ".sol",
        network: "SOLANA",
        detail: {
          chat_prompt: data.behaviorDesc,
          chat_dataset: data.dataset,
          blog_prompt: data.blogPrompt,
          chat_knowledge_base: {
            website: [data.website, data.website1, data.website2].filter(
              (url) => url && url.trim() !== ""
            ),
          },
          blog_dataset: data.blog_dataset,
        },
      };

      const htmlFile = await createHtmlFile(htmlString);
      const jsonFile = await createJsonFile(jsonData);
      const fileList = [htmlFile, data.avatar, jsonFile];

      const ipfsHashCids = await uploadFolderToIPFS(fileList);
      const findCid = ipfsHashCids.find(
        (item: IFile) => !item.filename.includes("/")
      );

      const systemProgram = SystemProgram.programId;
      const transaction = await program.methods
        .recordData(
          agentId,
          snsName,
          findCid ? findCid.contenthash : "",
          new BN(Date.now()),
          data.name,
          data.functionDesc,
          avatarCid[0].cid,
          "",
          "{}"
        )
        .accounts({
          signer: signer,
          state: statusPDA,
          recordAccount: recordPDA,
          systemProgram: systemProgram,
        })
        .signers([signer])
        .transaction();

      transaction.recentBlockhash = (
        await connection.getLatestBlockhash()
      ).blockhash;
      transaction.feePayer = signer;

      const signedTransaction = await provider.wallet.signTransaction(
        transaction
      );

      console.log("Created instruction:", signedTransaction);

      const txID = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      return {
        txHash: txID,
        fileList,
        ipfsInfo: {
          avatarHash: avatarCid[0].cid,
          contentHash: findCid ? findCid.contenthash : "",
          agentId,
        },
      };
    } catch (error) {
      console.error("Failed to create Solana record:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to create Solana record: ${error.message}`);
      }
      throw error;
    }
  }

  public async createRecord(data: IUploadData): Promise<{
    txHash: string;
    fileList: File[];
    ipfsInfo: {
      avatarHash: string;
      contentHash: string;
    };
  }> {
    const walletType = Number(localStorage.getItem(NETWORK_TYPE));
    if (walletType === ENetwork.Solana) {
      return this.createSolanaRecord(data);
    } else {
      return this.createEthereumRecord(data);
    }
  }

  private async createEthereumRecord(data: IUploadData): Promise<{
    txHash: string;
    fileList: File[];
    ipfsInfo: {
      avatarHash: string;
      contentHash: string;
    };
  }> {
    return createContractRecord(data);
  }

  public async setRecord(data: {
    did: string;
    contenthash: string;
  }): Promise<void> {
    const walletType = Number(localStorage.getItem(NETWORK_TYPE));

    try {
      if (walletType === ENetwork.Solana) {
        await this.setSolanaRecord(data);
      } else {
        await this.setEthereumRecord(data);
      }
    } catch (error) {
      console.error("Failed to set record:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to set record: ${error.message}`);
      }
      throw error;
    }
  }

  private async setEthereumRecord(data: {
    did: string;
    contenthash: string;
  }): Promise<void> {
    if (!window.ethereum) {
      throw new Error("Ethereum provider not found");
    }

    const chainId = ethers.BigNumber.from(window.ethereum.chainId).toNumber();
    if (chainId !== ENetwork.Ethereum) {
      throw new Error("Please switch to Ethereum mainnet");
    }

    await setEnsRecord(data.did, data.contenthash);
  }

  private async setSolanaRecord(data: {
    did: string;
    contenthash: string;
  }): Promise<void> {
    if (!window.solana) {
      throw new Error("Please connect Phantom wallet first");
    }
    console.log(data, "data");

    const provider = this.getProvider(RPC_URL.mainnet);
    console.log(provider, "provider");
    const connection = provider.connection;
    const signer = provider.wallet.publicKey;

    const recordV2Key = await getRecordV2Key(data.did, Record.IPFS);
    console.log("recordV2Key", recordV2Key.toString());

    const accountInfo = await connection.getAccountInfo(recordV2Key);
    const instructions: TransactionInstruction[] = [];

    if (!accountInfo?.data) {
      console.log("have no ipfs");
      const createInstruction = createRecordV2Instruction(
        data.did,
        Record.IPFS,
        serializeRecordV2Content(
          `ipfs://${data.contenthash}`,
          Record.IPFS
        ) as any,
        signer,
        signer
      );
      instructions.push(createInstruction);
    } else {
      console.log("have ipfs");
      const updateInstruction = updateRecordV2Instruction(
        data.did,
        Record.IPFS,
        serializeRecordV2Content(
          `ipfs://${data.contenthash}`,
          Record.IPFS
        ) as any,
        signer,
        signer
      );
      instructions.push(updateInstruction);
    }
    const verifyInstruction = validateRecordV2Content(
      true,
      data.did,
      Record.IPFS,
      signer,
      signer,
      signer
    );
    instructions.push(verifyInstruction);

    try {
      const transaction = new Transaction().add(...instructions);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = window.solana.publicKey;
      const signedTransaction = await window.solana.signTransaction(
        transaction
      );
      const txid = await connection.sendRawTransaction(
        signedTransaction.serialize()
      );
      console.log("TX", txid);
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  }
}

declare global {
  interface Window {
    ethereum?: any;
    solana?: any;
  }
}
