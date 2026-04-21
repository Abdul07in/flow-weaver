import type { Block, BlockResponse } from "../flow/types";
import { resolveTemplate, type ResponseMap } from "../flow/template";

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

/** Calls server-side proxy /api/run-block to bypass CORS. */
export class ProxyExecutor implements BlockExecutor {
  async execute(block: Block, responses: ResponseMap): Promise<BlockResponse> {
    const req = buildRequest(block, responses);
    const res = await fetch("/api/run-block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    const data = (await res.json()) as BlockResponse;
    return data;
  }
}

export const defaultExecutor: BlockExecutor = new ProxyExecutor();
