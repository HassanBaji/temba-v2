import {
  lineupPlayerName,
  ofSide,
  type BoardPlayer,
} from "@repo/domain/football-board";
import {
  captainPickPoolOrder,
  lastPick as lastPickOf,
} from "@repo/domain/football-captain-pick";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import type { Href } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { PickProgress } from "./pick-progress";
import {
  pickRoomCaptainNames,
  pickRoomCountLines,
  pickRoomPlayer,
  pickRoomPlayerName,
  pickRoomPoolPlayers,
  type LivePickSeat,
} from "./pick-room-model";
import { PickPool } from "./pick-sides";
import type { PickChoice } from "./use-pick-choice";
import type { PickRoom, PickRoomController } from "./use-pick-room";

function OrganizerAction({
  label,
  hint,
  disabled,
  first,
  onPress,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  first?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const messages = useMessages();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, hint].join(messages.common.listSeparator)}
      accessibilityState={{ disabled: disabled ?? false }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderTopWidth: first ? 0 : hairline,
        borderTopColor: colors.rule,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold" tone={disabled ? "muted" : "default"}>
          {label}
        </Text>
        <Text size="meta" tone="muted">
          {hint}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.muted} style={mirrorInRtl} />
    </Pressable>
  );
}

/**
 * A live pick (design 4c). The captain on turn taps a player in the pool;
 * an Organizer watches and can pick for the side on turn, undo the last
 * pick or stop.
 */
export function LivePick({
  room,
  players,
  balanceOn,
  fallback,
  seat,
  choice,
  pickRoom,
}: {
  room: PickRoom;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
  fallback: Href;
  seat: LivePickSeat;
  choice: PickChoice;
  pickRoom: PickRoomController;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick;
  const captains = pickRoomCaptainNames(room.captains, players, locale);
  const lastPick = lastPickOf(room.sides);
  const lastPickName = pickRoomPlayerName(players, lastPick?.userId, locale);
  const pool = captainPickPoolOrder(pickRoomPoolPlayers(room.pool, players), {
    organizer: room.viewer.isOrganizer,
    balanceOn,
  });
  return (
    <>
      <PickProgress
        room={room}
        players={players}
        balanceOn={balanceOn}
        fallback={fallback}
        viewerOnTurn={seat.viewerOnTurn}
      />
      {room.viewer.isOrganizer ? (
        <Surface padded={false} style={{ overflow: "hidden" }}>
          {seat.mayPickFor && room.turn != null ? (
            <OrganizerAction
              first
              label={m.pickFor(ofSide(captains, room.turn))}
              hint={m.pickForHint(ofSide(captains, room.turn))}
              disabled={choice.pickingFor}
              onPress={choice.pickFor}
            />
          ) : null}
          <OrganizerAction
            first={!seat.mayPickFor}
            label={m.undoLast}
            hint={lastPick ? m.undoHint(lastPickName) : m.undoNothing}
            disabled={!lastPick || pickRoom.undoing}
            onPress={() => pickRoom.askConfirm("undo")}
          />
          <OrganizerAction
            label={m.stop}
            hint={m.stopHint}
            disabled={pickRoom.stopping}
            onPress={() => pickRoom.askConfirm("stop")}
          />
        </Surface>
      ) : null}
      <PickPool
        pool={pool}
        head={pickRoomCountLines(room, locale).pool}
        selectable={seat.selectable}
        selected={seat.selectable ? choice.selected : null}
        onSelect={choice.select}
      />
    </>
  );
}

/**
 * The bar under a live pick: the pick the viewer is about to send, or for a
 * captain off turn who they wait for.
 */
export function LivePickFooter({
  room,
  players,
  seat,
  choice,
  pickRoom,
}: {
  room: PickRoom;
  players: readonly BoardPlayer[];
  seat: LivePickSeat;
  choice: PickChoice;
  pickRoom: PickRoomController;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick;
  const { turn } = room;
  const captains = pickRoomCaptainNames(room.captains, players, locale);
  if (!seat.selectable) {
    return turn != null ? (
      <Button
        label={m.isChoosing(ofSide(captains, turn))}
        variant="outline"
        size="lg"
        disabled
      />
    ) : null;
  }
  const chosen = choice.selected
    ? pickRoomPlayer(players, choice.selected)
    : undefined;
  const chosenName = lineupPlayerName(chosen, locale) ?? "";
  const sendPick = () => {
    if (!chosen || turn == null) {
      return;
    }
    pickRoom.pick({
      pickedUserId: chosen.userId,
      pickNumber: room.picks.next,
      forSide: seat.viewerOnTurn ? undefined : turn,
    });
  };
  return (
    <View style={{ flex: 1, gap: 8 }}>
      {chosen ? (
        <Button
          label={
            seat.viewerOnTurn || turn == null
              ? m.pickPlayer(chosenName)
              : m.pickPlayerFor(chosenName, ofSide(captains, turn))
          }
          size="lg"
          pending={pickRoom.picking}
          onPress={sendPick}
        />
      ) : (
        <Button label={m.tapToPick} variant="outline" size="lg" disabled />
      )}
      {choice.pickingFor && !seat.viewerOnTurn ? (
        <Button label={m.cancel} variant="outline" onPress={choice.cancel} />
      ) : null}
    </View>
  );
}

/**
 * The Organizer's undo or stop, asked once more before it is sent. The
 * screen keeps it under a finished pick too, so a pick that finishes while
 * the question is open leaves it open.
 */
export function PickConfirmSheet({
  room,
  players,
  pickRoom,
}: {
  room: PickRoom;
  players: readonly BoardPlayer[];
  pickRoom: PickRoomController;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick;
  const lastPick = lastPickOf(room.sides);
  const lastPickName = pickRoomPlayerName(players, lastPick?.userId, locale);
  const request: ConfirmRequest | null =
    pickRoom.confirm === "undo" && lastPick
      ? {
          title: m.undoTitle(lastPick.pickNumber),
          description: m.undoBody(
            lastPickName,
            ofSide(
              pickRoomCaptainNames(room.captains, players, locale),
              lastPick.side,
            ),
          ),
          confirmLabel: m.undoConfirm,
          cancelLabel: m.cancel,
          onConfirm: () => pickRoom.undo(lastPick.pickNumber, lastPickName),
        }
      : pickRoom.confirm === "stop"
        ? {
            title: m.stopTitle,
            description: m.stopBody,
            confirmLabel: m.stop,
            cancelLabel: m.cancel,
            onConfirm: pickRoom.stop,
          }
        : null;
  return (
    <ConfirmSheet
      request={request}
      pending={pickRoom.undoing || pickRoom.stopping}
      onClose={pickRoom.closeConfirm}
    />
  );
}
