"use client";

import { TvIcon } from "lucide-react";
import * as React from "react";

import { useMessages } from "~/components/locale-provider";
import type { GameActionsSheetRow } from "~/components/games/game-actions-sheet";

import { OnTvCard } from "./on-tv-card";
import { ShowOnTvSheet } from "./show-on-tv-sheet";
import { useLiveBoard } from "./use-live-board";

/**
 * Show on TV on a Game screen, for its Organizer: the menu row, the sheet it
 * opens and the On TV card. Everything is null where the Game has no board
 * or the viewer does not run it.
 */
export function useGameTv(gameId: string, organizes: boolean) {
  const m = useMessages().liveBoard;
  const live = useLiveBoard(gameId, organizes);
  const [open, setOpen] = React.useState(false);
  const kind = organizes ? (live.state?.kind ?? null) : null;
  const board = kind ? live.board : null;
  const offered = kind != null && (board != null || live.state?.canStart);

  const menuRow: GameActionsSheetRow | null = offered
    ? {
        key: "show_on_tv",
        label: m.menu.showOnTv,
        hint: m.menu.showOnTvHint,
        icon: TvIcon,
        onSelect: () => setOpen(true),
      }
    : null;
  const card =
    kind && board ? (
      <OnTvCard
        board={board}
        gameId={gameId}
        kind={kind}
        offsetMs={live.offsetMs}
      />
    ) : null;
  const sheet = kind ? (
    <ShowOnTvSheet
      gameId={gameId}
      kind={kind}
      live={live}
      onOpenChange={setOpen}
      open={open}
    />
  ) : null;
  return { menuRow, card, sheet };
}

export type GameTv = ReturnType<typeof useGameTv>;

const GameTvCardContext = React.createContext<React.ReactNode>(null);

/** Hands the On TV card to whichever Social screen is showing, under its header. */
export function GameTvCardProvider({
  card,
  children,
}: {
  card: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <GameTvCardContext.Provider value={card}>
      {children}
    </GameTvCardContext.Provider>
  );
}

export function GameTvCardSlot({ className }: { className?: string }) {
  const card = React.useContext(GameTvCardContext);
  return card ? <div className={className}>{card}</div> : null;
}
