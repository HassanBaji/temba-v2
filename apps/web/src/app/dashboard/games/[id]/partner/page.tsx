import { redirect } from "next/navigation";

import { friendlyGameHomeHref } from "@repo/domain/friendly-game-partner";

export default async function PickAPartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(friendlyGameHomeHref(id));
}
