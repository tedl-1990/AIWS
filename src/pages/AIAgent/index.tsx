/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bubble, useXAgent, useXChat } from "@ant-design/x";
import { Button, Modal, Tooltip } from "antd";
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

import { sendMessage } from "@/services/ai";
import { getBlogList, IBlogItem } from "@/services/aiChatFeed";
import { getEnsSocialAccounts } from "@/services/ens";

// Assets
import icSend from "@/assets/images/arrow-top.png";
import icJump from "@/assets/images/jump.png";
import imgDefaultAvatar from "@/assets/images/default-avatar.png";
import icEmpty from "@/assets/images/empty.png";
import icClose from "@/assets/images/close.png";
import icTwitter from "@/assets/images/ic-x.png";
import icTelegram from "@/assets/images/ic-telegram.png";
import icGithub from "@/assets/images/ic-github.png";
import icFarcaster from "@/assets/images/ic-farcaster.png";
import icCopy from "@/assets/images/ic-copy.png";
import { MESSAGE_URL } from "@/utils";
import Loader from "@/components/Loader";

interface CustomMessageInfo {
  messageCid: string;
  id: string;
  message: string;
  status: string;
  showCid: boolean;
}

const HAS_BLOG = true;

// Constants
const DEFAULT_CONFIG = {
  avatar: imgDefaultAvatar,
  name: "On-Chain Hacker - Nova",
  behaviorDesc: "",
  functionDesc:
    "A tech-savvy blockchain expert skilled in smart contracts and security. Nova is precise, logical, and always reliable.",
  model: "gpt-3.5-turbo",
  did: "nick.eth",
  id: "0",
  agentId: "s3PnrR9LrtJVBPjLG-43h",
  blogPrompt: "",
  hasBlog: HAS_BLOG,
};

const MOBILE_BREAKPOINT = 760;
const sessionId = uuidv4();

