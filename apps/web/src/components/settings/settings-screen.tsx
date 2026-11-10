"use client";

import type { ReactNode } from "react";

import { DashboardShell } from "~/components/dashboard-shell";
import { PageTitle } from "~/components/layout/page-title";
import { useMessages } from "~/components/locale-provider";
import { BackButton } from "~/components/ui/nav-icon-button";
import { cn } from "~/lib/utils";

export const SETTINGS_PATH = "/dashboard/you/settings";
export const DETAILS_PATH = `${SETTINGS_PATH}/details`;
export const AVAILABILITY_PATH = `${SETTINGS_PATH}/availability`;
export const PHOTO_PATH = `${SETTINGS_PATH}/photo`;

/** The Settings photo screen, returning to `backPath` when done. */
export function photoHref(backPath: string) {
  return `${PHOTO_PATH}?${new URLSearchParams({ back: backPath }).toString()}`;
}

/** A Settings page: back, title, and a column as wide as the page asks for. */
export function SettingsScreen({
  title,
  backHref,
  backLabel,
  width = "form",
  children,
}: {
  title: string;
  backHref: string;
  backLabel?: string;
  width?: "form" | "hub";
  children: ReactNode;
}) {
  const m = useMessages();
  return (
    <DashboardShell width="content" hidePageHeader hideMobileTopBar>
      <div
        className={cn(
          "mx-auto flex w-full min-w-0 flex-col pb-10",
          width === "hub" ? "max-w-[1000px]" : "max-w-[560px]",
        )}
      >
        <header className="mt-6 flex items-center gap-1.5 lg:mt-2">
          <BackButton href={backHref} label={backLabel ?? m.common.back} />
          <PageTitle className="text-ink">{title}</PageTitle>
        </header>
        <div className="pt-[22px]">{children}</div>
      </div>
    </DashboardShell>
  );
}
