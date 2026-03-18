export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type WorkspaceState = {
  activeCase: string;
  latestTime: string | null;
  artifactCount: number;
  files: string[];
};

export type ArtifactItem = {
  name: string;
  url: string;
  kind: "image" | "csv" | "log" | "text" | "other";
};

export type ToolResult = {
  ok: boolean;
  content: string;
};
