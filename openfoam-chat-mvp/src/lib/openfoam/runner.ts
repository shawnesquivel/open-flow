import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";

import { openfoamConfig, workspacePaths } from "@/lib/openfoam/config";

const execFileAsync = promisify(execFile);

export type RunAction =
  | "block_mesh"
  | "check_mesh"
  | "run_case"
  | "postprocess"
  | "render_phase1";

const runBash = async (command: string) => {
  return execFileAsync("bash", ["-lc", `. "${openfoamConfig.bashrc}" && ${command}`], {
    cwd: workspacePaths.currentCase,
    maxBuffer: 10 * 1024 * 1024
  });
};

const syncArtifacts = async () => {
  await fs.mkdir(workspacePaths.latestArtifacts, { recursive: true });

  const candidates = [
    "postProcessing",
    "velocity_magnitude.png",
    "pressure_contours.png",
    "streamlines.png",
    "velocity_profile_x001.png",
    "velocity_profile_x001.csv",
    "centerline_pressure.png",
    "centerline_pressure.csv",
    "log.blockMesh",
    "log.foamRun"
  ];

  for (const name of candidates) {
    const source = `${workspacePaths.currentCase}/${name}`;
    try {
      const stats = await fs.stat(source);
      if (stats.isFile()) {
        await fs.copyFile(source, `${workspacePaths.latestArtifacts}/${name.split("/").at(-1)}`);
      }
    } catch {
      // Optional artifact.
    }
  }
};

export const runOpenfoamAction = async (action: RunAction) => {
  switch (action) {
    case "block_mesh":
      return runBash("blockMesh");
    case "check_mesh":
      return runBash("checkMesh -latestTime");
    case "run_case":
      return runBash("chmod +x Allrun && ./Allrun");
    case "postprocess":
      return runBash("foamPostProcess -solver incompressibleFluid");
    case "render_phase1":
      return runBash("python3 render_phase1.py && python3 plot_phase1.py");
    default:
      throw new Error(`Unsupported action: ${action satisfies never}`);
  }
};

export const runAndCapture = async (action: RunAction) => {
  const result = await runOpenfoamAction(action);
  await syncArtifacts();
  return {
    stdout: result.stdout,
    stderr: result.stderr
  };
};
