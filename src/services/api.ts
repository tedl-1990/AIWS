import axios from "axios";

interface IMessageProps {
  agent_id: string;
  messages: {
    content: string;
  }[];
  thread_id: string;
}

const API_HOST = import.meta.env.VITE_APP_APIHOST;

export const getChatCompletions = async (data: { input: IMessageProps }) => {
  try {
    const response = await axios.post(
      `${API_HOST}/chat/completions/wait`,
      data,
      {
        timeout: 90000, // 90 seconds timeout
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 500) {
        throw new Error("Server error. Please try again later.");
      }
      throw new Error("Failed to get chat completions");
    }
    throw error;
  }
};

export const uploadMessage = async (data: {
  agent_id: string;
  ens: string;
  message: string;
  message_cid: string;
  prev_message_cid: string;
  role: 0 | 1;
  session: string;
}) => {
  const response = await axios.post(`${API_HOST}/chat/upload`, data);
  return response.data;
};

export const getMessageList = async (data: { page: number; limit: number }) => {
  const response = await axios.post(`${API_HOST}/chat/list`, data);
  return response.data;
};

export const getChat = async (data: { message_cid: string }) => {
  const response = await axios.post(`${API_HOST}/chat/get`, data);
  return response.data;
};

interface StreamHandler {
  onMessage: (message: string) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  onTimeout?: () => void;
}

export const getChatCompletionsStream = async (
  data: { input: IMessageProps },
  handler: StreamHandler
) => {
  const timeoutController = new AbortController();
  const controller = new AbortController();
  let hasError = false;
  let isCompleted = false;

  const timeoutId = setTimeout(() => {
    if (!hasError) {
      hasError = true;
      timeoutController.abort();
      handler.onTimeout?.();
    }
  }, 30000);

  timeoutController.signal.addEventListener("abort", () => {
    controller.abort("timeout");
  });

  try {
    const response = await fetch(`${API_HOST}/chat/completions/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is null");
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        try {
          const { value, done } = await reader.read();
          if (done) {
            // Normal completion, not an error
            if (!isCompleted) {
              handler.onComplete?.();
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line);
                if (data?.messages?.[0]) {
                  const message = data.messages[0];
                  if (message.content) {
                    handler.onMessage(message.content);
                  }
                  if (message?.response_metadata?.finish_reason === "stop") {
                    isCompleted = true;
                    handler.onComplete?.();
                  }
                }
              } catch {
                // Ignore parsing errors
              }
            }
          }
        } catch (readError) {
          // Only throw if not completed
          if (!isCompleted) {
            throw readError;
          }
          break;
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data?.messages?.[0]) {
            const message = data.messages[0];
            if (message.content) {
              handler.onMessage(message.content);
            }
            if (message?.response_metadata?.finish_reason === "stop") {
              isCompleted = true;
              handler.onComplete?.();
            }
          }
        } catch {
          // Ignore parsing errors
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    clearTimeout(timeoutId);
    // Only trigger error if not completed
    if (!isCompleted) {
      if (error instanceof Error) {
        handler.onError?.(error);
      } else {
        handler.onError?.(new Error('Unknown error occurred'));
      }
    }
  }
};
