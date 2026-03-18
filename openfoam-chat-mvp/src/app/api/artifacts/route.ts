import { NextResponse } from "next/server";

import { listArtifacts } from "@/lib/openfoam/artifacts";

export async function GET() {
  return NextResponse.json({
    artifacts: await listArtifacts()
  });
}
