export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export type BlockStatus = "idle" | "running" | "success" | "error";

export interface KeyValueEntry {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Block {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValueEntry[];
  headers: KeyValueEntry[];
  body: string; // raw JSON string
}

export interface BlockResponse {
  status: number;
  statusText: string;
  ok: boolean;
  headers: Record<string, string>;
  body: unknown;
  rawBody: string;
  durationMs: number;
  sizeBytes: number;
  error?: string;
}

export interface BlockRunState {
  status: BlockStatus;
  response?: BlockResponse;
  startedAt?: number;
}

export interface Flow {
  id: string;
  name: string;
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
  lastRunStatus?: BlockStatus;
  lastRunAt?: number;
}
