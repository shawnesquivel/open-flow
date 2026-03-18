import { NextResponse } from "next/server";
import { z } from "zod";

import { runClaudeLoop } from "@/lib/anthropic/loop";
import { listArtifacts } from "@/lib/openfoam/artifacts";
import { ensureWorkspaceInitialized, getWorkspaceState } from "@/lib/openfoam/workspace";

const requestSchema = z.object({
  prompt: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string()
      })
    )
    .default([])
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    await ensureWorkspaceInitialized();

    const result = await runClaudeLoop([
      ...body.messages,
      { role: "user", content: body.prompt }
    ]);

    return NextResponse.json({
      assistantText: result.assistantText,
      messages: result.messages,
      artifacts: await listArtifacts(),
      workspaceState: await getWorkspaceState()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown chat error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
