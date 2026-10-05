"use client";

import type { ReactNode } from "react";

import { CreateAccessGate } from "~/components/create-access-gate";

export default function NewGameLayout({ children }: { children: ReactNode }) {
  return (
    <CreateAccessGate
      title="Games"
      backHref="/dashboard/games"
      backLabel="Back to Games"
    >
      {children}
    </CreateAccessGate>
  );
}
