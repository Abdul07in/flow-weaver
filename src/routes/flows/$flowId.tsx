import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Play,
  ArrowLeft,
  Download,
  Upload,
  PlayCircle,
  Loader2,
  Lock,
  Unlock,
  Pencil,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useFlowStore } from "@/store/flowStore";
import { flowRepository } from "@/lib/storage/local";
import { HTTP_METHODS, type HttpMethod } from "@/lib/flow/types";
import { BlockCard } from "@/components/flow/BlockCard";
import { KeyValueEditor } from "@/components/flow/KeyValueEditor";
import { ResponseViewer } from "@/components/flow/ResponseViewer";
import { VariablePicker } from "@/components/flow/VariablePicker";
import { ScriptEditorDialog, type ScriptKind } from "@/components/flow/ScriptEditorDialog";
import { useRunner } from "@/hooks/useRunner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/flows/$flowId")({
  loader: async ({ params }) => {
    const flow = await flowRepository.get(params.flowId);
    if (!flow) throw notFound();
    return { flow };
  },
  component: Editor,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Flow not found</h1>
        <Link to="/" className="mt-3 inline-block text-sm text-primary hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  ),
});

function Editor() {
  const { flow: initial } = Route.useLoaderData();
  const flow = useFlowStore((s) => s.flow);
  const selectedBlockId = useFlowStore((s) => s.selectedBlockId);
  const runStates = useFlowStore((s) => s.runStates);
  const isRunning = useFlowStore((s) => s.isRunning);
  const load = useFlowStore((s) => s.load);
  const setName = useFlowStore((s) => s.setName);
  const addBlock = useFlowStore((s) => s.addBlock);
  const removeBlock = useFlowStore((s) => s.removeBlock);
  const duplicateBlock = useFlowStore((s) => s.duplicateBlock);
  const moveBlock = useFlowStore((s) => s.moveBlock);
  const selectBlock = useFlowStore((s) => s.selectBlock);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const pastLen = useFlowStore((s) => s.past.length);
  const futureLen = useFlowStore((s) => s.future.length);

  const { run, runOne } = useRunner();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load(initial);
  }, [initial, load]);

  // Keyboard shortcuts: Cmd/Ctrl+Enter to run, Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z (or Ctrl+Y) redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "Enter") {
        e.preventDefault();
        void run(0);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [run, undo, redo]);

  if (!flow) return null;

  const selected = flow.blocks.find((b) => b.id === selectedBlockId) ?? flow.blocks[0];
  const selectedIdx = flow.blocks.findIndex((b) => b.id === selected?.id);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(flow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${flow.name.replace(/\s+/g, "-")}.flow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      data.id = flow.id;
      data.updatedAt = Date.now();
      await flowRepository.save(data);
      load(data);
    } catch (e) {
      console.error("Failed to import flow", e);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-3 border-b bg-card/60 px-4 py-2.5 backdrop-blur">
        <Link
          to="/"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Input
          value={flow.name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 max-w-xs border-transparent bg-transparent text-base font-semibold shadow-none focus-visible:border-input focus-visible:bg-background"
        />
        <div className="ml-auto flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importJson(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={undo}
            disabled={pastLen === 0}
            title="Undo (Ctrl/Cmd+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={redo}
            disabled={futureLen === 0}
            title="Redo (Ctrl/Cmd+Shift+Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Import
          </Button>
          <Button variant="ghost" size="sm" onClick={exportJson}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button onClick={() => run(0)} disabled={isRunning} className="gap-1.5">
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            Run flow
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left rail */}
        <aside className="w-72 shrink-0 border-r bg-muted/20">
          <ScrollArea className="h-[calc(100vh-49px)]">
            <div className="space-y-2 p-3">
              <AnimatePresence>
                {flow.blocks.map((b, i) => (
                  <BlockCard
                    key={b.id}
                    block={b}
                    index={i}
                    total={flow.blocks.length}
                    status={runStates[b.id]?.status ?? "idle"}
                    selected={b.id === selected?.id}
                    onSelect={() => selectBlock(b.id)}
                    onMove={(d) => moveBlock(b.id, d)}
                    onDuplicate={() => duplicateBlock(b.id)}
                    onRemove={() => removeBlock(b.id)}
                  />
                ))}
              </AnimatePresence>
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={addBlock}>
                <Plus className="h-3.5 w-3.5" /> Add block
              </Button>
            </div>
          </ScrollArea>
        </aside>

        {/* Main panel */}
        <main className="flex-1 overflow-hidden">
          {selected ? (
            <BlockEditor
              key={selected.id}
              blockIdx={selectedIdx}
              onRunFromHere={() => run(selectedIdx)}
              onRunOne={() => runOne(selectedIdx)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No block selected.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function BlockEditor({
  blockIdx,
  onRunFromHere,
  onRunOne,
}: {
  blockIdx: number;
  onRunFromHere: () => void;
  onRunOne: () => void;
}) {
  const flow = useFlowStore((s) => s.flow)!;
  const block = flow.blocks[blockIdx];
  const runState = useFlowStore((s) => s.runStates[block.id]);
  const updateBlock = useFlowStore((s) => s.updateBlock);
  const updateKV = useFlowStore((s) => s.updateKV);
  const addKV = useFlowStore((s) => s.addKV);
  const removeKV = useFlowStore((s) => s.removeKV);
  const isRunning = useFlowStore((s) => s.isRunning);

  const [bodyError, setBodyError] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("params");
  const [scriptDialog, setScriptDialog] = useState<ScriptKind | null>(null);
  const status = runState?.status ?? "idle";
  const cryptoOn = !!(block.encryptEnabled || block.decryptEnabled);

  // Auto-switch to Response tab when this block starts running or finishes during a run
  useEffect(() => {
    if (status === "running" || status === "success" || status === "error") {
      setTab("response");
    }
  }, [status]);

  const onBodyChange = (v: string) => {
    updateBlock(block.id, { body: v });
    if (!v.trim()) {
      setBodyError(null);
      return;
    }
    try {
      JSON.parse(v);
      setBodyError(null);
    } catch (e) {
      setBodyError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const formatBody = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(block.body), null, 2);
      updateBlock(block.id, { body: formatted });
      setBodyError(null);
    } catch {
      /* ignore */
    }
  };

  const statusRing =
    status === "success"
      ? "ring-status-success/70 shadow-[0_0_0_4px_color-mix(in_oklab,var(--status-success)_15%,transparent)]"
      : status === "error"
        ? "ring-status-error/70 shadow-[0_0_0_4px_color-mix(in_oklab,var(--status-error)_15%,transparent)]"
        : status === "running"
          ? "ring-status-running/70 shadow-[0_0_0_4px_color-mix(in_oklab,var(--status-running)_15%,transparent)] animate-pulse"
          : "ring-transparent";

  return (
    <ScrollArea className="h-[calc(100vh-49px)]">
      <motion.div
        key={block.id}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
        className={cn(
          "mx-auto my-6 max-w-4xl space-y-4 rounded-xl border bg-card p-6 shadow-[var(--shadow-soft)] ring-2 transition-all duration-300",
          statusRing,
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <Input
            value={block.name}
            onChange={(e) => updateBlock(block.id, { name: e.target.value })}
            className="h-9 max-w-xs text-base font-semibold"
          />
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onRunOne}
              disabled={isRunning}
              className="gap-1.5"
              title="Run only this block"
            >
              <Play className="h-3.5 w-3.5" /> Run this
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRunFromHere}
              disabled={isRunning}
              className="gap-1.5"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Run from here
            </Button>
          </div>
        </div>

        {/* Method + URL */}
        <div className="flex gap-2">
          <Select
            value={block.method}
            onValueChange={(v) => updateBlock(block.id, { method: v as HttpMethod })}
          >
            <SelectTrigger className="h-10 w-28 font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HTTP_METHODS.map((m) => (
                <SelectItem key={m} value={m} className="font-bold">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-1 items-center gap-1 rounded-md border bg-background pr-1 focus-within:ring-1 focus-within:ring-ring">
            <Input
              value={block.url}
              onChange={(e) => updateBlock(block.id, { url: e.target.value })}
              placeholder="https://api.example.com/endpoint"
              className="h-10 border-0 font-mono text-sm shadow-none focus-visible:ring-0"
            />
            <VariablePicker onInsert={(t) => updateBlock(block.id, { url: block.url + t })} />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="params">
              Params{" "}
              {block.params.filter((p) => p.enabled && p.key).length > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({block.params.filter((p) => p.enabled && p.key).length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="headers">
              Headers{" "}
              {block.headers.filter((p) => p.enabled && p.key).length > 0 && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({block.headers.filter((p) => p.enabled && p.key).length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="body" disabled={block.method === "GET"}>
              Body
            </TabsTrigger>
            <TabsTrigger value="response">Response</TabsTrigger>
            <TabsTrigger value="crypto">
              <Lock className={cn("mr-1 h-3 w-3", cryptoOn && "text-primary")} />
              Crypto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="params" className="rounded-md border bg-card p-4">
            <KeyValueEditor
              entries={block.params}
              onUpdate={(id, patch) => updateKV(block.id, "params", id, patch)}
              onAdd={() => addKV(block.id, "params")}
              onRemove={(id) => removeKV(block.id, "params", id)}
              keyPlaceholder="param"
              valuePlaceholder="value"
              pickerAvailable={blockIdx > 0}
            />
          </TabsContent>

          <TabsContent value="headers" className="rounded-md border bg-card p-4">
            <KeyValueEditor
              entries={block.headers}
              onUpdate={(id, patch) => updateKV(block.id, "headers", id, patch)}
              onAdd={() => addKV(block.id, "headers")}
              onRemove={(id) => removeKV(block.id, "headers", id)}
              keyPlaceholder="header-name"
              valuePlaceholder="value"
              pickerAvailable={blockIdx > 0}
            />
          </TabsContent>

          <TabsContent value="body" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Raw JSON</span>
              <div className="flex items-center gap-2">
                {bodyError && <span className="text-xs text-status-error">{bodyError}</span>}
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={formatBody}>
                  Format
                </Button>
                {blockIdx > 0 && (
                  <VariablePicker onInsert={(t) => onBodyChange(block.body + t)} />
                )}
              </div>
            </div>
            <Textarea
              value={block.body}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder='{ "key": "value" }'
              className="min-h-[240px] font-mono text-sm"
              spellCheck={false}
            />
          </TabsContent>

          <TabsContent value="response" className="rounded-md border bg-card p-4">
            <ResponseViewer response={runState?.response} status={runState?.status ?? "idle"} />
          </TabsContent>

          <TabsContent value="crypto" className="space-y-3">
            <CryptoRow
              kind="encrypt"
              enabled={!!block.encryptEnabled}
              hasScript={!!block.encryptScript?.trim()}
              onToggle={(v) => updateBlock(block.id, { encryptEnabled: v })}
              onEdit={() => setScriptDialog("encrypt")}
            />
            <CryptoRow
              kind="decrypt"
              enabled={!!block.decryptEnabled}
              hasScript={!!block.decryptScript?.trim()}
              onToggle={(v) => updateBlock(block.id, { decryptEnabled: v })}
              onEdit={() => setScriptDialog("decrypt")}
            />
            <p className="text-[11px] text-muted-foreground">
              Scripts run in a sandboxed iframe. Encrypt transforms the outgoing body before sending;
              Decrypt transforms the response body before it's stored or piped to next blocks.
            </p>
          </TabsContent>
        </Tabs>

        <ScriptEditorDialog
          open={scriptDialog !== null}
          onOpenChange={(o) => !o && setScriptDialog(null)}
          kind={scriptDialog ?? "encrypt"}
          value={
            scriptDialog === "decrypt"
              ? (block.decryptScript ?? "")
              : (block.encryptScript ?? "")
          }
          onSave={(code) => {
            if (scriptDialog === "encrypt") {
              updateBlock(block.id, { encryptScript: code, encryptEnabled: true });
            } else if (scriptDialog === "decrypt") {
              updateBlock(block.id, { decryptScript: code, decryptEnabled: true });
            }
          }}
          sampleArgs={
            scriptDialog === "decrypt"
              ? { response: runState?.response ?? { status: 200, headers: {}, body: { example: true }, rawBody: "" } }
              : {
                  payload: (() => {
                    try {
                      return block.body ? JSON.parse(block.body) : {};
                    } catch {
                      return block.body;
                    }
                  })(),
                  context: { headers: {}, url: block.url, method: block.method, vars: {} },
                }
          }
        />
      </motion.div>
    </ScrollArea>
  );
}

function CryptoRow({
  kind,
  enabled,
  hasScript,
  onToggle,
  onEdit,
}: {
  kind: ScriptKind;
  enabled: boolean;
  hasScript: boolean;
  onToggle: (v: boolean) => void;
  onEdit: () => void;
}) {
  const Icon = kind === "encrypt" ? Lock : Unlock;
  const title = kind === "encrypt" ? "Encrypt request" : "Decrypt response";
  const subtitle =
    kind === "encrypt"
      ? "Transform the outgoing request body."
      : "Transform the incoming response body.";
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-4">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md",
          enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          {title}
          {hasScript && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              script saved
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
        <Pencil className="h-3 w-3" /> {hasScript ? "Edit" : "Add"} script
      </Button>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}
