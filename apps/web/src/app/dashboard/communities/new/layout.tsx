"use client";

import type { ReactNode } from "react";

import { CreateAccessGate } from "~/components/create-access-gate";
import { useMessages } from "~/components/locale-provider";

export default function NewCommunityLayout({
  children,
}: {
  children: ReactNode;
}) {
  const m = useMessages();
  return (
    <CreateAccessGate
      title={m.common.communities}
      backHref="/dashboard"
      backLabel={m.webDashboard.backToHome}
    >
      {children}
    </CreateAccessGate>
  );
}
