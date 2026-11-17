import { radii, sizes } from "@repo/design-tokens";
import {
  alonePairSameSide,
  formatAloneLevel,
  type AloneSide,
} from "@repo/domain/alone-teams";
import { formatGameDay } from "@repo/domain/format-game-start";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { shortPlayerName } from "@repo/domain/player-name";
import { useRouter, type Href } from "expo-router";
import { Scale, Shuffle } from "lucide-react-native";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { gameTitle } from "../game-details/details-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import {
  alonePlayerMap,
  balancedDraft,
  makeTeamsNote,
  makeTeamsProblem,
  openingMakeTeamsDraft,
  pairAverage,
  sameSlot,
  shuffledDraft,
  sideShort,
  slotUserId,
  swapMakeTeamsSlots,
  type MakeTeamsDraft,
  type MakeTeamsSlot,
  type SheetPlayer,
} from "./alone-teams-model";

const NUMBER_COLUMN = 24;
const AVERAGE_COLUMN = 48;

function OrganizerTag() {
  const palette = useTonePalette();
  const m = useMessages().aloneTeams.make;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: radii.slot,
        borderWidth: hairline,
        borderColor: palette.rule,
      }}
    >
      <Text size="eyebrow" mono uppercase tone="muted">
        {m.eyebrow}
      </Text>
    </View>
  );
}

