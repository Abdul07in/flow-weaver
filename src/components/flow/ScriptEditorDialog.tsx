import { useEffect, useState } from "react";
import { Lock, Unlock, Play, Check, X as XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runScript } from "@/lib/scripting/sandbox";

export type ScriptKind = "encrypt" | "decrypt";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  kind: ScriptKind;
  value: string;
  onSave: (code: string) => void;
  /** sample input for the Test button */
  sampleArgs: unknown;
}

const ENCRYPT_SNIPPETS: Record<string, string> = {
  Identity: `// Pass through unchanged\nreturn args.payload;`,
  "Base64 wrap": `// Wrap the JSON body in base64\nconst json = JSON.stringify(args.payload);\nreturn { encrypted: btoa(unescape(encodeURIComponent(json))) };`,
  "AES-GCM (Web Crypto)": `// Encrypt with AES-GCM. Replace SECRET with a 32-char key.
const SECRET = "0123456789abcdef0123456789abcdef";
const enc = new TextEncoder();
const keyBytes = enc.encode(SECRET).slice(0, 32);
const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const ct = new Uint8Array(await crypto.subtle.encrypt(
  { name: "AES-GCM", iv },
  key,
  enc.encode(JSON.stringify(args.payload))
));
const b64 = (u) => btoa(String.fromCharCode(...u));
return { iv: b64(iv), data: b64(ct) };`,
  "HMAC sign + add header": `// Sign body with HMAC-SHA256 and attach a header
const SECRET = "your-secret";
const enc = new TextEncoder();
const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const body = JSON.stringify(args.payload);
const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body)));
const hex = [...sig].map(b => b.toString(16).padStart(2, "0")).join("");
return { body, headers: { "X-Signature": hex } };`,
};

const DECRYPT_SNIPPETS: Record<string, string> = {
  Identity: `// Pass through unchanged\nreturn args.response.body;`,
  "Base64 unwrap": `// Reverse the base64 wrap\nconst b64 = args.response.body.encrypted;\nconst json = decodeURIComponent(escape(atob(b64)));\nreturn JSON.parse(json);`,
  "AES-GCM (Web Crypto)": `// Decrypt with AES-GCM. Use the same SECRET as encryption.
const SECRET = "0123456789abcdef0123456789abcdef";
const dec = new TextDecoder();
const enc = new TextEncoder();
const keyBytes = enc.encode(SECRET).slice(0, 32);
const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
const fromB64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const iv = fromB64(args.response.body.iv);
const data = fromB64(args.response.body.data);
const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
return JSON.parse(dec.decode(pt));`,
};

export function ScriptEditorDialog({ open, onOpenChange, kind, value, onSave, sampleArgs }: Props) {
  const [code, setCode] = useState(value);
  const [testResult, setTestResult] = useState<{ ok: boolean; output: string } | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(value);
      setTestResult(null);
    }
  }, [open, value]);

  const snippets = kind === "encrypt" ? ENCRYPT_SNIPPETS : DECRYPT_SNIPPETS;

  const handleTest = async () => {
    setRunning(true);
    setTestResult(null);
    const r = await runScript(code, sampleArgs, { timeoutMs: 2000 });
    setRunning(false);
    setTestResult({
      ok: r.ok,
      output: r.ok ? JSON.stringify(r.value, null, 2) : r.error || "Unknown error",
    });
  };

  const Icon = kind === "encrypt" ? Lock : Unlock;
  const title = kind === "encrypt" ? "Encrypt request" : "Decrypt response";
  const helper =
    kind === "encrypt"
      ? "Receives { payload, context }. Return a value, or { body, headers }, to replace the request body."
      : "Receives { response: { status, headers, body, rawBody } }. Return the decrypted body.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">{helper}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Select onValueChange={(v) => setCode(snippets[v])}>
              <SelectTrigger className="h-8 w-56 text-xs">
                <SelectValue placeholder="Insert template…" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(snippets).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleTest} disabled={running} className="gap-1.5">
              <Play className="h-3 w-3" /> {running ? "Running…" : "Test"}
            </Button>
          </div>

          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            placeholder="// Write your script here. Use `await` for Web Crypto APIs."
            className="min-h-[280px] font-mono text-xs leading-relaxed"
          />

          {testResult && (
            <div
              className={
                "rounded-md border p-3 text-xs " +
                (testResult.ok
                  ? "border-status-success/40 bg-status-success/5"
                  : "border-status-error/40 bg-status-error/5")
              }
            >
              <div className="mb-1 flex items-center gap-1.5 font-medium">
                {testResult.ok ? (
                  <Check className="h-3 w-3 text-status-success" />
                ) : (
                  <XIcon className="h-3 w-3 text-status-error" />
                )}
                {testResult.ok ? "Output" : "Error"}
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono">{testResult.output}</pre>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Runs in a sandboxed iframe with a 2s timeout. Scripts are stored in your browser with the flow.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(code);
              onOpenChange(false);
            }}
          >
            Save script
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
