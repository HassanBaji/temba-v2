"use client";

import type { ReactNode } from "react";

import { useTextDirection } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

/**
 * A standalone score or record such as "6–4 7–5" or "3 won, 2 lost". The
 * isolate in the page's direction keeps a neighbouring Latin name from
 * turning the digits LTR, so in Arabic the viewer's (or slot 1's) number sits
 * on the start side, as the names do.
 */
export function ScoreText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { direction } = useTextDirection();
  return (
    <bdi dir={direction} className={cn("tabular-nums", className)}>
      {children}
    </bdi>
  );
}
