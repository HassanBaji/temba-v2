import { bibColors, radii } from "@repo/design-tokens";
import { formatGameStart } from "@repo/domain/format-game-start";
import { captainPickSetupProblem } from "@repo/domain/football-captain-pick";
import { footballDraftSaveProblem } from "@repo/domain/football-draft";
import {
  FOOTBALL_TEAMS_METHODS,
  type FootballBalanceOn,
  type FootballBib,
  type FootballFirstPick,
  type FootballTeamsMethod,
} from "@repo/domain/football-lineup";
import { useRouter, useSegments, type Href } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Eraser,
  Shuffle,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { ConfirmSheet } from "../game-details/confirm-sheet";
import { footballPickRoomPath } from "../games/games-model";
import { NicknameName } from "../primitives/nickname-name";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { playerPath } from "../player-profile/player-path";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
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
  boardTierCell,
  clearSides,
  draftSummary,
  initialTeamsDraft,
  keeperWord,
  lineupPlayerName,
  mayBeSideCaptain,
  moveAcross,
  ofSide,
  ovrLabel,
  placeOn,
  setSideCaptain,
  shuffleSides,
  slotCode,
  switchMethod,
  teamsRating,
  teamsSideAverage,
  teamsTileName,
  tierProvisionalCount,
  type BoardPlayer,
  type Side,
  type TeamsDraft,
} from "@repo/domain/football-board";
import { CaptainPickSetup } from "./captain-pick-setup";
import { CaptainsSheet } from "./captains-sheet";
import { CaptainAvatar, TierMark } from "./team-columns";
import { TeamsPlayerSheet } from "./teams-player-sheet";

const BAR_HEIGHT = 6;
const SWATCH_BUTTON = 34;
const ARROW_BUTTON = 28;
const TILE_LEAD = 24;
const TILE_PADDING = 10;
const OPEN_RING = 2;
const NEW_BOX = { width: 34, height: 16 };

/** The Member nickname when the viewer may see one, else the full Temba name. */
function teamsName(player: Pick<BoardPlayer, "name" | "nickname">) {
  return player.nickname?.name ?? player.name;
}

