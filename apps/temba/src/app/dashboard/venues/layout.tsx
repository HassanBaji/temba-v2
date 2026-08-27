"use client";

import type { ReactNode } from "react";

import { OperatorGate } from "~/components/operator-gate";

export default function VenuesLayout({ children }: { children: ReactNode }) {
  return <OperatorGate>{children}</OperatorGate>;
}
