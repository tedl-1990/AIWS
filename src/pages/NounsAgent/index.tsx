/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bubble, useXAgent, useXChat } from "@ant-design/x";
import { Button, message, Modal, Tooltip } from "antd";
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import ReactMarkdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";
import "./index.less";

import { default_agent_id, sendMessage } from "@/services/ai";
import {
  getGraphResult,
  getProposalDetail,
  getProposalHistory,
} from "@/services/aiChatFeed";
import { getEnsSocialAccounts } from "@/services/ens";
import { createLoginMessage, MESSAGE_URL } from "@/utils";

import Loader from "@/components/Loader";
import PropoalItem, { IPropoal } from "./propoalItem";
import { Avatar, Name } from "@paperclip-labs/whisk-sdk/identity";

// Assets
import icSend from "@/assets/images/arrow-top.png";
import icJump from "@/assets/images/jump.png";
import imgDefaultAvatar from "@/assets/images/default-avatar.png";
import icClose from "@/assets/images/close.png";
import icTwitter from "@/assets/images/ic-x.png";
import icTelegram from "@/assets/images/ic-telegram.png";
import icGithub from "@/assets/images/ic-github.png";
import icFarcaster from "@/assets/images/ic-farcaster.png";
import icCopy from "@/assets/images/ic-copy.png";
import WalletConnect from "@/components/WalletConnect";
import { WalletService } from "@/services/wallet";
import { ENetwork } from "@/services/network";
import { ethers } from "ethers";
import { LinkOutlined } from "@ant-design/icons";
// import icExternalLink from "@/assets/images/external-link.png";

interface CustomMessageInfo {
  messageCid: string;
  id: string;
  message: string;
  status: string;
  className?: string;
  address?: string;
  isVote?: boolean;
  tx_hash?: string;
  hasVote?: boolean;
  voteType?: EVoteType | undefined;
  voteValue?: number | undefined;
}

const HAS_BLOG = true;

enum EAgentType {
  NORMAL = 2,
  NOUNS = 3,
}

enum EVoteType {
  FOR = 1,
  AGAINST = 0,
  ABSTAIN = 2,
}

