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
        timeout: 30000, // 30 seconds timeout
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

export const getChatCompletionsStream = async (data: {
  input: IMessageProps;
}) => {
  try {
    const response = await axios.post(
      `${API_HOST}/chat/completions/stream`,
      data,
      {
        timeout: 30000,
      }
    );
    return response;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 500) {
        throw new Error("Server error. Please try again later.");
      }
      throw new Error("Failed to get chat completions stream");
    }
    throw error;
  }
};
