"use client";

import { AppShell } from "~/components/layout/app-shell";

export function DashboardShell({
  children,
  title = "Home",
  description,
  action,
  width,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  width?: "content" | "wide";
}) {
  return (
    <AppShell
      title={title}
      description={description}
      action={action}
      width={width}
    >
      {children}
    </AppShell>
  );
}
