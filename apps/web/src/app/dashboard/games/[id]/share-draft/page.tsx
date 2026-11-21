"use client";

import { use } from "react";

import { ShareDraftPage } from "~/components/share-draft/share-draft-page";

export default function GameShareDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ShareDraftPage gameId={id} />;
}
