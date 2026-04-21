import { motion } from "framer-motion";
import type { BlockStatus } from "@/lib/flow/types";
import { cn } from "@/lib/utils";

const COLORS: Record<BlockStatus, string> = {
  idle: "bg-status-idle",
  running: "bg-status-running",
  success: "bg-status-success",
  error: "bg-status-error",
};

export function StatusDot({ status, className }: { status: BlockStatus; className?: string }) {
  return (
    <motion.span
      key={status}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("relative inline-block h-2 w-2 rounded-full", COLORS[status], className)}
    >
      {status === "running" && (
        <span className="absolute inset-0 animate-ping rounded-full bg-status-running opacity-75" />
      )}
    </motion.span>
  );
}
