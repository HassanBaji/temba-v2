import { type Metadata } from "next";
import type { ReactNode } from "react";

import { OperatorGate } from "~/components/operator-gate";
import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.webDashboard.operator.levels.title };
}

export default async function OperatorLevelsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const m = await getRequestMessages();
  return (
    <OperatorGate title={m.webDashboard.operator.levels.title}>
      {children}
    </OperatorGate>
  );
}
