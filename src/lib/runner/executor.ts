import type { Block, BlockResponse } from "../flow/types";
import { resolveTemplate, type ResponseMap } from "../flow/template";
import { runScript } from "../scripting/sandbox";

export interface BlockExecutor {
  execute(block: Block, responses: ResponseMap): Promise<BlockResponse>;
}

export interface ResolvedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export function buildRequest(block: Block, responses: ResponseMap): ResolvedRequest {
  const url = new URL(resolveTemplate(block.url, responses));
  for (const p of block.params) {
    if (!p.enabled || !p.key) continue;
    url.searchParams.append(resolveTemplate(p.key, responses), resolveTemplate(p.value, responses));
  }
  const headers: Record<string, string> = {};
  for (const h of block.headers) {
    if (!h.enabled || !h.key) continue;
    headers[resolveTemplate(h.key, responses)] = resolveTemplate(h.value, responses);
  }
  const hasBody = block.method !== "GET" && block.body.trim().length > 0;
  return {
    method: block.method,
    url: url.toString(),
    headers,
    body: hasBody ? resolveTemplate(block.body, responses) : undefined,
  };
}

function tryParseJson(s: string | undefined): unknown {
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function errorResponse(error: string): BlockResponse {
  return {
    status: 0,
    statusText: "Script Error",
    ok: false,
    headers: {},
    body: null,
    rawBody: "",
    durationMs: 0,
    sizeBytes: 0,
    error,
  };
}

/** Calls server-side proxy /api/run-block to bypass CORS. */
export class ProxyExecutor implements BlockExecutor {
  async execute(block: Block, responses: ResponseMap): Promise<BlockResponse> {
    const req = buildRequest(block, responses);

    // --- Encrypt request body ---
    if (block.encryptEnabled && block.encryptScript?.trim()) {
      const payload = tryParseJson(req.body);
      const result = await runScript<unknown>(block.encryptScript, {
        payload,
        context: {
          headers: req.headers,
          url: req.url,
          method: req.method,
          vars: responses,
        },
      });
      if (!result.ok) return errorResponse(`Encrypt script: ${result.error}`);
      const v = result.value;
      if (v && typeof v === "object" && !Array.isArray(v) && ("body" in (v as object) || "headers" in (v as object))) {
        const obj = v as { body?: unknown; headers?: Record<string, string> };
        if (obj.body !== undefined) {
          req.body = typeof obj.body === "string" ? obj.body : JSON.stringify(obj.body);
        }
        if (obj.headers) Object.assign(req.headers, obj.headers);
      } else {
        req.body = typeof v === "string" ? v : JSON.stringify(v);
      }
    }

    const res = await fetch("/api/run-block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const data = (await res.json()) as BlockResponse;

    // --- Decrypt response body ---
    if (block.decryptEnabled && block.decryptScript?.trim() && !data.error) {
      const result = await runScript<unknown>(block.decryptScript, {
        response: {
          status: data.status,
          headers: data.headers,
          body: data.body,
          rawBody: data.rawBody,
        },
      });
      if (!result.ok) {
        return { ...data, ok: false, error: `Decrypt script: ${result.error}` };
      }
      const newBody = result.value;
      const newRaw =
        typeof newBody === "string" ? newBody : JSON.stringify(newBody, null, 2);
      return {
        ...data,
        body: newBody,
        rawBody: newRaw,
        sizeBytes: new TextEncoder().encode(newRaw).length,
      };
    }

    return data;
  }
}

export const defaultExecutor: BlockExecutor = new ProxyExecutor();
