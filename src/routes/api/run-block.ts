import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const RequestSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.string().url().max(2048),
  headers: z.record(z.string(), z.string()).default({}),
  body: z.string().optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const Route = createFileRoute("/api/run-block")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        let parsed: z.infer<typeof RequestSchema>;
        try {
          const raw = await request.json();
          parsed = RequestSchema.parse(raw);
        } catch (err) {
          return json(
            {
              status: 0,
              statusText: "Bad Request",
              ok: false,
              headers: {},
              body: null,
              rawBody: "",
              durationMs: 0,
              sizeBytes: 0,
              error: err instanceof Error ? err.message : "Invalid request",
            },
            200,
          );
        }

        const start = Date.now();
        try {
          const init: RequestInit = {
            method: parsed.method,
            headers: parsed.headers,
            body: parsed.body,
          };
          const res = await fetch(parsed.url, init);
          const rawBody = await res.text();
          const durationMs = Date.now() - start;
          const headers: Record<string, string> = {};
          res.headers.forEach((v, k) => (headers[k] = v));
          let body: unknown = rawBody;
          try {
            body = rawBody ? JSON.parse(rawBody) : null;
          } catch {
            /* keep raw text */
          }
          return json({
            status: res.status,
            statusText: res.statusText,
            ok: res.ok,
            headers,
            body,
            rawBody,
            durationMs,
            sizeBytes: new TextEncoder().encode(rawBody).length,
          });
        } catch (err) {
          return json({
            status: 0,
            statusText: "Network Error",
            ok: false,
            headers: {},
            body: null,
            rawBody: "",
            durationMs: Date.now() - start,
            sizeBytes: 0,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
  },
});
