"use client";

import type {
  PlayedColumn,
  PlayedFact,
  PlayedRow,
} from "@repo/domain/played-game";
import { Share } from "lucide-react";
import Link from "next/link";

import { FootballInfoRows } from "~/components/games/football-info-rows";
import { Button } from "~/components/ui/button";

import { PlayedColumns } from "./played-columns";
import { PlayedHero, type PlayedHeroProps } from "./played-hero";

export function shareResultHref(gameId: string) {
  return `/dashboard/games/${gameId}/share`;
}

export type PlayedGameViewProps = {
  gameId: string;
  hero: Omit<PlayedHeroProps, "children" | "actions">;
  menu?: React.ReactNode;
  board: React.ReactNode;
  columns: [PlayedColumn, PlayedColumn];
  unplaced?: PlayedRow[];
  facts: PlayedFact[];
  onPressPlayer?: (row: PlayedRow) => void;
};

/** A played Game: the result on black, the roster, the facts, then share. */
export function PlayedGameView({
  gameId,
  hero,
  menu,
  board,
  columns,
  unplaced,
  facts,
  onPressPlayer,
}: PlayedGameViewProps) {
  const href = shareResultHref(gameId);
  return (
    <div className="space-y-6">
      <PlayedHero
        {...hero}
        actions={
          <>
            <Button variant="outline-inverse" size="sm" asChild>
              <Link href={href}>
                <Share aria-hidden="true" />
                Share result
              </Link>
            </Button>
            {menu}
          </>
        }
      >
        {board}
      </PlayedHero>
      <PlayedColumns
        columns={columns}
        unplaced={unplaced}
        onPressPlayer={onPressPlayer}
      />
      <FootballInfoRows rows={facts} />
      <Button size="lg" className="w-full" asChild>
        <Link href={href}>
          <Share aria-hidden="true" />
          Share result
        </Link>
      </Button>
    </div>
  );
}
