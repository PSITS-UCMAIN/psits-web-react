export const PERSONA_DATA_ANALYST = "DATA_ANALYST";

export type ChatMessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
}

export interface ToolCallEntry {
  tool: string;
  success: boolean;
  summary: string;
}

export interface AiAgentResponse {
  success: boolean;
  data: {
    sessionId: string;
    persona: string;
    result: string;
    history: ToolCallEntry[] | string;
    iterations: number;
  };
}

export interface DestroySessionResponse {
  success: boolean;
  data: {
    sessionId: string;
    destroyed: boolean;
  };
}

export interface ChatRequestBody {
  message?: string;
  persona?: string;
  sessionId?: string;
  destroy?: boolean;
}
