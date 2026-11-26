import type { BoardPlayer } from "@repo/domain/football-board";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import type { Href } from "expo-router";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { PickProgress } from "./pick-progress";
import type { PickRoom } from "./use-pick-room";

/** A finished pick (design 4d): the two sides as the captains picked them. */
export function FinishedPick({
  room,
  players,
  balanceOn,
  fallback,
}: {
  room: PickRoom;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
  fallback: Href;
}) {
  return (
    <PickProgress
      room={room}
      players={players}
      balanceOn={balanceOn}
      fallback={fallback}
    />
  );
}

export function FinishedPickFooter({
  onSeeTheDraft,
}: {
  onSeeTheDraft: () => void;
}) {
  const m = useMessages().football.pick;
  return <Button label={m.seeTheDraft} size="lg" onPress={onSeeTheDraft} />;
}
