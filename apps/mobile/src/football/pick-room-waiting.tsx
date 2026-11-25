import { radii } from "@repo/design-tokens";
import {
  bibNames,
  boardTierCell,
  lineupPlayerName,
  ofSide,
  ovrLabel,
  slotCode,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import {
  captainPickFirstPickLine,
  captainPickPoolLine,
} from "@repo/domain/football-captain-pick";
import type { FootballBalanceOn } from "@repo/domain/football-lineup";
import { formatGameStart } from "@repo/domain/format-game-start";
import type { Locale } from "@repo/i18n/locale";
import type { Href } from "expo-router";
import { Bell, Check } from "lucide-react-native";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { BibChip } from "./bib-picker";
import { InfoRows } from "./info-rows";
import {
  otherCaptainSide,
  pickRoomCaptainNames,
  pickRoomPlayer,
  pickRoomPool,
} from "@repo/domain/football-pick-room";
import { TierMark } from "./team-columns";
import type { PickRoom, PickRoomController } from "./use-pick-room";

const POOL_PREVIEW = 4;

function playerMeta(player: BoardPlayer | undefined, locale: Locale) {
  if (!player) {
    return null;
  }
  return [slotCode(player, locale), ovrLabel(player)].filter(Boolean).join(" ");
}

function CaptainCard({
  side,
  room,
  team,
  player,
}: {
  side: Side;
  room: PickRoom;
  team: string;
  player: BoardPlayer | undefined;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.pick;
  const inRoom = ofSide(room.captains, side)?.inRoom ?? false;
  const name = lineupPlayerName(player, locale) ?? "";
  const presence = inRoom ? m.inRoom : m.notHereYet;
  return (
    <View
      accessible
      accessibilityLabel={m.presenceSpoken(team, name, presence)}
      style={{
        flex: 1,
        minWidth: 0,
        padding: 16,
        gap: 14,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderStyle: inRoom ? "solid" : "dashed",
        borderColor: inRoom ? colors.rule : colors.inputBorder,
        overflow: "hidden",
      }}
    >
      {inRoom ? null : <Hatch radius={radii.lg} bordered={false} />}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <BibChip bib={ofSide(room.bibs, side)} size={18} />
        <Text size="meta" tone="muted">
          {team}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar
          name={player?.name ?? name}
          uri={player?.image ?? null}
          size="lg"
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={1}>
            {name}
          </Text>
          <Text size="eyebrow" mono tone="muted">
            {playerMeta(player, locale)}
          </Text>
        </View>
      </View>
      {inRoom ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: radii.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.control,
            }}
          >
            <Check size={11} color={colors.onControl} />
          </View>
          <Text size="meta" weight="semibold">
            {m.inRoom}
          </Text>
        </View>
      ) : (
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: radii.sm,
            backgroundColor: colors.paper,
          }}
        >
          <Text size="meta" tone="muted">
            {m.notHereYet}
          </Text>
        </View>
      )}
    </View>
  );
}

function PoolPreview({
  room,
  players,
  balanceOn,
}: {
  room: PickRoom;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.pick;
  const pool = pickRoomPool(room, players, balanceOn);
  const shown = pool.slice(0, POOL_PREVIEW);
  const more = room.pool.length - shown.length;
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <Text size="meta" tone="muted">
          {m.poolTitle}
        </Text>
        <Text size="eyebrow" tone="muted">
          {m.poolHead(room.pool.length)}
        </Text>
      </View>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        {shown.map((player, index) => {
          const cell = boardTierCell(player, locale);
          return (
            <View
              key={player.userId}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 9,
                paddingHorizontal: 14,
                borderTopWidth: index === 0 ? 0 : hairline,
                borderTopColor: colors.rule,
              }}
            >
              <Avatar name={player.name} uri={player.image} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text weight="semibold" numberOfLines={1}>
                  {lineupPlayerName(player, locale)}
                </Text>
                <Text size="eyebrow" mono tone="muted">
                  {slotCode(player, locale)}
                </Text>
              </View>
              {cell ? (
                <TierMark cell={cell} />
              ) : (
                <Text weight="bold" width="expanded" ltr>
                  {ovrLabel(player)}
                </Text>
              )}
            </View>
          );
        })}
        {more > 0 ? (
          <View
            style={{
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderTopWidth: shown.length > 0 ? hairline : 0,
              borderTopColor: colors.rule,
            }}
          >
            <Text size="meta" tone="muted">
              {m.andMore(more)}
            </Text>
          </View>
        ) : null}
      </Surface>
    </View>
  );
}

