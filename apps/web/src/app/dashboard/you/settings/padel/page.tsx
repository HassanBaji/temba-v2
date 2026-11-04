import { type Metadata } from "next";

import { PadelProfileScreen } from "~/components/settings/padel-profile";
import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.you.padel.title };
}

export default function PadelProfilePage() {
  return <PadelProfileScreen />;
}
