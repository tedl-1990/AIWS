/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import "./index.less";

export interface IPropoalsProps {
  proposal: IPropoal;
  onItemClick?: () => void;
}

export interface IPropoal {
  id: string;
  status: string;
  title: string;
  description: string;
  endBlock: string;
}

function getProposalActualStatus(
  status: string,
  endBlock: string,
  currentBlock: number
): string {
  if (currentBlock > parseInt(endBlock) && status.toUpperCase() === "ACTIVE") {
    return "DEFEATED";
  }

  return status;
}

async function getCurrentBlockNumber(): Promise<number> {
  try {
    const response = await fetch("https://ethereum-rpc.publicnode.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_blockNumber",
        params: [],
      }),
    });

    const data = await response.json();
    if (data.result) {
      return parseInt(data.result, 16);
    }
    return 0;
  } catch (error) {
    console.error("Failed to get current block number:", error);
    return 0;
  }
}

const PropoalItem: React.FC<IPropoalsProps> = (props) => {
  const { proposal, onItemClick } = props;
  const [currentBlockNumber, setCurrentBlockNumber] = useState<number>(0);
  const averageBlockTime = 12;

  // Get current block number
  useEffect(() => {
    const fetchBlockNumber = async () => {
      const blockNumber = await getCurrentBlockNumber();
      setCurrentBlockNumber(blockNumber);
    };

    fetchBlockNumber();

    // Refresh block number every minute
    const interval = setInterval(fetchBlockNumber, 600000);
    return () => clearInterval(interval);
  }, []);

  // Calculate time remaining in days or hours
  const getTimeRemaining = (blocks: number) => {
    if (blocks <= 0) return null;

    const secondsRemaining = blocks * averageBlockTime;

    const daysRemaining = Math.floor(secondsRemaining / (24 * 60 * 60));

    if (daysRemaining < 1) {
      const hoursRemaining = Math.ceil(secondsRemaining / (60 * 60));
      return `${hoursRemaining} hours`;
    }

    return `${daysRemaining} days`;
  };

  // Get proposal status display
  const getProposalStatusDisplay = (proposal: any) => {
    const actualStatus = getProposalActualStatus(
      proposal.status,
      proposal.endBlock,
      currentBlockNumber
    );

    if (actualStatus.toUpperCase() === "ACTIVE") {
      const blocksRemaining = parseInt(proposal.endBlock) - currentBlockNumber;
      if (blocksRemaining > 0) {
        const timeRemaining = getTimeRemaining(blocksRemaining);
        return {
          text: `Ends in ${timeRemaining}`,
          class: "status-active",
          icon: "⏱️",
        };
      }
    }

    if (actualStatus.toUpperCase() === "PENDING") {
      const blocksUntilStart =
        parseInt(proposal.startBlock) - currentBlockNumber;
      if (blocksUntilStart > 0) {
        const timeUntilStart = getTimeRemaining(blocksUntilStart);
        return {
          text: `Starts in ${timeUntilStart}`,
          class: "status-pending",
          icon: "🕒",
        };
      }
    }

    switch (actualStatus.toUpperCase()) {
      case "ACTIVE":
        return { text: "Active", class: "status-active", icon: "✅" };
      case "SUCCEEDED":
        return { text: "Succeeded", class: "status-succeeded", icon: "🎉" };
      case "EXECUTED":
        return { text: "Executed", class: "status-executed", icon: "✓" };
      case "DEFEATED":
        return { text: "Defeated", class: "status-defeated", icon: "❌" };
      case "PENDING":
        return { text: "Pending", class: "status-pending", icon: "⏳" };
      case "CANCELLED":
      case "CANCELED":
        return { text: "Cancelled", class: "status-cancelled", icon: "🚫" };
      case "VETOED":
        return { text: "Vetoed", class: "status-vetoed", icon: "🛑" };
      case "QUEUED":
        return { text: "Queued", class: "status-queued", icon: "⏱️" };
      default:
        return { text: proposal.status, class: "", icon: "❓" };
    }
  };

  const status = getProposalStatusDisplay(proposal);

  const isUpdatable = (proposal: any) => {
    const actualStatus = getProposalActualStatus(
      proposal.status,
      proposal.endBlock,
      currentBlockNumber
    );

    if (actualStatus.toUpperCase() === "DEFEATED") {
      return false;
    }

    const statusCheck =
      actualStatus.toUpperCase() === "ACTIVE" ||
      actualStatus.toUpperCase() === "PENDING";

    let timeCheck = true;
    if (proposal.createdTimestamp) {
      const createdTime = new Date(
        parseInt(proposal.createdTimestamp) * 1000
      ).getTime();
      const currentTime = new Date().getTime();
      const timeLimit = 72 * 60 * 60 * 1000;

      timeCheck = currentTime - createdTime <= timeLimit;
    }

    return statusCheck && timeCheck;
  };

  return (
    <div
      className="propoals-container"
      onClick={() => {
        if (onItemClick) {
          onItemClick();
        }
      }}
    >
      <div className="propoals-id">{proposal.id}</div>
      <div className="propoals-content">
        <div className="propoals-title">{proposal.title}</div>
      </div>
      <div className="proposal-status-wrapper">
        <div className="proposal-time">
          <span className="status-icon">{status.icon}</span>
          {status.text}
        </div>
        {isUpdatable(proposal) && (
          <div className="proposal-updatable">Updatable</div>
        )}
      </div>
    </div>
  );
};

export default PropoalItem;
