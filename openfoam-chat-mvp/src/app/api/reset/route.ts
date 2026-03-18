import { NextResponse } from "next/server";

import { listArtifacts } from "@/lib/openfoam/artifacts";
import { getWorkspaceState, resetWorkspace } from "@/lib/openfoam/workspace";

export async function POST() {
  await resetWorkspace();

  return NextResponse.json({
    ok: true,
    workspaceState: await getWorkspaceState(),
    artifacts: await listArtifacts()
  });
}
