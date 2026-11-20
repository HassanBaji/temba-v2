"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { FriendlyGameJoinSheet } from "~/components/games/friendly-game-join-sheet";
import { useLocale } from "~/components/locale-provider";
import type { FriendlyGameJoinSeat } from "@repo/domain/friendly-game-cta";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import { api } from "~/trpc/react";

/**
 * The Game screen's join sheet on a Social's Invite link: alone or with a
 * partner, then a seat. Only for a viewer who may open the Game.
 */
export function GameLinkSocialJoinSheet({
  gameId,
  open,
  onOpenChange,
  initialSeat,
  pending,
  onPickSeat,
}: {
  gameId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSeat: FriendlyGameJoinSeat | null;
  pending: boolean;
  onPickSeat: (
    sideIndex: number,
    position: "left" | "right" | "either",
  ) => Promise<unknown>;
}) {
  const router = useRouter();
  const locale = useLocale();
  const game = api.games.byId.useQuery({ id: gameId });
  const data = game.data;
  const joined = data ? data.isRegistered || data.isWaitlisted : false;

  // Registering with a partner happens inside the sheet, which then closes.
  // Only that moves on: a viewer who was already in stays on the link.
  const sawNotJoined = React.useRef(false);
  React.useEffect(() => {
    if (!data) {
      return;
    }
    if (!joined) {
      sawNotJoined.current = true;
      return;
    }
    if (sawNotJoined.current) {
      router.replace(`/dashboard/games/${gameId}`);
    }
  }, [data, gameId, joined, router]);

  if (!data || joined) {
    return null;
  }

  return (
    <FriendlyGameJoinSheet
      open={open}
      onOpenChange={onOpenChange}
      title={gameDisplayName(data, locale)}
      sides={data.sides}
      pending={pending}
      pricePerPlayerFils={data.pricePerPlayerFils}
      gameId={gameId}
      format={data.format}
      registrationMode={data.registrationMode}
      canRegister={data.canRegister}
      windowStart={data.windowStart}
      venueName={data.venue?.name ?? null}
      groupName={data.groupName}
      isOrganizer={data.isOrganizer}
      levelMinTenths={data.levelMinTenths}
      levelMaxTenths={data.levelMaxTenths}
      initialSeat={initialSeat}
      poolCount={data.poolCount}
      tournamentShape={data.tournamentShape}
      teamsAllowed={data.teamsAllowed}
      storedRoundCount={data.roundCount}
      windowEnd={data.windowEnd}
      matchMinutes={data.matchMinutes}
      allowSoloRegister={data.allowSoloRegister}
      organizerMakesTeams={data.organizerMakesTeams}
      onPickSeat={onPickSeat}
    />
  );
}
