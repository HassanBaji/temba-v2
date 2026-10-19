import { redirect } from "next/navigation";

import { venuePath } from "~/lib/console-paths";

export default async function VenueIndexPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = await params;
  redirect(venuePath(venueId));
}
