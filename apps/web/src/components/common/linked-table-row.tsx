"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

import { cn } from "~/lib/utils";

// A whole-row link for tables. A stretched link (`after:absolute after:inset-0`)
// needs `position: relative` on the <tr>, which iOS Safari ignores: the overlay
// then covers the page and every tap opens the last row's link. The row's own
// <Link> stays for keyboard and screen-reader users.
export function LinkedTableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function onClick(event: MouseEvent<HTMLTableRowElement>) {
    if ((event.target as Element).closest("a, button")) return;
    router.push(href);
  }

  return (
    <tr className={cn("cursor-pointer", className)} onClick={onClick}>
      {children}
    </tr>
  );
}
