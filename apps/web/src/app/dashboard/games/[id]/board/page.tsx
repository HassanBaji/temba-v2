"use client";

import { use } from "react";

import { BoardControlPage } from "~/components/live-board/board-control";

export default function GameBoardRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <BoardControlPage gameId={id} />;
}
