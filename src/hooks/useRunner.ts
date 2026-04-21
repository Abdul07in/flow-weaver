import { useCallback, useRef } from "react";
import { useFlowStore } from "@/store/flowStore";
import { runFlow } from "@/lib/runner/runFlow";

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
          useFlowStore.getState().setRunState(blockId, status, response);
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

  return { run, cancel };
}
