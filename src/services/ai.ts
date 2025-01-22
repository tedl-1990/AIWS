/**
 * AI Service Module
 */

// import { getChatCompletionsStream } from "./api";
import { getChatCompletions } from "./api";

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

/**
 * Send message to AI and get response
 * @param message User's message
 * @returns AI's response content
 */
export const sendMessage = async (
  message: string,
  sessionId: string,
  onProgress?: (text: string) => void,
  onFinish?: (text: string) => void
) => {
  try {
    if (message.length === 0) {
      return;
    }
    const agent_id =
      window.aiData?.agentId || window.aiData?.id || "Vi2L02VaH8HZG5MmaUH9B";
    // Get current conversation history
    const history = conversationHistories[currentConversationId] || [];
    // Initialize new conversation
    if (history.length === 0 && window.aiData?.behaviorDesc) {
      history.push({
        role: "system",
        content: window.aiData.behaviorDesc,
      });
    }

    history.push({ role: "user", content: message });

    // Call API with stream option
    const { messages } = await getChatCompletions({
      input: {
        agent_id: String(agent_id),
        messages: [
          {
            content: message || "",
          },
        ],
        thread_id: sessionId,
      },
    });
    const fullResponse = messages[0].content;
    onProgress?.(fullResponse);
    console.log(fullResponse, "fullResponse");
    onFinish?.(fullResponse);

    // Remove quotes from response
    const cleanResponse = removeQuotes(fullResponse);

    // Update conversation history
    history.push({ role: "assistant", content: cleanResponse });
    conversationHistories[currentConversationId] = history;

    return cleanResponse;
  } catch (error) {
    console.error("Error sending message:", error);
    const errorMessage = "Sorry, an error occurred. Please try again later.";
    const history = conversationHistories[currentConversationId] || [];
    history.push({ role: "assistant", content: errorMessage });
    conversationHistories[currentConversationId] = history;
    throw error;
  }
};

/**
 * Store all conversation histories
 */
const conversationHistories: Record<
  string,
  Array<{ role: "system" | "user" | "assistant"; content: string }>
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
