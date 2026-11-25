"use client";

import type { BoardPlayer } from "@repo/domain/football-board";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import { pickRoomCountLines } from "@repo/domain/football-pick-room";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

import { FootballPickRoomSides } from "./football-pick-room-parts";
import {
  type OpenPickRoom,
  type PickRoomNames,
} from "./football-pick-room-view";

/** The Pick room once every player is picked: the two sides, and on to the draft. */
export function FootballPickRoomFinished({
  room,
  names,
  players,
  balanceOn,
  onSeeTheDraft,
}: {
  room: OpenPickRoom;
  names: PickRoomNames;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
  onSeeTheDraft: () => void;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick;
  return (
    <>
      <div className="space-y-5">
        <div className="space-y-5">
          <FootballPickRoomSides
            room={room}
            teams={names.teams}
            counts={pickRoomCountLines(room, locale)}
            turn={null}
            players={players}
            balanceOn={balanceOn}
          />
        </div>
      </div>
      <div className="border-rule bg-background sticky bottom-0 border-t py-4">
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => onSeeTheDraft()}
        >
          {m.seeTheDraft}
        </Button>
      </div>
    </>
  );
}
