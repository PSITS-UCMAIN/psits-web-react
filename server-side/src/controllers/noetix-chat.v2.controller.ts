import { Request, Response } from "express";

import { catchAsync } from "../util/catch.async.util";
import { queryNoetixAiAgent } from "../services/noetix-chat.service";
import {
  isChatbotEnabled,
  isNoetixAdminDisabled,
  getNoetixDisabledTools,
  getNoetixMaxIterations,
} from "../services/devtools.service";
import { logService } from "../services/log.service";
import { logs_action } from "../enums/logs.enums";
import {
  findToolByName,
  ToolPermissionError,
  getToolRegistry,
  summarizeToolResult,
  type ChatTool,
} from "../types/chat-tool.types";
import { createNoetixUsageLog } from "../services/noetix-usage.service";

interface ChatRequestBody {
  message?: string;
  persona?: string;
  sessionId?: string;
  destroy?: boolean;
}

interface ToolCallEntry {
  tool: string;
  success: boolean;
  summary: string;
}

// Strips raw tool-call logs from Noetix history and builds a clean
// professional summary suitable for the UI.
const buildCleanToolHistory = (toolLog: ToolCallEntry[]): string => {
  if (!toolLog.length) return "";
  return toolLog
    .map((entry) =>
      entry.success
        ? `[${entry.tool}] completed.`
        : `[${entry.tool}] failed: ${entry.summary}`
    )
    .join(" ");
};

// Extracts tool arguments from the goal message based on args definitions.
// Noetix returns only the tool name — we parse the natural language goal to fill args.
function extractToolArgs(
  _toolName: string,
  goal: string,
  history: string,
  args?: Array<{ name: string; description: string; pattern?: string }>
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!args) return result;

  const source = goal + " " + history;

  for (const arg of args) {
    if (result[arg.name]) continue;
    const keyLower = arg.name.toLowerCase();

    // Check history first (Noetix may have echoed back args there).
    // Capture the rest of the line so multi-word values like
    // "name: John Smith" are not truncated to just "John".
    const historyMatch = source.match(
      new RegExp(`${keyLower}\\s*[:=]\\s*([^\\n]+)`, "i")
    );
    if (historyMatch) {
      const val = historyMatch[1].trim().replace(/[.,;]+$/, "");
      if (arg.pattern && !new RegExp(arg.pattern).test(val)) continue;
      result[arg.name] = val;
      continue;
    }

    // Try direct ID patterns in the goal
    if (
      keyLower.includes("id_number") ||
      keyLower.includes("student_id") ||
      keyLower.includes("id")
    ) {
      // Patterns: "ID 12345", "id number 12345", "ID number: 12345", "12345" (standalone alphanumeric)
      const patterns = [
        /(?:id\s*number?\s*[:\-]?\s*)(\w[\w\-]{5,})/i,
        /(\w[\w\-]{5,})\s*(?:is|for|of|with)/i,
      ];
      for (const pat of patterns) {
        const m = source.match(pat);
        if (m) {
          const val = m[1];
          if (arg.pattern && !new RegExp(arg.pattern).test(val)) continue;
          result[arg.name] = val;
          break;
        }
      }
    }

    // Try order_id pattern (matches "order id", "order_id", "order:123...")
    if (keyLower.includes("order_id") && !result[arg.name]) {
      const m = source.match(/(?:order[_\s]*id\s*[:=]?\s*)([a-f0-9]{24})/i);
      if (m) result[arg.name] = m[1];
    }

    // Try event_id pattern (matches "event id", "event_id", "eventId")
    if (keyLower.includes("event_id") && !result[arg.name]) {
      const m = source.match(
        /(?:event[_\s]*id|eventId)\s*[:=]?\s*([a-f0-9]{24})/i
      );
      if (m) result[arg.name] = m[1];
    }

    // Generic fallback: look for values mentioned near the arg name
    if (!result[arg.name]) {
      const m = source.match(
        new RegExp(`${keyLower}\\s*[:=]\\s*([^\\n]+)`, "i")
      );
      if (m) {
        const val = m[1].trim().replace(/[.,;]+$/, "");
        if (arg.pattern && !new RegExp(arg.pattern).test(val)) continue;
        result[arg.name] = val;
      }
    }

    // Prose extraction for free-text args (no pattern): quoted values or
    // "called/named/titled X" phrases in the goal. Goal only — history may
    // contain quoted JSON from prior tool results.
    if (!result[arg.name] && !arg.pattern) {
      const quoted = goal.match(/"([^"]{2,120})"|'([^']{2,120})'/);
      const quotedVal = quoted?.[1] ?? quoted?.[2];
      if (quotedVal) {
        result[arg.name] = quotedVal.trim();
        continue;
      }
      const phrase = goal.match(
        /\b(?:called|named|titled)\s+(?:the\s+|this\s+|an?\s+)?([A-Za-z0-9][^,.!?;]{1,118})/i
      );
      if (phrase) {
        result[arg.name] = phrase[1].trim();
      }
    }
  }

  return result;
}