/**
 * The room while it waits (design 4b): the two Side captains and who is in,
 * how the pick will run, and the first of the pool.
 */
export function WaitingRoom({
  room,
  players,
  balanceOn,
  kickoff,
  fallback,
}: {
  room: PickRoom;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
  kickoff: PickRoomController["kickoff"];
  fallback: Href;
}) {
  const locale = useLocale();
  const m = useMessages().football.pick;
  const names = bibNames(room.bibs, locale);
  const captains = pickRoomCaptainNames(room.captains, players, locale);
  const otherSide = otherCaptainSide(room.viewer.side);
  const captainPlayer = (side: Side) =>
    pickRoomPlayer(players, ofSide(room.captains, side)?.userId);
  return (
    <>
      <ScreenHeader
        nav="back"
        fallback={fallback}
        title={m.title}
        actions={
          kickoff ? (
            <Text size="meta" tone="muted">
              {formatGameStart(kickoff, locale)}
            </Text>
          ) : null
        }
      >
        <Text size="meta" tone="muted">
          {otherSide != null
            ? m.introCaptain(ofSide(captains, otherSide))
            : m.introOrganizer(captains.slot1, captains.slot2)}
        </Text>
      </ScreenHeader>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <CaptainCard
          side={1}
          room={room}
          team={names.slot1}
          player={captainPlayer(1)}
        />
        <CaptainCard
          side={2}
          room={room}
          team={names.slot2}
          player={captainPlayer(2)}
        />
      </View>
      <InfoRows
        rows={[
          {
            label: m.firstPickLabel,
            value: captainPickFirstPickLine(
              { firstPick: room.firstPick, firstPickSide: room.firstPickSide },
              names,
              locale,
            ),
          },
          { label: m.orderLabel, value: m.orderValue },
          {
            label: m.toPickLabel,
            value: captainPickPoolLine(room.pool.length, locale),
          },
        ]}
      />
      <PoolPreview room={room} players={players} balanceOn={balanceOn} />
    </>
  );
}

/**
 * What a waiting viewer can do: a captain reminds the other, and an
 * Organizer reminds either, starts without them or stops the pick.
 */
export function WaitingRoomFooter({
  room,
  players,
  pickRoom,
}: {
  room: PickRoom;
  players: readonly BoardPlayer[];
  pickRoom: PickRoomController;
}) {
  const colors = useColors();
  const locale = useLocale();
  const m = useMessages().football.pick;
  const captains = pickRoomCaptainNames(room.captains, players, locale);
  const otherSide = otherCaptainSide(room.viewer.side);
  const asCaptain = room.viewer.role === "captain" && otherSide != null;
  const remindLabel = (side: Side) => {
    const state = pickRoom.reminded[side];
    const name = ofSide(captains, side);
    return state === "recently"
      ? m.remindedRecently(name)
      : state === "sent"
        ? m.reminded(name)
        : m.remind(name);
  };
  const remindButton = (side: Side) =>
    (ofSide(room.captains, side)?.inRoom ?? false) ? null : (
      <Button
        key={side}
        label={remindLabel(side)}
        variant="outline"
        pending={pickRoom.remindingSide === side}
        icon={<Bell size={15} color={colors.ink} />}
        onPress={() => pickRoom.remind(side, ofSide(captains, side))}
      />
    );
  return (
    <View style={{ flex: 1, gap: 8 }}>
      {asCaptain ? (
        <>
          <Button
            label={m.waitingFor(ofSide(captains, otherSide))}
            variant="outline"
            size="lg"
            disabled
          />
          {remindButton(otherSide)}
        </>
      ) : (
        <>
          {remindButton(1)}
          {remindButton(2)}
        </>
      )}
      {room.viewer.isOrganizer ? (
        <>
          <Button
            label={m.startNow}
            size="lg"
            pending={pickRoom.starting}
            disabled={pickRoom.stopping}
            onPress={pickRoom.start}
          />
          <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
            {m.startNowHint}
          </Text>
          <Button
            label={m.stop}
            variant="outline"
            pending={pickRoom.stopping}
            disabled={pickRoom.starting}
            onPress={pickRoom.stop}
          />
          <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
            {m.stopHint}
          </Text>
        </>
      ) : null}
    </View>
  );
}
