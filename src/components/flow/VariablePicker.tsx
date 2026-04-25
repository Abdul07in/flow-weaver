import { useState } from "react";
import { ChevronRight, Braces } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFlowStore } from "@/store/flowStore";
import { buildPickerTree, type PickerNode } from "@/lib/flow/template";
import { cn } from "@/lib/utils";

interface Props {
  onInsert: (token: string) => void;
}

export function VariablePicker({ onInsert }: Props) {
  const flow = useFlowStore((s) => s.flow);
  const selectedId = useFlowStore((s) => s.selectedBlockId);
  const runStates = useFlowStore((s) => s.runStates);
  const [open, setOpen] = useState(false);

  if (!flow) return null;
  const idx = flow.blocks.findIndex((b) => b.id === selectedId);
  const prior = idx > 0 ? flow.blocks.slice(0, idx) : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
          title="Insert variable from previous response"
        >
          <Braces className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b px-3 py-2 text-xs font-semibold">Insert from previous response</div>
        <ScrollArea className="h-72">
          <div className="p-2">
            {prior.length === 0 && (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                No prior blocks. Add a block before this one to chain data.
              </div>
            )}
            {prior.map((b) => (
              <BlockSection
                key={b.id}
                blockName={b.name}
                tree={buildPickerTree(b.name, runStates[b.id]?.response)}
                hasResponse={!!runStates[b.id]?.response}
                onInsert={(t) => {
                  onInsert(t);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function BlockSection({
  blockName,
  tree,
  hasResponse,
  onInsert,
}: {
  blockName: string;
  tree: PickerNode[];
  hasResponse: boolean;
  onInsert: (t: string) => void;
}) {
  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {blockName}
      </div>
      {!hasResponse ? (
        <div className="px-2 py-1 text-xs text-muted-foreground italic">Run flow once to see paths.</div>
      ) : (
        tree.map((n) => <Node key={n.token} node={n} depth={0} onInsert={onInsert} />)
      )}
    </div>
  );
}

function Node({ node, depth, onInsert }: { node: PickerNode; depth: number; onInsert: (t: string) => void }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = !!node.children?.length;
  return (
    <div>
      <button
        onClick={() => (hasChildren ? setOpen(!open) : onInsert(node.token))}
        onDoubleClick={() => onInsert(node.token)}
        className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-xs hover:bg-accent"
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        <ChevronRight
          className={cn("h-3 w-3 shrink-0 transition", open && "rotate-90", !hasChildren && "opacity-0")}
        />
        <span className="font-mono text-foreground">{node.label}</span>
        <span className="ml-auto truncate text-muted-foreground">{node.preview}</span>
      </button>
      {open && hasChildren && (
        <div>
          {node.children!.map((c) => (
            <Node key={c.token} node={c} depth={depth + 1} onInsert={onInsert} />
          ))}
        </div>
      )}
    </div>
  );
}
