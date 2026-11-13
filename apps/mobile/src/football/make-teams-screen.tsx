import { bibColors, radii } from "@repo/design-tokens";
import { formatGameStart } from "@repo/domain/format-game-start";
import {
  FOOTBALL_TEAMS_METHODS,
  type FootballBalanceOn,
  type FootballBib,
  type FootballTeamsMethod,
} from "@repo/domain/football-lineup";
import { useRouter, type Href } from "expo-router";
import { ArrowLeft, ArrowRight, Shuffle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { NicknameName } from "../primitives/nickname-name";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors, useColorSchemeName } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { bibEdge } from "./bib-edge";
import { BibChip, BibPicker } from "./bib-picker";
import {
  balancedSides,
  boardTierCell,
  draftSummary,
  initialTeamsDraft,
  keeperWord,
  makeTeamsLevelLabel,
  moveAcross,
  placeOn,
  slotCode,
  switchMethod,
  teamsSideAverage,
  type BoardPlayer,
  type Side,
  type TeamsDraft,
} from "@repo/domain/football-board";
import { BibRow, TierMark } from "./team-columns";

const BAR_HEIGHT = 6;
const SWATCH_BUTTON = 34;

/** The Member nickname when the viewer may see one, else the full Temba name. */
function teamsName(player: Pick<BoardPlayer, "name" | "nickname">) {
  return player.nickname?.name ?? player.name;
}

