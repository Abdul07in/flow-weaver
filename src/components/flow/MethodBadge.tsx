import type { HttpMethod } from "@/lib/flow/types";
import { cn } from "@/lib/utils";

const COLORS: Record<HttpMethod, string> = {
  GET: "bg-method-get/10 text-method-get",
  POST: "bg-method-post/10 text-method-post",
  PUT: "bg-method-put/15 text-method-put",
  PATCH: "bg-method-patch/10 text-method-patch",
  DELETE: "bg-method-delete/10 text-method-delete",
};

interface Props {
  method: HttpMethod;
  className?: string;
}

export function MethodBadge({ method, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[44px] items-center justify-center rounded px-1.5 text-[10px] font-bold tracking-wide",
        COLORS[method],
        className,
      )}
    >
      {method}
    </span>
  );
}
