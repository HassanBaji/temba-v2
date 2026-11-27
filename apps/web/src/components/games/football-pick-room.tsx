"use client";

import type { Side } from "@repo/domain/football-board";
import { captainPickRoomLines } from "@repo/domain/football-captain-pick";
import { livePickSeat } from "@repo/domain/football-pick-room";
import { formatGameStart } from "@repo/domain/format-game-start";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as React from "react";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { gameHomeHref } from "~/lib/dashboard-paths";

import { FootballPickRoomClosed } from "./football-pick-room-closed";
import { FootballPickRoomFinished } from "./football-pick-room-finished";
import {
  FootballPickRoomConfirms,
  FootballPickRoomLive,
  type PickConfirm,
} from "./football-pick-room-live";
import { FootballPickRoomBanner } from "./football-pick-room-parts";
import { pickRoomNames } from "./football-pick-room-view";
import {
  FootballPickRoomWaiting,
  type PickReminded,
} from "./football-pick-room-waiting";
import { useFootballPickRoom } from "./use-football-pick-room";

/**
 * The Pick room (designs 4b to 4d, ADR-0109), for the two Side captains and
 * the Game's Organizers: the waiting room, the live pick, the finished pick
 * or the closed room, as `useFootballPickRoom` reads it. What the viewer
 * chose on the page is held here, so it is not lost when one state takes
 * another's place: the selected player goes with each pick, the reminders
 * sent with each room, and an open confirmation stays open. Someone the
 * room was never read to gets the not-found page.
 */
export function FootballPickRoom({ gameId }: { gameId: string }) {
  const locale = useLocale();
  const m = useMessages().football.pick;
  const gameHref = gameHomeHref(gameId);
  const {
    view,
    players,
    balanceOn,
    kickoff,
    missing,
    loadError,
    retry,
    actions,
    seeTheDraft,
  } = useFootballPickRoom(gameId);
  const [reminded, setReminded] = React.useState<
    Partial<Record<Side, PickReminded>>
  >({});
  const [selected, setSelected] = React.useState<string | null>(null);
  const [pickingFor, setPickingFor] = React.useState(false);
  const [confirm, setConfirm] = React.useState<PickConfirm | null>(null);
  const room = view === "closed" ? null : view;
  const nextPick = room?.picks.next ?? null;
  const pickId = room?.pickId ?? null;

  React.useEffect(() => {
    setSelected(null);
    setPickingFor(false);
  }, [nextPick]);

  React.useEffect(() => {
    setReminded({});
  }, [pickId]);

  const stopPick = () =>
    actions.stop.mutate({ gameId }, { onSuccess: () => setConfirm(null) });

  const back = (
    <Button variant="outline" asChild>
      <Link href={gameHref}>{m.backToGame}</Link>
    </Button>
  );

  if (missing) {
    notFound();
  }
  if (view === "closed") {
    return (
      <DashboardShell title={m.title} action={back} isSubPage hideNav>
        <FootballPickRoomClosed />
      </DashboardShell>
    );
  }
  if (loadError) {
    return (
      <DashboardShell title={m.title} action={back} isSubPage hideNav>
        <ErrorState
          title={m.loadError}
          message={loadError.message}
          onRetry={retry}
          backHref={gameHref}
          backLabel={m.backToGame}
        />
      </DashboardShell>
    );
  }
  if (!room || !players) {
    return (
      <DashboardShell title={m.title} action={back} isSubPage hideNav>
        <span className="sr-only" role="status">
          {m.loading}
        </span>
        <Skeleton className="h-80 w-full rounded-xl" />
      </DashboardShell>
    );
  }

  const names = pickRoomNames(room, players, locale);

  if (room.status === "waiting") {
    return (
      <DashboardShell
        title={m.title}
        description={kickoff ? formatGameStart(kickoff, locale) : undefined}
        action={back}
        isSubPage
        hideNav
      >
        <FootballPickRoomWaiting
          gameId={gameId}
          room={room}
          names={names}
          players={players}
          balanceOn={balanceOn}
          actions={actions}
          reminded={reminded}
          onReminded={(side, state) =>
            setReminded((current) => ({ ...current, [side]: state }))
          }
          onStop={stopPick}
        />
      </DashboardShell>
    );
  }

  const done = room.status === "done";
  const lines = captainPickRoomLines(
    {
      status: room.status,
      picks: room.picks,
      turn: room.turn,
      firstPick: room.firstPick,
      firstPickSide: room.firstPickSide,
      sizes: {
        slot1: room.sides.slot1.length,
        slot2: room.sides.slot2.length,
      },
    },
    room.viewer.side,
    { captains: names.captains, teams: names.teams },
    locale,
  );

  return (
    <DashboardShell
      title={m.title}
      description={lines.progress}
      action={back}
      width={done ? "content" : "wide"}
      isSubPage
      hideNav
    >
      <div className="space-y-5">
        <FootballPickRoomBanner
          lines={lines}
          onTurn={livePickSeat(room, false).viewerOnTurn}
        />
        {done ? (
          <FootballPickRoomFinished
            room={room}
            names={names}
            players={players}
            balanceOn={balanceOn}
            onSeeTheDraft={() => void seeTheDraft()}
          />
        ) : (
          <FootballPickRoomLive
            gameId={gameId}
            room={room}
            names={names}
            players={players}
            balanceOn={balanceOn}
            actions={actions}
            selected={selected}
            onSelect={setSelected}
            pickingFor={pickingFor}
            onPickingFor={setPickingFor}
            onAsk={setConfirm}
          />
        )}
      </div>
      <FootballPickRoomConfirms
        gameId={gameId}
        room={room}
        names={names}
        actions={actions}
        confirm={confirm}
        onChange={setConfirm}
        onStop={stopPick}
      />
    </DashboardShell>
  );
}