export const destroySessionController = catchAsync(
  async (req: Request, res: Response) => {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    const result = await queryNoetixAiAgent(
      "DATA_ANALYST",
      "",
      [],
      sessionId,
      undefined,
      true
    );

    return res.status(200).json({
      success: true,
      data: { sessionId: result.data.sessionId, destroyed: true },
    });
  }
);

export const aiAgentController = catchAsync(
  async (req: Request<{}, {}, ChatRequestBody>, res: Response) => {
    if (!(await isChatbotEnabled())) {
      return res.status(403).json({
        error: "CHATBOT_DISABLED",
        message: "The chatbot has been disabled by an administrator",
      });
    }

    const isAdminDisabled = await isNoetixAdminDisabled(
      req.admin._id.toString()
    );
    if (isAdminDisabled) {
      return res.status(403).json({
        error: "NOETIX_ADMIN_DISABLED",
        message:
          "You have been disabled from using Noetix AI. Contact an administrator.",
      });
    }

    const { message, persona = "DATA_ANALYST", sessionId, destroy } = req.body;
    const resolvedUserAccess = req.userV2.access!;
    const userName = req.admin.name;
    
    if (destroy) {
      const result = await queryNoetixAiAgent(
        persona,
        message || "",
        [],
        sessionId,
        undefined,
        true
      );
      return res.status(200).json({
        success: true,
        data: { sessionId: result.data.sessionId, destroyed: true },
      });
    }

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const newSessionId = crypto.randomUUID();
    let effectiveSessionId = sessionId || newSessionId;
    let history = "";
    let iteration = 0;
    let sessionSuccess = false;
    let finalToolName: string | undefined;
    const allToolNames: string[] = [];

    const logUsage = async () => {
      try {
        await createNoetixUsageLog({
          session_id: effectiveSessionId,
          admin: req.admin.name,
          admin_id: req.admin._id.toString(),
          goal: message,
          tool_names: allToolNames,
          success: sessionSuccess,
          error: history.includes("error:") ? history.slice(-500) : undefined,
          iterations: iteration,
          mode: "agent",
        });
      } catch (err) {
        console.error("[NoetixUsageLog] Failed to create usage log:", err);
      }
    };

    const maxIterations = await getNoetixMaxIterations();
    const disabledToolNames = new Set(await getNoetixDisabledTools());
    const tools = getToolRegistry()
      .filter((t) => !disabledToolNames.has(t.name))
      .map((t) => ({
        name: t.name,
        description: t.description,
        ...(t.args ? { args: t.args } : {}),
      }));

    const toolLog: ToolCallEntry[] = [];

    while (iteration < maxIterations) {
      iteration++;

      let agentResult;
      try {
        agentResult = await queryNoetixAiAgent(
          persona,
          message,
          tools,
          effectiveSessionId,
          history || undefined,
          false
        );
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message === "SESSION_NOT_FOUND" ||
            err.message === "SESSION_EXPIRED")
        ) {
          agentResult = await queryNoetixAiAgent(
            persona,
            message,
            tools,
            undefined,
            history || undefined,
            false
          );
        } else {
          throw err;
        }
      }

      effectiveSessionId = agentResult.data.sessionId;
      finalToolName = agentResult.data.tools_used;
      if (finalToolName) allToolNames.push(finalToolName);

      if (agentResult.data.isFinished) {
        sessionSuccess = true;
        await logUsage();
        const cleanHistory = buildCleanToolHistory(toolLog);
        return res.status(200).json({
          success: true,
          data: {
            sessionId: agentResult.data.sessionId,
            persona: agentResult.data.persona,
            result: agentResult.data.final_result,
            history: cleanHistory,
            iterations: iteration,
          },
        });
      }

      if (!finalToolName) {
        sessionSuccess = true;
        await logUsage();
        const cleanHistory = buildCleanToolHistory(toolLog);
        return res.status(200).json({
          success: true,
          data: {
            sessionId: agentResult.data.sessionId,
            persona: agentResult.data.persona,
            result: agentResult.data.final_result || "No tool selected.",
            history: cleanHistory,
            iterations: iteration,
          },
        });
      }

      const tool = findToolByName(finalToolName);
      if (!tool) {
        history = `${history} Called ${finalToolName} — error: tool not found.\n`;
        continue;
      }

      let toolResult: unknown;
      let resolvedArgs: Record<string, string> | undefined;
      try {
        const noetixArgs = agentResult.data.tool_args;
        resolvedArgs =
          noetixArgs && Object.keys(noetixArgs).length > 0
            ? (noetixArgs as Record<string, string>)
            : extractToolArgs(finalToolName, message, history, tool.args);

        toolResult = await tool.execute(resolvedArgs, resolvedUserAccess, userName);
        const resultSummary = summarizeToolResult(toolResult) || "null";
        toolLog.push({ tool: finalToolName, success: true, summary: resultSummary });
        history = `${history} Called ${finalToolName}, result: ${
          resultSummary.length > 6000
            ? `${resultSummary.slice(0, 6000)}... (truncated)`
            : resultSummary
        }.\n`;
      } catch (err) {
        const errorMsg =
          err instanceof ToolPermissionError
            ? err.message
            : err instanceof Error
              ? err.message
              : "unknown error";
        toolLog.push({ tool: finalToolName, success: false, summary: errorMsg });
        history = `${history} Called ${finalToolName}, error: ${errorMsg}.\n`;

        if (tool.permission !== "read") {
          await logService.create({
            admin: req.admin.name,
            admin_id: req.admin._id,
            action: `${logs_action.NOETIX_AI_ACTION}: ${tool.name} (failed)`,
            target: `Error: ${errorMsg}`,
          });
        }
      }

      // Audit trail for successful privileged (non-read) actions.
      // Placed outside the try-catch so audit failures never reclassify
      // committed mutations as tool errors (which would trigger Noetix retries).
      if (tool.permission !== "read" && toolResult !== undefined) {
        const resultSummary = summarizeToolResult(toolResult) || "null";
        await logService.create({
          admin: req.admin.name,
          admin_id: req.admin._id,
          action: `${logs_action.NOETIX_AI_ACTION}: ${tool.name}`,
          target: `Args: ${JSON.stringify(resolvedArgs)} — Result: ${resultSummary.slice(0, 300)}`,
        });
      }
    }

    await logUsage();

    // Build a clean, professional summary from tool calls for the max-iterations case.
    const toolSummaries = toolLog
      .map((entry) =>
        entry.success
          ? `Executed ${entry.tool}.`
          : `Action '${entry.tool}' could not be completed: ${entry.summary}.`
      )
      .join(" ");

    return res.status(200).json({
      success: true,
      data: {
        sessionId: effectiveSessionId,
        persona,
        result:
          "The AI agent reached the maximum iteration limit. The goal may need simplification. " +
          toolSummaries,
        history: buildCleanToolHistory(toolLog),
        iterations: iteration,
      },
    });
  }
);
