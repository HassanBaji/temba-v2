"use client";

import { use } from "react";

import { GamePaymentsPage } from "~/components/game-payments/payments-page";

export default function GamePaymentsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <GamePaymentsPage gameId={id} />;
}