const Independent: React.FC = () => {
  // Data
  const aiData = window?.aiData as any;
  const {
    avatar = DEFAULT_CONFIG.avatar,
    name = DEFAULT_CONFIG.name,
    functionDesc = DEFAULT_CONFIG.functionDesc,
    behaviorDesc,
    did = DEFAULT_CONFIG.did,
    blogPrompt,
    agentId,
    id,
    hasBlog = HAS_BLOG,
  } = aiData || DEFAULT_CONFIG;

  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [activeTab, setActiveTab] = useState<"feed" | "chat">(
    hasBlog ? "feed" : "chat"
  );
  const [feedList, setFeedList] = useState<IBlogItem[]>([]);
  const [isOnMobile, setIsOnMobile] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
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

  const sessionParam = {
    sessionId,
    agentId: agentId || id,
    ens: did,
  };

  // Chat configuration
  const roles = {
    ai: {
      placement: "start" as const,
      typing: {
        step: 1,
        interval: 30,
        enabled: true,
      },
      avatar: { src: avatar },
      loadingRender: () => <Loader />,
    },
    local: {
      placement: "end" as const,
      variant: "shadow" as const,
    },
  };

  // Utility functions
  const scrollChatToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const container = document.getElementById("chat-container");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, []);

  // Chat handling
  const [agent] = useXAgent({
    request: async ({ message }, { onSuccess, onUpdate }) => {
      try {
        await sendMessage(
          message || "",
          sessionId,
          "",
          undefined,
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
          msg.message === message ? { ...msg, messageCid, showCid: false } : msg
        )
      );
    },
    [setMessages]
  );

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

  // Feed handling
  const [feedLoading, setFeedLoading] = useState(false);
  const queryFeedList = useCallback(async () => {
    try {
      setFeedLoading(true);
      const data = await getBlogList({
        agent_id: String(sessionParam.agentId),
        page: 1,
        limit: 100,
      });
      setFeedList(data);
      setFeedLoading(false);
    } catch (error) {
      setFeedLoading(false);
      console.error("Failed to fetch feed:", error);
    }
  }, [sessionParam.agentId]);
  // Components
  const CustomBubble = useCallback(
    ({ content, messageCid }: { content: string; messageCid: string }) => (
      <div
        className="markdown-content"
        onClick={() => {
          if (!isOnMobile) return;
          if (activeMessageCid === messageCid) {
            setActiveMessageCid("");
          } else {
            setActiveMessageCid(messageCid);
          }
        }}
      >
        <div className="message-content">
          <ReactMarkdown
            components={{
              a: (props) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        {(activeMessageCid === messageCid || !isOnMobile) && (
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
      ({ id, message, status, messageCid = "" }) => ({
        key: id,
        loading: message.length === 0,
        role: status === "local" ? "local" : "ai",
        content: <CustomBubble content={message} messageCid={messageCid} />,
      })
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
    if (hasBlog) {
      queryFeedList();
    }
  }, [hasBlog, queryFeedList]);

  useEffect(() => {
    scrollChatToBottom();
  }, [messages, scrollChatToBottom]);

  const contentTabWidth = useMemo(() => {
    if (isOnMobile) {
      return "100%";
    }
    return hasBlog ? "400px" : "200px";
  }, [hasBlog, isOnMobile]);
  const chatTabWidth = useMemo(() => {
    if (!hasBlog) {
      return "100%";
    }
    return "50%";
  }, [hasBlog]);

  return (
    <>
      <div className="ai-agent-ert-effect"></div>
      <div className="ai-agent-container">
        <div className="agent-header">
          <div className="agent-info">
            <img src={avatar} alt="avatar" className="agent-avatar" />
            <div className="agent-details">
              <h2 className="agent-name ai-agent-flicker">{name}</h2>
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
            {hasBlog && (
              <div
                className={
                  activeTab === "feed"
                    ? "ai-agent-flicker active"
                    : "ai-agent-flicker"
                }
                onClick={() => setActiveTab("feed")}
              >
                Feed
              </div>
            )}
            <div
              className={`${!hasBlog && isOnMobile ? "showBorderBottom" : ""} ${
                activeTab === "chat"
                  ? "ai-agent-flicker active"
                  : "ai-agent-flicker"
              }`}
              style={{ width: chatTabWidth }}
              onClick={() => setActiveTab("chat")}
            >
              Chat
            </div>
          </div>

          <div className="tabs-content-splitter"></div>
          <div className="content-wrapper">
            {/* feed */}
            <div
              style={{ display: activeTab === "feed" ? "block" : "none" }}
              className="feed-container"
            >
              {feedLoading ? (
                <div className="feed-loading">
                  <div className="loader"></div>
                  <div className="feed-loading-text">Loading</div>
                </div>
              ) : (
                <>
                  {feedList.length > 0 ? (
                    feedList.map((item: any, index: number) => (
                      <div key={index}>
                        <div className="feed-item">
                          <div className="feed-item-title">{item.title}</div>
                          <div
                            dangerouslySetInnerHTML={{
                              __html: item.content.replace(/\n/g, "<br/>"),
                            }}
                          ></div>
                        </div>
                        {index !== feedList.length - 1 && (
                          <div className="feed-item-divider"></div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="feed-empty">
                      <img src={icEmpty} alt="" />
                      <div>No Content</div>
                    </div>
                  )}
                </>
              )}
            </div>
            {/* chat */}
            <div
              style={{ display: activeTab === "chat" ? "block" : "none" }}
              className="chat-container"
              ref={chatContainerRef}
            >
              <Bubble.List
                id="chat-container"
                items={items}
                roles={roles}
                className="messages"
              />
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
                  {behaviorDesc}
                </p>
              </Tooltip>
            </div>
            {blogPrompt && (
              <div className="detail-item">
                <h4>Blog Description Prompt:</h4>
                <Tooltip
                  title={
                    <div
                      style={{ cursor: "pointer" }}
                      onClick={() => copyToClipboard(blogPrompt)}
                    >
                      {isCopied ? "Copied!" : "Click To Copy"}
                    </div>
                  }
                  getPopupContainer={() =>
                    document.querySelector(
                      ".agent-details-modal"
                    ) as HTMLElement
                  }
                  mouseEnterDelay={0}
                  onOpenChange={(open) => {
                    if (open) {
                      setIsCopied(false);
                    }
                  }}
                >
                  <p
                    onClick={() => copyToClipboard(blogPrompt)}
                    style={{ cursor: "pointer" }}
                  >
                    {blogPrompt}
                  </p>
                </Tooltip>
              </div>
            )}
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
