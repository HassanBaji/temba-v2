"use client";

import { TvIcon } from "lucide-react";
import Link from "next/link";

import {
  formatBoardCode,
  liveBoardScene,
  type LiveBoardKind,
} from "@repo/domain/live-board";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { gameBoardHref } from "~/lib/dashboard-paths";

import { useBoardNow } from "./use-board-now";
import type { LiveBoardControlState } from "./use-live-board";

/**
 * On the Game screen while its board is on, for the Organizer: which TV it
 * is on and what that TV shows, with the control one tap away.
 */
export function OnTvCard({
  gameId,
  kind,
  board,
  offsetMs,
}: {
  gameId: string;
  kind: LiveBoardKind;
  board: LiveBoardControlState;
  offsetMs: number;
}) {
  const m = useMessages().liveBoard;
  const now = useBoardNow(offsetMs);
  const [first] = board.tvs;
  const tv =
    board.tvs.length > 1 ? m.card.tvCount(board.tvs.length) : first?.name;
  const line = !tv
    ? m.card.waiting(formatBoardCode(board.code))
    : kind === "social"
      ? m.card.showing(
          tv,
          m.screens[liveBoardScene(board, now).screen],
          board.rotate,
        )
      : m.card.showingOne(tv);
  return (
    <section
      aria-label={m.card.title}
      className="border-rule rounded-card flex items-center gap-3.5 border px-4 py-3.5"
    >
      <span className="border-rule flex size-11 flex-none items-center justify-center rounded-[10px] border">
        <TvIcon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">
          {tv ? m.card.title : m.card.waitingTitle}
        </p>
        <p className="text-muted-foreground text-eyebrow mt-0.5">{line}</p>
      </div>
      <Button asChild className="flex-none">
        <Link href={gameBoardHref(gameId)}>{m.card.control}</Link>
      </Button>
    </section>
  );
}
