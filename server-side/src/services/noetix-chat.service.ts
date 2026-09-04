interface NoetixAiAgentResponse {
  success: boolean;
  data: {
    sessionId: string;
    persona: string;
    isFinished: boolean;
    final_result: string;
    tools_used: string;
    history: string;
    sessionTTL: number;
    tool_args?: Record<string, unknown>;
  };
}

export const queryNoetixAiAgent = async (
  persona: string,
  goal: string,
  tools: Array<{ name: string; description: string }>,
  sessionId?: string,
  history?: string,
  destroy?: boolean
): Promise<NoetixAiAgentResponse> => {
  const noetixUrl = process.env.NOETIX_URL || "http://localhost:3000";
  const apiKey = process.env.NOETIX_API_KEY;

  if (!apiKey) {
    throw new Error("NOETIX_API_KEY is not configured");
  }

  // context.tools and goal are required on EVERY call (Noetix rejects
  // requests missing them with INVALID_REQUEST); history carries prior results.
  const body: Record<string, unknown> = {
    persona,
    goal,
    context: { tools },
  };

  if (sessionId) body.sessionId = sessionId;
  if (history) body.history = history;
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
