import { type Metadata } from "next";

import { FootballProfileScreen } from "~/components/settings/football-profile";
import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.you.footballProfile.title };
}

export default function FootballProfilePage() {
  return <FootballProfileScreen />;
}
