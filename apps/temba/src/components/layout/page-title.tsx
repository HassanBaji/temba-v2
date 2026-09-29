import type { ComponentPropsWithoutRef } from "react";

import { cn } from "~/lib/utils";

type PageTitleVariant = "standard" | "hero" | "compact";

const pageTitleVariants: Record<PageTitleVariant, string> = {
  standard: "text-h2 lg:text-h1 font-bold tracking-[-0.02em]",
  // Editorial display title on ink heroes and the create flow.
  hero: "font-expanded text-display leading-none tracking-[-0.03em]",
  // Centred sub-page title in the mobile top bar.
  compact: "text-lead text-center font-semibold tracking-[-0.01em]",
};

export function PageTitle({
  as: Heading = "h1",
  variant = "standard",
  className,
  ...props
}: ComponentPropsWithoutRef<"h1"> & {
  as?: "h1" | "h2" | "h3" | "p";
  variant?: PageTitleVariant;
}) {
  return (
    <Heading
      data-slot="page-title"
      className={cn(
        "min-w-0 break-words",
        pageTitleVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
