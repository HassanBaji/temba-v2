import { type Metadata } from "next";

import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.common.groups };
}

export default function GroupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
