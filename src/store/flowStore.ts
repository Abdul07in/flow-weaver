import { create } from "zustand";
import type { Block, BlockResponse, BlockRunState, BlockStatus, Flow, KeyValueEntry } from "@/lib/flow/types";
import { createBlock, createKV } from "@/lib/flow/factory";
import { flowRepository } from "@/lib/storage/local";

const HISTORY_LIMIT = 100;
const COALESCE_MS = 400;

interface FlowState {
  flow: Flow | null;
  selectedBlockId: string | null;
  runStates: Record<string, BlockRunState>;
  isRunning: boolean;

  // history
  past: Flow[];
  future: Flow[];
  _lastCommitAt: number;
  _lastCoalesceKey: string | null;

  load: (flow: Flow) => void;
  setName: (name: string) => void;
  selectBlock: (id: string) => void;

  addBlock: () => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (id: string, dir: -1 | 1) => void;
  updateBlock: (id: string, patch: Partial<Block>) => void;

  updateKV: (
    blockId: string,
    field: "params" | "headers",
    entryId: string,
    patch: Partial<KeyValueEntry>,
  ) => void;
  addKV: (blockId: string, field: "params" | "headers") => void;
  removeKV: (blockId: string, field: "params" | "headers", entryId: string) => void;

  setRunState: (blockId: string, status: BlockStatus, response?: BlockResponse) => void;
  resetRunStates: () => void;
  setIsRunning: (b: boolean) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  persist: () => Promise<void>;
}

