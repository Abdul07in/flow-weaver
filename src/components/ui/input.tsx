import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * PlayStation-style input: tight 3px radius, calm border, brand-blue 2px focus
 * ring delivered as box-shadow (no border-color shift).
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[3px] border border-input bg-background px-3 py-1 text-sm text-foreground transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-foreground/60 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--primary)] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
