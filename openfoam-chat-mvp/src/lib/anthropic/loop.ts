import { anthropic, anthropicModel } from "@/lib/anthropic/client";
import { OPENFOAM_SYSTEM_PROMPT } from "@/lib/anthropic/system-prompt";
import { claudeTools, executeClaudeTool } from "@/lib/anthropic/tools";
import type { ChatMessage } from "@/lib/types";

type AnthropicBlock = {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
};

const toAnthropicMessages = (messages: ChatMessage[]) =>
  messages.map((message) => ({
    role: message.role,
    content: message.content
  }));

export const runClaudeLoop = async (messages: ChatMessage[]) => {
  let conversation: Array<Record<string, unknown>> = toAnthropicMessages(messages);

  for (let step = 0; step < 8; step += 1) {
    const response = await anthropic.messages.create({
      model: anthropicModel,
      max_tokens: 1600,
      system: OPENFOAM_SYSTEM_PROMPT,
      tools: [...claudeTools],
      messages: conversation as never
    });

    const blocks = response.content as AnthropicBlock[];
    conversation.push({
      role: "assistant",
      content: blocks
    });

    if (response.stop_reason !== "tool_use") {
      const assistantText = blocks
        .filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("\n");

      return {
        assistantText,
        messages: conversation
      };
    }

    const toolResults = await Promise.all(
      blocks
        .filter((block) => block.type === "tool_use")
        .map(async (block) => {
          const result = await executeClaudeTool(block.name ?? "", block.input ?? {});
          return {
            type: "tool_result",
            tool_use_id: block.id,
            is_error: !result.ok,
            content: result.content
          };
        })
    );

    conversation.push({
      role: "user",
      content: toolResults
    });
  }

  throw new Error("Claude tool loop hit the safety limit.");
};
