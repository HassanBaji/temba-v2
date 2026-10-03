"use client";

import type { ReactNode } from "react";

import { CreateAccessGate } from "~/components/create-access-gate";

export default function NewCommunityLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CreateAccessGate
      title="Communities"
      backHref="/dashboard"
      backLabel="Back to Home"
    >
      {children}
    </CreateAccessGate>
  );
}
