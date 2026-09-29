import type { ReactNode } from "react";

import { PageTitle } from "~/components/layout/page-title";
import { cn } from "~/lib/utils";

/**
 * The detail-page header for Groups, Communities, Teams and Venues: a leading
 * visual, the h1, badges and a meta line, then actions. Below `sm` the
 * primary action takes its own full-width row under the header and only the
 * overflow menu stays beside the title, so a 360px title is never squeezed.
 */
export function EntityHomeHeader({
  leading,
  title,
  badges,
  meta,
  metaClassName,
  primaryAction,
  menu,
  className,
}: {
  leading?: ReactNode;
  title: string;
  badges?: ReactNode;
  meta?: ReactNode;
  metaClassName?: string;
  primaryAction?: ReactNode;
  menu?: ReactNode;
  className?: string;
}) {
  return (
    <header
      data-slot="entity-home-header"
      className={cn("flex flex-wrap items-start gap-x-3 gap-y-4", className)}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1 space-y-2">
        <PageTitle>{title}</PageTitle>
        {badges ? (
          <div className="flex flex-wrap items-center gap-2">{badges}</div>
        ) : null}
        {meta ? (
          <div
            className={cn(
              "text-meta text-muted-foreground min-w-0 break-words",
              metaClassName,
            )}
          >
            {meta}
          </div>
        ) : null}
      </div>
      {primaryAction ? (
        <div className="order-last basis-full sm:order-none sm:shrink-0 sm:basis-auto [&>*]:w-full sm:[&>*]:w-auto">
          {primaryAction}
        </div>
      ) : null}
      {menu ? <div className="shrink-0">{menu}</div> : null}
    </header>
  );
}
