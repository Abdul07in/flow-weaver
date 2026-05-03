import { create } from "zustand";
import type { Block, BlockResponse, BlockRunState, BlockStatus, Flow, KeyValueEntry } from "@/lib/flow/types";
import { createBlock, createKV } from "@/lib/flow/factory";
import { flowRepository } from "@/lib/storage/local";

interface FlowState {
  flow: Flow | null;
  selectedBlockId: string | null;
  runStates: Record<string, BlockRunState>;
  isRunning: boolean;

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

  persist: () => Promise<void>;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  flow: null,
  selectedBlockId: null,
  runStates: {},
  isRunning: false,

  load: (flow) =>
    set({
      flow,
      selectedBlockId: flow.blocks[0]?.id ?? null,
      runStates: {},
      isRunning: false,
    }),

  setName: (name) => {
    const f = get().flow;
    if (!f) return;
    set({ flow: { ...f, name } });
    void get().persist();
  },

  selectBlock: (id) => set({ selectedBlockId: id }),

  addBlock: () => {
    const f = get().flow;
    if (!f) return;
    const block = createBlock({ name: `Step ${f.blocks.length + 1}` });
    set({ flow: { ...f, blocks: [...f.blocks, block] }, selectedBlockId: block.id });
    void get().persist();
  },

  removeBlock: (id) => {
    const f = get().flow;
    if (!f) return;
    const blocks = f.blocks.filter((b) => b.id !== id);
    const selected = get().selectedBlockId === id ? (blocks[0]?.id ?? null) : get().selectedBlockId;
    set({ flow: { ...f, blocks }, selectedBlockId: selected });
    void get().persist();
  },

  duplicateBlock: (id) => {
    const f = get().flow;
    if (!f) return;
    const idx = f.blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const dup = { ...createBlock(), ...f.blocks[idx], id: createBlock().id, name: `${f.blocks[idx].name} copy` };
    const blocks = [...f.blocks.slice(0, idx + 1), dup, ...f.blocks.slice(idx + 1)];
    set({ flow: { ...f, blocks }, selectedBlockId: dup.id });
    void get().persist();
  },

  moveBlock: (id, dir) => {
    const f = get().flow;
    if (!f) return;
    const idx = f.blocks.findIndex((b) => b.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= f.blocks.length) return;
    const blocks = [...f.blocks];
    [blocks[idx], blocks[j]] = [blocks[j], blocks[idx]];
    set({ flow: { ...f, blocks } });
    void get().persist();
  },

  updateBlock: (id, patch) => {
    const f = get().flow;
    if (!f) return;
    set({
      flow: { ...f, blocks: f.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) },
    });
    void get().persist();
  },

  updateKV: (blockId, field, entryId, patch) => {
    const f = get().flow;
    if (!f) return;
    set({
      flow: {
        ...f,
        blocks: f.blocks.map((b) =>
          b.id === blockId
            ? { ...b, [field]: b[field].map((e) => (e.id === entryId ? { ...e, ...patch } : e)) }
            : b,
        ),
      },
    });
    void get().persist();
  },

  addKV: (blockId, field) => {
    const f = get().flow;
    if (!f) return;
    set({
      flow: {
        ...f,
        blocks: f.blocks.map((b) => (b.id === blockId ? { ...b, [field]: [...b[field], createKV()] } : b)),
      },
    });
    void get().persist();
  },

  removeKV: (blockId, field, entryId) => {
    const f = get().flow;
    if (!f) return;
    set({
      flow: {
        ...f,
        blocks: f.blocks.map((b) =>
          b.id === blockId ? { ...b, [field]: b[field].filter((e) => e.id !== entryId) } : b,
        ),
      },
    });
    void get().persist();
  },

  setRunState: (blockId, status, response) =>
    set((s) => ({ runStates: { ...s.runStates, [blockId]: { status, response } } })),

  resetRunStates: () => set({ runStates: {} }),
  setIsRunning: (b) => set({ isRunning: b }),

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
}));
