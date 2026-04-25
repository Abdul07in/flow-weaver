## Per-block Encryption / Decryption hooks

Add an optional, per-block scripting layer that lets users transform the **outgoing request body** (encrypt) and the **incoming response body** (decrypt) using their own JavaScript. Both are independent, optional, and only affect the block they're configured on.

## How it works (user view)

On any block, two new toggles appear in the block editor: **Encrypt request** and **Decrypt response**. Toggling either opens a code editor modal where the user writes a small JS function. A small lock icon on the block card indicates encryption/decryption is enabled.

### Encrypt request
- Triggered just before the request is sent.
- User script signature:
  ```js
  // available: payload (parsed JSON if valid, else raw string), context
  // context = { headers, url, method, vars }  // vars = previous responses by name
  // must return: string | object  → becomes the new request body
  // may also return { body, headers } to also override/add headers (e.g. X-Encrypted: true)
  return { encrypted: btoa(JSON.stringify(payload)) };
  ```

### Decrypt response
- Triggered right after the response arrives, before it's stored / piped to next blocks.
- User script signature:
  ```js
  // available: response = { status, headers, body, rawBody }
  // must return: any  → replaces response.body (and rawBody is regenerated)
  return JSON.parse(atob(response.body.encrypted));
  ```

Both scripts run in a **sandboxed iframe** (browser-side, before/after the proxy call) with a 2-second timeout. Errors surface as a red banner in the Response tab and mark the block as error (script error is distinct from HTTP error).

## Scope (v1)

- Per-block toggle + script storage for `encryptScript` and `decryptScript`
- Sandboxed execution via hidden `<iframe sandbox="allow-scripts">` + `postMessage`, with timeout
- Code editor modal (textarea with monospace + line numbers; no heavy editor dep)
- Template snippets dropdown: Base64, AES-GCM (Web Crypto), HMAC signing, identity
- Pipe-through behavior: decrypted body is what next blocks see via `{{Block.body...}}`
- Visual indicator on BlockCard (lock icon) + small badge in editor header
- Persisted with the rest of the flow (localStorage + export/import JSON)

## Out of scope

- Shared/global crypto helpers across blocks
- Key management UI / secrets vault (user pastes keys into their script for now)
- Streaming responses, binary bodies

## Technical changes

### Types — `src/lib/flow/types.ts`
Add to `Block`:
```ts
encryptEnabled?: boolean;
encryptScript?: string;   // JS source
decryptEnabled?: boolean;
decryptScript?: string;
```

### Sandbox runner — new `src/lib/scripting/sandbox.ts`
- Lazy-creates a hidden iframe with `sandbox="allow-scripts"` and `srcdoc` containing a message listener that `eval`s the user function as `new Function('payload','context', userCode)` and posts the return value back.
- Exposes `runScript(code, args, { timeoutMs = 2000 })` returning `Promise<{ ok, value, error }>`.
- Handles serialization (structured clone) and timeout via `setTimeout` + reject.

### Executor — `src/lib/runner/executor.ts`
In `ProxyExecutor.execute`:
1. Build request as today.
2. If `block.encryptEnabled && block.encryptScript`:
   - Parse `req.body` as JSON if possible, pass as `payload`.
   - Run script; on success replace `req.body` (stringify if object) and merge optional `headers`.
   - On script error → return a `BlockResponse` with `error: "Encrypt script: ..."`.
3. POST to `/api/run-block` (unchanged).
4. If `block.decryptEnabled && block.decryptScript`:
   - Run script with `response`.
   - Replace `response.body`, regenerate `response.rawBody = JSON.stringify(newBody)`, recompute `sizeBytes`.
   - On script error → return response with `error: "Decrypt script: ..."` and `ok: false`.

### UI — script editor modal — new `src/components/flow/ScriptEditorDialog.tsx`
Built on existing `Dialog`. Props: `title`, `value`, `onSave`, `kind: "encrypt" | "decrypt"`, plus a "Test" button that runs the script against the block's last response (decrypt) or current body (encrypt) and shows result/error inline. Snippet dropdown inserts templates.

### Block editor — `src/routes/flows/$flowId.tsx`
- Add a new tab **"Crypto"** (or two small toggle rows above the tabs) with two cards: Encrypt request / Decrypt response, each with a switch + "Edit script" button opening the dialog.
- Show small lock icon next to block name in header when either is enabled.

### BlockCard — `src/components/flow/BlockCard.tsx`
- Show a small `Lock` lucide icon next to method badge when `encryptEnabled || decryptEnabled`.

### Store — `src/store/flowStore.ts`
No new actions; reuse `updateBlock` for the new fields.

### Factory — `src/lib/flow/factory.ts`
Default new fields to `false` / empty string.

## Security notes

- Scripts run in an iframe with `sandbox="allow-scripts"` only (no same-origin) → cannot touch app DOM, cookies, or localStorage.
- 2s timeout prevents infinite loops from hanging the runner.
- Scripts are stored in plaintext localStorage — clearly noted in a small helper text under the editor.

## Files touched / created

- create `src/lib/scripting/sandbox.ts`
- create `src/components/flow/ScriptEditorDialog.tsx`
- edit `src/lib/flow/types.ts`
- edit `src/lib/flow/factory.ts`
- edit `src/lib/runner/executor.ts`
- edit `src/routes/flows/$flowId.tsx`
- edit `src/components/flow/BlockCard.tsx`
