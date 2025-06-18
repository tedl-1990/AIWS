/**
 * Entry point for AI Agent application
 */

import React from "react";
import { ConfigProvider } from "antd";
import ReactDOM from "react-dom/client";
import NounsAgent from "../pages/NounsAgent";
import { RecoilRoot } from "recoil";
import { WhiskSdkProvider } from "@paperclip-labs/whisk-sdk";
import { IdentityResolver } from "@paperclip-labs/whisk-sdk/identity";

// import "antd/dist/reset.css";
import "../index.less";

/**
 * Extend Window interface to include aiData property
 */
declare global {
  interface Window {
    aiData: {
      agentId: string; // Agent ID
      name: string; // AI agent name
      functionDesc: string; // Function description
      behaviorDesc: string; // Behavior description
      apiKey: string; // API key
      model: string; // Model name
      did: string; // Device ID
      id: string; // Agent ID
      avatar: string; // Avatar URL
      testKey: string; // Test API key
    };
  }
}

/**
 * Get API key from URL query parameters
 * @returns API key from URL or null if not present
 */
const getApiKeyFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("apiKey");
};

/**
 * Update window.aiData with API key from URL if present
 */
const updateAiData = () => {
  const apiKey = getApiKeyFromUrl();
  if (apiKey) {
    window.aiData = {
      ...window.aiData,
      testKey: apiKey,
    };
  }
};

// Initialize aiData with URL parameters if available
if (window.aiData) {
  updateAiData();
} else {
  console.error("window.aiData not initialized");
}

// Get root element and render React application
const root = document.getElementById("root-ai-agent");
if (root) {
  ReactDOM.createRoot(root).render(
    <WhiskSdkProvider
      apiKey={"d327a2a1-6b0b-4708-aeec-d9d220a91ef7"}
      config={{
        identity: {
          // Specify the resolver order for sequential resolution.
          // This will be used as defaults if no resolvers are provided in the component or hook.
          resolverOrder: [
            IdentityResolver.Ens,
            IdentityResolver.Farcaster,
            IdentityResolver.Base,
            IdentityResolver.Nns,
            IdentityResolver.Uni,
            IdentityResolver.Lens,
            IdentityResolver.World,
          ],

          // Optional: Override specific addresses with custom names or avatars.
          overrides: {},
        },
      }}
    >
      <RecoilRoot>
        <ConfigProvider>
          <React.StrictMode>
            <NounsAgent />
          </React.StrictMode>
        </ConfigProvider>
      </RecoilRoot>
    </WhiskSdkProvider>
  );
} else {
  console.error("Root element not found");
}
