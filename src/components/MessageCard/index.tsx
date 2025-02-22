import { Avatar } from "antd";
import "./index.less";
import { AVATAR_URL, MESSAGE_URL } from "@/utils";

interface AgentFileInfo {
  version: number;
  agent_type: number;
  agent_id: string;
  agent_name: string;
  agent_avatar: string;
  agent_intro: string;
  did: string;
}

export interface IMessageRow {
  agent_config: string;
  agent_files_info: AgentFileInfo;
  agent_id: string;
  agent_type: number;
  chain_id: number;
  cid: string;
  create_time: number;
  did: string;
  ens: string;
  id: number;
  message: string;
  message_cid: string;
  prev_message_cid: string;
  role: number;
  scene: string;
  session: string;
  to_hash: string;
  transaction_id: string;
}

interface IMessageCardProps {
  message: IMessageRow;
}

export default function MessageCard({ message }: IMessageCardProps) {
  return (
    <div className="mobile-message-item">
      <div className="mobile-message-item-header">
        <Avatar
          size={48}
          shape="square"
          src={`${AVATAR_URL}${message.agent_files_info.agent_avatar}`}
        />
        <div className="mobile-agent-item-name">
          {message.agent_files_info.agent_name}
        </div>
      </div>
      <div className="mobile-message-item-ipfsHash">
        <span className="mobile-message-item-label">IPFS Hash:</span>{" "}
        <a href={`${MESSAGE_URL}${message.message_cid}`} target="_blank">
          {message.message_cid.slice(0, 6)}...
          {message.message_cid.slice(-4)}
        </a>
      </div>
      <div className="mobile-message-item-content">
        <span className="mobile-message-item-label">Content:</span>{" "}
        {message.message}
      </div>
      <div className="mobile-message-item-did">
        <span className="mobile-message-item-label">Create time:</span>{" "}
        {new Date(message.create_time * 1000).toLocaleString()}
      </div>
      <div className="mobile-message-item-ipfsHash">
        <span className="mobile-message-item-label">Previous IPFS Hash:</span>{" "}
        {message.prev_message_cid ? (
          <a href={`${MESSAGE_URL}${message.prev_message_cid}`} target="_blank">
            {message.prev_message_cid.slice(0, 6)}...
            {message.prev_message_cid.slice(-4)}
          </a>
        ) : (
          <span>None</span>
        )}
      </div>
    </div>
  );
}
