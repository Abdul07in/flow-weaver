import type { HttpMethod } from "@/lib/flow/types";
import { cn } from "@/lib/utils";

/**
 * Calm, solid pill in the method's brand hue (PlayStation eschews tinted
 * backgrounds — solid color blocks read as more confident).
 */
const COLORS: Record<HttpMethod, string> = {
  GET: "bg-method-get text-white",
  POST: "bg-method-post text-white",
  PUT: "bg-method-put text-white",
  PATCH: "bg-method-patch text-white",
  DELETE: "bg-method-delete text-white",
};

interface Props {
  method: HttpMethod;
  className?: string;
}

export function MethodBadge({ method, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[48px] items-center justify-center rounded-full px-2 text-[10px] font-bold tracking-[0.05em]",
        COLORS[method],
        className,
      )}
    >
      {method}
    </span>
  );
}
