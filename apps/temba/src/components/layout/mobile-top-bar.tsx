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
  icon,
}: {
  title?: string;
  icon?: ReactNode;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "bg-card sticky top-0 z-40 flex min-h-11 items-center gap-2 py-2 pt-4 lg:hidden",
        pageGutterX,
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          aria-label="Back"
          className="text-foreground focus-visible:ring-ring/50 inline-flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
        >
          <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={2} />
        </Link>
      )}
      {title ? (
        <p className="min-w-0 flex-1 truncate text-3xl font-bold tracking-[-0.01em]">
          {title}
        </p>
      ) : null}
      {icon ? <div className="size-11 shrink-0">{icon}</div> : null}
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
  icon,
  action,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <MobileTopBar
      title={title}
      backHref={detailBackHref(pathname)}
      action={action}
      icon={icon}
    />
  );
}
