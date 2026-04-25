import { motion } from "framer-motion";
import { ChevronUp, ChevronDown, Copy, Trash2, Lock } from "lucide-react";
import type { Block, BlockStatus } from "@/lib/flow/types";
import { MethodBadge } from "./MethodBadge";
import { StatusDot } from "./StatusDot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  block: Block;
  index: number;
  total: number;
  status: BlockStatus;
  selected: boolean;
  onSelect: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export function BlockCard({
  block,
  index,
  total,
  status,
  selected,
  onSelect,
  onMove,
  onDuplicate,
  onRemove,
}: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={
        status === "error"
          ? { opacity: 1, y: 0, x: [0, -4, 4, -3, 3, 0] }
          : { opacity: 1, y: 0 }
      }
      transition={{ duration: 0.25 }}
      onClick={onSelect}
      className={cn(
        "group relative cursor-pointer rounded-lg border bg-card px-3 py-2.5 shadow-[var(--shadow-soft)] transition",
        selected ? "border-primary ring-2 ring-primary/20" : "hover:border-foreground/20",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground w-4">{index + 1}</span>
        <MethodBadge method={block.method} />
        <span className="flex-1 truncate text-sm font-medium">{block.name}</span>
        {(block.encryptEnabled || block.decryptEnabled) && (
          <Lock className="h-3 w-3 text-primary" aria-label="Crypto enabled" />
        )}
        <StatusDot status={status} />
      </div>

      <div className="mt-2 flex items-center justify-end gap-0.5">
        <IconBtn onClick={() => onMove(-1)} disabled={index === 0}>
          <ChevronUp className="h-3 w-3" />
        </IconBtn>
        <IconBtn onClick={() => onMove(1)} disabled={index === total - 1}>
          <ChevronDown className="h-3 w-3" />
        </IconBtn>
        <IconBtn onClick={onDuplicate}>
          <Copy className="h-3 w-3" />
        </IconBtn>
        <IconBtn onClick={onRemove}>
          <Trash2 className="h-3 w-3" />
        </IconBtn>
      </div>
    </motion.div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}
