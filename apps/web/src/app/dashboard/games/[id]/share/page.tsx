"use client";

import { use } from "react";

import { ShareResultPage } from "~/components/share-result/share-result-page";

export default function GameShareResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ShareResultPage gameId={id} />;
}
