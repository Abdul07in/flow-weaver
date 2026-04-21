import type { Block, BlockResponse, BlockStatus } from "../flow/types";
import type { ResponseMap } from "../flow/template";
import { defaultExecutor, type BlockExecutor } from "./executor";

export interface RunUpdate {
  blockId: string;
  status: BlockStatus;
  response?: BlockResponse;
}

export interface RunOptions {
  startIndex?: number;
  executor?: BlockExecutor;
  onUpdate?: (u: RunUpdate) => void;
  signal?: AbortSignal;
}

/** Execute blocks sequentially, stop on first error. Pure orchestration. */
export async function runFlow(blocks: Block[], opts: RunOptions = {}): Promise<ResponseMap> {
  const { startIndex = 0, executor = defaultExecutor, onUpdate, signal } = opts;
  const responses: ResponseMap = {};
  for (let i = startIndex; i < blocks.length; i++) {
    if (signal?.aborted) break;
    const block = blocks[i];
    onUpdate?.({ blockId: block.id, status: "running" });
    try {
      const response = await executor.execute(block, responses);
      responses[block.name] = response;
      const status: BlockStatus = response.ok && !response.error ? "success" : "error";
      onUpdate?.({ blockId: block.id, status, response });
      if (status === "error") break;
    } catch (err) {
      const response: BlockResponse = {
        status: 0,
        statusText: "Network Error",
        ok: false,
        headers: {},
        body: null,
        rawBody: "",
        durationMs: 0,
        sizeBytes: 0,
        error: err instanceof Error ? err.message : String(err),
      };
      onUpdate?.({ blockId: block.id, status: "error", response });
      break;
    }
  }
  return responses;
}
