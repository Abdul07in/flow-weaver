import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import type { BlockResponse, BlockStatus } from "@/lib/flow/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JsonTree } from "./JsonTree";
import { cn } from "@/lib/utils";

interface Props {
  response?: BlockResponse;
  status: BlockStatus;
}

export function ResponseViewer({ response, status }: Props) {
  const [copied, setCopied] = useState(false);

  if (status === "idle" && !response) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Run the flow to see the response.
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Running…
      </div>
    );
  }
  if (!response) return null;

  const statusColor = response.ok
    ? "bg-status-success/10 text-status-success"
    : "bg-status-error/10 text-status-error";

  const copy = async () => {
    await navigator.clipboard.writeText(response.rawBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-3 text-xs">
        <span className={cn("rounded px-2 py-0.5 font-semibold", statusColor)}>
          {response.status} {response.statusText}
        </span>
        <span className="text-muted-foreground">{response.durationMs} ms</span>
        <span className="text-muted-foreground">{formatBytes(response.sizeBytes)}</span>
        <Button variant="ghost" size="sm" onClick={copy} className="ml-auto h-7 gap-1 text-xs">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {response.error && (
        <div className="rounded-md border border-status-error/30 bg-status-error/5 p-3 text-xs text-status-error">
          {response.error}
        </div>
      )}

      <Tabs defaultValue="body">
        <TabsList>
          <TabsTrigger value="body" className="text-xs">
            Body (JSON)
          </TabsTrigger>
          <TabsTrigger value="raw" className="text-xs">
            Raw
          </TabsTrigger>
          <TabsTrigger value="headers" className="text-xs">
            Headers
          </TabsTrigger>
        </TabsList>
        <TabsContent value="body">
          <ScrollArea className="h-80 rounded-md border bg-muted/30 p-3">
            <JsonTree data={response.body} />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="raw">
          <ScrollArea className="h-80 rounded-md border bg-muted/30">
            <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">{response.rawBody}</pre>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="headers">
          <ScrollArea className="h-80 rounded-md border">
            <div className="divide-y text-xs">
              {Object.entries(response.headers).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[140px_1fr] gap-2 px-3 py-1.5">
                  <span className="font-medium text-muted-foreground truncate">{k}</span>
                  <span className="font-mono break-all">{v}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}
