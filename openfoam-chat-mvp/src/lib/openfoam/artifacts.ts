import { promises as fs } from "node:fs";
import path from "node:path";

import { workspacePaths } from "@/lib/openfoam/config";
import type { ArtifactItem } from "@/lib/types";

const kindForName = (name: string): ArtifactItem["kind"] => {
  if (name.endsWith(".png")) return "image";
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".log")) return "log";
  if (name.endsWith(".txt")) return "text";
  return "other";
};

export const listArtifacts = async (): Promise<ArtifactItem[]> => {
  await fs.mkdir(workspacePaths.latestArtifacts, { recursive: true });
  const names = (await fs.readdir(workspacePaths.latestArtifacts)).sort();

  return names.map((name) => ({
    name,
    url: `/api/artifacts/${encodeURIComponent(name)}`,
    kind: kindForName(name)
  }));
};

export const resolveArtifactPath = (relativeName: string) => {
  if (relativeName.includes("..")) {
    throw new Error("Invalid artifact path");
  }
  return path.join(workspacePaths.latestArtifacts, relativeName);
};
