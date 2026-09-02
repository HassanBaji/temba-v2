import type { ReactNode } from "react";
import { Archive } from "lucide-react";

import { cn } from "~/lib/utils";

export function SoftArchiveBanner({
  heading,
  children,
  className,
}: {
  heading: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      role="status"
      className={cn("bg-muted rounded-xl p-4 md:p-5", className)}
    >
      <div className="flex gap-3">
        <Archive
          aria-hidden="true"
          className="text-muted-foreground mt-0.5 size-5 shrink-0"
          strokeWidth={2}
        />
        <div className="min-w-0">
          <h3 className="text-title font-semibold tracking-[-0.01em]">
            {heading}
          </h3>
          <div className="text-body text-muted-foreground mt-1">{children}</div>
        </div>
      </div>
    </section>
  );
}
