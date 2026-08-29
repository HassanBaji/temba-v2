"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { pageGutterX } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

export function MobileTopBar({
  title,
  backHref,
  action,
}: {
  title: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "border-border bg-background sticky top-0 z-40 flex min-h-11 items-center gap-2 border-b py-2 lg:hidden",
        pageGutterX,
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Back"
          className="text-foreground focus-visible:ring-ring/50 inline-flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
        >
          <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={2} />
        </Link>
      ) : (
        <span className="size-11 shrink-0" aria-hidden="true" />
      )}
      <p className="text-title min-w-0 flex-1 truncate font-semibold tracking-[-0.01em]">
        {title}
      </p>
      <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-end">
        {action}
      </div>
    </header>
  );
}

export function detailBackHref(pathname: string | null): string | undefined {
  if (!pathname) {
    return undefined;
  }
  if (/^\/dashboard\/groups\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/groups";
  }
  if (/^\/dashboard\/communities\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/communities";
  }
  if (/^\/dashboard\/teams\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/teams";
  }
  if (/^\/dashboard\/venues\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/venues";
  }
  if (/^\/dashboard\/games\/(?!new$)[^/]+/.test(pathname)) {
    return "/dashboard/games";
  }
  return undefined;
}

export function MobileTopBarFromPath({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <MobileTopBar
      title={title}
      backHref={detailBackHref(pathname)}
      action={action}
    />
  );
}
