/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { Button, Dropdown, message, Space, Select } from "antd";
import {
  WalletOutlined,
  DisconnectOutlined,
  SwapOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import "./index.less";
import { WalletService } from "@/services/wallet";
import { ENetwork, networks } from "@/services/network";
import { useRecoilState } from "recoil";
import { isWalletConnectedState, networkState } from "@/store/network";
import { NETWORK_TYPE } from "@/utils/constants";
import { Name } from "@paperclip-labs/whisk-sdk/identity";

interface WalletConnectProps {
  onDisconnect: () => void;
  onConnect?: (type: ENetwork) => void;
  showPublishDrawer: () => void;
  loading: boolean;
  showPublish?: boolean;
}

const WalletConnect: React.FC<WalletConnectProps> = ({
  onDisconnect,
  onConnect,
  showPublishDrawer,
  showPublish = true,
  loading,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [network, setNetwork] = useRecoilState(networkState);
  const [connecting, setConnecting] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useRecoilState(
    isWalletConnectedState
  );

  const walletService = WalletService.getInstance();
  const currentInfo = walletService.getWalletInfo();

  useEffect(() => {
    setIsWalletConnected(walletService.isConnected());
    const unsubscribe = walletService.subscribe(() => {
      setIsWalletConnected(walletService.isConnected());
    });
    return unsubscribe;
  }, [walletService, setIsWalletConnected]);

  // Connect wallet
  const handleConnectWallet = async (network: ENetwork) => {
    try {
      setConnecting(true);
      await walletService.connectWallet(network);
      localStorage.setItem(NETWORK_TYPE, network.toString());
      setNetwork(network);
      onConnect?.(network);
    } catch (err) {
      messageApi.error(
        err instanceof Error ? err.message : "Connect wallet failed"
      );
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect wallet
  const handleDisconnect = async () => {
    try {
      await walletService.disconnectWallet();
      onDisconnect();
    } catch (err) {
      console.log(err);
      localStorage.removeItem("Authentication-Tokens");
      localStorage.removeItem("Token_address");
      window.location.reload();
    }
  };

  // Switch account
  const handleSwitchAccount = async () => {
    try {
      if (network === ENetwork.Ethereum) {
        if (!window.ethereum) {
          throw new Error("Please install MetaMask");
        }

        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });

        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (!accounts || accounts.length === 0) {
          throw new Error("No account selected");
        }

        const currentInfo = walletService.getWalletInfo();
        if (currentInfo?.address.toLowerCase() === accounts[0].toLowerCase()) {
          throw new Error("Same account selected");
        }

        await walletService.disconnectWallet();
        await walletService.connectWallet(ENetwork.Ethereum);

        messageApi.success("Switch account successfully");
      } else {
        if (!window.solana) {
          throw new Error("Please install Phantom");
        }
        await walletService.disconnectWallet();
        await walletService.connectWallet(ENetwork.Solana);
        messageApi.success("Switch account successfully");
      }
    } catch (err) {
      console.error("Switch account failed:", err);
      messageApi.error(
        err instanceof Error ? err.message : "Switch account failed"
      );
    }
  };

  // Account dropdown items
  const accountItems: MenuProps["items"] = [
    ...(network === ENetwork.Ethereum
      ? [
          {
            key: "switch",
            label: "Switch Account",
            icon: <SwapOutlined />,
            onClick: handleSwitchAccount,
          },
        ]
      : []),
    {
      type: "divider",
    },
    {
      key: "disconnect",
      label: "Disconnect",
      icon: <DisconnectOutlined />,
      onClick: handleDisconnect,
    },
  ];

  // Handle network change
  const handleNetworkChange = async (newNetwork: ENetwork) => {
    try {
      setNetwork(newNetwork);
      localStorage.setItem(NETWORK_TYPE, newNetwork.toString());
      if (isWalletConnected) {
        await handleDisconnect();
        await handleConnectWallet(newNetwork);
      }
    } catch (error) {
      console.log(error);
      messageApi.error("Switch network failed");
    }
  };

  const isLoading = loading || connecting;

  return (
    <>
      {contextHolder}
      <Space className="container">
        {showPublish && (
          <Select
            className="select"
            value={network}
            onChange={handleNetworkChange}
            options={networks}
          />
        )}

        {isWalletConnected && showPublish && (
          <Button
            style={{ color: "#000" }}
            type="primary"
            icon={<PlusOutlined />}
            onClick={showPublishDrawer}
          >
            Create Agent
          </Button>
        )}

        {!isWalletConnected || isLoading ? (
          <Button
            className="connect-button"
            icon={<WalletOutlined />}
            onClick={() => handleConnectWallet(network)}
            loading={isLoading}
          >
            {isLoading ? "Connecting..." : "Connect Wallet"}
          </Button>
        ) : (
          <Dropdown menu={{ items: accountItems }} trigger={["click"]}>
            <Button className="connect-button" icon={<WalletOutlined />}>
              <Name address={(currentInfo?.address as any) || ""}></Name>
            </Button>
          </Dropdown>
        )}
      </Space>
    </>
  );
};
export default WalletConnect;