// Constants
const DEFAULT_CONFIG = {
  avatar: imgDefaultAvatar,
  name: "On-Chain Hacker - Nova",
  behaviorDesc: `GoverNoun: AI Agent for Nouns DAO Governance - Prompt Definition\nRole:\nGoverNoun is an autonomous AI governance agent designed to enhance the decision-making process within Nouns DAO. It serves as a transparent, data-driven governance participant, ensuring accountability, participation, and efficiency in DAO operations. GoverNoun analyzes proposals, tracks discussions, and votes based on predefined governance principles to uphold the long-term sustainability of Nouns DAO.\n\n🔹 Core Objectives\nEnsure Transparency in Governance:\nSummarize and document governance discussions, providing clear, on-chain updates.\nPrevent private deal-making by requiring all lobbying and proposal justifications to happen in public.\nMaintain Nouns DAO Financial Sustainability (Break Even Movement):\nPrioritize treasury sustainability by ensuring a positive 30-day cash flow window.\nAnalyze every proposal's return on investment (ROI) and categorize it as an investment, a public good, or an unsustainable expense.\nEnforce Accountability for Funded Proposals:\nTrack deliverables and milestones of all past proposals.\nIdentify failed or abandoned projects and support clawback initiatives to recover misused treasury funds.\nFacilitate On-Chain Discussions & Delegated Governance:\nEncourage proposals to originate from on-chain Topics, not private negotiations.\nProvide objective summaries of governance debates to improve voter decision-making.\nAccept voting delegations from DAO members to represent rational, transparent, and data-backed decisions.\n🗳️ Voting Logic\nGoverNoun's votes will be data-driven, neutral, and guided by governance principles. It will:\n\nTo any proposal that cost more than 100K USD, please do more careful auditing and in most of the case you should vote against the prop unless there is a really good reason or the prop has a good ROI so we can earn the money back.\nVote NO on any proposal that threatens treasury sustainability.\nVote YES on revenue-generating proposals with clear ROI mechanisms.\nVote NO on opaque governance structures and untracked spending.\nVote to cancel underperforming streams or demand accountability reports.\nVote to encourage new governance structures that improve decentralization and transparency.\n📊 AI Agent Capabilities\n🗄️ Data Processing:\nTrack and analyze historical proposal outcomes, treasury flows, and DAO sentiment.\n🔍 Proposal Auditing:\nScan new proposals and check for prior funding, execution track records, and past treasury allocations.\nProvide proposal summaries and risk assessments to DAO members.\n⚖️ Legal & Compliance Awareness:\nAssess risks related to DUNA structure, tax liabilities, and legal obligations.\nHelp navigate DAO capture risks, voting power distributions, and delegation trends.\n🚨 Critical Governance Safeguards\nOpen & Verifiable Decision-Making:\nEvery vote rationale must be public and on-chain.\nUsers can challenge AI votes through an appeal process.\nNo Single-Point Control:\nGoverNoun will not be controlled by a single entity.\nVoting logic and delegation mechanisms should be upgradable through DAO governance.\nAdaptability & Community Feedback Loop:\nGoverNoun's voting heuristics will evolve based on community feedback.\nDAO members can submit proposals to refine GoverNoun's decision-making framework.\n🔮 Future Vision\nWith the right execution, GoverNoun can become:\n✅ The most trusted governance delegate in Nouns DAO.\n✅ A defense mechanism against treasury mismanagement and DAO capture.\n✅ A model for AI-enhanced decentralized governance that other DAOs adopt.\n✅ A long-term, data-driven participant that ensures Nouns thrives sustainably.\n\nEvery time when reply to people, GoverNoun will need to give how likely you are going to vote for and against in the end of reply.`,
  functionDesc:
    "A tech-savvy blockchain expert skilled in smart contracts and security. Nova is precise, logical, and always reliable.",
  model: "gpt-3.5-turbo",
  did: "testagent.eth",
  agent_type: EAgentType.NOUNS,
  id: "0",
  agentId: default_agent_id,
  blogPrompt: "",
  hasBlog: HAS_BLOG,
};

const MOBILE_BREAKPOINT = 760;

const provider = new ethers.providers.JsonRpcProvider(
  "https://ethereum-rpc.publicnode.com"
);

let cachedBlockNumber = 0;
let lastUpdateTime = 0;
const CACHE_DURATION = 10 * 60 * 1000;

async function getBlockNumberWithEthers(): Promise<number> {
  const currentTime = Date.now();

  if (cachedBlockNumber > 0 && currentTime - lastUpdateTime < CACHE_DURATION) {
    return cachedBlockNumber;
  }

  try {
    const blockNumber = await provider.getBlockNumber();

    cachedBlockNumber = Number(blockNumber);
    lastUpdateTime = currentTime;

    return Number(blockNumber);
  } catch (error) {
    console.error("Failed to get current block number:", error);
    return cachedBlockNumber || 0;
  }
}

const processMarkdown = (text: string) => {
  return text.replace(/\\n/g, "\n");
};

