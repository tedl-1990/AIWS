/**
 * AI Agents Marketplace component
 * Displays a list of AI agents and provides functionality to create new agents
 */

import React, { useState, useCallback, useEffect } from "react";
import { Avatar, Button, Table, Drawer, Space, message, Tooltip } from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useConnect, useAccount, useDisconnect, useSignMessage } from "wagmi";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import {
  PlusOutlined,
  WalletOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import Publish from "../Publish";
import "./index.less";
import { AxiosError } from "axios";
import WalletConnect from "@/components/WalletConnect";
import logo from "@/assets/images/logo.jpg";
import { getAllRecords, IRecord } from "@/services/upload";
import githubLogo from "@/assets/images/icon-github.png";

interface IContractHistoryRow {
  id: string;
  name: string;
  avatar: string;
  description: string;
  did: string;
  timestamp: number;
  ipfsHash: string;
  address: string;
}

/**
 * Interface for wallet connection errors
 */
interface ConnectError extends Error {
  message: string;
}

/**
 * Create authentication message with timestamp
 * @param address Wallet address
 * @returns Message and timestamp
 */
const createLoginMessage = (address: string) => {
  const timestamp = Math.floor(new Date().getTime() / 1000);
  const msg = `
Login on AIWS:

This signature is used only for login and does not include any other fees.

Wallet address:
${address}

Nonce:
${timestamp}
`;
  return {
    msg,
    timestamp,
  };
};

/**
 * Main AgentList component
 */
const AgentList: React.FC = () => {
  // State management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [signing, setSigning] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [agents, setAgents] = useState<IContractHistoryRow[]>([]);

  // Wallet connection hooks
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: new MetaMaskConnector(),
    onError(error: ConnectError) {
      message.error("Failed to connect wallet: " + error.message);
      setConnecting(false);
    },
  });
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const fetchRecords = async (): Promise<void> => {
    try {
      setTableLoading(true);
      const { records } = await getAllRecords();

      const latestRecords = records.reduce(
        (acc: { [key: string]: IRecord }, curr: IRecord) => {
          if (curr.did) {
            if (!acc[curr.did] || acc[curr.did].timestamp < curr.timestamp) {
              acc[curr.did] = curr;
            }
          } else {
            const key = `${curr.creator_address}-${curr.timestamp}`;
            acc[key] = curr;
          }
          return acc;
        },
        {}
      );

      const formattedAgents: IContractHistoryRow[] = Object.values(
        latestRecords
      ).map((record: IRecord, index: number) => ({
        id: `${record.creator_address}-${index}`,
        name: record.agent_name,
        avatar: record.avatar,
        timestamp: record.timestamp,
        description: record.agent_intro,
        did: record.did,
        ipfsHash: record.contenthash,
        address: record.creator_address,
      }));
      setTotal(formattedAgents.length);
      setAgents(formattedAgents);
    } catch (error) {
      console.error("Fetch records error:", error);
      message.error("Failed to load agents");
    } finally {
      setTableLoading(false);
    }
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setCurrentPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);
  };

  /**
   * Sign message using wallet
   * @param msg Message to sign
   * @returns Signed message or null if failed
   */
  const signMessage = useCallback(
    async (msg: string) => {
      if (signing) return null;
      try {
        setSigning(true);
        return await signMessageAsync({ message: msg });
      } catch (err) {
        console.error("Sign message error:", err);
        handleDisconnect();
        throw new Error("Failed to sign message");
      } finally {
        setSigning(false);
      }
    },
    [signMessageAsync, signing, disconnect]
  );

  /**
   * Handle user login
   * @param address Wallet address
   * @returns Authentication token or undefined if failed
   */
  const handleLogin = useCallback(
    async (address: string) => {
      if (loading || signing) return;
      try {
        setLoading(true);
        const { msg } = createLoginMessage(address);
        const signature = await signMessage(msg);

        if (!signature) return;

        localStorage.setItem("Authentication-Tokens", signature);
        localStorage.setItem("Token_address", address);
        return signature;
      } catch (err) {
        const error = err as Error | AxiosError;
        if (!error.message.includes("User rejected")) {
          console.error("Login error:", error);
          message.error(
            `Login failed: ${
              error instanceof AxiosError
                ? error.response?.data?.message || error.message
                : error.message
            }`
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [signMessage, loading, signing]
  );

  /**
   * Handle wallet connection
   */
  const handleConnect = async () => {
    if (connecting) return;
    try {
      setConnecting(true);
      if (typeof window.ethereum === "undefined") {
        window.open("https://metamask.io/download/", "_blank");
        return;
      }
      await connect();
    } catch (err) {
      console.error("Connect error:", err);
      message.error("Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };
  useEffect(() => {
    fetchRecords();
  }, []);

  /**
   * Initialize login on component mount
   */
  useEffect(() => {
    let mounted = true;
    let loginAttempted = false;

    const initLogin = async () => {
      if (loginAttempted) return;
      loginAttempted = true;

      const storedToken = localStorage.getItem("Authentication-Tokens");
      const storedAddress = localStorage.getItem("Token_address");

      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (!accounts || accounts.length === 0) {
            localStorage.removeItem("Authentication-Tokens");
            localStorage.removeItem("Token_address");
            return;
          }
        }

        if (storedToken && storedAddress && !isConnected) {
          if (mounted) {
            await connect();
          }
          return;
        }

        if (isConnected && address && address !== storedAddress && mounted) {
          const token = await handleLogin(address);
          if (token) {
            message.success("Connected successfully");
          }
        }
      } catch (err) {
        const error = err as Error;
        if (error.message.toLowerCase().includes("wallet_requestPermissions")) {
          return;
        }
        if (mounted) {
          message.error("Failed to login: " + error.message);
          localStorage.removeItem("Authentication-Tokens");
          localStorage.removeItem("Token_address");
        }
      }
    };

    if (!loading && !signing) {
      initLogin();
    }

    return () => {
      mounted = false;
    };
  }, [isConnected, address, connect, handleLogin, loading, signing]);

  /**
   * Handle wallet disconnection
   */
  const handleDisconnect = () => {
    disconnect();
    localStorage.removeItem("Authentication-Tokens");
    localStorage.removeItem("Token_address");
  };

  /**
   * Show publish drawer if wallet is connected
   */
  const showPublishDrawer = () => {
    if (!isConnected) {
      message.error("Please connect wallet first");
      return;
    }
    setDrawerOpen(true);
  };

  /**
   * Handle creation of new agent
   * @param agent New agent data
   */
  const handleCreateAgent = () => {
    fetchRecords().finally(() => {
      setDrawerOpen(false);
    });
  };

  /**
   * Open chat with selected agent
   * @param record Record to handle
   */
  const handleChat = (record: IContractHistoryRow) => {
    const recordsWithSameDid = agents.filter(
      (agent) => agent.did === record.did
    );
    const latestRecord = recordsWithSameDid.reduce((latest, current) =>
      current.timestamp > latest.timestamp ? current : latest
    );

    if (record.timestamp === latestRecord.timestamp) {
      window.open(`https://${record.did}.limo`, "_blank");
    } else {
      window.open(
        `https://ipfs.glitterprotocol.dev/ipfs/${record.ipfsHash}`,
        "_blank"
      );
    }
  };

  /**
   * Table columns configuration
   */
  const columns: ColumnsType<IContractHistoryRow> = [
    {
      title: "Agent",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <Space>
          <Avatar
            src={`https://ipfs.glitterprotocol.dev/ipfs/${record.avatar}`}
          />
          <span>{record.name}</span>
        </Space>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "DID",
      dataIndex: "did",
      key: "did",
      render: (_, record) => (
        <a href={`https://${record.did}.limo`} target="_blank">
          {record.did}
        </a>
      ),
    },
    {
      title: "IPFS Hash",
      dataIndex: "ipfsHash",
      key: "ipfsHash",
      render: (_) => {
        return (
          <a
            href={`https://ipfs.glitterprotocol.dev/ipfs/${_}`}
            target="_blank"
          >
            <Tooltip title={_}>
              {_.slice(0, 6)}...{_.slice(-4)}
            </Tooltip>
          </a>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<MessageOutlined />}
          onClick={() => handleChat(record)}
        >
          Chat
        </Button>
      ),
    },
  ];

  return (
    <div className="agent-list">
      <div className="header">
        <div className="logo">
          <img width={48} height={48} src={logo} alt="" />
          <h1>AIWS</h1>
          <a
            href="https://github.com/tedl-1990/AIWS"
            className="github-link"
            target="_blank"
          >
            <img width={16} height={16} src={githubLogo} alt="" />
          </a>
        </div>
        <Space>
          {isConnected && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showPublishDrawer}
            >
              Create Agent
            </Button>
          )}
          <WalletConnect loading={loading} onDisconnect={handleDisconnect} />
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={agents}
        rowKey="id"
        className="agent-table"
        loading={tableLoading}
        pagination={{
          current: currentPage,
          pageSize,
          total: total,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
        }}
        onChange={handleTableChange}
      />

      <Drawer
        title="Create New AI Agent"
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width="100%"
        styles={{
          body: {
            padding: 24,
            display: "flex",
            justifyContent: "center",
          },
        }}
      >
        {isConnected ? (
          <div style={{ maxWidth: 800, width: "100%" }}>
            <Publish onSuccess={handleCreateAgent} />
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p>Please connect your wallet first</p>
            <Button icon={<WalletOutlined />} onClick={handleConnect}>
              Connect Wallet
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AgentList;