function SlotCell({
  player,
  isViewer,
  selected,
  onPress,
}: {
  player: SheetPlayer | undefined;
  isViewer: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const palette = useTonePalette();
  const m = messages.aloneTeams;
  if (!player) {
    return <View style={{ flex: 1 }} />;
  }
  const name = isViewer ? m.players.you : shortPlayerName(player.name);
  const side = sideShort(player.preferredSide, locale);
  const detail = [player.levelBand, side].filter(Boolean).join(" ");
  const sideWord =
    player.preferredSide === "left"
      ? m.join.left
      : player.preferredSide === "right"
        ? m.join.right
        : null;
  const ink = selected ? palette.onControl : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[
        isViewer ? name : player.name,
        player.levelBand,
        sideWord,
      ]
        .filter(Boolean)
        .join(messages.tournament.listSeparator)}
      accessibilityHint={m.make.swapHint}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: selected ? palette.control : palette.rule,
        backgroundColor: selected ? palette.control : undefined,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        size="meta"
        numberOfLines={1}
        style={[{ flex: 1, minWidth: 0 }, ink ? { color: ink } : null]}
      >
        {name}
      </Text>
      {detail ? (
        <Text
          size="eyebrow"
          mono
          tone="muted"
          ltr
          style={ink ? { color: ink } : undefined}
        >
          {detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

function TeamsTable({
  draft,
  playerById,
  viewerUserId,
  selected,
  onTap,
}: {
  draft: MakeTeamsDraft;
  playerById: ReadonlyMap<string, SheetPlayer>;
  viewerUserId: string | null;
  selected: MakeTeamsSlot | null;
  onTap: (slot: MakeTeamsSlot) => void;
}) {
  const locale = useLocale();
  const m = useMessages().aloneTeams.make;
  const levels = useMemo(
    () => alonePlayerMap([...playerById.values()]),
    [playerById],
  );
  const isSelected = (slot: MakeTeamsSlot) =>
    selected != null && sameSlot(selected, slot);

  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <Text size="eyebrow" tone="muted" style={{ width: NUMBER_COLUMN }}>
          {m.columnNumber}
        </Text>
        <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
          {m.columnLeft}
        </Text>
        <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
          {m.columnRight}
        </Text>
        <Text
          size="eyebrow"
          tone="muted"
          style={{ width: AVERAGE_COLUMN, textAlign: "right" }}
        >
          {m.columnAverage}
        </Text>
      </View>
      {draft.pairs.map((pair, pairIndex) => {
        const average = pairAverage(pair, levels);
        const sameSide = alonePairSameSide(pair, levels);
        const slot = (side: AloneSide) => ({ pairIndex, side });
        return (
          <Fragment key={pairIndex}>
            <Hairline />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text
                size="eyebrow"
                mono
                tone="muted"
                style={{ width: NUMBER_COLUMN }}
              >
                {String(pairIndex + 1).padStart(2, "0")}
              </Text>
              {(["left", "right"] as const).map((side) => (
                <SlotCell
                  key={side}
                  player={playerById.get(pair[side])}
                  isViewer={pair[side] === viewerUserId}
                  selected={isSelected(slot(side))}
                  onPress={() => onTap(slot(side))}
                />
              ))}
              <View style={{ width: AVERAGE_COLUMN, alignItems: "flex-end" }}>
                <Text size="body" weight="semibold" ltr>
                  {formatAloneLevel(average, locale)}
                </Text>
                {sameSide ? (
                  <Text size="eyebrow" mono tone="muted">
                    {m.sameSide(sideShort(sameSide, locale) ?? "")}
                  </Text>
                ) : null}
              </View>
            </View>
          </Fragment>
        );
      })}
    </Surface>
  );
}

/**
 * Make teams on an Alone-only Social: open balanced by level, Shuffle or
 * swap two players by hand, then post the teams (ADR-0096).
 */
export function AloneMakeTeamsScreen({ gameId }: { gameId: string }) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.aloneTeams.make;
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const game = api.games.byId.useQuery({ id: gameId });
  const sheet = api.games.teamsSheet.useQuery({ gameId });
  const [draft, setDraft] = useState<MakeTeamsDraft | null>(null);
  const [selected, setSelected] = useState<MakeTeamsSlot | null>(null);

  useEffect(() => {
    if (sheet.data && draft == null) {
      setDraft(openingMakeTeamsDraft(sheet.data));
    }
  }, [sheet.data, draft]);

  const post = api.games.postTeams.useMutation({
    onSuccess: async () => {
      toast.show(m.posted);
      await Promise.all([
        utils.games.teamsSheet.invalidate({ gameId }),
        utils.games.byId.invalidate({ id: gameId }),
        utils.games.listMyGames.invalidate(),
      ]);
      router.back();
    },
  });

  const fallback = `/games/${gameId}` as Href;
  const players = sheet.data?.players ?? [];
  const playerById = useMemo(
    () => new Map(players.map((player) => [player.userId, player])),
    [players],
  );
  const levels = useMemo(() => alonePlayerMap(players), [players]);
  const header = (
    <ScreenHeader
      nav="back"
      fallback={fallback}
      title={m.title}
      actions={<OrganizerTag />}
    />
  );

  if (sheet.error) {
    return (
      <Screen>
        {header}
        <Surface accessibilityRole="alert" style={{ gap: 4 }}>
          <Text weight="semibold">
            {messages.mobileTournament.aloneTeams.loadFailed}
          </Text>
          <Text size="meta" tone="muted">
            {isNotFoundError(sheet.error)
              ? messages.mobileGameDetails.notFound.description
              : sheet.error.message}
          </Text>
        </Surface>
      </Screen>
    );
  }

  if (!sheet.data || !draft) {
    return (
      <Screen>
        {header}
        <View
          style={{ gap: 16 }}
          accessibilityLabel={messages.mobileTournament.aloneTeams.loading}
        >
          <Skeleton height={44} radius={radii.lg} />
          <Skeleton height={360} radius={radii.surface} />
        </View>
      </Screen>
    );
  }

  const data = sheet.data;
  const reposting = data.teamsPostedAt != null;
  const problem = makeTeamsProblem(draft, data, locale);
  const blocked = data.drawPosted
    ? messages.aloneTeams.errors.drawPosted
    : players.length < data.minPlayers
      ? m.tooFew(data.minPlayers)
      : null;
  const selectedId = selected ? slotUserId(draft, selected) : null;
  const selectedName = selectedId
    ? (playerById.get(selectedId)?.name ?? null)
    : null;
  const unplaced = draft.unplaced ? playerById.get(draft.unplaced) : undefined;
  const viewerUserId = game.data?.viewerUserId ?? null;
  const gameLine = game.data
    ? [
        [gameTitle(game.data, locale), game.data.venue?.name]
          .filter(Boolean)
          .join(messages.tournament.listSeparator),
        game.data.windowStart
          ? formatGameDay(game.data.windowStart, locale, { weekday: "short" })
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  function tap(slot: MakeTeamsSlot) {
    if (!draft) {
      return;
    }
    if (selected == null) {
      setSelected(slot);
      return;
    }
    setDraft(swapMakeTeamsSlots(draft, selected, slot));
    setSelected(null);
  }

  return (
    <Screen
      footer={
        <View style={{ flex: 1, gap: 8 }}>
          <Button
            label={reposting ? m.postAgain : m.post}
            size="lg"
            disabled={!data.canPost || problem != null}
            pending={post.isPending}
            onPress={() => post.mutate({ gameId, pairs: draft.pairs })}
          />
          <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
            {reposting ? m.postAgainNote : m.postNote(players.length)}
          </Text>
        </View>
      }
    >
      <ScreenHeader
        nav="back"
        fallback={fallback}
        title={m.title}
        actions={<OrganizerTag />}
      >
        {gameLine ? (
          <Text size="meta" tone="muted">
            {gameLine}
          </Text>
        ) : null}
        <Text size="meta" tone="muted">
          {m.intro(players.length)}
        </Text>
      </ScreenHeader>
      {blocked ? (
        <Surface accessibilityRole="alert">
          <Text weight="semibold">{blocked}</Text>
        </Surface>
      ) : null}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={m.balance}
              variant="outline"
              selected={draft.mode === "balanced"}
              icon={<Scale size={15} color={colors.ink} />}
              onPress={() => {
                setSelected(null);
                setDraft(balancedDraft(players));
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={m.shuffle}
              variant="outline"
              icon={<Shuffle size={15} color={colors.ink} />}
              onPress={() => {
                setSelected(null);
                setDraft(shuffledDraft(players));
              }}
            />
          </View>
        </View>
        <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
          {selectedName
            ? m.swapSelected(selectedName)
            : makeTeamsNote(draft, levels, locale)}
        </Text>
      </View>
      <TeamsTable
        draft={draft}
        playerById={playerById}
        viewerUserId={viewerUserId}
        selected={selected}
        onTap={tap}
      />
      {unplaced ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", paddingHorizontal: 12 }}>
            <View style={{ width: NUMBER_COLUMN + 8 }} />
            <SlotCell
              player={unplaced}
              isViewer={unplaced.userId === viewerUserId}
              selected={selected === "unplaced"}
              onPress={() => tap("unplaced")}
            />
            <View style={{ flex: 1, marginStart: 8 }} />
            <View style={{ width: AVERAGE_COLUMN + 8 }} />
          </View>
          <Text size="meta" tone="muted">
            {m.unplaced(unplaced.name)}
          </Text>
        </View>
      ) : null}
      <Text size="meta" tone="muted">
        {m.legend}
      </Text>
      {problem && !blocked ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {problem}
        </Text>
      ) : null}
      {post.error ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {post.error.message}
        </Text>
      ) : null}
    </Screen>
  );
}
