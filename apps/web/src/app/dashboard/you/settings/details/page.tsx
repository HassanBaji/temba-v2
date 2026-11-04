import { type Metadata } from "next";

import { DetailsScreen } from "~/components/settings/details-form";
import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.you.details.title };
}

export default function DetailsPage() {
  return <DetailsScreen />;
}
