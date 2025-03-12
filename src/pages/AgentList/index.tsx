/**
 * AI Agents Marketplace component
 * Displays a list of AI agents and provides functionality to create new agents
 */

import React, { useState, useCallback, useEffect } from "react";
import {
  Avatar,
  Button,
  Table,
  Drawer,
  Space,
  message,
  Tooltip,
  Tabs,
  Spin,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { WalletOutlined, MessageOutlined } from "@ant-design/icons";
import Publish from "../Publish";
import "./index.less";
import WalletConnect from "@/components/WalletConnect";
import logo from "@/assets/images/logo.jpg";
import { IRecord } from "@/services/upload";
import githubLogo from "@/assets/images/icon-github.png";
import xLogo from "@/assets/images/icon-X.png";
import AgentCard, { IContractHistoryRow } from "@/components/agentCard";
import MessageCard, { IMessageRow } from "@/components/MessageCard";
import { getMessageList } from "@/services/api";
import { AVATAR_URL, MESSAGE_URL } from "@/utils";
import avatar_default from "@/assets/images/default-avatar.png";
import icEthereum from "@/assets/images/ic-eth.png";
import icSolana from "@/assets/images/ic-sol.png";
import starPng from "@/assets/images/icon-star.png";
import { WalletService } from "@/services/wallet";
import { ENetwork } from "@/services/network";
import { networkState } from "@/store/network";
import { useRecoilState } from "recoil";
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

enum AgentListTab {
  Agents = "Agents",
  Messages = "Messages",
}

const MOBILE_BREAKPOINT = 768;

const DID_BLACKLIST = [""];
const TOP_AGENTS = ["ainick.eth"];

/**
 * Main AgentList component
 */
const AgentList: React.FC = () => {
  // State management
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableMessageLoading, setTableMessageLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentMessagePage, setCurrentMessagePage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [messagePageSize, setMessagePageSize] = useState(8);
  const [totalMessage, setTotalMessage] = useState(0);
  const [agents, setAgents] = useState<IContractHistoryRow[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<IMessageRow[]>([]);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [connectError, setConnectError] = useState(false);
  const [userCancelled, setUserCancelled] = useState(false);

  const walletService = WalletService.getInstance();
  const [network, setNetwork] = useRecoilState(networkState);

  // Effects
  useEffect(() => {
    const checkMobile = () =>
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setIsWalletConnected(walletService.isConnected());

    const unsubscribe = walletService.subscribe(() => {
      setIsWalletConnected(walletService.isConnected());
    });

    return unsubscribe;
  }, [walletService]);

  const fetchRecords = useCallback(async (): Promise<void> => {
    try {
      setTableLoading(true);
      const { records } = await walletService.getAllRecords();
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
        latestRecords as { [key: string]: IRecord }
      )
        .filter((record) => !DID_BLACKLIST.includes(record.did))
        .map((record: IRecord, index: number) => ({
          id: `${record.creator_address}-${index}`,
          name: record.agent_name,
          avatar: record.avatar,
          timestamp: record.timestamp,
          description: record.agent_intro,
          did: record.did,
          ipfsHash: record.contenthash,
          address: record.creator_address,
          isTop: TOP_AGENTS.includes(record.did),
          network: record.network,
        }))
        .sort((a, b) => {
          if (a.isTop && !b.isTop) return -1;
          if (!a.isTop && b.isTop) return 1;
          return b.timestamp - a.timestamp;
        });
      setTotal(formattedAgents.length);
      setAgents(formattedAgents);
    } catch (error) {
      console.error("Fetch records error:", error);
      // message.error("Failed to load agents");
    } finally {
      setTableLoading(false);
    }
  }, [walletService]);

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setCurrentPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);
  };

  /**
   * Handle wallet disconnection
   */
  const handleDisconnect = useCallback(async () => {
    try {
      await walletService.disconnectWallet();
      setUserCancelled(true);
      setIsWalletConnected(false);
    } catch (err) {
      localStorage.removeItem("Authentication-Tokens");
      localStorage.removeItem("Token_address");
      window.location.reload();
      messageApi.error(
        err instanceof Error ? err.message : "failed to disconnect"
      );
    }
  }, [walletService, messageApi]);

  const handleMessageTableChange = (pagination: TablePaginationConfig) => {
    setCurrentMessagePage(pagination.current || 1);
    setMessagePageSize(pagination.pageSize || 10);
  };

  /**
   * Handle user login
   * @param address Wallet address
   * @returns Authentication token or undefined if failed
   */
  const handleLogin = useCallback(
    async (address: string) => {
      if (loading) return;
      try {
        setLoading(true);
        const { msg } = createLoginMessage(address);
        const signature = await walletService.signMessage(msg);
        if (!signature) return;

        localStorage.setItem("Authentication-Tokens", signature);
        localStorage.setItem("Token_address", address);
        return signature;
      } catch (err) {
        const error = err as Error;
        if (error.message.includes("User rejected")) {
          await handleDisconnect();
          setUserCancelled(true);
        } else {
          messageApi.error("login failed: " + error.message);
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, walletService, messageApi, handleDisconnect]
  );

  /**
   * Handle wallet connection
   */
  const handleConnect = useCallback(async () => {
    if (connecting) return;
    try {
      setConnecting(true);
      setConnectError(false);
      setUserCancelled(false);
      const savedType = network;
      await walletService.connectWallet(savedType);
      // after connection, if it is a new connection, trigger signature
      const walletInfo = walletService.getWalletInfo();
      if (walletInfo?.address) {
        const storedAddress = localStorage.getItem("Token_address");
        if (!storedAddress || storedAddress !== walletInfo.address) {
          await handleLogin(walletInfo.address);
        }
      }
    } catch (err) {
      const error = err as Error;
      setConnectError(true);

      if (
        error.message.includes("User rejected") ||
        error.message.includes("User denied")
      ) {
        setUserCancelled(true);
        localStorage.removeItem("Authentication-Tokens");
        localStorage.removeItem("Token_address");
      }
    } finally {
      setConnecting(false);
    }
  }, [connecting, walletService, handleLogin, network]);

  const fetchMessages = useCallback(async (): Promise<void> => {
    try {
      setTableMessageLoading(true);
      const { data } = await getMessageList({
        page: 1,
        limit: 100,
      });
      const { list, total_count } = data;
      setMessages(list);
      setTotalMessage(total_count);
    } catch (error) {
      console.error("Fetch messages error:", error);
      // message.error("Failed to load messages");
    } finally {
      setTableMessageLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchMessages();
  }, [fetchRecords, fetchMessages]);

  /**
   * Initialize login on component mount
   */
  useEffect(() => {
    let mounted = true;

    const restoreWalletConnection = async () => {
      // check if there is stored login information
      const storedToken = localStorage.getItem("Authentication-Tokens");
      const storedAddress = localStorage.getItem("Token_address");

      // if there is no stored information, no need to restore
      if (!storedToken || !storedAddress || !network) {
        return;
      }

      try {
        // if the wallet is not connected, try to restore connection
        if (!isWalletConnected) {
          await walletService.connectWallet(network);
          return;
        }

        // if the wallet is connected but the address does not match, login again
        const walletInfo = walletService.getWalletInfo();
        if (walletInfo?.address && walletInfo.address !== storedAddress) {
          const token = await handleLogin(walletInfo.address);
          if (token && mounted) {
            messageApi.success("connected successfully");
          }
        }
      } catch (err) {
        const error = err as Error;
        // only handle errors that are not user cancelled
        if (!error.message.includes("User rejected") && mounted) {
          // clear all stored information
          localStorage.removeItem("Authentication-Tokens");
          localStorage.removeItem("Token_address");
        }
      }
    };

    // only restore connection if not loaded and not cancelled
    if (!loading && !connectError && !userCancelled) {
      restoreWalletConnection();
    }

    return () => {
      mounted = false;
    };
  }, [
    isWalletConnected,
    loading,
    connectError,
    userCancelled,
    walletService,
    handleLogin,
    messageApi,
    network,
  ]);

  /**
   * Show publish drawer if wallet is connected
   */
  const showPublishDrawer = () => {
    if (!isWalletConnected) {
      message.error("please connect wallet");
      return;
    }
    setDrawerOpen(true);
  };

  /**
   * Handle creation of new agent
   * @param agent New agent data
   */
  const handleCreateAgent = () => {
    setTimeout(() => {
      setDrawerOpen(false);
      fetchRecords();
    }, 500);
  };

  /**
   * Open chat with selected agent
   * @param record Record to handle
   */
  const handleChat = (record: IContractHistoryRow) => {
    if (record.network === ENetwork.Ethereum) {
      window.open(`https://${record.did}.limo`, "_blank");
    } else {
      window.open(`https://${record.did}.sol.build`, "_blank");
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
            shape="square"
            src={`https://ipfs.glitterprotocol.dev/ipfs/${record.avatar}`}
          />
          <div className="agent-name">
            <span>{record.name}</span>
            {record.isTop && (
              <img
                width={16}
                src={starPng}
                alt="Top Agent"
                className="top-agent-icon"
              />
            )}
          </div>
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
      render: (_, record) =>
        record.network === ENetwork.Ethereum ? (
          <Space size={8} align="center">
            <img
              style={{ verticalAlign: "sub" }}
              width={16}
              height={16}
              src={icEthereum}
              alt=""
            />
            <a href={`https://${record.did}.limo`} target="_blank">
              {record.did}
            </a>
          </Space>
        ) : (
          <Space size={8} align="center">
            <img
              style={{ verticalAlign: "sub" }}
              width={16}
              height={16}
              src={icSolana}
              alt=""
            />
            <a href={`https://${record.did}.sol.build`} target="_blank">
              {record.did}.sol
            </a>
          </Space>
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
          style={{ color: "#000" }}
          icon={<MessageOutlined />}
          onClick={() => handleChat(record)}
        >
          Chat
        </Button>
      ),
    },
  ];

  /**
   * Table columns configuration
   */
  const messageColumns: ColumnsType<IMessageRow> = [
    {
      title: "IPFS Hash",
      dataIndex: "message_cid ",
      key: "message_cid",
      render: (_, record) => (
        <a href={`${MESSAGE_URL}${record.message_cid}`} target="_blank">
          {record.message_cid.slice(0, 6)}...{record.message_cid.slice(-4)}
        </a>
      ),
    },
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      render: (_, record) => {
        return (
          <span>{new Date(record.create_time * 1000).toLocaleString()}</span>
        );
      },
    },
    {
      title: "Content",
      dataIndex: "content",
      key: "content",
      render: (_, record) => (
        <div className="message-content">{record.message}</div>
      ),
    },
    {
      title: "Sender",
      dataIndex: "sender",
      key: "sender",
      render: (_, record: IMessageRow) => (
        <Space>
          {record.role === 1 ? (
            <>
              <Avatar
                shape="square"
                src={`${AVATAR_URL}${record.agent_files_info.agent_avatar}`}
              />
              <span>{record.agent_files_info.agent_name}</span>
            </>
          ) : (
            <>
              <Avatar shape="square" src={avatar_default} />
              <span>User</span>
            </>
          )}
        </Space>
      ),
    },
    {
      title: "Previous IPFS Hash",
      dataIndex: "prev_message_cid",
      key: "prev_message_cid",
      render: (_, record) =>
        record.prev_message_cid ? (
          <a href={`${MESSAGE_URL}${record.prev_message_cid}`} target="_blank">
            {record.prev_message_cid.slice(0, 6)}...
            {record.prev_message_cid.slice(-4)}
          </a>
        ) : (
          <span>--</span>
        ),
    },
  ];

  return (
    <div className="agent-list">
      {contextHolder}
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
          <a
            href="https://x.com/AIWS_WORLD"
            className="github-link"
            target="_blank"
          >
            <img width={16} height={16} src={xLogo} alt="" />
          </a>
        </div>
        {!isMobile && (
          <Space>
            {/* <Button
              onClick={() => {
                walletService.setRecord({
                  did: "xiyangyang423",
                  contenthash: "QmeHebB8bP1yufCDhtjw4FAw1DBGJT6zvMLuec9Tgz6ysV",
                });
              }}
            >
              setsns
            </Button> */}
            <WalletConnect
              loading={loading}
              onDisconnect={handleDisconnect}
              showPublishDrawer={showPublishDrawer}
              onConnect={async (type: ENetwork) => {
                setNetwork(type);
                // after connection, trigger signature immediately
                const walletInfo = walletService.getWalletInfo();
                if (walletInfo?.address) {
                  const storedAddress = localStorage.getItem("Token_address");
                  if (!storedAddress || storedAddress !== walletInfo.address) {
                    await handleLogin(walletInfo.address);
                  }
                }
              }}
            />
          </Space>
        )}
      </div>

      <Tabs className="agent-list-tabs">
        <Tabs.TabPane tab={AgentListTab.Agents} key={AgentListTab.Agents}>
          {!isMobile ? (
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
              rowClassName={(record) => (record.isTop ? "top-agent-row" : "")}
            />
          ) : (
            <div className="mobile-agent-list">
              {tableLoading ? (
                <div className="mobile-agent-list-loading">
                  <Spin />
                </div>
              ) : (
                agents.map((agent) => (
                  <AgentCard
                    agent={agent}
                    handleChat={handleChat}
                    key={agent.id}
                  />
                ))
              )}
            </div>
          )}
        </Tabs.TabPane>
        <Tabs.TabPane tab={AgentListTab.Messages} key={AgentListTab.Messages}>
          {!isMobile ? (
            <Table
              columns={messageColumns}
              dataSource={messages}
              rowKey="id"
              className="agent-table"
              loading={tableMessageLoading}
              pagination={{
                current: currentMessagePage,
                pageSize: messagePageSize,
                total: totalMessage,
                onChange: (page, size) => {
                  setCurrentMessagePage(page);
                  setMessagePageSize(size);
                },
              }}
              onChange={handleMessageTableChange}
            />
          ) : (
            <div className="mobile-message-list">
              {tableMessageLoading ? (
                <div className="mobile-message-list-loading">
                  <Spin />
                </div>
              ) : (
                messages.map((message) => (
                  <MessageCard key={message.id} message={message} />
                ))
              )}
            </div>
          )}
        </Tabs.TabPane>
      </Tabs>

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
        {isWalletConnected ? (
          <div style={{ maxWidth: 800, width: "100%" }}>
            <Publish onSuccess={handleCreateAgent} />
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p>Please connect wallet first</p>
            <Button
              icon={<WalletOutlined />}
              style={{ color: "#000" }}
              onClick={handleConnect}
            >
              Connect Wallet
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AgentList;
