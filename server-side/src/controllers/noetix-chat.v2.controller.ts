import { Request, Response } from "express";

import { catchAsync } from "../util/catch.async.util";
import {
  queryNoetixAiAgent,
  type NoetixLastTool,
} from "../services/noetix-chat.service";
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
  summarizeToolResult,
  buildNoetixTools,
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

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const trimmedMessage = message.trim();
    const newSessionId = crypto.randomUUID();
    let effectiveSessionId = sessionId || newSessionId;
    let lastTool: NoetixLastTool | undefined;
    let iteration = 0;
    let sessionSuccess = false;
    let sessionError: string | undefined;
    let finalToolName: string | undefined;
    const allToolNames: string[] = [];

    const logUsage = async () => {
      try {
        await createNoetixUsageLog({
          session_id: effectiveSessionId,
          admin: req.admin.name,
          admin_id: req.admin._id.toString(),
          goal: trimmedMessage,
          tool_names: allToolNames,
          success: sessionSuccess,
          error: sessionError,
          iterations: iteration,
          mode: "agent",
        });
      } catch (err) {
        console.error("[NoetixUsageLog] Failed to create usage log:", err);
      }
    };

    const maxIterations = await getNoetixMaxIterations();
    const disabledToolNames = new Set(await getNoetixDisabledTools());
    // Tools are filtered by the admin's role: read-only roles (STANDARD /
    // NO_ACCESS) get read-permission tools only; others get the tools their
    // access level satisfies. Disabled tools are excluded.
    const tools = buildNoetixTools(disabledToolNames, resolvedUserAccess);

    if (tools.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          sessionId: effectiveSessionId,
          persona,
          result:
            "No tools are available for your access level. Contact an administrator to enable tools.",
          history: "",
          iterations: 0,
        },
      });
    }

    const toolLog: ToolCallEntry[] = [];

    const finish = (result: string) => {
      const cleanHistory = buildCleanToolHistory(toolLog);
      return res.status(200).json({
        success: true,
        data: {
          sessionId: effectiveSessionId,
          persona,
          result,
          history: cleanHistory,
          iterations: iteration,
        },
      });
    };

    while (iteration < maxIterations) {
      iteration++;

      let agentResult;
      try {
        agentResult = await queryNoetixAiAgent(
          persona,
          trimmedMessage,
          tools,
          effectiveSessionId,
          undefined,
          false,
          lastTool,
          resolvedUserAccess
        );
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message === "SESSION_NOT_FOUND" ||
            err.message === "SESSION_EXPIRED")
        ) {
          agentResult = await queryNoetixAiAgent(
            persona,
            trimmedMessage,
            tools,
            undefined,
            undefined,
            false,
            lastTool,
            resolvedUserAccess
          );
        } else {
          throw err;
        }
      }

      effectiveSessionId = agentResult.data.sessionId;
      finalToolName = agentResult.data.tools_used;
      if (finalToolName) allToolNames.push(finalToolName);

      // Noetix v3.1 loop guard: a stuck loop is returned as 200 with a
      // stuckReason — surface it as a failed session, not a success.
      const stuckReason = agentResult.data.stuckReason;

      if (agentResult.data.isFinished || stuckReason) {
        const cleanHistory = buildCleanToolHistory(toolLog);
        if (stuckReason) {
          sessionSuccess = false;
          sessionError = `stuck: ${stuckReason}`;
        } else {
          sessionSuccess = true;
        }
        await logUsage();
        const result =
          agentResult.data.final_result ||
          (stuckReason
            ? "I could not complete this request — I hit a repeat in my tool loop. Please rephrase with more specific details."
            : "No tool selected.");
        return res.status(200).json({
          success: true,
          data: {
            sessionId: agentResult.data.sessionId,
            persona: agentResult.data.persona,
            result,
            stuck: Boolean(stuckReason),
            stuckReason: stuckReason,
            confidence: agentResult.data.confidence,
            sources: agentResult.data.sources,
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
            confidence: agentResult.data.confidence,
            sources: agentResult.data.sources,
            history: cleanHistory,
            iterations: iteration,
          },
        });
      }

      const tool = findToolByName(finalToolName);
      if (!tool) {
        lastTool = {
          tool: finalToolName,
          args: agentResult.data.tool_args ?? {},
          status: "error",
          result: "Tool not found in the registry.",
        };
        continue;
      }

      // Disabled tools are never executed (defense in depth — Noetix does
      // not receive them, but stale session state may still select one).
      if (disabledToolNames.has(tool.name)) {
        toolLog.push({
          tool: finalToolName,
          success: false,
          summary: "tool is disabled by an administrator",
        });
        await logService.create({
          admin: req.admin.name,
          admin_id: req.admin._id,
          action: `${logs_action.NOETIX_AI_ACTION}: ${tool.name} (blocked — disabled)`,
          target: "Tool is disabled by an administrator; execution blocked.",
        });
        lastTool = {
          tool: finalToolName,
          args: agentResult.data.tool_args ?? {},
          status: "error",
          result:
            "This tool is disabled by an administrator and cannot be executed. Pick a different tool or state the request cannot be fulfilled.",
        };
        continue;
      }

      // Noetix v3.1 B1: tool_args are validated server-side. If Noetix
      // reports invalid args after its self-repair retry, feed the details
      // back so it can fix them on the next turn instead of guessing.
      const noetixArgs = agentResult.data.tool_args ?? {};
      if (agentResult.data.tool_args_valid === false) {
        const details =
          (agentResult.data.validation ?? []).join("; ") ||
          "arguments failed validation";
        toolLog.push({
          tool: finalToolName,
          success: false,
          summary: `args validation failed: ${details}`,
        });
        sessionError = `${finalToolName} args validation failed: ${details}`;
        lastTool = {
          tool: finalToolName,
          args: noetixArgs,
          status: "error",
          result: `Invalid arguments: ${details}. Correct the arguments and retry.`,
        };
        continue;
      }

      // Noetix returned no args for a tool that requires them — ask it to
      // populate them on the next turn.
      const missingArgs = tool.args?.filter((a) => a.required !== false);
      if (
        Object.keys(noetixArgs).length === 0 &&
        missingArgs &&
        missingArgs.length > 0
      ) {
        const missing = missingArgs.map((a) => a.name).join(", ");
        lastTool = {
          tool: finalToolName,
          args: noetixArgs,
          status: "error",
          result: `Missing required argument(s): ${missing}. Provide them and retry.`,
        };
        continue;
      }

      let toolResult: unknown;
      try {
        toolResult = await tool.execute(
          noetixArgs,
          resolvedUserAccess,
          userName
        );
        const resultSummary = summarizeToolResult(toolResult) || "null";
        toolLog.push({
          tool: finalToolName,
          success: true,
          summary: resultSummary,
        });
        lastTool = {
          tool: finalToolName,
          args: noetixArgs,
          status: resultSummary === "null" ? "empty" : "ok",
          result: resultSummary,
        };
      } catch (err) {
        const errorMsg =
          err instanceof ToolPermissionError
            ? err.message
            : err instanceof Error
              ? err.message
              : "unknown error";
        toolLog.push({
          tool: finalToolName,
          success: false,
          summary: errorMsg,
        });
        sessionError = `${finalToolName} failed: ${errorMsg}`;
        lastTool = {
          tool: finalToolName,
          args: noetixArgs,
          status: "error",
          result: errorMsg,
        };

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
          target: `Args: ${JSON.stringify(noetixArgs)} — Result: ${resultSummary.slice(0, 300)}`,
        });
      }
    }

    sessionSuccess = false;
    sessionError = sessionError ?? "reached max iterations";
    await logUsage();

    return finish(
      "I was unable to complete this request within the available steps. Please try rephrasing your question with more specific details."
    );
  }
);
