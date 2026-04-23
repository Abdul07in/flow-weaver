import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * PlayStation-inspired button.
 *
 * Signature hover move on `default` / `commerce`:
 *   - background swaps to PlayStation Cyan (`primary-hover`)
 *   - 2px white border appears
 *   - 2px PlayStation Blue outer ring blooms
 *   - the entire button scales up to 1.05× (a calmer take on Sony's 1.2×
 *     so it doesn't break dense product UI)
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium tracking-wide transition-all duration-200 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:opacity-60 will-change-transform",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-2 border-transparent rounded-full shadow-[var(--shadow-soft)] hover:bg-primary-hover hover:border-white hover:shadow-[0_0_0_2px_var(--primary),var(--shadow-elevated)] hover:scale-[1.05] focus-visible:shadow-[0_0_0_2px_var(--primary)]",
        commerce:
          "bg-commerce text-commerce-foreground border-2 border-transparent rounded-full font-bold tracking-wider hover:bg-primary-hover hover:border-white hover:shadow-[0_0_0_2px_var(--primary)] hover:scale-[1.05] active:bg-commerce/80",
        destructive:
          "bg-destructive text-destructive-foreground rounded-full hover:bg-primary-hover hover:border-2 hover:border-white hover:shadow-[0_0_0_2px_var(--primary)] hover:scale-[1.05]",
        outline:
          "border border-border bg-background text-foreground rounded-full hover:bg-primary-hover hover:text-white hover:border-white hover:shadow-[0_0_0_2px_var(--primary)] hover:scale-[1.05]",
        secondary:
          "bg-secondary text-secondary-foreground rounded-full hover:bg-primary-hover hover:text-white hover:scale-[1.05]",
        ghost:
          "rounded-md text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:text-primary-hover hover:underline rounded-none",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
