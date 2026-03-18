# OpenFOAM Chat MVP

Single-user, single-case, ephemeral Next.js app for chatting with Claude about one OpenFOAM tutorial case and letting it safely edit, run, and visualize that case.

## MVP shape

- One Ubuntu droplet runs both the web app and OpenFOAM.
- No database.
- No queue.
- No multi-tenancy.
- No persistent job history.
- One active workspace at a time, copied from a template case.
- Artifacts are local PNG/CSV/log files served by the same app.

This is the cheapest reasonable version because it avoids:

- orchestration across multiple machines
- object storage
- background workers
- session persistence

## Recommended droplet

- `s-2vcpu-4gb` if you want the web app and OpenFOAM on one box with some headroom
- `s-2vcpu-2gb` is okay for `pitzDaily`, but 4 GB is safer once the Next server and ParaView batch rendering are on the same machine

## Architecture

### Runtime components

1. `Next.js UI`
   - chat box
   - current case summary
   - run status
   - artifact gallery

2. `Next.js API routes`
   - receive the user prompt
   - call Anthropic Messages API
   - run the Claude tool loop
   - execute whitelisted local tools
   - return final text + updated artifact list

3. `Local OpenFOAM workspace`
   - copied from `OPENFOAM_TEMPLATE_CASE` into `OPENFOAM_WORK_ROOT/current`
   - reset before each one-shot run
   - contains all edited dictionaries, logs, output times, and post-processing output

4. `Artifact folder`
   - generated PNGs/CSVs copied into `OPENFOAM_ARTIFACT_DIR`
   - served to the frontend through `/api/artifacts`

### Request flow

1. User sends chat prompt.
2. `POST /api/chat` builds a Messages API request with OpenFOAM tools.
3. Claude returns text and zero or more `tool_use` blocks.
4. The backend executes each requested tool locally.
5. Tool results are sent back as `tool_result` blocks.
6. Loop continues until Claude returns a normal final answer.
7. Frontend refreshes workspace state and artifact list.

This matches Anthropic's documented `tool_use` / `tool_result` loop from the Messages API docs.

## Anthropic tool-use notes

This MVP should use the plain Messages API, not the higher-level Agent SDK, because:

- it is simpler to reason about
- the backend already owns the tool execution
- we only need a few local tools

Relevant Anthropic details:

- define tools in the `tools` array with `name`, `description`, and `input_schema`
- inspect `response.stop_reason === "tool_use"`
- collect tool calls from `response.content`
- send results back as user content blocks of type `tool_result`
- prefer `strict: true` on tools so inputs match schema

## API endpoints

### `POST /api/chat`

Primary endpoint. Accepts a single prompt and optional prior message history for the current browser session.

Request:

```json
{
  "prompt": "Increase inlet velocity to 20 m/s and run the case.",
  "messages": []
}
```

Response:

```json
{
  "assistantText": "I increased the inlet velocity, ran the case, and generated fresh images.",
  "messages": [],
  "artifacts": [
    {
      "name": "velocity_magnitude.png",
      "url": "/api/artifacts/velocity_magnitude.png",
      "kind": "image"
    }
  ],
  "workspaceState": {
    "activeCase": "pitzDaily",
    "latestTime": "0.3",
    "artifactCount": 5
  }
}
```

### `GET /api/state`

Returns a lightweight summary of the current ephemeral workspace.

### `POST /api/reset`

Deletes the current workspace and re-copies it from the template case.

### `GET /api/artifacts`

Lists generated artifacts.

### `GET /api/artifacts/[...path]`

Streams an artifact file to the UI.

## Tool schema

The backend exposes four Claude tools.

### `openfoam_case_inspect`

Use for safe reads only.

Actions:

- `summary`
- `read_file`
- `list_files`

### `openfoam_case_edit`

Use to replace or overwrite known case files. This is intentionally scoped to case dictionaries, not arbitrary shell editing.

Actions:

- `write_file`
- `replace_text`

Allowed paths:

- `0.orig/U`
- `0.orig/p`
- `0.orig/k`
- `0.orig/epsilon`
- `0.orig/nut`
- `0.orig/nuTilda`
- `constant/physicalProperties`
- `constant/momentumTransport`
- `system/controlDict`
- `system/fvSchemes`
- `system/fvSolution`
- `system/functions`

### `openfoam_run`

Use to run only whitelisted OpenFOAM workflows.

Actions:

- `block_mesh`
- `check_mesh`
- `run_case`
- `postprocess`
- `render_phase1`

### `openfoam_artifacts`

Use to list and inspect outputs already generated.

Actions:

- `list`
- `read_text`

## Suggested folder structure

```text
openfoam-chat-mvp/
  .env.example
  package.json
  README.md
  src/
    app/
      page.tsx
      api/
        chat/route.ts
        state/route.ts
        reset/route.ts
        artifacts/
          route.ts
          [...path]/route.ts
    lib/
      anthropic/
        client.ts
        loop.ts
        tools.ts
      openfoam/
        config.ts
        workspace.ts
        runner.ts
        artifacts.ts
      types.ts
```

## Local setup

1. Install OpenFOAM 12 on the droplet.
2. Copy `.env.example` to `.env.local`.
3. Set `ANTHROPIC_API_KEY` yourself.
4. Install packages with `npm install`.
5. Run `npm run dev`.

## First user stories

- "Summarize this case."
- "Increase inlet velocity to 20 m/s."
- "Change the end time to 1.0."
- "Run the case."
- "Generate velocity, pressure, and streamline images."
- "Show me the latest artifacts."

## What not to build yet

- authentication
- per-user workspaces
- long-running queues
- multi-case uploads
- general arbitrary shell access
- full browser-based ParaView
