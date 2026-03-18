import { promises as fs } from "node:fs";

import {
  getWorkspaceState,
  listWorkspaceFiles,
  readCaseFile,
  replaceInCaseFile,
  writeCaseFile
} from "@/lib/openfoam/workspace";
import { listArtifacts, resolveArtifactPath } from "@/lib/openfoam/artifacts";
import { runAndCapture, type RunAction } from "@/lib/openfoam/runner";
import type { ToolResult } from "@/lib/types";

type JsonObject = Record<string, unknown>;

export const claudeTools = [
  {
    name: "openfoam_case_inspect",
    description:
      "Inspect the current OpenFOAM workspace. Use this before editing or running anything. It can summarize the workspace, read an allowed case file, or list files in a subdirectory. Use it for understanding the case state, solver files, and current output times. Allowed direct file reads in this MVP are: Allrun, Allclean, readme-openfoam, 0.orig/U, 0.orig/p, 0.orig/k, 0.orig/epsilon, 0.orig/nut, 0.orig/nuTilda, constant/physicalProperties, constant/momentumTransport, system/controlDict, system/fvSchemes, system/fvSolution, and system/functions. Do not request system/blockMeshDict or constant/transportProperties in this case unless the workspace listing proves they exist.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["summary", "read_file", "list_files"]
        },
        path: {
          type: "string",
          description: "Relative path inside the current OpenFOAM workspace."
        }
      },
      required: ["action"],
      additionalProperties: false
    }
  },
  {
    name: "openfoam_case_edit",
    description:
      "Edit one of the allowed OpenFOAM case files. Use write_file to fully replace a file when you already know the exact desired contents. Use replace_text for targeted, deterministic string replacement. Only edit known case dictionaries and initial condition files. Allowed edit paths in this MVP are: 0.orig/U, 0.orig/p, 0.orig/k, 0.orig/epsilon, 0.orig/nut, 0.orig/nuTilda, constant/physicalProperties, constant/momentumTransport, system/controlDict, system/fvSchemes, system/fvSolution, and system/functions. Never invent new files in this MVP.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["write_file", "replace_text"]
        },
        path: {
          type: "string",
          description: "Allowed relative case file path."
        },
        content: {
          type: "string",
          description: "Full file contents used by write_file."
        },
        old_text: {
          type: "string",
          description: "Exact text to replace for replace_text."
        },
        new_text: {
          type: "string",
          description: "Replacement text for replace_text."
        }
      },
      required: ["action", "path"],
      additionalProperties: false
    }
  },
  {
    name: "openfoam_run",
    description:
      "Run a whitelisted OpenFOAM action in the current workspace. Use run_case for the normal tutorial pipeline via Allrun. Use block_mesh or check_mesh for debugging. Use render_phase1 only after a successful run to generate PNG and CSV artifacts. This tool returns stdout and stderr snippets, not a full terminal session.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["block_mesh", "check_mesh", "run_case", "postprocess", "render_phase1"]
        }
      },
      required: ["action"],
      additionalProperties: false
    }
  },
  {
    name: "openfoam_artifacts",
    description:
      "Inspect generated outputs after a run or post-processing step. Use list to discover available PNG, CSV, and log files. Use read_text for small text artifacts like logs or CSV previews. Do not use this for case source files; use openfoam_case_inspect instead.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["list", "read_text"]
        },
        name: {
          type: "string",
          description: "Artifact filename inside the artifact directory."
        }
      },
      required: ["action"],
      additionalProperties: false
    }
  }
] as const;

const ok = (content: string): ToolResult => ({ ok: true, content });
const fail = (message: string): ToolResult => ({ ok: false, content: message });

export const executeClaudeTool = async (
  name: string,
  input: JsonObject
): Promise<ToolResult> => {
  try {
    switch (name) {
      case "openfoam_case_inspect": {
        const action = String(input.action ?? "");

        if (action === "summary") {
          return ok(JSON.stringify(await getWorkspaceState(), null, 2));
        }

        if (action === "read_file") {
          return ok(await readCaseFile(String(input.path ?? "")));
        }

        if (action === "list_files") {
          return ok(JSON.stringify(await listWorkspaceFiles(String(input.path ?? ".")), null, 2));
        }

        return fail(`Unsupported inspect action: ${action}`);
      }

      case "openfoam_case_edit": {
        const action = String(input.action ?? "");
        const targetPath = String(input.path ?? "");

        if (action === "write_file") {
          await writeCaseFile(targetPath, String(input.content ?? ""));
          return ok(`Updated ${targetPath}`);
        }

        if (action === "replace_text") {
          await replaceInCaseFile(
            targetPath,
            String(input.old_text ?? ""),
            String(input.new_text ?? "")
          );
          return ok(`Replaced text in ${targetPath}`);
        }

        return fail(`Unsupported edit action: ${action}`);
      }

      case "openfoam_run": {
        const action = String(input.action ?? "") as RunAction;
        const result = await runAndCapture(action);
        return ok(JSON.stringify(result, null, 2));
      }

      case "openfoam_artifacts": {
        const action = String(input.action ?? "");

        if (action === "list") {
          return ok(JSON.stringify(await listArtifacts(), null, 2));
        }

        if (action === "read_text") {
          const artifactPath = resolveArtifactPath(String(input.name ?? ""));
          const content = await fs.readFile(artifactPath, "utf8");
          return ok(content.slice(0, 20_000));
        }

        return fail(`Unsupported artifact action: ${action}`);
      }

      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown tool error";
    return fail(message);
  }
};
