import { radii } from "@repo/design-tokens";
import {
  bibNames,
  boardTierCell,
  ovrLabel,
  slotCode,
  type BoardPlayer,
  type Side,
} from "@repo/domain/football-board";
import {
  captainPickCountLines,
  captainPickDone,
  captainPickFirstPickLine,
  captainPickPoolLine,
  captainPickPoolOrder,
  captainPickRoomLines,
  pickTurn,
} from "@repo/domain/football-captain-pick";
import { formatGameStart } from "@repo/domain/format-game-start";
import { PICK_ROOM_POLL_MS } from "@repo/domain/football-lineup";
import type { Locale } from "@repo/i18n/locale";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { Bell, Check, ChevronRight } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { gamePath } from "../games/games-model";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api, type RouterOutputs } from "../trpc/react";
import { BibChip } from "./bib-picker";
import { pickCaptainName } from "./captain-pick-setup";
import { InfoRows } from "./info-rows";
import { PickPool, PickSides } from "./pick-sides";
import { TierMark } from "./team-columns";

type PickRoom = Exclude<
  RouterOutputs["games"]["footballPickRoom"],
  { status: "stopped" }
>;

const POOL_PREVIEW = 4;

type Reminded = "sent" | "recently";

type RoomRead = RouterOutputs["games"]["footballPickRoom"];

/**
 * The room with a pick placed, as the server places it: the caller's own
 * pick shows at once and the next read corrects it.
 */
function withPick(
  current: RoomRead,
  pick: { userId: string; pickNumber: number },
): RoomRead {
  if (current.status !== "live" || current.turn == null) {
    return current;
  }
  const side = current.turn;
  const row = { userId: pick.userId, pickNumber: pick.pickNumber };
  const sides =
    side === 1
      ? { ...current.sides, slot1: [...current.sides.slot1, row] }
      : { ...current.sides, slot2: [...current.sides.slot2, row] };
  const pool = current.pool.filter((userId) => userId !== pick.userId);
  const done = captainPickDone(pool.length);
  return {
    ...current,
    status: done ? "done" : "live",
    sides,
    pool,
    turn:
      done || current.firstPickSide == null
        ? null
        : pickTurn({
            slot1: sides.slot1.length,
            slot2: sides.slot2.length,
            firstPickSide: current.firstPickSide,
          }),
    picks: {
      made: current.picks.made + 1,
      total: current.picks.total,
      next: pick.pickNumber + 1,
    },
  };
}

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

/** Polls only while the screen is in front; React Query pauses it in the background. */
function useScreenFocused() {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused;
}

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
  const captain = side === 1 ? room.captains.slot1 : room.captains.slot2;
  const inRoom = captain?.inRoom ?? false;
  const name = pickCaptainName(player ?? null, messages.common.you) ?? "";
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
        <BibChip
          bib={side === 1 ? room.bibs.slot1 : room.bibs.slot2}
          size={18}
        />
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
  balanceOn: "tierPoints" | "ovr";
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.pick;
  const byId = new Map(players.map((player) => [player.userId, player]));
  const pool = captainPickPoolOrder(
    room.pool.flatMap((userId) => {
      const player = byId.get(userId);
      return player ? [player] : [];
    }),
    { organizer: room.viewer.isOrganizer, balanceOn },
  );
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
                  {pickCaptainName(player, messages.common.you)}
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

function ClosedRoom({ gameId }: { gameId: string }) {
  const router = useRouter();
  const m = useMessages().football.pick;
  const fallback = gamePath(gameId) as Href;
  return (
    <Screen>
      <ScreenHeader nav="back" fallback={fallback} title={m.title} />
      <Surface style={{ gap: 4 }}>
        <Text weight="semibold">{m.closedTitle}</Text>
        <Text size="meta" tone="muted">
          {m.closedBody}
        </Text>
      </Surface>
      <Button
        label={m.backToGame}
        variant="outline"
        size="lg"
        onPress={() => router.replace(fallback)}
      />
    </Screen>
  );
}

/**
 * The Pick room (designs 4b to 4d, ADR-0109), for the two Side captains and
 * the Game's Organizers. It reads `games.footballPickRoom` every two seconds
 * while the screen is in front and the App is not in the background, which
 * is what keeps a captain "In the room". While it waits each captain sees
 * the other and can remind them; the Organizer can remind either, start
 * without them or stop the pick. Once live, the captain on turn taps a
 * player and confirms; their own pick shows at once and the next read
 * corrects it. The Organizer watches and can pick for the side on turn,
 * undo the last pick or stop. A stopped pick closes the room for everyone.
 */
