import { promises as fs } from "node:fs";

import { resolveArtifactPath } from "@/lib/openfoam/artifacts";

const contentTypeForName = (name: string) => {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".csv")) return "text/csv; charset=utf-8";
  if (name.endsWith(".log") || name.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params;
  const relativeName = params.path.join("/");
  const absolutePath = resolveArtifactPath(relativeName);
  const file = await fs.readFile(absolutePath);

  return new Response(file, {
    headers: {
      "content-type": contentTypeForName(relativeName)
    }
  });
}
