import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function JsonTree({ data, depth = 0 }: { data: unknown; depth?: number }) {
  return <Node value={data} keyName={null} depth={depth} />;
}

function Node({ value, keyName, depth }: { value: unknown; keyName: string | null; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);

  if (!isObject) {
    return (
      <div className="font-mono text-xs flex gap-1.5" style={{ paddingLeft: depth * 14 }}>
        {keyName !== null && <span className="text-method-patch">"{keyName}":</span>}
        <Primitive value={value} />
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div className="font-mono text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 hover:bg-accent rounded px-0.5"
        style={{ paddingLeft: depth * 14 }}
      >
        <ChevronRight className={cn("h-3 w-3 transition", open && "rotate-90")} />
        {keyName !== null && <span className="text-method-patch">"{keyName}":</span>}
        <span className="text-muted-foreground">
          {isArray ? `Array(${entries.length})` : `{${entries.length}}`}
        </span>
      </button>
      {open && (
        <div>
          {entries.map(([k, v]) => (
            <Node key={k} value={v} keyName={k} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span className="text-muted-foreground">null</span>;
  if (typeof value === "string") return <span className="text-method-get">"{value}"</span>;
  if (typeof value === "number") return <span className="text-method-post">{value}</span>;
  if (typeof value === "boolean") return <span className="text-method-delete">{String(value)}</span>;
  return <span>{String(value)}</span>;
}
