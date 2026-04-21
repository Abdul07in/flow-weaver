import { nanoid } from "nanoid";
import type { Block, Flow, KeyValueEntry, HttpMethod } from "./types";

export function createKV(key = "", value = "", enabled = true): KeyValueEntry {
  return { id: nanoid(8), key, value, enabled };
}

export function createBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: nanoid(10),
    name: "New Request",
    method: "GET" as HttpMethod,
    url: "https://jsonplaceholder.typicode.com/todos/1",
    params: [createKV()],
    headers: [createKV("Content-Type", "application/json")],
    body: "",
    ...overrides,
  };
}

export function createFlow(name = "Untitled Flow"): Flow {
  const now = Date.now();
  return {
    id: nanoid(12),
    name,
    blocks: [createBlock({ name: "Step 1" })],
    createdAt: now,
    updatedAt: now,
  };
}
