import type { Flow } from "../flow/types";
import type { FlowRepository } from "./repository";

const KEY = "apiflow.flows.v1";

function read(): Record<string, Flow> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, Flow>) : {};
  } catch {
    return {};
  }
}

function write(map: Record<string, Flow>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(map));
}

export class LocalStorageFlowRepository implements FlowRepository {
  async list(): Promise<Flow[]> {
    return Object.values(read()).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  async get(id: string): Promise<Flow | undefined> {
    return read()[id];
  }
  async save(flow: Flow): Promise<void> {
    const map = read();
    map[flow.id] = { ...flow, updatedAt: Date.now() };
    write(map);
  }
  async remove(id: string): Promise<void> {
    const map = read();
    delete map[id];
    write(map);
  }
}

export const flowRepository: FlowRepository = new LocalStorageFlowRepository();
