import { type Metadata } from "next";

import { PlayWindowsScreen } from "~/components/settings/play-windows-form";
import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.you.playWindows.title };
}

export default function AvailabilityPage() {
  return <PlayWindowsScreen />;
}
