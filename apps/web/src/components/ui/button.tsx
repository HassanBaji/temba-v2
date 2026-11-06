import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";
import { Slot } from "radix-ui";

import { cn } from "~/lib/utils";

// Keeps the visual size but grows the pointer target to at least 44×44 (WCAG
// 2.5.8) with a centred pseudo-element; clipped by overflow-hidden ancestors.
// Centring is physical (left-1/2 with -translate-x-1/2) so it holds in RTL.
const touchHitArea =
  "relative after:absolute after:left-1/2 after:top-1/2 after:size-full after:min-h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-control-edge bg-control bg-clip-padding text-on-control hover:border-control-edge/90 hover:bg-control/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline underline-offset-4",
        inverse:
          "bg-focus-control text-on-focus-control hover:bg-focus-control/90",
        "outline-inverse":
          "border border-dimrule bg-transparent text-on-focus hover:bg-raised",
      },
      size: {
        default: "h-11 min-h-11 px-4 py-2 has-[>svg]:px-3",
        xs: cn(
          touchHitArea,
          "h-6 gap-1 rounded-md px-2 text-eyebrow has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        ),
        sm: cn(
          touchHitArea,
          "h-9 min-h-9 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        ),
        lg: "h-13 min-h-13 rounded-lg px-6 text-base has-[>svg]:px-4",
        icon: "size-11",
        "icon-xs": cn(
          touchHitArea,
          "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        ),
        "icon-sm": cn(touchHitArea, "size-8"),
        "icon-lg": cn(touchHitArea, "size-10"),
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  pending = false,
  pendingLabel,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    pending?: boolean;
    pendingLabel?: string;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  const showPending = pending && !asChild;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      {...props}
    >
      {showPending ? (
        <>
          <Loader2Icon aria-hidden="true" className="animate-spin" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants, touchHitArea };
