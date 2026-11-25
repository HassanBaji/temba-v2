import type { Href } from "expo-router";

import { gamePath } from "../games/games-model";
import { useMessages } from "../i18n/locale-provider";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { ClosedRoom } from "./pick-room-closed";
import { FinishedPick, FinishedPickFooter } from "./pick-room-finished";
import { LivePick, LivePickFooter, PickConfirmSheet } from "./pick-room-live";
import { livePickSeat } from "./pick-room-model";
import { WaitingRoom, WaitingRoomFooter } from "./pick-room-waiting";
import { usePickChoice } from "./use-pick-choice";
import { usePickRoom } from "./use-pick-room";

/**
 * The Pick room (designs 4b to 4d, ADR-0109), for the two Side captains and
 * the Game's Organizers. It reads `games.footballPickRoom` every two seconds
 * while the screen is in front and the App is not in the background, which
 * is what keeps a captain "In the room". While it waits each captain sees
 * the other and can remind them; the Organizer can remind either, start
 * without them or stop the pick. Once live, the captain on turn taps a
 * player and confirms; their own pick shows at once and the next read
 * corrects it. The Organizer watches and can pick for the side on turn,
 * undo the last pick or stop. What a read puts on the screen is
 * `pickRoomAfterRead`'s to say: a pick stopped while it waits or is live
 * closes the room and says so, and a finished pick stays on the screen
 * through the closed or not-found reads that follow once the Organizer
 * publishes or edits the draft. It is then read slowly, and a new room the
 * Organizer opens takes its place. A closed room is read again only when
 * the screen comes back in front.
 */
export function PickRoomScreen({ gameId }: { gameId: string }) {
  const m = useMessages().football.pick;
  const fallback = gamePath(gameId) as Href;
  const pickRoom = usePickRoom(gameId);
  const { room, players, balanceOn } = pickRoom;
  const choice = usePickChoice(room?.picks.next ?? null);

  if (pickRoom.view === "closed") {
    return <ClosedRoom gameId={gameId} />;
  }
  if (!room || !players) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title={m.title} />
        {pickRoom.loadError ? (
          <Surface accessibilityRole="alert" style={{ gap: 4 }}>
            <Text weight="semibold">{m.loadError}</Text>
            <Text size="meta" tone="muted">
              {pickRoom.loadError.message}
            </Text>
          </Surface>
        ) : (
          <Skeleton height={320} radius={16} />
        )}
      </Screen>
    );
  }

  if (room.status === "waiting") {
    return (
      <Screen
        footer={
          <WaitingRoomFooter
            room={room}
            players={players}
            pickRoom={pickRoom}
          />
        }
      >
        <WaitingRoom
          room={room}
          players={players}
          balanceOn={balanceOn}
          kickoff={pickRoom.kickoff}
          fallback={fallback}
        />
      </Screen>
    );
  }

  const done = room.status === "done";
  const seat = livePickSeat(room, choice.pickingFor);
  const footer = done ? (
    <FinishedPickFooter onSeeTheDraft={() => void pickRoom.seeTheDraft()} />
  ) : seat.selectable || seat.waiting ? (
    <LivePickFooter
      room={room}
      players={players}
      seat={seat}
      choice={choice}
      pickRoom={pickRoom}
    />
  ) : null;

  return (
    <Screen footer={footer}>
      {done ? (
        <FinishedPick
          room={room}
          players={players}
          balanceOn={balanceOn}
          fallback={fallback}
        />
      ) : (
        <LivePick
          room={room}
          players={players}
          balanceOn={balanceOn}
          fallback={fallback}
          seat={seat}
          choice={choice}
          pickRoom={pickRoom}
        />
      )}
      <PickConfirmSheet room={room} players={players} pickRoom={pickRoom} />
    </Screen>
  );
}
