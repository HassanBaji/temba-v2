import { type Metadata } from "next";

import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.common.games };
}

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
