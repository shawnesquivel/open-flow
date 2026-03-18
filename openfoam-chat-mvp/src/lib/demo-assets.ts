import path from "node:path";

const demoAssetDir =
  process.env.OPENFOAM_DEMO_ASSET_DIR ??
  "/Users/shawnesquivel/Downloads/pitzDaily-viz";

export const demoImages = [
  {
    name: "velocity_magnitude.png",
    title: "Flow Speed Map",
    summary:
      "Shows where air moves fast and where it slows down, including the recirculation pocket after expansion."
  },
  {
    name: "streamlines.png",
    title: "Flow Paths",
    summary:
      "Shows the path of airflow so you can spot separation behind the step and reattachment downstream."
  },
  {
    name: "pressure_contours.png",
    title: "Pressure Map",
    summary:
      "Highlights pressure drop in the separated region and recovery along the channel."
  },
  {
    name: "velocity_profile_x001.png",
    title: "Speed Profile Near Expansion",
    summary:
      "A cross-section plot showing local speed changes and reverse flow near the lower wall."
  },
  {
    name: "centerline_pressure.png",
    title: "Pressure Along Duct",
    summary:
      "A simple line chart showing pressure loss and recovery along the main flow direction."
  }
] as const;

export const demoFiles = [
  ...demoImages.map((item) => item.name),
  "velocity_profile_x001.csv",
  "centerline_pressure.csv"
];

export const resolveDemoAssetPath = (name: string) => {
  if (!demoFiles.includes(name)) {
    throw new Error(`Unknown demo asset: ${name}`);
  }

  return path.join(demoAssetDir, name);
};