export function PickRoomScreen({ gameId }: { gameId: string }) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.pick;
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const focused = useScreenFocused();
  const fallback = gamePath(gameId) as Href;
  const game = api.games.byId.useQuery({ id: gameId });
  const board = api.games.footballBoard.useQuery({ gameId });
  const room = api.games.footballPickRoom.useQuery(
    { gameId },
    {
      enabled: focused,
      refetchInterval: focused ? PICK_ROOM_POLL_MS : false,
      refetchOnWindowFocus: "always",
      retry: false,
    },
  );
  const [reminded, setReminded] = useState<Partial<Record<Side, Reminded>>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [pickingFor, setPickingFor] = useState(false);
  const [confirm, setConfirm] = useState<"undo" | "stop" | null>(null);
  const wasOpen = useRef(false);
  const data = room.data;
  const nextPick = data && data.status !== "stopped" ? data.picks.next : null;

  useEffect(() => {
    setSelected(null);
    setPickingFor(false);
  }, [nextPick]);

  const leave = useCallback(
    async (message: string) => {
      toast.show(message);
      await Promise.all([
        utils.games.footballBoard.invalidate({ gameId }),
        utils.games.byId.invalidate({ id: gameId }),
      ]);
      router.replace(fallback);
    },
    [toast, utils, gameId, router, fallback],
  );

  useEffect(() => {
    if (!data) {
      return;
    }
    if (data.status !== "stopped") {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      void leave(m.stopped);
    }
  }, [data, leave, m.stopped]);

  const boardPlayers = board.data?.players;
  const knownIds =
    data && data.status !== "stopped"
      ? [
          ...data.pool,
          ...data.sides.slot1.map((row) => row.userId),
          ...data.sides.slot2.map((row) => row.userId),
        ]
      : [];
  const unknownIds = boardPlayers
    ? knownIds
        .filter(
          (userId) => !boardPlayers.some((player) => player.userId === userId),
        )
        .join(",")
    : "";
  const refetchBoard = board.refetch;
  useEffect(() => {
    if (unknownIds) {
      void refetchBoard();
    }
  }, [unknownIds, refetchBoard]);

  const refresh = () => utils.games.footballPickRoom.invalidate({ gameId });
  const failure = (error: { message: string }) => toast.show(error.message);
  const remind = api.games.remindFootballCaptain.useMutation({
    onError: failure,
  });
  const start = api.games.startFootballPick.useMutation({
    onError: failure,
    onSettled: refresh,
  });
  const stop = api.games.stopFootballPick.useMutation({
    onSuccess: () => {
      wasOpen.current = false;
      setConfirm(null);
      void leave(m.stopped);
    },
    onError: failure,
  });
  const pickPlayer = api.games.pickFootballPlayer.useMutation({
    onMutate: async (input) => {
      await utils.games.footballPickRoom.cancel({ gameId });
      const previous = utils.games.footballPickRoom.getData({ gameId });
      utils.games.footballPickRoom.setData({ gameId }, (current) =>
        current
          ? withPick(current, {
              userId: input.userId,
              pickNumber: input.pickNumber,
            })
          : current,
      );
      return { previous };
    },
    onError: (error, _input, context) => {
      if (context?.previous) {
        utils.games.footballPickRoom.setData({ gameId }, context.previous);
      }
      failure(error);
    },
    onSuccess: (result) => {
      if (result.done) {
        void utils.games.footballBoard.invalidate({ gameId });
      }
    },
    onSettled: refresh,
  });
  const undoPick = api.games.undoFootballPick.useMutation({
    onError: failure,
    onSettled: () => {
      setConfirm(null);
      void refresh();
    },
  });

  if (room.error?.data?.code === "NOT_FOUND" || data?.status === "stopped") {
    return <ClosedRoom gameId={gameId} />;
  }
  if (!data || !boardPlayers) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title={m.title} />
        {room.error ? (
          <Surface accessibilityRole="alert" style={{ gap: 4 }}>
            <Text weight="semibold">{m.loadError}</Text>
            <Text size="meta" tone="muted">
              {room.error.message}
            </Text>
          </Surface>
        ) : (
          <Skeleton height={320} radius={16} />
        )}
      </Screen>
    );
  }

  const names = bibNames(data.bibs, locale);
  const balanceOn = board.data?.balanceOn ?? "ovr";
  const playerOf = (userId: string | undefined) =>
    boardPlayers.find((player) => player.userId === userId);
  const captainPlayer = (side: Side) =>
    playerOf((side === 1 ? data.captains.slot1 : data.captains.slot2)?.userId);
  const captainName = (side: Side) =>
    pickCaptainName(captainPlayer(side) ?? null, messages.common.you) ?? "";
  const otherSide: Side | null =
    data.viewer.side === 1 ? 2 : data.viewer.side === 2 ? 1 : null;
  const inRoom = (side: Side) =>
    (side === 1 ? data.captains.slot1 : data.captains.slot2)?.inRoom ?? false;
  const kickoff = game.data?.windowStart ?? null;
  const intro =
    otherSide != null
      ? m.introCaptain(captainName(otherSide))
      : m.introOrganizer(captainName(1), captainName(2));
  const firstPickLine = captainPickFirstPickLine(
    { firstPick: data.firstPick, firstPickSide: data.firstPickSide },
    names,
    locale,
  );

  const sendReminder = (side: Side) =>
    remind.mutate(
      { gameId, side },
      {
        onSuccess: (result) => {
          setReminded((current) => ({
            ...current,
            [side]: result.sent ? "sent" : "recently",
          }));
          toast.show(
            result.sent
              ? m.reminded(captainName(side))
              : m.remindedRecently(captainName(side)),
          );
        },
      },
    );
  const remindLabel = (side: Side) => {
    const state = reminded[side];
    const name = captainName(side);
    return state === "recently"
      ? m.remindedRecently(name)
      : state === "sent"
        ? m.reminded(name)
        : m.remind(name);
  };
  const remindButton = (side: Side) =>
    inRoom(side) ? null : (
      <Button
        key={side}
        label={remindLabel(side)}
        variant="outline"
        pending={remind.isPending && remind.variables?.side === side}
        icon={<Bell size={15} color={colors.ink} />}
        onPress={() => sendReminder(side)}
      />
    );

  if (data.status === "waiting") {
    const asCaptain = data.viewer.role === "captain" && otherSide != null;
    const footer = (
      <View style={{ flex: 1, gap: 8 }}>
        {asCaptain ? (
          <>
            <Button
              label={m.waitingFor(captainName(otherSide))}
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
        {data.viewer.isOrganizer ? (
          <>
            <Button
              label={m.startNow}
              size="lg"
              pending={start.isPending}
              disabled={stop.isPending}
              onPress={() => start.mutate({ gameId })}
            />
            <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
              {m.startNowHint}
            </Text>
            <Button
              label={m.stop}
              variant="outline"
              pending={stop.isPending}
              disabled={start.isPending}
              onPress={() => stop.mutate({ gameId })}
            />
            <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
              {m.stopHint}
            </Text>
          </>
        ) : null}
      </View>
    );
    return (
      <Screen footer={footer}>
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
            {intro}
          </Text>
        </ScreenHeader>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <CaptainCard
            side={1}
            room={data}
            team={names.slot1}
            player={captainPlayer(1)}
          />
          <CaptainCard
            side={2}
            room={data}
            team={names.slot2}
            player={captainPlayer(2)}
          />
        </View>
        <InfoRows
          rows={[
            { label: m.firstPickLabel, value: firstPickLine },
            { label: m.orderLabel, value: m.orderValue },
            {
              label: m.toPickLabel,
              value: captainPickPoolLine(data.pool.length, locale),
            },
          ]}
        />
        <PoolPreview room={data} players={boardPlayers} balanceOn={balanceOn} />
      </Screen>
    );
  }

  const done = data.status === "done";
  const turn = data.turn;
  const lines = captainPickRoomLines(
    {
      status: data.status,
      picks: data.picks,
      turn,
      firstPick: data.firstPick,
      firstPickSide: data.firstPickSide,
      sizes: {
        slot1: data.sides.slot1.length,
        slot2: data.sides.slot2.length,
      },
    },
    data.viewer.side,
    {
      captains: { slot1: captainName(1), slot2: captainName(2) },
      teams: names,
    },
    locale,
  );
  const counts = captainPickCountLines(
    {
      slot1: data.sides.slot1.length,
      slot2: data.sides.slot2.length,
      pool: data.pool.length,
      firstPickSide: data.firstPickSide ?? 1,
    },
    locale,
  );
  const pool = captainPickPoolOrder(
    data.pool.flatMap((userId) => {
      const player = playerOf(userId);
      return player ? [player] : [];
    }),
    { organizer: data.viewer.isOrganizer, balanceOn },
  );
  const viewerOnTurn = !done && turn != null && data.viewer.side === turn;
  const mayPickFor =
    !done && turn != null && data.viewer.isOrganizer && !viewerOnTurn;
  const selectable = viewerOnTurn || (mayPickFor && pickingFor);
  const choice = selectable && selected ? playerOf(selected) : undefined;
  const choiceName = choice
    ? (pickCaptainName(choice, messages.common.you) ?? "")
    : "";
  const lastPick =
    [
      ...data.sides.slot1.map((row) => ({ ...row, side: 1 as const })),
      ...data.sides.slot2.map((row) => ({ ...row, side: 2 as const })),
    ]
      .flatMap((row) =>
        row.pickNumber == null ? [] : [{ ...row, pickNumber: row.pickNumber }],
      )
      .sort((a, b) => b.pickNumber - a.pickNumber)[0] ?? null;
  const lastPickName = lastPick
    ? (pickCaptainName(
        playerOf(lastPick.userId) ?? null,
        messages.common.you,
      ) ?? "")
    : "";

  const sendPick = () => {
    if (!choice || turn == null) {
      return;
    }
    pickPlayer.mutate({
      gameId,
      userId: choice.userId,
      pickNumber: data.picks.next,
      forSide: viewerOnTurn ? undefined : turn,
    });
  };
  const seeTheDraft = async () => {
    await Promise.all([
      utils.games.footballBoard.invalidate({ gameId }),
      utils.games.byId.invalidate({ id: gameId }),
    ]);
    router.replace(fallback);
  };

  const confirmRequest: ConfirmRequest | null =
    confirm === "undo" && lastPick
      ? {
          title: m.undoTitle(lastPick.pickNumber),
          description: m.undoBody(lastPickName, captainName(lastPick.side)),
          confirmLabel: m.undoConfirm,
          cancelLabel: m.cancel,
          onConfirm: () =>
            undoPick.mutate(
              { gameId, pickNumber: lastPick.pickNumber },
              { onSuccess: () => toast.show(m.undone(lastPickName)) },
            ),
        }
      : confirm === "stop"
        ? {
            title: m.stopTitle,
            description: m.stopBody,
            confirmLabel: m.stop,
            cancelLabel: m.cancel,
            onConfirm: () => stop.mutate({ gameId }),
          }
        : null;

  const footer = done ? (
    <Button
      label={m.seeTheDraft}
      size="lg"
      onPress={() => void seeTheDraft()}
    />
  ) : selectable ? (
    <View style={{ flex: 1, gap: 8 }}>
      {choice ? (
        <Button
          label={
            viewerOnTurn || turn == null
              ? m.pickPlayer(choiceName)
              : m.pickPlayerFor(choiceName, captainName(turn))
          }
          size="lg"
          pending={pickPlayer.isPending}
          onPress={sendPick}
        />
      ) : (
        <Button label={m.tapToPick} variant="outline" size="lg" disabled />
      )}
      {pickingFor && !viewerOnTurn ? (
        <Button
          label={m.cancel}
          variant="outline"
          onPress={() => {
            setPickingFor(false);
            setSelected(null);
          }}
        />
      ) : null}
    </View>
  ) : data.viewer.side != null && turn != null ? (
    <Button
      label={m.isChoosing(captainName(turn))}
      variant="outline"
      size="lg"
      disabled
    />
  ) : null;

  return (
    <Screen footer={footer}>
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
        sides={data.sides}
        captains={{
          slot1: data.captains.slot1?.userId ?? null,
          slot2: data.captains.slot2?.userId ?? null,
        }}
        bibs={data.bibs}
        teams={names}
        counts={counts}
        turn={done ? null : turn}
        nextPick={data.picks.next}
        players={boardPlayers}
        balanceOn={balanceOn}
      />
      {data.viewer.isOrganizer && !done ? (
        <Surface padded={false} style={{ overflow: "hidden" }}>
          {mayPickFor && turn != null ? (
            <OrganizerAction
              first
              label={m.pickFor(captainName(turn))}
              hint={m.pickForHint(captainName(turn))}
              disabled={pickingFor}
              onPress={() => setPickingFor(true)}
            />
          ) : null}
          <OrganizerAction
            first={!mayPickFor}
            label={m.undoLast}
            hint={lastPick ? m.undoHint(lastPickName) : m.undoNothing}
            disabled={!lastPick || undoPick.isPending}
            onPress={() => setConfirm("undo")}
          />
          <OrganizerAction
            label={m.stop}
            hint={m.stopHint}
            disabled={stop.isPending}
            onPress={() => setConfirm("stop")}
          />
        </Surface>
      ) : null}
      {done ? null : (
        <PickPool
          pool={pool}
          head={counts.pool}
          selectable={selectable}
          selected={selectable ? selected : null}
          onSelect={setSelected}
        />
      )}
      <ConfirmSheet
        request={confirmRequest}
        pending={undoPick.isPending || stop.isPending}
        onClose={() => setConfirm(null)}
      />
    </Screen>
  );
}
