export const PERSONA_DATA_ANALYST = "DATA_ANALYST";

export type ChatMessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: Date;
  /** Noetix v3.1 grounded-final confidence. */
  confidence?: "high" | "medium" | "low";
  /** Noetix v3.1: tools whose results back this answer. */
  sources?: string[];
  /** Renders the system pill as an amber warning instead of neutral. */
  variant?: "default" | "warning";
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
    /** Noetix v3.1 loop guard fired; result is a clarification, not a full answer. */
    stuck?: boolean;
    stuckReason?: string;
    confidence?: "high" | "medium" | "low";
    sources?: string[];
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