function MethodToggle({
  method,
  onChange,
}: {
  method: FootballTeamsMethod;
  onChange: (method: FootballTeamsMethod) => void;
}) {
  const colors = useColors();
  const m = useMessages().mobileTournament.makeTeams;
  const methodLabels: Record<FootballTeamsMethod, string> = {
    level: m.methodByLevel,
    manual: m.methodManual,
  };
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: "row",
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        overflow: "hidden",
      }}
    >
      {FOOTBALL_TEAMS_METHODS.map((value) => {
        const selected = value === method;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(value)}
            style={{
              flex: 1,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? colors.control : colors.paper,
            }}
          >
            <Text
              size="meta"
              weight={selected ? "semibold" : "regular"}
              style={{ color: selected ? colors.onControl : colors.muted }}
            >
              {methodLabels[value]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Bar({ share, bib }: { share: number; bib: FootballBib }) {
  const colors = useColors();
  const scheme = useColorSchemeName();
  const fill = bibColors[bib].fill;
  return (
    <View
      style={{
        flex: 1,
        height: BAR_HEIGHT,
        borderRadius: BAR_HEIGHT / 2,
        backgroundColor: colors.wash,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${Math.round(Math.min(1, share) * 100)}%`,
          height: BAR_HEIGHT,
          backgroundColor: bibEdge(fill, colors, scheme),
        }}
      />
    </View>
  );
}

function BalanceCard({
  draft,
  summary,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
}) {
  const locale = useLocale();
  const m = useMessages().mobileTournament.makeTeams;
  const row = (side: Side) => {
    const bib = side === 1 ? draft.bibs.slot1 : draft.bibs.slot2;
    const members = side === 1 ? summary.slot1 : summary.slot2;
    const name = side === 1 ? summary.names.slot1 : summary.names.slot2;
    return (
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <BibChip bib={bib} size={16} />
          <Text weight="semibold">{name}</Text>
          <Text size="meta" tone="muted" style={{ flex: 1 }}>
            {m.avgAndKeepers(
              teamsSideAverage(members, locale, summary.balanceOn),
              keeperWord(members, locale),
            )}
          </Text>
          <Text weight="bold" width="expanded">
            {draft.method === "manual"
              ? m.ofTeamSize(members.length, summary.teamSize)
              : String(members.length)}
          </Text>
        </View>
        <Bar share={members.length / Math.max(1, summary.teamSize)} bib={bib} />
      </View>
    );
  };
  return (
    <Surface style={{ gap: 12 }}>
      {row(1)}
      {row(2)}
      <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
        {summary.problem ?? m.readyToPublish(summary.note)}
      </Text>
    </Surface>
  );
}

function ArrowButton({
  side,
  bib,
  name,
  onPress,
}: {
  side: Side;
  bib: FootballBib;
  name: string;
  onPress: () => void;
}) {
  const m = useMessages().mobileTournament.makeTeams;
  const { fill, on } = bibColors[bib];
  const Icon = side === 1 ? ArrowRight : ArrowLeft;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.moveToOtherTeam(name)}
      hitSlop={6}
      onPress={onPress}
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: on,
      }}
    >
      <Icon size={14} color={fill} style={mirrorInRtl} />
    </Pressable>
  );
}

function LevelColumns({
  draft,
  summary,
  onMove,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
  onMove: (userId: string) => void;
}) {
  const m = useMessages().mobileTournament.makeTeams;
  const column = (side: Side) => {
    const bib = side === 1 ? draft.bibs.slot1 : draft.bibs.slot2;
    const members = side === 1 ? summary.slot1 : summary.slot2;
    return (
      <View style={{ flex: 1, gap: 8 }}>
        {members.map((player) => (
          <BibRow
            key={player.userId}
            player={player}
            bib={bib}
            showTier
            balanceOn={summary.balanceOn}
            trailing={
              <ArrowButton
                side={side}
                bib={bib}
                name={teamsName(player)}
                onPress={() => onMove(player.userId)}
              />
            }
          />
        ))}
      </View>
    );
  };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {column(1)}
        {column(2)}
      </View>
      <Text size="meta" tone="muted">
        {m.noSubs}
      </Text>
    </View>
  );
}

function SwatchButton({
  bib,
  selected,
  label,
  onPress,
}: {
  bib: FootballBib;
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const scheme = useColorSchemeName();
  const fill = bibColors[bib].fill;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        width: SWATCH_BUTTON,
        height: SWATCH_BUTTON,
        borderRadius: radii.sm,
        padding: 2,
        borderWidth: 2,
        borderColor: selected ? colors.ink : "transparent",
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: radii.sm - 2,
          backgroundColor: fill,
          borderWidth: hairline,
          borderColor: bibEdge(fill, colors, scheme),
          opacity: selected ? 1 : 0.55,
        }}
      />
    </Pressable>
  );
}

function ManualRow({
  player,
  draft,
  names,
  balanceOn,
  onPlace,
}: {
  player: BoardPlayer;
  draft: TeamsDraft;
  names: { slot1: string; slot2: string };
  balanceOn: FootballBalanceOn;
  onPlace: (side: Side) => void;
}) {
  const colors = useColors();
  const scheme = useColorSchemeName();
  const messages = useMessages();
  const locale = useLocale();
  const m = messages.mobileTournament.makeTeams;
  const side = draft.sides[player.userId];
  const bib =
    side === 1 ? draft.bibs.slot1 : side === 2 ? draft.bibs.slot2 : null;
  const fill = bib ? bibColors[bib].fill : colors.paper;
  const on = bib ? bibColors[bib].on : colors.ink;
  const code = slotCode(player, locale);
  const tierCell = boardTierCell(player, locale);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: radii.md,
        backgroundColor: fill,
        borderWidth: hairline,
        borderStyle: bib ? "solid" : "dashed",
        borderColor: bib ? bibEdge(fill, colors, scheme) : colors.inputBorder,
      }}
    >
      <Avatar name={player.name} uri={player.image} guest={player.guest} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <NicknameName
          name={player.isViewer ? messages.common.you : teamsName(player)}
          isNickname={!player.isViewer && player.nickname != null}
          weight="regular"
          color={on}
        />
        {code ? (
          <Text size="eyebrow" mono style={{ color: on, opacity: 0.7 }}>
            {code}
          </Text>
        ) : null}
      </View>
      {tierCell ? (
        <TierMark cell={tierCell} />
      ) : (
        <Text weight="bold" width="expanded" ltr style={{ color: on }}>
          {makeTeamsLevelLabel(player, balanceOn)}
        </Text>
      )}
      <SwatchButton
        bib={draft.bibs.slot1}
        selected={side === 1}
        label={m.putIn(teamsName(player), names.slot1)}
        onPress={() => onPlace(1)}
      />
      <SwatchButton
        bib={draft.bibs.slot2}
        selected={side === 2}
        label={m.putIn(teamsName(player), names.slot2)}
        onPress={() => onPlace(2)}
      />
    </View>
  );
}

function ManualLists({
  draft,
  summary,
  onPlace,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
  onPlace: (userId: string, side: Side) => void;
}) {
  const m = useMessages().mobileTournament.makeTeams;
  const group = (
    title: React.ReactNode,
    meta: string,
    members: readonly BoardPlayer[],
  ) =>
    members.length > 0 ? (
      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {title}
          <Text size="meta" tone="muted">
            {meta}
          </Text>
        </View>
        {members.map((player) => (
          <ManualRow
            key={player.userId}
            player={player}
            draft={draft}
            names={summary.names}
            balanceOn={summary.balanceOn}
            onPlace={(side) => onPlace(player.userId, side)}
          />
        ))}
      </View>
    ) : null;
  const sideTitle = (bib: FootballBib, name: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <BibChip bib={bib} size={14} />
      <Text weight="semibold">{name}</Text>
    </View>
  );
  return (
    <View style={{ gap: 20 }}>
      {group(
        <Text weight="semibold">{m.notPlaced}</Text>,
        m.left(summary.unplaced.length),
        summary.unplaced,
      )}
      {group(
        sideTitle(draft.bibs.slot1, summary.names.slot1),
        m.ofTeamSize(summary.slot1.length, summary.teamSize),
        summary.slot1,
      )}
      {group(
        sideTitle(draft.bibs.slot2, summary.names.slot2),
        m.ofTeamSize(summary.slot2.length, summary.teamSize),
        summary.slot2,
      )}
    </View>
  );
}

/**
 * The Organizer splits the pool into two teams, by Level or by hand, picks
 * each team's bib colour and publishes.
 */
export function MakeTeamsScreen({ gameId }: { gameId: string }) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.makeTeams;
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const game = api.games.byId.useQuery({ id: gameId });
  const board = api.games.footballBoard.useQuery({ gameId });
  const [draft, setDraft] = useState<TeamsDraft | null>(null);

  useEffect(() => {
    if (board.data && draft == null) {
      setDraft(initialTeamsDraft(board.data.players, board.data.teams));
    }
  }, [board.data, draft]);

  const publish = api.games.publishFootballTeams.useMutation({
    onSuccess: async () => {
      toast.show(m.published);
      await Promise.all([
        utils.games.footballBoard.invalidate({ gameId }),
        utils.games.byId.invalidate({ id: gameId }),
        utils.games.listMyGames.invalidate(),
      ]);
      router.back();
    },
  });

  const fallback = `/games/${gameId}` as Href;
  const players = board.data?.players ?? [];
  const sideSize = game.data?.sideSize ?? null;
  const summary = draft
    ? draftSummary(draft, players, locale, board.data?.balanceOn)
    : null;

  if (board.error || (board.data && !board.data.viewer.canMakeTeams)) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title={m.title} />
        <Surface style={{ gap: 4 }}>
          <Text weight="semibold">
            {board.error ? m.poolLoadFailed : m.teamsFixed}
          </Text>
          <Text size="meta" tone="muted">
            {board.error?.message ?? m.organizerOnly}
          </Text>
        </Surface>
      </Screen>
    );
  }

  if (!draft || !summary) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title={m.title} />
        <Skeleton height={320} radius={16} />
      </Screen>
    );
  }

  const start = game.data?.windowStart ?? null;
  const intro = [
    start ? formatGameStart(start, locale) : null,
    sideSize
      ? m.perTeamStart(summary.teamSize, sideSize)
      : m.perTeam(summary.teamSize),
  ]
    .filter(Boolean)
    .join(". ");
  const how = draft.method === "level" ? m.howLevel : m.howManual;

  return (
    <Screen
      footer={
        <>
          {draft.method === "level" ? (
            <Button
              label={m.shuffle}
              variant="outline"
              size="lg"
              icon={<Shuffle size={16} color={colors.ink} />}
              onPress={() =>
                setDraft({
                  ...draft,
                  sides: balancedSides(players, Math.random),
                })
              }
            />
          ) : (
            <Button
              label={messages.common.clear}
              variant="outline"
              size="lg"
              onPress={() => setDraft({ ...draft, sides: {} })}
            />
          )}
          <View style={{ flex: 1 }}>
            <Button
              label={m.publish}
              size="lg"
              disabled={summary.problem != null}
              pending={publish.isPending}
              onPress={() =>
                publish.mutate({
                  gameId,
                  method: draft.method,
                  bibs: draft.bibs,
                  slot1: summary.slot1.map((player) => player.userId),
                  slot2: summary.slot2.map((player) => player.userId),
                })
              }
            />
          </View>
        </>
      }
    >
      <ScreenHeader
        nav="back"
        fallback={fallback}
        title={draft.method === "level" ? m.title : m.manualTitle}
        actions={
          <Text size="meta" tone="muted">
            {m.inThePool(players.length)}
          </Text>
        }
      >
        <Text size="meta" tone="muted">
          {intro}. {how}
        </Text>
      </ScreenHeader>
      <MethodToggle
        method={draft.method}
        onChange={(method) => setDraft(switchMethod(draft, method, players))}
      />
      <BibPicker
        bibs={draft.bibs}
        onChange={(bibs) => setDraft({ ...draft, bibs })}
      />
      <BalanceCard draft={draft} summary={summary} />
      {draft.method === "level" ? (
        <LevelColumns
          draft={draft}
          summary={summary}
          onMove={(userId) => setDraft(moveAcross(draft, userId))}
        />
      ) : (
        <ManualLists
          draft={draft}
          summary={summary}
          onPlace={(userId, side) => setDraft(placeOn(draft, userId, side))}
        />
      )}
      {publish.error ? (
        <Text size="meta" accessibilityRole="alert">
          {publish.error.message}
        </Text>
      ) : null}
    </Screen>
  );
}
