import { type Metadata } from "next";
import type { ReactNode } from "react";

import { OperatorGate } from "~/components/operator-gate";

export const metadata: Metadata = {
  title: "Verify Groups",
};

export default function OperatorGroupsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <OperatorGate title="Verify Groups">{children}</OperatorGate>;
}
