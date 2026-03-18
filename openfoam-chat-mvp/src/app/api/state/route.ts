import { NextResponse } from "next/server";

import { listArtifacts } from "@/lib/openfoam/artifacts";
import { ensureWorkspaceInitialized, getWorkspaceState } from "@/lib/openfoam/workspace";

export async function GET() {
  await ensureWorkspaceInitialized();
  return NextResponse.json({
    workspaceState: await getWorkspaceState(),
    artifacts: await listArtifacts()
  });
}
