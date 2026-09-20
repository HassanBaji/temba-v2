"use client";

import type { ReactNode } from "react";

import { CreateAccessGate } from "~/components/create-access-gate";

export default function NewTournamentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CreateAccessGate
      title="Create tournament"
      backHref="/dashboard/games"
      backLabel="Back to Games"
    >
      {children}
    </CreateAccessGate>
  );
}
