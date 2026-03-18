import { promises as fs } from "node:fs";
import path from "node:path";

import { workspacePaths, openfoamConfig } from "@/lib/openfoam/config";
import type { WorkspaceState } from "@/lib/types";

const ALLOWED_FILES = new Set([
  "Allclean",
  "Allrun",
  "0.orig/U",
  "0.orig/p",
  "0.orig/k",
  "0.orig/epsilon",
  "0.orig/nut",
  "0.orig/nuTilda",
  "constant/physicalProperties",
  "constant/momentumTransport",
  "system/controlDict",
  "system/fvSchemes",
  "system/fvSolution",
  "system/functions",
  "readme-openfoam"
]);

const isNumericTimeDir = (name: string) => /^(\d+(\.\d+)?)$/.test(name);

export const ensureDir = async (target: string) => {
  await fs.mkdir(target, { recursive: true });
};

export const ensureWorkspaceInitialized = async () => {
  try {
    await fs.access(workspacePaths.currentCase);
  } catch {
    await resetWorkspace();
    return;
  }

  const entries = await fs.readdir(workspacePaths.currentCase);
  if (entries.length === 0) {
    await resetWorkspace();
  }
};

export const resetWorkspace = async () => {
  await fs.rm(workspacePaths.currentCase, { recursive: true, force: true });
  await ensureDir(openfoamConfig.workRoot);
  await fs.cp(openfoamConfig.templateCase, workspacePaths.currentCase, {
    recursive: true
  });
  await ensureDir(workspacePaths.latestArtifacts);
};

export const assertAllowedCasePath = (relativePath: string) => {
  if (!ALLOWED_FILES.has(relativePath)) {
    throw new Error(`Path not allowed in MVP: ${relativePath}`);
  }
  return path.join(workspacePaths.currentCase, relativePath);
};

export const readCaseFile = async (relativePath: string) => {
  const absolutePath = assertAllowedCasePath(relativePath);
  return fs.readFile(absolutePath, "utf8");
};

export const writeCaseFile = async (relativePath: string, contents: string) => {
  const absolutePath = assertAllowedCasePath(relativePath);
  await fs.writeFile(absolutePath, contents, "utf8");
};

export const replaceInCaseFile = async (
  relativePath: string,
  oldText: string,
  newText: string
) => {
  const current = await readCaseFile(relativePath);
  if (!current.includes(oldText)) {
    throw new Error(`Could not find target text in ${relativePath}`);
  }
  await writeCaseFile(relativePath, current.replace(oldText, newText));
};

export const listWorkspaceFiles = async (subdir = ".") => {
  const target = path.join(workspacePaths.currentCase, subdir);
  const items = await fs.readdir(target, { withFileTypes: true });
  return items.map((item) => ({
    name: item.name,
    type: item.isDirectory() ? "directory" : "file"
  }));
};

export const getWorkspaceState = async (): Promise<WorkspaceState> => {
  await ensureWorkspaceInitialized();
  await ensureDir(workspacePaths.latestArtifacts);

  const files = await fs.readdir(workspacePaths.currentCase);
  const latestTime =
    files
      .filter(isNumericTimeDir)
      .sort((a, b) => Number(a) - Number(b))
      .at(-1) ?? null;

  const artifacts = await fs.readdir(workspacePaths.latestArtifacts);

  return {
    activeCase: path.basename(workspacePaths.currentCase),
    latestTime,
    artifactCount: artifacts.length,
    files: files.sort()
  };
};
