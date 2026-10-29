import { type Metadata } from "next";
import type { ReactNode } from "react";

import { OperatorGate } from "~/components/operator-gate";

export const metadata: Metadata = {
  title: "Player Levels",
};

export default function OperatorLevelsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <OperatorGate title="Player Levels">{children}</OperatorGate>;
}
