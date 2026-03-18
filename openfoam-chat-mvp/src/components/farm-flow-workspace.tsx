"use client";

import { useRef, useState } from "react";

type WorkspaceAsset = {
  name: string;
  title: string;
  summary: string;
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

type RunStep = {
  id: string;
  label: string;
  detail: string;
  status: "pending" | "active" | "done";
};

type Props = {
  assets: WorkspaceAsset[];
};

const INITIAL_STEPS: RunStep[] = [
  {
    id: "inspect",
    label: "Review setup",
    detail: "Checking baseline airflow settings and boundary conditions.",
    status: "pending",
  },
  {
    id: "mesh",
    label: "Build model",
    detail: "Preparing and validating the geometry mesh.",
    status: "pending",
  },
  {
    id: "solve",
    label: "Run simulation",
    detail: "Solving transient airflow through the duct expansion.",
    status: "pending",
  },
  {
    id: "render",
    label: "Generate visuals",
    detail: "Creating speed, pressure, and flow-path outputs.",
    status: "pending",
  },
];

const INITIAL_PROMPT =
  "Run the baseline duct airflow simulation and generate the key visuals.";

export function Workspace({ assets }: Props) {
  const runIdRef = useRef(0);

  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [steps, setSteps] = useState<RunStep[]>(INITIAL_STEPS);
  const [revealedAssetCount, setRevealedAssetCount] = useState(0);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState("Idle");
  const [isRunning, setIsRunning] = useState(false);
  const [runComplete, setRunComplete] = useState(false);

  const updateStep = (targetId: string, status: RunStep["status"]) => {
    setSteps((current) =>
      current.map((step) =>
        step.id === targetId ? { ...step, status } : step,
      ),
    );
  };

  const wait = async (ms: number, runId: number) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return runIdRef.current === runId;
  };

  const showThought = async (
    runId: number,
    thought: string,
    stepId: string,
    statusText: string,
  ) => {
    updateStep(stepId, "active");
    setCurrentStatus(statusText);
    setCurrentThought(thought);

    const stillRunning = await wait(3000, runId);
    if (!stillRunning) return false;

    setCurrentThought(null);
    updateStep(stepId, "done");
    return true;
  };

  const runAnalysis = async () => {
    const runId = Date.now();
    runIdRef.current = runId;

    setMessages([{ role: "user", content: INITIAL_PROMPT }]);
    setSteps(INITIAL_STEPS);
    setRevealedAssetCount(0);
    setCurrentThought(null);
    setCurrentStatus("Starting...");
    setIsRunning(true);
    setRunComplete(false);

    if (!(await wait(500, runId))) return;

    if (
      !(await showThought(
        runId,
        "Checking the baseline setup first.",
        "inspect",
        "Reviewing setup...",
      ))
    ) {
      return;
    }

    if (
      !(await showThought(
        runId,
        "Model build looks good. Moving into simulation.",
        "mesh",
        "Building model...",
      ))
    ) {
      return;
    }

    if (
      !(await showThought(
        runId,
        "Simulation finished cleanly. Generating visuals now.",
        "solve",
        "Running simulation...",
      ))
    ) {
      return;
    }

    updateStep("render", "active");
    setCurrentStatus("Generating visuals...");

    for (const [index, asset] of assets.entries()) {
      setCurrentStatus(`Rendering ${asset.title}...`);
      if (!(await wait(1000, runId))) return;
      setRevealedAssetCount(index + 1);
    }

    updateStep("render", "done");
    setCurrentStatus("Complete");
    setIsRunning(false);
    setRunComplete(true);
    setCurrentThought(null);
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content:
          "Done. The results show clear separation after expansion, with pressure loss and speed changes downstream.",
      },
    ]);
  };

  return (
    <main className="mx-auto max-w-[1520px] px-4 pb-8 pt-5">
      <div className="mb-4 rounded-2xl border-4 border-amber-900 bg-gradient-to-b from-[#86c85f] to-[#4f7d2a] p-4 text-[#2e2115] shadow-[0_10px_0_#5f3d1f]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-wide">FlowPilot</h1>
            <p className="text-sm font-medium text-[#3a2a1d]">
              Run simulations, review outputs, ask questions — all in one place.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={isRunning}
            className="rounded-lg border-2 border-amber-900 bg-[#f6c24b] px-4 py-2 text-sm font-black text-[#3a2a1d] shadow-[0_3px_0_#b77d2d] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-75"
          >
            {isRunning
              ? "Running..."
              : runComplete
                ? "Run again"
                : "Run analysis"}
          </button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-1 flex-col rounded-2xl border-4 border-[#5f3d1f] bg-[#f6edcf] p-4 text-[#2f2418] shadow-[0_8px_0_#7c522b]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-2xl font-black">Outputs</h2>
              <span className="rounded-md bg-[#dcb475] px-2 py-1 text-sm font-bold text-[#3a2a1d]">
                {revealedAssetCount}/{assets.length}
              </span>
            </div>

            {revealedAssetCount === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-[#b99058] bg-[#f3e3b8] text-center text-[#5a452f]">
                <p className="text-lg">
                  {isRunning
                    ? "Generating visuals..."
                    : "Run an analysis to populate this workspace."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {assets.slice(0, revealedAssetCount).map((asset) => (
                  <article
                    key={asset.name}
                    className="overflow-hidden rounded-xl border-2 border-[#b99058] bg-[#fff9e6]"
                  >
                    <img
                      src={`/api/demo-assets/${asset.name}`}
                      alt={asset.title}
                      className="aspect-video w-full object-cover"
                    />
                    <div className="p-3">
                      <h3 className="mb-1 text-sm font-black text-[#3a2a1d]">
                        {asset.title}
                      </h3>
                      <p className="text-sm leading-6 text-[#4c3a2a]">
                        {asset.summary}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="sticky top-4 h-fit space-y-4">
          <div className="rounded-2xl border-4 border-[#5f3d1f] bg-[#f6edcf] p-4 text-[#2f2418] shadow-[0_8px_0_#7c522b]">
            <div className="rounded-xl border-2 border-[#b99058] bg-[#fff9e6] p-3 text-sm leading-7 text-[#4c3a2a]">
              <div>
                Scenario:{" "}
                <span className="font-black text-[#3a2a1d]">
                  Backward-Facing Step Airflow
                </span>
              </div>
              <div>
                Engine:{" "}
                <span className="font-black text-[#3a2a1d]">
                  Transient airflow solver
                </span>
              </div>
              <div>
                Case ID:{" "}
                <span className="font-black text-[#3a2a1d]">
                  pitzDaily (technical)
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-lg border-2 border-[#b99058] bg-[#fff9e6] px-3 py-2 text-xs font-bold text-[#5a452f]">
              {currentStatus}
            </div>
          </div>

          <div className="rounded-2xl border-4 border-[#5f3d1f] bg-[#f6edcf] p-4 text-[#2f2418] shadow-[0_8px_0_#7c522b]">
            <h2 className="mb-3 text-2xl font-black">Pipeline</h2>
            <div className="grid grid-cols-2 gap-2">
              {steps.map((step) => (
                <div key={step.id} className={stepClass(step.status)}>
                  {step.label}
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm leading-6 text-[#4c3a2a]">
              {steps.find((step) => step.status === "active")?.detail ??
                (runComplete
                  ? "All steps complete."
                  : "Idle. Run an analysis to start the pipeline.")}
            </p>
          </div>

          <div className="rounded-2xl border-4 border-[#5f3d1f] bg-[#f6edcf] p-4 text-[#2f2418] shadow-[0_8px_0_#7c522b]">
            <h2 className="mb-3 text-2xl font-black">Assistant</h2>
            <div className="flex max-h-[520px] min-h-[360px] flex-col gap-3 overflow-y-auto rounded-xl border-2 border-[#b99058] bg-[#fff9e6] p-3">
              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#b99058] p-4 text-sm text-[#7c522b]">
                  Conversation and status updates appear here when you run an
                  analysis.
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-lg border-2 p-3 ${
                      message.role === "user"
                        ? "border-[#7c93d9] bg-[#dce6ff]"
                        : "border-[#b99058] bg-[#fff4d8]"
                    }`}
                  >
                    <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-[#7c522b]">
                      {message.role}
                    </div>
                    <div className="text-base leading-7 text-[#3a2a1d]">
                      {message.content}
                    </div>
                  </div>
                ))
              )}

              {currentThought ? (
                <div className="rounded-lg border-2 border-[#7c93d9] bg-[#eef3ff] p-3">
                  <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-[#4f68af]">
                    assistant
                  </div>
                  <div className="text-base leading-7 text-[#3a2a1d]">
                    {currentThought}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-3 rounded-xl border-2 border-[#b99058] bg-[#fff9e6] p-3">
              <div className="mb-2 rounded-lg border border-[#d5b47a] bg-[#fff4d8] p-2 text-sm leading-6 text-[#3a2a1d]">
                {INITIAL_PROMPT}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#7c522b]">
                  Natural language
                </span>
                <button
                  onClick={runAnalysis}
                  disabled={isRunning}
                  className="rounded-lg border-2 border-amber-900 bg-[#f6c24b] px-3 py-1.5 text-sm font-black text-[#3a2a1d] shadow-[0_2px_0_#b77d2d] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {isRunning ? "Running..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function stepClass(status: RunStep["status"]) {
  const base =
    "rounded-md border-2 px-2 py-1.5 text-center text-xs font-black tracking-wide";
  if (status === "done")
    return `${base} border-[#548b47] bg-[#d8efc5] text-[#26441f]`;
  if (status === "active")
    return `${base} border-[#7c93d9] bg-[#dce6ff] text-[#2f4177]`;
  return `${base} border-[#d5b47a] bg-[#fff4d8] text-[#7c522b]`;
}
