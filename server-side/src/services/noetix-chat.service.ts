import type { NoetixTool } from "../types/chat-tool.types";

// Result of the tool the caller just executed (Noetix v3.1 structured
// ledger handoff, preferred over legacy free-text `history`).
export interface NoetixLastTool {
  tool: string;
  args: Record<string, unknown>;
  status: "ok" | "error" | "empty";
  result: string;
}

export interface NoetixAiAgentData {
  sessionId: string;
  persona: string;
  isFinished: boolean;
  final_result: string;
  tools_used: string;
  history: string;
  sessionTTL: number;
  tool_args?: Record<string, unknown>;
  // ── v3.1 additions (all optional; older Noetix instances omit them) ──
  plan?: Array<Record<string, unknown>>;
  plan_revision?: Record<string, unknown>;
  turns_used?: number;
  tool_args_valid?: boolean;
  validation?: string[];
  sources?: string[];
  confidence?: "high" | "medium" | "low";
  stuckReason?: string;
  tools_changed?: boolean;
}

export interface NoetixAiAgentResponse {
  success: boolean;
  data: NoetixAiAgentData;
}

export const queryNoetixAiAgent = async (
  persona: string,
  goal: string,
  tools: NoetixTool[],
  sessionId?: string,
  history?: string,
  destroy?: boolean,
  lastTool?: NoetixLastTool,
  adminAccess?: string
): Promise<NoetixAiAgentResponse> => {
  const noetixUrl = process.env.NOETIX_URL || "http://localhost:3000";
  const apiKey = process.env.NOETIX_API_KEY;

  if (!apiKey) {
    throw new Error("NOETIX_API_KEY is not configured");
  }

  // context.tools and goal are required on every call (Noetix rejects
  // requests missing them with INVALID_REQUEST). `lastTool` carries the
  // structured result of the previous tool execution (Noetix v3.1);
  // `history` is the legacy free-text form, still normalized by Noetix.
  const body: Record<string, unknown> = {
    persona,
    goal,
    context: {
      tools,
      ...(adminAccess ? { adminAccess } : {}),
    },
  };

  if (sessionId) body.sessionId = sessionId;
  if (history) body.history = history;
  if (lastTool) body.lastTool = lastTool;
  if (destroy) body.destroy = true;

  const response = await fetch(`${noetixUrl}/api/ai-agent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const code = errorBody?.error?.code;
    if (code) {
      const err = new Error(code) as Error & { status: number };
      err.status = response.status;
      throw err;
    }
    throw new Error(`Noetix AI Agent API error: ${response.status}`);
  }

  const json = (await response.json()) as NoetixAiAgentResponse;

  return json;
};
