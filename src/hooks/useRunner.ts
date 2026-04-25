import { useCallback, useRef } from "react";
import { useFlowStore } from "@/store/flowStore";
import { runFlow } from "@/lib/runner/runFlow";
import type { BlockResponse } from "@/lib/flow/types";

export function useRunner() {
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (startIndex = 0) => {
    const state = useFlowStore.getState();
    if (!state.flow || state.isRunning) return;

    state.resetRunStates();
    state.setIsRunning(true);

    // mark all idle
    state.flow.blocks.forEach((b) => state.setRunState(b.id, "idle"));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      await runFlow(state.flow.blocks, {
        startIndex,
        signal: ctrl.signal,
        onUpdate: ({ blockId, status, response }) => {
          const s = useFlowStore.getState();
          s.setRunState(blockId, status, response);
          if (status === "running" || status === "success" || status === "error") {
            s.selectBlock(blockId);
          }
        },
      });
    } finally {
      useFlowStore.getState().setIsRunning(false);
      void useFlowStore.getState().persist();
    }
  }, []);

  /** Run only the block at `index`. Uses prior responses already in runStates so {{...}} still resolves. */
  const runOne = useCallback(async (index: number) => {
    const state = useFlowStore.getState();
    if (!state.flow || state.isRunning) return;
    const blocks = state.flow.blocks;
    if (index < 0 || index >= blocks.length) return;

    state.setIsRunning(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const seedResponses: Record<string, BlockResponse> = {};
      for (let i = 0; i < index; i++) {
        const prev = blocks[i];
        const r = state.runStates[prev.id]?.response;
        if (r) seedResponses[prev.name] = r;
      }
      const oneBlock = [blocks[index]];
      await runFlow(oneBlock, {
        startIndex: 0,
        signal: ctrl.signal,
        seedResponses,
        onUpdate: ({ blockId, status, response }) => {
          const s = useFlowStore.getState();
          s.setRunState(blockId, status, response);
          if (status === "running" || status === "success" || status === "error") {
            s.selectBlock(blockId);
          }
        },
      });
    } finally {
      useFlowStore.getState().setIsRunning(false);
      void useFlowStore.getState().persist();
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { run, runOne, cancel };
}
