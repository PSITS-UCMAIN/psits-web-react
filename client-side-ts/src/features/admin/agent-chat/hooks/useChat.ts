import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";
import {
  sendAiAgentMessage,
  destroyChatSession,
} from "../api/chat.api";
import type { ChatMessage } from "../types/chat.types";
import { PERSONA_DATA_ANALYST } from "../types/chat.types";

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendAiAgentMessage({
        message: text.trim(),
        persona: PERSONA_DATA_ANALYST,
        sessionId: sessionId || undefined,
      });

      if (!response.success) {
        throw new Error("Invalid response from AI service");
      }

      const {
        data: { result, sessionId: newSessionId, history },
      } = response;

      setSessionId(newSessionId);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result || "Response received.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Display tool call summary as a system message if present.
      if (history?.trim()) {
        const systemMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "system",
          content: history.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMsg]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An error occurred";

      if (
        message.includes("SESSION_EXPIRED") ||
        message.includes("SESSION_NOT_FOUND")
      ) {
        if (sessionId) {
          await destroyChatSession(sessionId).catch(() => {});
        }
        setSessionId(null);
        const systemMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "system",
          content: "Session reset — fresh data loaded",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, systemMsg]);
        toast.info("Session reset — fresh data loaded.");
        await sendMessage(text);
        return;
      }

      if (message.includes("Permission")) {
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Access denied: ${message}. Please contact an administrator.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        toast.warning("Permission denied for this action.");
        setIsLoading(false);
        return;
      }

      toast.error(
        message.includes("NOETIX_API_KEY")
          ? "AI service unavailable. Contact administrator."
          : message
      );

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I'm sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, [isLoading, sessionId, user, scrollToBottom]);

  const handleRefresh = useCallback(async () => {
    if (sessionId) {
      try {
        await destroyChatSession(sessionId);
      } catch {
        // ignore destroy errors
      }
    }
    setSessionId(null);
    setMessages([]);
    toast.info("Data refreshed. Start a new conversation.");
  }, [sessionId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  return {
    messages,
    input,
    isLoading,
    sessionId,
    setInput,
    sendMessage,
    handleRefresh,
    handleKeyDown,
    messagesEndRef,
    scrollToBottom,
  };
};
