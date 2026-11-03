import { type Metadata } from "next";

import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.common.settings };
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
