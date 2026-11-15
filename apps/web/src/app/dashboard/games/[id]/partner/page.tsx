import { redirect } from "next/navigation";

import { friendlyGameHomeTarget } from "@repo/domain/friendly-game-partner";
import { gameHomeTargetHref } from "~/lib/game-home-tab";

export default async function PickAPartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(gameHomeTargetHref(friendlyGameHomeTarget(id)));
}