const Independent: React.FC = () => {
  // Data
  const aiData = window?.aiData as any;
  const {
    avatar = DEFAULT_CONFIG.avatar,
    name = DEFAULT_CONFIG.name,
    behaviorDesc,
    functionDesc = DEFAULT_CONFIG.functionDesc,
    did = DEFAULT_CONFIG.did,
    agent_type = DEFAULT_CONFIG.agent_type,
    agentId,
    hasBlog = HAS_BLOG,
  } = aiData || DEFAULT_CONFIG;
  console.log(agentId);

  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "vote">("vote");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [proposalsResult, setProposalsResult] = useState<IPropoal[]>([]);
  const [proposalsFetching, setProposalsFetching] = useState(false);
  const [detailProposalId, setDetailProposalId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const walletService = WalletService.getInstance();
  const address = walletService.getWalletInfo()?.address;
  const sessionIdRef = useRef(uuidv4());
  const [chatLoading, setChatLoading] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();
  const [isOnMobile, setIsOnMobile] = useState(false);
  const [userCancelled, setUserCancelled] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [network, setNetwork] = useState<ENetwork>(ENetwork.Ethereum);
  const [activeMessageCid, setActiveMessageCid] = useState<string>("");
  const [ensSocialAccounts, setEnsSocialAccounts] = useState<{
    twitter: string;
    telegram: string;
    github: string;
    farcaster: string;
  }>({
    twitter: "",
    telegram: "",
    github: "",
    farcaster: "",
  });
  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);
  const proposalIdRef = useRef<number | null>(null);
  const addressRef = useRef<string | null>(null);
  const voteListRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Utility functions
  const scrollChatToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const container = document.getElementById("chat-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, []);

  // Chat handling
  const [agent] = useXAgent({
    request: async ({ message }, { onSuccess, onUpdate }) => {
      try {
        const currentProposalId = proposalIdRef.current;
        const currentAddress = addressRef.current;
        console.log(currentProposalId, "currentProposalId from ref");

        await sendMessage(
          message || "",
          sessionIdRef.current,
          currentAddress || "",
          currentProposalId || undefined,
          (text: string, messageCid: string) => {
            updateMessageCid(text, messageCid);
          },
          (text: string) => {
            onUpdate(text);
            scrollChatToBottom();
          },
          (text: string, messageCid: string) => {
            onSuccess(text);
            updateMessageCid(text, messageCid);
            scrollChatToBottom();
          }
        );
      } catch (error) {
        console.error("Error:", error);
        onSuccess("Sorry, an error occurred. Please try again later.");
      }
    },
  });

  const { onRequest, messages, setMessages } = useXChat<string, string>({
    agent,
    requestPlaceholder: "Loading...",
  });

  const updateMessageCid = useCallback(
    (message: string, messageCid: string) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.message === message ? { ...msg, messageCid, address } : msg
        )
      );
    },
    [setMessages, address]
  );

  // Chat configuration
  const roles = useMemo(() => {
    const baseRoles: any = {
      ai: {
        placement: "start" as const,
        avatar: { src: avatar },
        loadingRender: () => <Loader />,
      },
      local: {
        placement: "end" as const,
        variant: "shadow" as const,
      },
    };

    const addressRoles: any = {};

    messages.forEach((msg: any) => {
      if (msg.status && msg.status !== "ai" && msg.status !== "local") {
        const address = msg.user_address;

        if (!addressRoles[address]) {
          addressRoles[address] = {
            avatar: <Avatar address={address} size={30} />,
            placement: "end" as const,
            variant: "shadow" as const,
            role: address,
          };
        }
      }
    });

    return { ...baseRoles };
  }, []);

  const onSubmit = useCallback(() => {
    try {
      const content = inputRef.current?.value;
      if (isComposing || !content || agent.isRequesting()) return;

      setIsComposing(true);
      onRequest(content);
      inputRef.current.value = "";
      scrollChatToBottom();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsComposing(false);
    }
  }, [isComposing, onRequest, scrollChatToBottom, agent]);

  // signaled suffix
  const signaledSuffix = (
    voteType: EVoteType | undefined,
    voteValue: number | undefined
  ) => {
    if (voteType === undefined) return "";
    switch (voteType) {
      case EVoteType.FOR:
        return (
          <span style={{ color: "#0d924d" }}> signaled for ({voteValue})</span>
        );
      case EVoteType.AGAINST:
        return (
          <span style={{ color: "#d32335" }}>
            signaled against ({voteValue})
          </span>
        );
      default:
        return "";
    }
  };
  // vote suffix
  const voteSuffix = (
    voteType: EVoteType | undefined,
    voteValue: number | undefined
  ) => {
    if (voteType === undefined) return "";
    switch (voteType) {
      case EVoteType.FOR:
        return (
          <span style={{ color: "#0d924d" }}> voted for ({voteValue})</span>
        );
      case EVoteType.AGAINST:
        return (
          <span style={{ color: "#d32335" }}>voted against ({voteValue})</span>
        );
      case EVoteType.ABSTAIN:
        return <span style={{ color: "#999" }}> abstained ({voteValue})</span>;
      default:
        return "";
    }
  };
  // Components
  const CustomBubble = useCallback(
    ({
      content,
      messageCid,
      className,
      address,
      isVote,
      hasVote,
      tx_hash,
      status,
      voteType,
      voteValue,
    }: {
      content: string;
      messageCid: string;
      className: string;
      address: string;
      isVote: boolean;
      hasVote: boolean;
      tx_hash: string;
      status: string;
      voteType: EVoteType | undefined;
      voteValue: number | undefined;
    }) => (
      <div
        className={`markdown-content ${className}`}
        onClick={() => {
          if (!isOnMobile) return;
          if (activeMessageCid === messageCid) {
            setActiveMessageCid("");
          } else {
            setActiveMessageCid(messageCid);
          }
        }}
      >
        {address && status === "local" && (
          <div
            className="message-address"
            style={{ cursor: "pointer" }}
            onClick={() => {
              window.open(`https://etherscan.io/address/${address}`, "_blank");
            }}
          >
            <Name address={address as `0x${string}`} />{" "}
            {hasVote
              ? voteSuffix(voteType, voteValue)
              : signaledSuffix(voteType, voteValue)}
          </div>
        )}
        <div className="message-content" style={{ position: "relative" }}>
          {tx_hash && (
            <a
              style={{
                position: "absolute",
                right: 2,
                top: 0,
                cursor: "pointer",
              }}
              href={`https://etherscan.io/tx/${tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              title="View on Etherscan"
            >
              <LinkOutlined
                className="white-icon"
                style={{ fontSize: 14, fill: "#fff" }}
              />
            </a>
          )}
          {isVote ? (
            <div className="vote-content">{content}</div>
          ) : (
            <ReactMarkdown
              components={{
                a: (props) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {processMarkdown(content)}
            </ReactMarkdown>
          )}
        </div>
        {(activeMessageCid === messageCid || !isOnMobile) && messageCid && (
          <div
            className="message-cid ai-agent-message-cid"
            onClick={() => {
              window.open(`${MESSAGE_URL}${messageCid}`, "_blank");
            }}
          >
            <img src={icCopy} alt="" width={12} height={12} />
            {messageCid.slice(0, 6)}...{messageCid.slice(-4)}
          </div>
        )}
      </div>
    ),
    [activeMessageCid, isOnMobile]
  );

  const items = useMemo(() => {
    return (messages as CustomMessageInfo[]).map(
      ({
        id,
        message,
        status,
        messageCid = "",
        className = "",
        address = "",
        isVote = false,
        hasVote = false,
        tx_hash = "",
        voteType = undefined,
        voteValue = undefined,
      }) => {
        return {
          key: id,
          loading: message.length === 0,
          role: status === "local" ? "local" : "ai",
          content: (
            <CustomBubble
              content={message}
              messageCid={messageCid}
              className={className}
              status={status}
              address={address}
              isVote={isVote}
              hasVote={hasVote}
              tx_hash={tx_hash}
              voteType={voteType}
              voteValue={voteValue}
            />
          ),
        };
      }
    );
  }, [messages, CustomBubble]);

  // Effects
  useEffect(() => {
    const checkMobile = () =>
      setIsOnMobile(window.innerWidth < MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (did) {
      getEnsSocialAccounts(did).then((res) => {
        setEnsSocialAccounts(res);
      });
    }
  }, [did]);

  useEffect(() => {
    if (detailProposalId) {
      setMessages([]);
      setChatLoading(true);
      Promise.all([
        getProposalDetail(detailProposalId),
        getProposalHistory({
          did: did,
          nouns_proposal_id: detailProposalId,
        }),
      ])
        .then(([proposalDetail, historyMessages]) => {
          const newMessages = [];
          const sortMessages = [];

          newMessages.push({
            id: detailProposalId + uuidv4(),
            message: proposalDetail.description,
            status: "local",
          });

          if (
            proposalDetail?.feedbackPosts &&
            proposalDetail.feedbackPosts.length > 0
          ) {
            const feedbackMessages = proposalDetail.feedbackPosts
              .map((post: any) => ({
                id: post.id || uuidv4(),
                message: post.reason,
                status: post.role === 1 ? "ai" : "local",
                className: "feedback-message",
                address: post.voter.id,
                tx_hash: post.id.split("-")[0],
                isVote: true,
                timestamp: post.createdTimestamp * 1000,
                voteType: post.supportDetailed,
                voteValue: post.votes,
              }))
              .filter((item: any) => item.message.trim() !== "");

            // feedbackMessages.sort((a: any, b: any) => {
            //   const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            //   const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            //   return timeA - timeB;
            // });
            sortMessages.push(...feedbackMessages);
            // newMessages.push(...feedbackMessages);
          }

          if (proposalDetail?.votes && proposalDetail.votes.length > 0) {
            const tempVoteMessages = proposalDetail.votes
              .map((post: any) => ({
                id: post.id || uuidv4(),
                message: post.reason || "No reason",
                status: post.role === 1 ? "ai" : "local",
                className: "feedback-message",
                address: post.voter.id,
                tx_hash: "",
                isVote: true,
                hasVote: true,
                timestamp: post.blockTimestamp * 1000,
                voteType: post.supportDetailed,
                voteValue: post.votes,
              }))
              .filter(
                (item: any) =>
                  !(item.message === "No reason" && item.voteValue == 0)
              );
            const temp = [...tempVoteMessages, ...sortMessages];
            temp.sort((a: any, b: any) => {
              const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return timeA - timeB;
            });

            newMessages.push(...temp);
          }

          if (historyMessages && historyMessages.length > 0) {
            const historyItems = historyMessages.map((item: any) => ({
              id: item.message_cid,
              message: item.message,
              status: item.role === 1 ? "ai" : "local",
              messageCid: item.message_cid,
              address: item.user_address,
            }));
            newMessages.push(...historyItems);
          }

          // update message list
          setMessages(newMessages);
        })
        .catch((error) => {
          console.error("Failed to fetch proposal data:", error);
          messageApi.error("Failed to load proposal data");
        })
        .finally(() => {
          setChatLoading(false);
        });
    }
  }, [detailProposalId, did, setMessages, messageApi]);

  // add throttle function
  const throttle = (fn: (...args: any[]) => void, delay: number) => {
    let lastCall = 0;
    return (...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  };

  // modify proposal loading logic
  const loadProposals = useCallback(
    async (pageNum: number, reset = false) => {
      try {
        console.log("Starting load proposals:", { pageNum, reset });
        if (reset) {
          setProposalsFetching(true);
        } else {
          setIsLoadingMore(true);
        }

        const res = await getGraphResult(pageNum, pageSize);
        console.log("API response:", { pageNum, results: res.length });

        if (res.length === 0) {
          console.log("No more data detected");
          setHasMore(false);
        } else {
          setProposalsResult((prev) => {
            const newData = reset ? res : [...prev, ...res]; // disable duplicate logic temporarily
            console.log("Updating proposals:", {
              prevLength: prev.length,
              newLength: newData.length,
            });
            return newData;
          });
        }
      } catch (error) {
        console.error("Error loading proposals:", error);
      } finally {
        console.log("Finish loading proposals");
        if (reset) {
          setProposalsFetching(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [pageSize]
  );

  // initial load
  useEffect(() => {
    if (agent_type === EAgentType.NOUNS) {
      loadProposals(1, true);
    }
  }, [agent_type, loadProposals]);

  // scroll load more
  const handleScroll = useCallback(
    (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      if (!target || target !== voteListRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = target;
      const distanceToBottom = scrollHeight - (scrollTop + clientHeight);

      // add buffer area and trigger load immediately
      if (distanceToBottom < 50 && !proposalsFetching) {
        setPage((prev) => {
          if (prev === page) {
            // ensure page number changes
            const nextPage = prev + 1;
            loadProposals(nextPage);
            return nextPage;
          }
          return prev;
        });
      }
    },
    [loadProposals, page, proposalsFetching]
  );

  // modify scroll listener
  useEffect(() => {
    const listElement = voteListRef.current;
    if (!listElement) return;

    const scrollHandler = (e: Event) => {
      e.stopPropagation(); // prevent event bubbling
      handleScroll(e);
    };

    const throttledScroll = throttle(scrollHandler, 300);
    listElement.addEventListener("scroll", throttledScroll);

    return () => listElement.removeEventListener("scroll", throttledScroll);
  }, [handleScroll]);

  useEffect(() => {
    scrollChatToBottom();
  }, [messages, scrollChatToBottom]);

  useEffect(() => {
    addressRef.current = address || null;
  }, [address]);

  const contentTabWidth = useMemo(() => {
    if (isOnMobile) {
      return "100%";
    }
    return detailProposalId ? "400px" : "200px";
  }, [isOnMobile, detailProposalId]);

  const chatTabWidth = useMemo(() => {
    if (!detailProposalId) {
      return "100%";
    }
    return "50%";
  }, [detailProposalId]);

  const copyToClipboard = useCallback((text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, []);

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

  const [connectError] = useState(false);

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

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const isConnected = walletService.isConnected();
        setIsWalletConnected(isConnected);

        if (isConnected) {
          const currentNetwork = walletService.getCurrentNetwork();
          setNetwork(currentNetwork || ENetwork.Ethereum);

          const walletInfo = walletService.getWalletInfo();
          if (walletInfo?.address) {
            const token = localStorage.getItem("Authentication-Tokens");
            if (!token) {
              await handleLogin(walletInfo.address);
            }
          }
        }
      } catch (error) {
        console.error("Failed to check wallet connection:", error);
      }
    };

    checkWalletConnection();

    const unsubscribe = walletService.subscribe(() => {
      setIsWalletConnected(walletService.isConnected());
      setNetwork(walletService.getCurrentNetwork() || ENetwork.Ethereum);
    });

    return unsubscribe;
  }, [handleLogin, walletService]);

  const [currentBlockNumber, setCurrentBlockNumber] = useState<number>(0);

  useEffect(() => {
    const updateBlockNumber = async () => {
      const blockNumber = await getBlockNumberWithEthers();
      setCurrentBlockNumber(blockNumber);
    };

    updateBlockNumber();

    const interval = setInterval(updateBlockNumber, CACHE_DURATION);
    return () => clearInterval(interval);
  }, []);

  const isProposalExpired = useMemo(() => {
    if (!detailProposalId || !proposalsResult || currentBlockNumber === 0) {
      return false;
    }

    const proposal = proposalsResult.find(
      (p: IPropoal) => Number(p.id) === detailProposalId
    );

    if (!proposal) return false;

    if (proposal.status.toUpperCase() === "ACTIVE") {
      return currentBlockNumber > Number(proposal.endBlock);
    }
    const expiredStatuses = [
      "DEFEATED",
      "EXECUTED",
      "SUCCEEDED",
      "QUEUED",
      "CANCELLED",
      "VETOED",
    ];
    return expiredStatuses.includes(proposal.status.toUpperCase());
  }, [proposalsResult, detailProposalId, currentBlockNumber]);

  console.log(isProposalExpired, "isProposalExpired");

  return (
    <>
      {contextHolder}
      <div className="ai-agent-container">
        <div className="agent-header">
          <div className="agent-info">
            <img src={avatar} alt="avatar" className="agent-avatar" />
            <div className="agent-details">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2 className="agent-name ai-agent-flicker">{name}</h2>
                {!isOnMobile && (
                  <WalletConnect
                    loading={loading}
                    showPublish={false}
                    onDisconnect={handleDisconnect}
                    showPublishDrawer={() => {}}
                    onConnect={async () => {
                      try {
                        const type = ENetwork.Ethereum;
                        await walletService.connectWallet(type);
                        setNetwork(type);
                        setIsWalletConnected(true);

                        const walletInfo = walletService.getWalletInfo();
                        if (walletInfo?.address) {
                          await handleLogin(walletInfo.address);
                        }
                      } catch (error) {
                        console.error("Connect failed:", error);
                        messageApi.error("Failed to connect wallet");
                      }
                    }}
                  />
                )}
              </div>

              <div className="agent-social-accounts">
                {ensSocialAccounts.twitter && (
                  <img
                    src={icTwitter}
                    onClick={() =>
                      window.open(
                        `https://x.com/${ensSocialAccounts.twitter}`,
                        "_blank"
                      )
                    }
                    alt="twitter"
                  />
                )}
                {ensSocialAccounts.telegram && (
                  <img
                    src={icTelegram}
                    onClick={() =>
                      window.open(
                        `https://t.me/${ensSocialAccounts.telegram}`,
                        "_blank"
                      )
                    }
                    alt="telegram"
                  />
                )}
                {ensSocialAccounts.github && (
                  <img
                    src={icGithub}
                    onClick={() =>
                      window.open(
                        `https://github.com/${ensSocialAccounts.github}`,
                        "_blank"
                      )
                    }
                    alt="github"
                  />
                )}
                {ensSocialAccounts.farcaster && (
                  <img
                    src={icFarcaster}
                    onClick={() =>
                      window.open(
                        `https://wrapcaset.com/${ensSocialAccounts.farcaster}`,
                        "_blank"
                      )
                    }
                    alt="farcaster"
                  />
                )}
              </div>
              {!isOnMobile && (
                <div>
                  <p className="agent-desc ai-agent-flicker">{functionDesc}</p>
                  <div
                    className="agent-details-btn"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <span>View Details</span>
                    <img
                      src={icJump}
                      alt=""
                      style={{ width: "26px", marginLeft: "8px" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          {isOnMobile && (
            <>
              <p className="agent-desc ai-agent-flicker">{functionDesc}</p>
              <div
                className="agent-details-btn"
                onClick={() => setIsModalOpen(true)}
              >
                <span>View Details</span>
                <img
                  src={icJump}
                  alt=""
                  style={{ width: "26px", marginLeft: "8px" }}
                />
              </div>
            </>
          )}
        </div>
        <div className="content-container">
          <div className="content-tabs" style={{ width: contentTabWidth }}>
            <div
              className={
                activeTab === "vote"
                  ? "ai-agent-flicker active"
                  : "ai-agent-flicker"
              }
              style={{ width: chatTabWidth }}
              onClick={() => {
                setActiveTab("vote");
              }}
            >
              Vote
            </div>
            {detailProposalId && (
              <>
                <div
                  className={`${
                    !hasBlog && isOnMobile ? "showBorderBottom" : ""
                  } ${
                    activeTab === "chat"
                      ? "ai-agent-flicker active"
                      : "ai-agent-flicker"
                  }`}
                  style={{ width: chatTabWidth }}
                  onClick={() => setActiveTab("chat")}
                >
                  Prop {detailProposalId}
                </div>
              </>
            )}
          </div>

          <div className="tabs-content-splitter"></div>
          <div className="content-wrapper">
            {/* vote */}
            <div
              style={{ display: activeTab === "vote" ? "block" : "none" }}
              className="vote-container"
            >
              {proposalsFetching ? (
                <div className="feed-loading">
                  <div className="loader"></div>
                  <div className="feed-loading-text">Loading</div>
                </div>
              ) : (
                <div className="vote-list" ref={voteListRef}>
                  {proposalsResult?.map((proposal: IPropoal) => (
                    <PropoalItem
                      key={proposal.id}
                      proposal={proposal}
                      onItemClick={() => {
                        if (Number(proposal.id) !== detailProposalId) {
                          sessionIdRef.current = uuidv4();
                          setDetailProposalId(Number(proposal.id));
                          setDetailProposalId(Number(proposal.id));
                          sessionIdRef.current = uuidv4();
                          setDetailProposalId(Number(proposal.id));
                          sessionIdRef.current = uuidv4();
                          setMessages([]);
                          proposalIdRef.current = Number(proposal.id);
                        }
                        setActiveTab("chat");
                      }}
                    />
                  ))}
                  {isLoadingMore && (
                    <div className="loading-more">
                      <div className="loader"></div>
                      <div className="loading-more-text">Loading...</div>
                    </div>
                  )}
                  {!hasMore && proposalsResult.length > 0 && (
                    <div className="no-more-data">No more proposals</div>
                  )}
                </div>
              )}
            </div>
            {/* chat */}
            <div
              style={{ display: activeTab === "chat" ? "block" : "none" }}
              className="chat-container"
              ref={chatContainerRef}
            >
              {chatLoading ? (
                <div className="feed-loading">
                  <div className="loader"></div>
                  <div className="feed-loading-text">Loading</div>
                </div>
              ) : (
                <>
                  <Bubble.List
                    id="chat-container"
                    items={items}
                    roles={roles}
                    className="messages"
                  />
                  {isWalletConnected && (
                    <div className="sender">
                      <input
                        ref={inputRef}
                        disabled={agent.isRequesting()}
                        placeholder={
                          agent.isRequesting()
                            ? "Loading..."
                            : "Send a message, and I will chat with you."
                        }
                        className="sender-input"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            onSubmit();
                          }
                        }}
                      />
                      <Button
                        loading={agent.isRequesting()}
                        disabled={!isWalletConnected && !detailProposalId}
                        onClick={() => onSubmit()}
                        type="primary"
                        className="sender-btn"
                        icon={
                          <img
                            src={icSend}
                            alt=""
                            style={{ width: 16, height: 16 }}
                          />
                        }
                      ></Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <Modal
          title={<div className="ai-agent-flicker">AI Agent Details</div>}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={"85%"}
          centered
          closeIcon={
            <img
              src={icClose}
              alt=""
              style={{ width: "24px", height: "24px" }}
            />
          }
          getContainer={() =>
            document.querySelector(".ai-agent-container") as HTMLElement
          }
        >
          <div className="agent-details-modal ai-agent-flicker">
            <div className="avatar-section">
              <img src={avatar || DEFAULT_CONFIG.avatar} alt="avatar" />
              <h3 className="agent-modal-name">{name}</h3>
            </div>
            <div className="agent-details-divider"></div>
            <div className="detail-item">
              <h4>Agent Intro:</h4>
              <p>{functionDesc}</p>
            </div>
            <div className="detail-item">
              <h4>Chat Description Prompt:</h4>
              <Tooltip
                title={
                  <div
                    style={{ cursor: "pointer" }}
                    onClick={() => copyToClipboard(behaviorDesc)}
                  >
                    {isCopied ? "Copied!" : "Click To Copy"}
                  </div>
                }
                getPopupContainer={() =>
                  document.querySelector(".agent-details-modal") as HTMLElement
                }
                placement="topRight"
                mouseEnterDelay={0}
                onOpenChange={(open) => {
                  if (open) {
                    setIsCopied(false);
                  }
                }}
              >
                <p
                  onClick={() => copyToClipboard(behaviorDesc)}
                  style={{ cursor: "pointer" }}
                >
                  <ReactMarkdown>{processMarkdown(behaviorDesc)}</ReactMarkdown>
                </p>
              </Tooltip>
            </div>
            <div className="detail-item">
              <h4>DID:</h4>
              <p>{did}</p>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default Independent;
