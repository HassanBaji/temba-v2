import { bibNames, type BoardPlayer } from "@repo/domain/football-board";
import { captainPickRoomLines } from "@repo/domain/football-captain-pick";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import type { Href } from "expo-router";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  pickRoomCaptainNames,
  pickRoomCountLines,
} from "@repo/domain/football-pick-room";
import { PickSides } from "./pick-sides";
import type { PickRoom } from "./use-pick-room";

/**
 * The top of a live or finished Pick room (designs 4c and 4d): how far the
 * pick is, whose turn it is, and the two sides as picked so far. The turn
 * card is the screen's focus only while the viewer is the one to pick.
 */
export function PickProgress({
  room,
  players,
  balanceOn,
  fallback,
  viewerOnTurn = false,
}: {
  room: PickRoom;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
  fallback: Href;
  viewerOnTurn?: boolean;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick;
  const done = room.status === "done";
  const names = bibNames(room.bibs, locale);
  const lines = captainPickRoomLines(
    {
      status: done ? "done" : "live",
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
    {
      captains: pickRoomCaptainNames(room.captains, players, locale),
      teams: names,
    },
    locale,
  );
  return (
    <>
      <ScreenHeader
        nav="back"
        fallback={fallback}
        title={m.title}
        actions={
          <Text size="meta" tone="muted">
            {lines.progress}
          </Text>
        }
      />
      <Surface
        tone={viewerOnTurn ? "ink" : "paper"}
        accessibilityLiveRegion="polite"
        style={{ gap: 6 }}
      >
        {lines.toss ? (
          <Text size="eyebrow" tone="muted">
            {lines.toss}
          </Text>
        ) : null}
        <Text
          size="h1"
          weight="bold"
          width="expanded"
          accessibilityRole="header"
        >
          {lines.title}
        </Text>
        <Text size="meta" tone="muted">
          {lines.sub}
        </Text>
      </Surface>
      <PickSides
        sides={room.sides}
        captains={{
          slot1: room.captains.slot1?.userId ?? null,
          slot2: room.captains.slot2?.userId ?? null,
        }}
        bibs={room.bibs}
        teams={names}
        counts={pickRoomCountLines(room, locale)}
        turn={done ? null : room.turn}
        nextPick={room.picks.next}
        players={players}
        balanceOn={balanceOn}
      />
    </>
  );
}
