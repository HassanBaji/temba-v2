"use client";

import type {
  PlayedColumn,
  PlayedFact,
  PlayedRow,
} from "@repo/domain/played-game";
import { Share } from "lucide-react";
import Link from "next/link";

import { FootballInfoRows } from "~/components/games/football-info-rows";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

import { PlayedColumns } from "./played-columns";
import { PlayedHero, type PlayedHeroProps } from "./played-hero";

export function shareResultHref(gameId: string) {
  return `/dashboard/games/${gameId}/share`;
}

export type PlayedGameViewProps = {
  gameId: string;
  hero: Omit<PlayedHeroProps, "children" | "actions" | "footer">;
  menu?: React.ReactNode;
  board: React.ReactNode;
  /** The MVP row, last in the hero. */
  heroFooter?: React.ReactNode;
  /** A task that closes soon, such as Rate the game, first under the hero. */
  task?: React.ReactNode;
  /** The marks rows, between the columns and the facts. */
  marks?: React.ReactNode;
  columns: [PlayedColumn, PlayedColumn];
  unplaced?: PlayedRow[];
  facts: PlayedFact[];
  /** The Match dispute row, under the facts. */
  dispute?: React.ReactNode;
  onPressPlayer?: (row: PlayedRow) => void;
};

/** A played Game: the result on black, the roster, the facts, then share. */
export function PlayedGameView({
  gameId,
  hero,
  menu,
  board,
  heroFooter,
  task,
  marks,
  columns,
  unplaced,
  facts,
  dispute,
  onPressPlayer,
}: PlayedGameViewProps) {
  const m = useMessages();
  const href = shareResultHref(gameId);
  return (
    <div className="space-y-6">
      <PlayedHero
        {...hero}
        actions={
          <>
            <Button
              size="icon"
              variant="ghost"
              className="border-dimrule bg-raised text-on-focus hover:bg-raised/80 hover:text-on-focus rounded-md border"
              asChild
            >
              <Link href={href} aria-label={m.game.cta.shareResult}>
                <Share aria-hidden="true" className="size-5" />
              </Link>
            </Button>
            {menu}
          </>
        }
        footer={heroFooter}
      >
        {board}
      </PlayedHero>
      {task}
      <PlayedColumns
        columns={columns}
        unplaced={unplaced}
        onPressPlayer={onPressPlayer}
      />
      {marks}
      <FootballInfoRows rows={facts} />
      {dispute}
      <Button size="lg" className="w-full" asChild>
        <Link href={href}>
          <Share aria-hidden="true" />
          {m.game.cta.shareResult}
        </Link>
      </Button>
    </div>
  );
}