function MethodToggle({
  method,
  methods,
  onChange,
}: {
  method: FootballTeamsMethod;
  methods: readonly FootballTeamsMethod[];
  onChange: (method: FootballTeamsMethod) => void;
}) {
  const colors = useColors();
  const m = useMessages().mobileTournament.makeTeams;
  const methodLabels: Record<FootballTeamsMethod, string> = {
    level: m.methodByLevel,
    manual: m.methodManual,
    captain_pick: m.methodCaptainPick,
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
      {methods.map((value) => {
        const selected = value === method;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(value)}
            style={{
              flex: value === "captain_pick" ? 1.3 : 1,
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
  canSaveDraft,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
  canSaveDraft: boolean;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.makeTeams;
  const row = (side: Side) => {
    const bib = side === 1 ? draft.bibs.slot1 : draft.bibs.slot2;
    const members = side === 1 ? summary.slot1 : summary.slot2;
    const name = side === 1 ? summary.names.slot1 : summary.names.slot2;
    const provisional = tierProvisionalCount(members, summary.balanceOn);
    return (
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <BibChip bib={bib} size={16} />
          <Text weight="semibold">{name}</Text>
          <Text size="meta" tone="muted" style={{ flex: 1 }}>
            {m.avgAndKeepers(
              teamsSideAverage(members, locale, summary.balanceOn),
              [
                keeperWord(members, locale),
                provisional > 0
                  ? messages.football.board.notRatedCount(provisional)
                  : null,
              ]
                .filter(Boolean)
                .join(messages.common.listSeparator),
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
        {summary.problem ??
          (canSaveDraft
            ? m.readyToPublishOrDraft(summary.note)
            : m.readyToPublish(summary.note))}
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
        width: ARROW_BUTTON,
        height: ARROW_BUTTON,
        borderRadius: radii.sm,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: on,
      }}
    >
      <Icon size={16} color={fill} style={mirrorInRtl} />
    </Pressable>
  );
}

/** The hatched box and "new", while a player's Group Tier is Provisional. */
function NewMark({ label, color }: { label: string; color: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          ...NEW_BOX,
          borderRadius: radii.slot,
          backgroundColor: colors.paper,
        }}
      >
        <Hatch />
      </View>
      <Text size="eyebrow" style={{ color, opacity: 0.6 }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * A pool player on Make teams by Level: the full name on top, wrapping
 * rather than cut, then the position, the number the teams balance on and
 * the arrow that moves them across. Tapping the tile opens their profile,
 * and the tile is ringed while it is open.
 */
function TeamsTile({
  player,
  side,
  bib,
  balanceOn,
  sideCaptain,
  open,
  onOpen,
  onMove,
}: {
  player: BoardPlayer;
  side: Side;
  bib: FootballBib;
  balanceOn: FootballBalanceOn;
  sideCaptain: boolean;
  open: boolean;
  onOpen: () => void;
  onMove: () => void;
}) {
  const colors = useColors();
  const scheme = useColorSchemeName();
  const messages = useMessages();
  const locale = useLocale();
  const { fill, on } = bibColors[bib];
  const code = slotCode(player, locale);
  const rating = teamsRating(player, balanceOn, locale);
  const { name, spoken, isNickname } = teamsTileName(player, locale);
  const edgeWidth = open ? OPEN_RING : hairline;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={[
        spoken,
        sideCaptain ? messages.football.captains.spoken : null,
        code,
        rating.spoken,
      ]
        .filter(Boolean)
        .join(messages.common.listSeparator)}
      onPress={onOpen}
      style={({ pressed }) => ({
        gap: 10,
        // The ring is a wider edge, so the padding gives the room back.
        padding: TILE_PADDING - edgeWidth,
        borderRadius: radii.card,
        backgroundColor: fill,
        borderWidth: edgeWidth,
        borderColor: open ? colors.ink : bibEdge(fill, colors, scheme),
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <CaptainAvatar
          player={player}
          bib={bib}
          sideCaptain={sideCaptain}
          size="sm"
        />
        <NicknameName
          name={name}
          isNickname={isNickname}
          size="meta"
          weight="semibold"
          color={on}
          numberOfLines={0}
          style={{ flex: 1 }}
        />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: TILE_LEAD, alignItems: "center" }}>
          {code ? (
            <Text size="eyebrow" mono style={{ color: on, opacity: 0.6 }}>
              {code}
            </Text>
          ) : null}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {rating.kind === "new" ? (
            <NewMark label={rating.value} color={on} />
          ) : rating.kind === "guest" ? (
            <Text size="meta" style={{ color: on, opacity: 0.6 }}>
              {rating.value}
            </Text>
          ) : (
            <Text
              size="lead"
              width="expanded"
              weight="bold"
              ltr
              style={{ color: on }}
            >
              {rating.value}
            </Text>
          )}
        </View>
        <ArrowButton side={side} bib={bib} name={name} onPress={onMove} />
      </View>
    </Pressable>
  );
}

function LevelColumns({
  draft,
  summary,
  openUserId,
  onOpen,
  onMove,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
  openUserId: string | null;
  onOpen: (userId: string) => void;
  onMove: (userId: string) => void;
}) {
  const m = useMessages().mobileTournament.makeTeams;
  const column = (side: Side) => {
    const bib = side === 1 ? draft.bibs.slot1 : draft.bibs.slot2;
    const members = side === 1 ? summary.slot1 : summary.slot2;
    return (
      <View style={{ flex: 1, gap: 8 }}>
        {members.map((player) => (
          <TeamsTile
            key={player.userId}
            player={player}
            side={side}
            bib={bib}
            balanceOn={summary.balanceOn}
            sideCaptain={ofSide(draft.captains, side) === player.userId}
            open={openUserId === player.userId}
            onOpen={() => onOpen(player.userId)}
            onMove={() => onMove(player.userId)}
          />
        ))}
      </View>
    );
  };
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
          {m.players}
        </Text>
        <Text size="eyebrow" tone="muted">
          {m.tapToOpen}
        </Text>
      </View>
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
  onOpen,
  onPlace,
}: {
  player: BoardPlayer;
  draft: TeamsDraft;
  names: { slot1: string; slot2: string };
  onOpen: () => void;
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
  const { name, spoken, isNickname } = teamsTileName(player, locale);
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[spoken, code]
          .filter(Boolean)
          .join(messages.common.listSeparator)}
        onPress={onOpen}
        style={{
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <CaptainAvatar
          player={player}
          bib={bib}
          sideCaptain={
            side != null && ofSide(draft.captains, side) === player.userId
          }
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <NicknameName
            name={name}
            isNickname={isNickname}
            weight="regular"
            color={on}
            numberOfLines={0}
          />
          {code ? (
            <Text size="eyebrow" mono style={{ color: on, opacity: 0.7 }}>
              {code}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {tierCell ? (
        <TierMark cell={tierCell} />
      ) : (
        <Text weight="bold" width="expanded" ltr style={{ color: on }}>
          {ovrLabel(player)}
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
  onOpen,
  onPlace,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
  onOpen: (userId: string) => void;
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
            onOpen={() => onOpen(player.userId)}
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

function CaptainChip({
  side,
  team,
  captain,
  onPress,
}: {
  side: Side;
  team: string;
  captain: BoardPlayer | null;
  onPress: (side: Side) => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.captains;
  const name = lineupPlayerName(captain, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.chipSpoken(team, name)}
      onPress={() => onPress(side)}
      style={{
        flex: 1,
        minWidth: 0,
        height: 42,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderStyle: captain ? "solid" : "dashed",
        borderColor: captain ? colors.rule : colors.inputBorder,
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: radii.sm,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: captain ? colors.control : colors.paper,
          borderWidth: hairline,
          borderColor: captain ? colors.controlEdge : colors.inputBorder,
        }}
      >
        <Text
          size="eyebrow"
          weight="semibold"
          style={{ color: captain ? colors.onControl : colors.muted }}
        >
          {m.badge}
        </Text>
      </View>
      <Text
        size="meta"
        numberOfLines={1}
        tone={captain ? undefined : "muted"}
        style={{ flex: 1 }}
      >
        {name ?? m.add}
      </Text>
      <ChevronDown size={14} color={colors.muted} />
    </Pressable>
  );
}

/** "Captains, optional, one per team": a chip per side opens the sheet. */
function CaptainsRow({
  draft,
  players,
  names,
  onOpen,
}: {
  draft: TeamsDraft;
  players: readonly BoardPlayer[];
  names: { slot1: string; slot2: string };
  onOpen: (side: Side) => void;
}) {
  const m = useMessages().football.captains;
  const captain = (userId: string | null) =>
    players.find((player) => player.userId === userId) ?? null;
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
          {m.title}
        </Text>
        <Text size="eyebrow" tone="muted">
          {m.optional}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <CaptainChip
          side={1}
          team={names.slot1}
          captain={captain(draft.captains.slot1)}
          onPress={onOpen}
        />
        <CaptainChip
          side={2}
          team={names.slot2}
          captain={captain(draft.captains.slot2)}
          onPress={onOpen}
        />
      </View>
    </View>
  );
}

/**
 * The Organizer splits the pool into two teams, by Level or by hand, picks
 * each team's bib colour and publishes, or saves the split as the Game's
 * Draft line-up while the teams are not published, with a Side captain per
 * team or none. Opened from a draft, it starts from it. A save and a publish
 * name the draft it opened from, or say that there was none, so a draft a
 * co-Organizer saved meanwhile is not replaced unseen. While the teams are
 * not published it also opens a Captain pick (ADR-0109); opened while one
 * runs, it goes to the Pick room.
 */
export function MakeTeamsScreen({ gameId }: { gameId: string }) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.makeTeams;
  const router = useRouter();
  const segments = useSegments();
  const toast = useToast();
  const utils = api.useUtils();
  const game = api.games.byId.useQuery({ id: gameId });
  const board = api.games.footballBoard.useQuery({ gameId });
  const [draft, setDraft] = useState<TeamsDraft | null>(null);
  const [openedFromDraftAt, setOpenedFromDraftAt] = useState<Date | null>(null);
  const [captainsSide, setCaptainsSide] = useState<Side | null>(null);
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [firstPick, setFirstPick] = useState<FootballFirstPick>("toss");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const pickStatus = board.data?.draft?.pick?.status;
  const pickRunning = pickStatus === "waiting" || pickStatus === "live";

  useEffect(() => {
    if (pickRunning) {
      router.replace(footballPickRoomPath(gameId));
    }
  }, [pickRunning, gameId, router]);

  useEffect(() => {
    if (board.data && draft == null) {
      setDraft(
        initialTeamsDraft(
          board.data.players,
          board.data.teams,
          board.data.draft,
        ),
      );
      setOpenedFromDraftAt(board.data.draft?.updatedAt ?? null);
    }
  }, [board.data, draft]);

  const closeWith = async (message: string) => {
    toast.show(message);
    await Promise.all([
      utils.games.footballBoard.invalidate({ gameId }),
      utils.games.byId.invalidate({ id: gameId }),
      utils.games.listMyGames.invalidate(),
    ]);
    router.back();
  };

  const publish = api.games.publishFootballTeams.useMutation({
    onSuccess: () => closeWith(m.published),
  });
  const saveDraft = api.games.saveFootballDraft.useMutation({
    onSuccess: () => closeWith(m.draftSaved),
  });
  const openRoom = api.games.openFootballPickRoom.useMutation({
    onSuccess: async () => {
      setConfirmReplace(false);
      await Promise.all([
        utils.games.footballBoard.invalidate({ gameId }),
        utils.games.footballPickRoom.invalidate({ gameId }),
      ]);
      router.replace(footballPickRoomPath(gameId));
    },
    onError: () => setConfirmReplace(false),
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

  if (!draft || !summary || pickRunning) {
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
  const how =
    draft.method === "captain_pick"
      ? messages.football.pick.setup.intro
      : draft.method === "level"
        ? m.howLevel
        : m.howManual;
  const canSaveDraft = board.data?.viewer.canSaveDraft ?? false;
  const canOpenPickRoom = board.data?.viewer.canOpenPickRoom ?? false;
  const methods = canOpenPickRoom
    ? FOOTBALL_TEAMS_METHODS
    : FOOTBALL_TEAMS_METHODS.filter((method) => method !== "captain_pick");
  const pickCaptains = {
    slot1: draft.captains.slot1,
    slot2: draft.captains.slot2,
  };
  const pickProblem = captainPickSetupProblem(
    pickCaptains,
    players.map((player) => player.userId),
    players.filter(mayBeSideCaptain).map((player) => player.userId),
    locale,
  );
  const captainName = (userId: string | null) =>
    lineupPlayerName(
      players.find((player) => player.userId === userId),
      locale,
    ) ?? "";
  const openPickRoom = () => {
    if (pickCaptains.slot1 == null || pickCaptains.slot2 == null) {
      return;
    }
    openRoom.mutate({
      gameId,
      bibs: draft.bibs,
      captains: { slot1: pickCaptains.slot1, slot2: pickCaptains.slot2 },
      firstPick,
    });
  };
  const openPlayer =
    draft.method === "captain_pick"
      ? null
      : (players.find((player) => player.userId === openUserId) ?? null);
  const openSide = openPlayer ? (draft.sides[openPlayer.userId] ?? null) : null;
  const openIsCaptain =
    openSide != null && ofSide(draft.captains, openSide) === openPlayer?.userId;
  const method = draft.method;
  const sides = {
    method,
    bibs: draft.bibs,
    slot1: summary.slot1.map((player) => player.userId),
    slot2: summary.slot2.map((player) => player.userId),
    captains: draft.captains,
  };
  const saveProblem = footballDraftSaveProblem(
    sides,
    players.map((player) => player.userId),
    locale,
  );

  return (
    <Screen
      footer={
        method === "captain_pick" ? (
          <View style={{ flex: 1, gap: 8 }}>
            <Button
              label={messages.football.pick.setup.open}
              size="lg"
              disabled={pickProblem != null}
              pending={openRoom.isPending}
              onPress={() =>
                board.data?.draft ? setConfirmReplace(true) : openPickRoom()
              }
            />
            <Text
              size="eyebrow"
              tone="muted"
              accessibilityLiveRegion="polite"
              style={{ textAlign: "center" }}
            >
              {pickProblem ??
                messages.football.pick.setup.told(
                  captainName(pickCaptains.slot1),
                  captainName(pickCaptains.slot2),
                )}
            </Text>
          </View>
        ) : (
          <>
            {draft.method === "level" ? (
              <Button
                label={m.shuffle}
                variant="outline"
                size={canSaveDraft ? "icon-lg" : "lg"}
                icon={<Shuffle size={16} color={colors.ink} />}
                onPress={() =>
                  setDraft(shuffleSides(draft, players, Math.random))
                }
              />
            ) : (
              <Button
                label={messages.common.clear}
                variant="outline"
                size={canSaveDraft ? "icon-lg" : "lg"}
                icon={
                  canSaveDraft ? <Eraser size={16} color={colors.ink} /> : null
                }
                onPress={() => setDraft(clearSides(draft))}
              />
            )}
            {canSaveDraft ? (
              <Button
                label={m.saveDraft}
                variant="outline"
                size="lg"
                disabled={saveProblem != null || publish.isPending}
                pending={saveDraft.isPending}
                onPress={() =>
                  saveDraft.mutate({
                    gameId,
                    ...sides,
                    method,
                    draftUpdatedAt: openedFromDraftAt,
                  })
                }
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Button
                label={m.publish}
                size="lg"
                disabled={summary.problem != null || saveDraft.isPending}
                pending={publish.isPending}
                onPress={() =>
                  publish.mutate({
                    gameId,
                    ...sides,
                    draftUpdatedAt: openedFromDraftAt,
                  })
                }
              />
            </View>
          </>
        )
      }
    >
      <ScreenHeader
        nav="back"
        fallback={fallback}
        title={draft.method === "manual" ? m.manualTitle : m.title}
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
        methods={methods}
        onChange={(method) => setDraft(switchMethod(draft, method, players))}
      />
      {draft.method === "captain_pick" ? (
        <CaptainPickSetup
          draft={draft}
          players={players}
          names={summary.names}
          balanceOn={board.data?.balanceOn ?? "ovr"}
          firstPick={firstPick}
          onChange={setDraft}
          onFirstPickChange={setFirstPick}
        />
      ) : (
        <>
          <BibPicker
            bibs={draft.bibs}
            onChange={(bibs) => setDraft({ ...draft, bibs })}
          />
          <BalanceCard
            draft={draft}
            summary={summary}
            canSaveDraft={canSaveDraft}
          />
          <CaptainsRow
            draft={draft}
            players={players}
            names={summary.names}
            onOpen={setCaptainsSide}
          />
          {draft.method === "level" ? (
            <LevelColumns
              draft={draft}
              summary={summary}
              openUserId={openPlayer?.userId ?? null}
              onOpen={setOpenUserId}
              onMove={(userId) => setDraft(moveAcross(draft, userId))}
            />
          ) : (
            <ManualLists
              draft={draft}
              summary={summary}
              onOpen={setOpenUserId}
              onPlace={(userId, side) => setDraft(placeOn(draft, userId, side))}
            />
          )}
        </>
      )}
      {publish.error || saveDraft.error || openRoom.error ? (
        <Text size="meta" accessibilityRole="alert">
          {(publish.error ?? saveDraft.error ?? openRoom.error)?.message}
        </Text>
      ) : null}
      <TeamsPlayerSheet
        gameId={gameId}
        player={openPlayer}
        side={openSide}
        names={summary.names}
        balanceOn={summary.balanceOn}
        isCaptain={openIsCaptain}
        canBeCaptain={
          openSide != null && openPlayer != null && mayBeSideCaptain(openPlayer)
        }
        onClose={() => setOpenUserId(null)}
        onPlace={(side) => {
          if (openPlayer) {
            setDraft(placeOn(draft, openPlayer.userId, side));
          }
        }}
        onToggleCaptain={() => {
          if (openPlayer && openSide) {
            setDraft(
              setSideCaptain(
                draft,
                openSide,
                openIsCaptain ? null : openPlayer.userId,
              ),
            );
          }
        }}
        onOpenProfile={() => {
          if (openPlayer) {
            setOpenUserId(null);
            router.push(playerPath(segments, openPlayer.userId, "football"));
          }
        }}
      />
      <CaptainsSheet
        side={captainsSide}
        bibs={draft.bibs}
        names={summary.names}
        sides={{ slot1: summary.slot1, slot2: summary.slot2 }}
        captains={draft.captains}
        onSideChange={setCaptainsSide}
        onPick={(side, userId) => setDraft(setSideCaptain(draft, side, userId))}
        onClose={() => setCaptainsSide(null)}
      />
      <ConfirmSheet
        request={
          confirmReplace
            ? {
                title: messages.football.pick.setup.replaceTitle,
                description: messages.football.pick.setup.replaceBody,
                confirmLabel: messages.football.pick.setup.replaceConfirm,
                cancelLabel: messages.football.pick.setup.cancel,
                onConfirm: openPickRoom,
              }
            : null
        }
        pending={openRoom.isPending}
        onClose={() => setConfirmReplace(false)}
      />
    </Screen>
  );
}
