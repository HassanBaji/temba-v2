import { type Metadata } from "next";
import type { ReactNode } from "react";

import { OperatorGate } from "~/components/operator-gate";

export const metadata: Metadata = {
  title: "Venues",
};

export default function VenuesLayout({ children }: { children: ReactNode }) {
  return <OperatorGate>{children}</OperatorGate>;
}
