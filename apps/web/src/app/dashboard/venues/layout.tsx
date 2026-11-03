import { type Metadata } from "next";
import type { ReactNode } from "react";

import { OperatorGate } from "~/components/operator-gate";
import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.webDashboard.meta.venues };
}

export default async function VenuesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const m = await getRequestMessages();
  return <OperatorGate title={m.webDashboard.meta.venues}>{children}</OperatorGate>;
}
