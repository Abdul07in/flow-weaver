
# API Flow Builder

A simplified, user-friendly Postman-style flow builder where you chain API calls into a sequence, pipe data from one block's response into the next, and run the whole flow with per-block results.

## Core concepts

- **Flow** — a named, ordered sequence of API call blocks. Saved to browser localStorage (cloud sync can be layered in later without changing the data model).
- **Block** — a single API request: method, URL, query params, headers, JSON body. Each block has its own response panel (status, time, headers, JSON tree + raw view).
- **Variable references** — type `{{blockName.response.path}}` anywhere (URL, params, header values, body). A "Insert from previous response" picker shows a tree of prior responses; clicking a node inserts the correct token automatically.

## Pages

1. **`/` — Flows dashboard**
   - List of saved flows (name, # blocks, last run status, last run time)
   - "New flow" button, rename, duplicate, delete
   - Empty-state illustration with a one-click sample flow

2. **`/flows/$flowId` — Flow editor & runner**
   - **Left rail**: ordered list of blocks (drag to reorder, add, delete, collapse). Each card shows method badge, name, and status dot (idle / running / success / error).
   - **Main panel**: selected block's editor — name, method dropdown (GET/POST/PUT/PATCH/DELETE), URL, tabs for Params / Headers / Body / Response.
     - Params & Headers: clean key/value editor with enable/disable toggle per row.
     - Body: JSON editor with formatting + validation (Monaco-lite via textarea + syntax highlight).
     - Response tab: status pill, latency, size, headers table, collapsible JSON tree, raw view toggle, copy button.
   - **Top bar**: flow name (inline edit), "Run flow" (runs all blocks in order), "Run from here", import/export JSON.
   - **Variable picker**: small popover button in any input → tree of `{{block.response.…}}` paths from prior blocks; click to insert at cursor.

## Execution

- Frontend serializes the flow → POSTs to a TanStack server route `/api/run-block` (server-side proxy, avoids CORS, supports any API).
- Blocks run sequentially. Before each request the engine resolves `{{...}}` tokens against accumulated responses. On non-2xx or network error: stop the flow, mark that block as errored, surface the error in its Response tab, leave subsequent blocks idle.
- Streaming UI: each block's status updates live as it completes (success animation pulse / red shake on error).

## UX & visual style

- Clean, modern light theme with a tasteful accent color; rounded cards, soft shadows, generous spacing.
- Method badges color-coded (GET green, POST blue, PUT amber, PATCH purple, DELETE red).
- Subtle Framer-Motion-style animations: block reorder, panel transitions, status dot pulses, response panel slide-in.
- Keyboard friendly: Cmd/Ctrl+Enter to run, arrow keys to switch blocks.

## Architecture (built for extensibility)

- **Domain layer** (`src/lib/flow/`): pure types & functions — `Flow`, `Block`, `runFlow`, `resolveTemplate`, `validateBlock`. No React, no I/O. Easy to unit test and reuse.
- **Storage layer** (`src/lib/storage/`): `FlowRepository` interface with `LocalStorageFlowRepository` implementation. Swap to a `CloudFlowRepository` later with zero UI changes.
- **Execution layer** (`src/lib/runner/`): `BlockExecutor` interface; `ProxyExecutor` calls the server route. Adding auth presets, retries, or a different transport = new executor.
- **UI layer**: small composable components (`BlockCard`, `KeyValueEditor`, `JsonTree`, `VariablePicker`, `ResponseViewer`) — each does one thing (SRP).
- **State**: Zustand store per flow editor for fine-grained, performant updates (no whole-tree re-renders); React Query for the server-route call.
- **Routes** (TanStack Start): `/`, `/flows/$flowId`. Server route: `/api/run-block` (POST, validates input with Zod, returns status/headers/body/timing).

## v1 scope (this build)

- Flows dashboard + editor/runner
- Methods: GET/POST/PUT/PATCH/DELETE
- Headers, query params, raw JSON body editors
- Visual variable picker + `{{...}}` template syntax
- Server-side proxy execution, sequential run with stop-on-error
- Per-block response viewer (status, timing, headers, JSON tree + raw)
- LocalStorage persistence, import/export flow as JSON

## Out of scope (clean extension points already designed in)

- Auth/login + cloud sync (repository swap)
- Run history, environments/secrets, JSONPath, parallel branches, scheduled runs
