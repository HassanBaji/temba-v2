"use client";

import type { ReactNode } from "react";

import { CreateAccessGate } from "~/components/create-access-gate";

export default function NewGroupLayout({ children }: { children: ReactNode }) {
  return (
    <CreateAccessGate
      title="Groups"
      backHref="/dashboard/groups"
      backLabel="Back to Groups"
    >
      {children}
    </CreateAccessGate>
  );
}
