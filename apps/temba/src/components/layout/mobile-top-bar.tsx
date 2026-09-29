"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useCreateAccess } from "~/components/create-access-gate";
import { BackButton } from "~/components/ui/nav-icon-button";
import { detailBackHref } from "~/lib/dashboard-paths";
import { pageGutterX } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

export function MobileTopBar({
  title,
  backHref,
  action,
  icon,
  isSubPage,
  titleAs: Title = "h1",
}: {
  title?: string;
  icon?: ReactNode;
  backHref?: string;
  action?: ReactNode;
  isSubPage?: boolean;
  titleAs?: "h1" | "p";
}) {
  return (
    <header
      className={cn(
        "bg-background sticky top-0 z-40 flex h-[var(--mobile-top-bar-height)] shrink-0 items-center justify-between gap-2 pb-2 pt-4 lg:hidden",
        pageGutterX,
        // Inset shadow, not a border, so the hairline stays inside --mobile-top-bar-height.
        isSubPage && "shadow-[inset_0_-1px_0_var(--border)]",
      )}
    >
      {backHref && <BackButton href={backHref} />}
      {title ? (
        <Title
          className={cn(
            "min-w-0 flex-1 truncate text-3xl font-bold tracking-[-0.01em]",
            isSubPage && "text-foreground text-center text-base",
          )}
        >
          {title}
        </Title>
      ) : null}

      {icon ? <div className="size-11 shrink-0">{icon}</div> : null}
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function MobileTopBarFromPath({
  title,
  icon,
  action,
  isSubPage,
  titleAs,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  isSubPage?: boolean;
  titleAs?: "h1" | "p";
}) {
  const pathname = usePathname();
  const { isLoaded, hasCreateAccess } = useCreateAccess();
  return (
    <MobileTopBar
      isSubPage={isSubPage}
      title={title}
      backHref={detailBackHref(pathname, isLoaded && hasCreateAccess)}
      action={action}
      icon={icon}
      titleAs={titleAs}
    />
  );
}
