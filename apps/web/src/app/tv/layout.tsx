import { type Metadata } from "next";

import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return {
    title: m.liveBoard.tv.title,
    robots: { index: false, follow: false },
  };
}

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return children;
}
