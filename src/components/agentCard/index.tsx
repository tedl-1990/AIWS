import { MessageOutlined } from "@ant-design/icons";
import { Avatar, Button } from "antd";
import { AVATAR_URL } from "@/utils";
import starPng from "@/assets/images/icon-star.png";
import "./index.less";
import { ENetwork } from "@/services/network";
export interface IContractHistoryRow {
  id: string;
  name: string;
  avatar: string;
  description: string;
  did: string;
  timestamp: number;
  ipfsHash: string;
  address: string;
  network: ENetwork;
  isTop?: boolean;
}

interface AgentCardProps {
  agent: IContractHistoryRow;
  handleChat: (agent: IContractHistoryRow) => void;
}

export default function AgentCard({ agent, handleChat }: AgentCardProps) {
  return (
    <div className="mobile-agent-item">
      <div className="mobile-agent-item-header">
        <Avatar shape="square" size={48} src={`${AVATAR_URL}${agent.avatar}`} />
        <div className="mobile-agent-item-name">{agent.name}</div>
        {agent.isTop && (
          <img
            width={16}
            src={starPng}
            alt="Top Agent"
            className="top-agent-icon"
          />
        )}
      </div>
      <div className="mobile-agent-item-description">
        <span className="mobile-agent-item-label">Description:</span>{" "}
        {agent.description}
      </div>
      <div className="mobile-agent-item-did">
        <span className="mobile-agent-item-label">DID:</span> {agent.did}
      </div>
      <div className="mobile-agent-item-ipfsHash">
        <span className="mobile-agent-item-label">IPFS Hash:</span>{" "}
        <a href={`${AVATAR_URL}${agent.ipfsHash}`} target="_blank">
          {agent.ipfsHash.slice(0, 6)}...
          {agent.ipfsHash.slice(-4)}
        </a>
      </div>
      <div className="mobile-agent-item-action">
        <Button
          type="primary"
          icon={<MessageOutlined />}
          onClick={() => handleChat(agent)}
        >
          Chat
        </Button>
      </div>
    </div>
  );
}