export const useFlowStore = create<FlowState>((set, get) => {
  /**
   * Apply a mutation to the current flow, push the previous version to history,
   * clear the redo stack, and persist. `coalesceKey` allows consecutive edits
   * (e.g., typing in the same text field) to merge into a single undo step
   * when they happen within COALESCE_MS.
   */
  const mutate = (
    fn: (flow: Flow) => Flow,
    opts: { coalesceKey?: string; extra?: Partial<FlowState> } = {},
  ) => {
    const state = get();
    const f = state.flow;
    if (!f) return;
    const next = fn(f);
    if (next === f) return;

    const now = Date.now();
    const coalesce =
      !!opts.coalesceKey &&
      opts.coalesceKey === state._lastCoalesceKey &&
      now - state._lastCommitAt < COALESCE_MS;

    const past = coalesce ? state.past : [...state.past, f].slice(-HISTORY_LIMIT);

    set({
      flow: next,
      past,
      future: [],
      _lastCommitAt: now,
      _lastCoalesceKey: opts.coalesceKey ?? null,
      ...(opts.extra ?? {}),
    });
    void get().persist();
  };

  return {
    flow: null,
    selectedBlockId: null,
    runStates: {},
    isRunning: false,

    past: [],
    future: [],
    _lastCommitAt: 0,
    _lastCoalesceKey: null,

    load: (flow) =>
      set({
        flow,
        selectedBlockId: flow.blocks[0]?.id ?? null,
        runStates: {},
        isRunning: false,
        past: [],
        future: [],
        _lastCommitAt: 0,
        _lastCoalesceKey: null,
      }),

    setName: (name) =>
      mutate((f) => (f.name === name ? f : { ...f, name }), { coalesceKey: "name" }),

    selectBlock: (id) => set({ selectedBlockId: id }),

    addBlock: () => {
      const f = get().flow;
      if (!f) return;
      const block = createBlock({ name: `Step ${f.blocks.length + 1}` });
      mutate((cur) => ({ ...cur, blocks: [...cur.blocks, block] }), {
        extra: { selectedBlockId: block.id },
      });
    },

    removeBlock: (id) => {
      const f = get().flow;
      if (!f) return;
      const blocks = f.blocks.filter((b) => b.id !== id);
      const selected = get().selectedBlockId === id ? (blocks[0]?.id ?? null) : get().selectedBlockId;
      mutate((cur) => ({ ...cur, blocks }), { extra: { selectedBlockId: selected } });
    },

    duplicateBlock: (id) => {
      const f = get().flow;
      if (!f) return;
      const idx = f.blocks.findIndex((b) => b.id === id);
      if (idx < 0) return;
      const dup = { ...createBlock(), ...f.blocks[idx], id: createBlock().id, name: `${f.blocks[idx].name} copy` };
      const blocks = [...f.blocks.slice(0, idx + 1), dup, ...f.blocks.slice(idx + 1)];
      mutate((cur) => ({ ...cur, blocks }), { extra: { selectedBlockId: dup.id } });
    },

    moveBlock: (id, dir) => {
      mutate((cur) => {
        const idx = cur.blocks.findIndex((b) => b.id === id);
        const j = idx + dir;
        if (idx < 0 || j < 0 || j >= cur.blocks.length) return cur;
        const blocks = [...cur.blocks];
        [blocks[idx], blocks[j]] = [blocks[j], blocks[idx]];
        return { ...cur, blocks };
      });
    },

    updateBlock: (id, patch) => {
      // Coalesce typing into a single field on a single block
      const keys = Object.keys(patch);
      const coalesceKey =
        keys.length === 1 ? `updateBlock:${id}:${keys[0]}` : undefined;
      mutate(
        (cur) => ({
          ...cur,
          blocks: cur.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        }),
        { coalesceKey },
      );
    },

    updateKV: (blockId, field, entryId, patch) => {
      const keys = Object.keys(patch);
      const coalesceKey =
        keys.length === 1 ? `updateKV:${blockId}:${field}:${entryId}:${keys[0]}` : undefined;
      mutate(
        (cur) => ({
          ...cur,
          blocks: cur.blocks.map((b) =>
            b.id === blockId
              ? { ...b, [field]: b[field].map((e) => (e.id === entryId ? { ...e, ...patch } : e)) }
              : b,
          ),
        }),
        { coalesceKey },
      );
    },

    addKV: (blockId, field) => {
      mutate((cur) => ({
        ...cur,
        blocks: cur.blocks.map((b) =>
          b.id === blockId ? { ...b, [field]: [...b[field], createKV()] } : b,
        ),
      }));
    },

    removeKV: (blockId, field, entryId) => {
      mutate((cur) => ({
        ...cur,
        blocks: cur.blocks.map((b) =>
          b.id === blockId ? { ...b, [field]: b[field].filter((e) => e.id !== entryId) } : b,
        ),
      }));
    },

    setRunState: (blockId, status, response) =>
      set((s) => ({ runStates: { ...s.runStates, [blockId]: { status, response } } })),

    resetRunStates: () => set({ runStates: {} }),
    setIsRunning: (b) => set({ isRunning: b }),

    undo: () => {
      const s = get();
      if (!s.flow || s.past.length === 0) return;
      const previous = s.past[s.past.length - 1];
      const past = s.past.slice(0, -1);
      const future = [s.flow, ...s.future].slice(0, HISTORY_LIMIT);
      // Keep selected block if still present
      const selected =
        previous.blocks.find((b) => b.id === s.selectedBlockId)?.id ??
        previous.blocks[0]?.id ??
        null;
      set({
        flow: previous,
        past,
        future,
        selectedBlockId: selected,
        _lastCommitAt: 0,
        _lastCoalesceKey: null,
      });
      void get().persist();
    },

    redo: () => {
      const s = get();
      if (!s.flow || s.future.length === 0) return;
      const next = s.future[0];
      const future = s.future.slice(1);
      const past = [...s.past, s.flow].slice(-HISTORY_LIMIT);
      const selected =
        next.blocks.find((b) => b.id === s.selectedBlockId)?.id ??
        next.blocks[0]?.id ??
        null;
      set({
        flow: next,
        past,
        future,
        selectedBlockId: selected,
        _lastCommitAt: 0,
        _lastCoalesceKey: null,
      });
      void get().persist();
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    persist: async () => {
      const f = get().flow;
      if (!f) return;
      const lastRun = Object.values(get().runStates);
      const lastRunStatus: BlockStatus | undefined = lastRun.length
        ? lastRun.some((r) => r.status === "error")
          ? "error"
          : lastRun.every((r) => r.status === "success")
            ? "success"
            : "idle"
        : f.lastRunStatus;
      await flowRepository.save({ ...f, lastRunStatus, lastRunAt: lastRun.length ? Date.now() : f.lastRunAt });
    },
  };
});
