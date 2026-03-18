"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Artifact = {
  name: string;
  url: string;
  kind: "image" | "csv" | "log" | "text" | "other";
};

type WorkspaceState = {
  activeCase: string;
  latestTime: string | null;
  artifactCount: number;
  files: string[];
};

const cardStyle: CSSProperties = {
  background: "#111936",
  border: "1px solid #253055",
  borderRadius: 16,
  padding: 18
};

export function ChatShell() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("Summarize the current case.");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageArtifacts = useMemo(
    () => artifacts.filter((artifact) => artifact.kind === "image"),
    [artifacts]
  );

  const loadState = async () => {
    const response = await fetch("/api/state");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to load state");
    }
    setWorkspaceState(data.workspaceState);
    setArtifacts(data.artifacts);
  };

  useEffect(() => {
    loadState().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to load state");
    });
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setPrompt("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          messages
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Chat request failed");
      }

      setMessages([
        ...nextMessages,
        { role: "assistant", content: data.assistantText ?? "(No response text)" }
      ]);
      setArtifacts(data.artifacts ?? []);
      setWorkspaceState(data.workspaceState ?? null);
    } catch (err) {
      setMessages(messages);
      setError(err instanceof Error ? err.message : "Chat request failed");
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Reset failed");
      }
      setMessages([]);
      setArtifacts(data.artifacts ?? []);
      setWorkspaceState(data.workspaceState ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 20px 48px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          marginBottom: 20
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 36 }}>OpenFOAM Chat MVP</h1>
          <p style={{ margin: "8px 0 0", color: "#b7c2da" }}>
            One-shot Claude control over a single ephemeral OpenFOAM workspace.
          </p>
        </div>
        <button
          onClick={onReset}
          disabled={loading}
          style={buttonStyle("secondary")}
        >
          Reset Workspace
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            background: "#3b1220",
            border: "1px solid #8d2948",
            color: "#ffd7df"
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "1.15fr 0.85fr"
        }}
      >
        <section style={{ ...cardStyle, minHeight: 640 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Chat</h2>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 420,
              maxHeight: 420,
              overflowY: "auto",
              paddingRight: 4
            }}
          >
            {messages.length === 0 ? (
              <div style={emptyStateStyle}>
                Start with something like:
                <br />
                <code>Increase inlet velocity to 20 m/s and explain the change.</code>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  style={{
                    alignSelf: message.role === "user" ? "flex-end" : "stretch",
                    background: message.role === "user" ? "#1c2959" : "#0d1430",
                    border: "1px solid #253055",
                    borderRadius: 14,
                    padding: 14,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.55
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: 0.6,
                      textTransform: "uppercase",
                      color: "#8ea0c9",
                      marginBottom: 6
                    }}
                  >
                    {message.role}
                  </div>
                  {message.content}
                </div>
              ))
            )}
          </div>

          <form onSubmit={onSubmit} style={{ marginTop: 18 }}>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              placeholder="Ask Claude to inspect, edit, run, or generate artifacts."
              style={{
                width: "100%",
                resize: "vertical",
                borderRadius: 14,
                border: "1px solid #2d3a66",
                background: "#091126",
                color: "#e8edf8",
                padding: 14,
                font: "inherit",
                boxSizing: "border-box"
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
                gap: 12
              }}
            >
              <div style={{ color: "#8ea0c9", fontSize: 14 }}>
                Claude tool loop + whitelisted OpenFOAM actions
              </div>
              <button type="submit" disabled={loading} style={buttonStyle("primary")}>
                {loading ? "Working..." : "Send"}
              </button>
            </div>
          </form>
        </section>

        <div style={{ display: "grid", gap: 20 }}>
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Workspace</h2>
            {workspaceState ? (
              <div style={{ color: "#b7c2da", lineHeight: 1.7 }}>
                <div>
                  Active case: <strong style={{ color: "#fff" }}>{workspaceState.activeCase}</strong>
                </div>
                <div>
                  Latest time: <strong style={{ color: "#fff" }}>{workspaceState.latestTime ?? "-"}</strong>
                </div>
                <div>
                  Artifact count: <strong style={{ color: "#fff" }}>{workspaceState.artifactCount}</strong>
                </div>
                <div>
                  Root files: <strong style={{ color: "#fff" }}>{workspaceState.files.join(", ")}</strong>
                </div>
              </div>
            ) : (
              <div style={emptyStateStyle}>Loading workspace state...</div>
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Artifacts</h2>
            {artifacts.length === 0 ? (
              <div style={emptyStateStyle}>No artifacts yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {artifacts.map((artifact) => (
                  <a
                    key={artifact.name}
                    href={artifact.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "#bcd0ff",
                      textDecoration: "none",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid #253055",
                      background: "#0d1430"
                    }}
                  >
                    {artifact.name}
                  </a>
                ))}
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>Image Preview</h2>
            {imageArtifacts.length === 0 ? (
              <div style={emptyStateStyle}>Generated PNGs will show up here.</div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {imageArtifacts.map((artifact) => (
                  <div key={artifact.name}>
                    <div style={{ marginBottom: 8, color: "#b7c2da", fontSize: 14 }}>
                      {artifact.name}
                    </div>
                    <img
                      src={artifact.url}
                      alt={artifact.name}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: "1px solid #253055",
                        display: "block"
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

const emptyStateStyle: CSSProperties = {
  borderRadius: 12,
  border: "1px dashed #31416e",
  padding: 16,
  color: "#8ea0c9",
  lineHeight: 1.6
};

function buttonStyle(kind: "primary" | "secondary"): CSSProperties {
  return {
    border: "1px solid",
    borderColor: kind === "primary" ? "#4764c8" : "#31416e",
    background: kind === "primary" ? "#3150bb" : "#111936",
    color: "#fff",
    borderRadius: 12,
    padding: "10px 14px",
    font: "inherit",
    cursor: "pointer"
  };
}
