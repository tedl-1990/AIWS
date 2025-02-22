/**
 * AI Service Module
 */

// import { getChatCompletionsStream } from "./api";
import { getChatCompletionsStream, uploadMessage } from "./api";
import { createAvatarCid, createJsonFile } from "./upload";

/**
 * Declare global window.aiData type
 */
declare global {
  interface Window {
    aiData: {
      agentId: string; // AI ID
      name: string; // AI name
      functionDesc: string; // Function description
      behaviorDesc: string; // Behavior description
      model: string; // Model used
      did: string; // Device ID
      id: string; // AI ID
      avatar: string; // Avatar
      apiKey: string; // API key
      testKey: string; // Test key
    };
  }
}

/**
 * Remove quotes from start and end of text
 */
const removeQuotes = (text: string): string => {
  return text.replace(/^["'""]|["'""]$/g, "").trim();
};

interface ICalculateCidData {
  message: string;
  prev_message_cid: string;
  role: 0 | 1;
  agent_id: string;
  ens: string;
  session: string;
}

export const calculateCid = async (
  data: ICalculateCidData
): Promise<string> => {
  const json = {
    message: data.message,
    session: data.session,
    create_time: Date.now(),
    prev_message_cid: data.prev_message_cid,
    role: data.role,
    agent_id: data.agent_id,
    ens: data.ens,
  };
  const jsonFile = await createJsonFile(json);
  const ipfsHashCid = await createAvatarCid(jsonFile);
  return ipfsHashCid[0].cid;
};

/**
 * Send message to AI and get response
 * @param message User's message
 * @returns AI's response content
 */
export const sendMessage = async (
  message: string,
  sessionId: string,
  onSend?: (text: string, messageCid: string) => void,
  onProgress?: (text: string, messageCid: string) => void,
  onFinish?: (text: string, messageCid: string) => void
) => {
  try {
    if (message.length === 0) {
      return;
    }
    const agent_id = window.aiData?.agentId || window.aiData?.id || "l5_pEJ6aAydRl8c0KQsIH";
    const did = window.aiData?.did || "test.agent";

    // Get current conversation history
    const history = conversationHistories[currentConversationId] || [];

    const message_cid = await calculateCid({
      message: message,
      prev_message_cid: history[history.length - 1]?.messageCid || "",
      role: 0,
      agent_id: agent_id,
      ens: did,
      session: sessionId,
    });
    onSend?.(message, message_cid);

    uploadMessage({
      agent_id: String(agent_id),
      ens: did,
      message: message,
      message_cid: message_cid,
      prev_message_cid: history[history.length - 1]?.messageCid || "",
      role: 0,
      session: sessionId,
    });

    history.push({ role: "user", content: message, messageCid: message_cid });

    let fullResponse = '';
    const tempMessageCid = 'loading_message_cid'; // Temporary messageCid

    await getChatCompletionsStream(
      {
        input: {
          agent_id: String(agent_id),
          messages: [{ content: message || "" }],
          thread_id: sessionId,
        },
      },
      {
        onMessage: (content) => {
          fullResponse += content;
          const cleanResponse = removeQuotes(fullResponse);
          
          // Find if message already exists
          const existingMessageIndex = history.findIndex(msg => msg.messageCid === tempMessageCid);
          if (existingMessageIndex !== -1) {
            // Update existing message content
            history[existingMessageIndex].content = cleanResponse;
          } else {
            // Add new message
            history.push({
              role: "assistant",
              content: cleanResponse,
              messageCid: tempMessageCid,
            });
          }
          
          conversationHistories[currentConversationId] = history;
          onProgress?.(fullResponse, tempMessageCid);
        },
        onComplete: async () => {
          const cleanResponse = removeQuotes(fullResponse);
          
          // Calculate real messageCid
          const response_cid = await calculateCid({
            message: cleanResponse,
            prev_message_cid: message_cid,
            role: 1,
            agent_id: agent_id,
            ens: did,
            session: sessionId,
          });

          // Replace temporary messageCid
          const messageIndex = history.findIndex(msg => msg.messageCid === tempMessageCid);
          if (messageIndex !== -1) {
            history[messageIndex].messageCid = response_cid;
          }
          
          conversationHistories[currentConversationId] = history;
          onFinish?.(fullResponse, response_cid);

          uploadMessage({
            agent_id: String(agent_id),
            ens: did,
            message: cleanResponse,
            message_cid: response_cid,
            prev_message_cid: message_cid,
            role: 1,
            session: sessionId,
          });
        },
        onError: (error) => {
          throw error;
        },
        onTimeout: () => {
          throw new Error("Request timeout");
        }
      }
    );

    return fullResponse;
  } catch (error) {
    console.error("Error sending message:", error);
    const errorMessage = "Sorry, an error occurred. Please try again later.";
    const history = conversationHistories[currentConversationId] || [];
    const agent_id = window.aiData?.agentId || window.aiData?.id || "dgl6Ez4ZKOu5GczMN3veC";
    const did = window.aiData?.did || "test.agent";
    const error_cid = await calculateCid({
      message: errorMessage,
      prev_message_cid: history[history.length - 1]?.messageCid || "",
      role: 1,
      agent_id: agent_id,
      ens: did,
      session: sessionId,
    });
    uploadMessage({
      agent_id: String(agent_id),
      ens: did,
      message: errorMessage,
      message_cid: error_cid,
      prev_message_cid: history[history.length - 1]?.messageCid || "",
      role: 1,
      session: sessionId,
    });
    history.push({
      role: "assistant",
      content: errorMessage,
      messageCid: error_cid,
    });
    conversationHistories[currentConversationId] = history;
    throw error;
  }
};

/**
 * Store all conversation histories
 */
const conversationHistories: Record<
  string,
  Array<{
    role: "system" | "user" | "assistant";
    content: string;
    messageCid: string;
  }>
> = {};

/**
 * Current conversation ID
 */
let currentConversationId = "0";

/**
 * Set current active conversation
 * @param conversationId Conversation ID
 */
export const setCurrentConversation = (conversationId: string) => {
  currentConversationId = conversationId;
  // Initialize history if new conversation
  if (!conversationHistories[conversationId]) {
    conversationHistories[conversationId] = [];
    if (window.aiData?.behaviorDesc) {
      conversationHistories[conversationId].push({
        role: "system",
        content: window.aiData.behaviorDesc,
        messageCid: "",
      });
    }
  }
};

/**
 * Clear current conversation history
 */
export const clearHistory = () => {
  conversationHistories[currentConversationId] = [];
};

/**
 * Clear all conversation histories
 */
export const clearAllHistory = () => {
  Object.keys(conversationHistories).forEach((key) => {
    conversationHistories[key] = [];
  });
};

/**
 * Get current conversation history (excluding system messages)
 * @returns Current conversation history array
 */
export const getCurrentHistory = () => {
  const history = conversationHistories[currentConversationId] || [];
  return history.filter((msg) => msg.role !== "system");
};
