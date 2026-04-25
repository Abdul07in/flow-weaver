/**
 * Sandboxed JS execution via a hidden iframe with `sandbox="allow-scripts"`.
 * The iframe has no same-origin access — it cannot touch app DOM, cookies, or storage.
 * User scripts are executed as `new Function('args', userCode)` and must `return` a value.
 */

let iframe: HTMLIFrameElement | null = null;
let ready: Promise<void> | null = null;
const pending = new Map<string, (msg: { ok: boolean; value?: unknown; error?: string }) => void>();

const SANDBOX_HTML = `<!doctype html><html><body><script>
(function(){
  window.addEventListener('message', async function(ev){
    var data = ev.data || {};
    if (data.type !== 'run') return;
    var id = data.id;
    try {
      var fn = new Function('args', '"use strict";\\nreturn (async function(){\\n' + data.code + '\\n})();');
      var result = await fn(data.args);
      parent.postMessage({ type: 'result', id: id, ok: true, value: result }, '*');
    } catch (e) {
      parent.postMessage({ type: 'result', id: id, ok: false, error: (e && e.message) || String(e) }, '*');
    }
  });
  parent.postMessage({ type: 'ready' }, '*');
})();
<\/script></body></html>`;

function ensureIframe(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Sandbox unavailable on server"));
  if (ready) return ready;
  ready = new Promise((resolve) => {
    iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden;";
    iframe.srcdoc = SANDBOX_HTML;
    const onMsg = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "ready") {
        resolve();
        return;
      }
      if (data.type === "result" && typeof data.id === "string") {
        const cb = pending.get(data.id);
        if (cb) {
          pending.delete(data.id);
          cb({ ok: !!data.ok, value: data.value, error: data.error });
        }
      }
    };
    window.addEventListener("message", onMsg);
    document.body.appendChild(iframe);
  });
  return ready;
}

export interface ScriptResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: string;
}

export async function runScript<T = unknown>(
  code: string,
  args: unknown,
  opts: { timeoutMs?: number } = {},
): Promise<ScriptResult<T>> {
  const timeoutMs = opts.timeoutMs ?? 2000;
  await ensureIframe();
  const id = Math.random().toString(36).slice(2);
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        resolve({ ok: false, error: `Script timed out after ${timeoutMs}ms` });
      }
    }, timeoutMs);
    pending.set(id, (msg) => {
      clearTimeout(t);
      resolve(msg as ScriptResult<T>);
    });
    iframe?.contentWindow?.postMessage({ type: "run", id, code, args }, "*");
  });
}
