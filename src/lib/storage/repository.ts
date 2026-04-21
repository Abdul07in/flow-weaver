import type { Flow } from "../flow/types";

/** Storage abstraction — swap with a CloudFlowRepository later without touching UI. */
export interface FlowRepository {
  list(): Promise<Flow[]>;
  get(id: string): Promise<Flow | undefined>;
  save(flow: Flow): Promise<void>;
  remove(id: string): Promise<void>;
}
