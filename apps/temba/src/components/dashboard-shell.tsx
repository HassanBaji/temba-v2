"use client";

import { AppShell } from "~/components/layout/app-shell";

export function DashboardShell({
  children,
  title,
  icon,
  description,
  action,
  width,
  hidePageHeader,
  hidePageTitle,
  hideMobileTopBar,
}: {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  width?: "content" | "wide";
  hidePageHeader?: boolean;
  hidePageTitle?: boolean;
  hideMobileTopBar?: boolean;
}) {
  return (
    <AppShell
      title={title}
      icon={icon}
      description={description}
      action={action}
      width={width}
      hidePageHeader={hidePageHeader}
      hideMobileTopBar={hideMobileTopBar}
    >
      {children}
    </AppShell>
  );
}
