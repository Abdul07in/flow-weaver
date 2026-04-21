import type { Block, BlockResponse } from "./types";

export type ResponseMap = Record<string, BlockResponse | undefined>;

const TOKEN_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

/**
 * Resolve {{blockName.response.path}} tokens against accumulated responses.
 * Path uses dot/bracket notation. The first segment is the block name; the
 * second must be "response"; the rest is a path into the response body or
 * special fields (status, headers).
 */
export function resolveTemplate(input: string, responsesByName: ResponseMap): string {
  if (!input) return input;
  return input.replace(TOKEN_RE, (_, expr: string) => {
    const value = lookup(expr.trim(), responsesByName);
    if (value === undefined || value === null) return "";
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  });
}

export function lookup(expr: string, responsesByName: ResponseMap): unknown {
  const path = parsePath(expr);
  if (path.length < 2) return undefined;
  const [blockName, root, ...rest] = path;
  const resp = responsesByName[blockName];
  if (!resp) return undefined;
  let cur: unknown;
  if (root === "response" || root === "body") cur = resp.body;
  else if (root === "status") cur = resp.status;
  else if (root === "headers") cur = resp.headers;
  else return undefined;
  for (const seg of rest) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function parsePath(expr: string): string[] {
  // Support dot and [n] / ["x"] notation.
  const out: string[] = [];
  let buf = "";
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === ".") {
      if (buf) out.push(buf);
      buf = "";
      i++;
    } else if (c === "[") {
      if (buf) out.push(buf);
      buf = "";
      const end = expr.indexOf("]", i);
      if (end === -1) break;
      let key = expr.slice(i + 1, end).trim();
      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1);
      }
      out.push(key);
      i = end + 1;
    } else {
      buf += c;
      i++;
    }
  }
  if (buf) out.push(buf);
  return out;
}

/** Build a list of resolvable paths from a response body for the variable picker. */
export interface PickerNode {
  label: string;
  token: string;
  preview: string;
  children?: PickerNode[];
}

export function buildPickerTree(blockName: string, response: BlockResponse | undefined): PickerNode[] {
  if (!response) return [];
  const root: PickerNode = {
    label: "response",
    token: `{{${blockName}.response}}`,
    preview: previewOf(response.body),
    children: walk(response.body, `${blockName}.response`),
  };
  const status: PickerNode = {
    label: "status",
    token: `{{${blockName}.status}}`,
    preview: String(response.status),
  };
  return [root, status];
}

function walk(value: unknown, prefix: string): PickerNode[] | undefined {
  if (value === null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v, i) => {
      const token = `{{${prefix}[${i}]}}`;
      return {
        label: `[${i}]`,
        token,
        preview: previewOf(v),
        children: walk(v, `${prefix}[${i}]`),
      };
    });
  }
  return Object.keys(value as object)
    .slice(0, 100)
    .map((k) => {
      const v = (value as Record<string, unknown>)[k];
      const safe = /^[A-Za-z_$][\w$]*$/.test(k) ? `.${k}` : `["${k}"]`;
      const token = `{{${prefix}${safe}}}`;
      return { label: k, token, preview: previewOf(v), children: walk(v, `${prefix}${safe}`) };
    });
}

function previewOf(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return v.length > 40 ? `"${v.slice(0, 40)}…"` : `"${v}"`;
  if (typeof v === "object") return Array.isArray(v) ? `Array(${v.length})` : "Object";
  return String(v);
}
