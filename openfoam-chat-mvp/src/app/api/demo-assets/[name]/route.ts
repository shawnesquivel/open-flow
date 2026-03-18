import { promises as fs } from "node:fs";

import { resolveDemoAssetPath } from "@/lib/demo-assets";

const contentTypeForName = (name: string) => {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".csv")) return "text/csv; charset=utf-8";
  return "application/octet-stream";
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;
  const absolutePath = resolveDemoAssetPath(name);
  const file = await fs.readFile(absolutePath);

  return new Response(file, {
    headers: {
      "content-type": contentTypeForName(name)
    }
  });
}
