import { sizes } from "@repo/design-tokens";
import { formatGameStart } from "@repo/domain/format-game-start";
import { registerTeamAction } from "@repo/domain/game-copy";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import { levelRangeRequestCard } from "@repo/domain/level-range-request";
import {
  tournamentSeatLabel,
  type TournamentDetails,
  type TournamentDetailsSide,
  type TournamentHomeView,
} from "@repo/domain/tournament-details";
import {
  tournamentCollapsedTeamsLabel,
  tournamentSeatsTakenLine,
  tournamentSeatsTakenSrLabel,
  tournamentTeamRows,
  tournamentTeamsCountLine,
  type TournamentTeamRow,
} from "@repo/domain/tournament-home";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Card } from "../home/card";
import { LevelRequestCard } from "../game-details/level-request-card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { OpenSlot } from "./open-slot";

type Position = "left" | "right";
type Occupant = NonNullable<TournamentDetailsSide["left"]>;

const SEAT_CELL = 22;

export type PreDrawHandlers = {
  levelRequestPending: boolean;
  registerTeamPending: boolean;
  teamId: string;
  onTeamIdChange: (teamId: string) => void;
  onTakeSeat: (seat: { sideIndex: number; position: Position }) => void;
  /** The Organizer tapped an open seat; `canJoin` when they could take it too. */
  onOpenSeat?: (
    seat: { sideIndex: number; position: Position },
    canJoin: boolean,
  ) => void;
  onRegisterTeam: (teamId: string) => void;
  onRequestLevel: () => void;
  onOpenPlayer?: (userId: string) => void;
  /** True where tapping the player opens the Organizer's actions, not their profile. */
  playerOpensActions?: (userId: string) => boolean;
};

function HeroSeat({
  occupant,
  position,
  isViewer,
}: {
  occupant: Occupant | null;
  position: Position;
  isViewer: boolean;
}) {
  const messages = useMessages();
  const home = messages.tournament.home;
  if (!occupant) {
    return (
      <View
        accessible
        accessibilityLabel={home.openPositionSr}
        style={{ flex: 1, height: 64, borderRadius: 8 }}
      >
        <Hatch radius={8} />
      </View>
    );
  }
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        minHeight: 64,
      }}
    >
      <Avatar name={occupant.name} uri={occupant.image} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="body" numberOfLines={1}>
          {isViewer ? messages.common.you : occupant.name}
        </Text>
        <Text size="eyebrow" tone="muted">
          {position === "left" ? home.leftSeat : home.rightSeat}
        </Text>
      </View>
    </View>
  );
}

function Hero({
  view,
  viewerUserId,
}: {
  view: TournamentHomeView;
  viewerUserId: string;
}) {
  const messages = useMessages();
  const { hero, viewerSide } = view;
  return (
    <Surface tone="ink" style={{ gap: 12 }}>
      <Text size="meta" tone="muted">
        {hero.eyebrow}
      </Text>
      <Text
        size="display"
        width="expanded"
        weight="bold"
        accessibilityRole="header"
      >
        {hero.name}
      </Text>
      <View>
        {hero.startLine ? <Text size="lead">{hero.startLine}</Text> : null}
        {hero.sizeLine ? (
          <Text size="meta" tone="muted">
            {hero.sizeLine}
          </Text>
        ) : null}
      </View>
      <Hairline />
      {view.seated ? (
        <View style={{ gap: 8 }}>
          <Text size="meta" tone="muted">
            {messages.tournament.home.yourTeam}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <HeroSeat
              occupant={viewerSide?.left ?? null}
              position="left"
              isViewer={viewerSide?.left?.userId === viewerUserId}
            />
            <HeroSeat
              occupant={viewerSide?.right ?? null}
              position="right"
              isViewer={viewerSide?.right?.userId === viewerUserId}
            />
          </View>
        </View>
      ) : null}
      <Text size="meta" tone="muted">
        {hero.statusLine}
      </Text>
    </Surface>
  );
}

function SeatTile({
  occupant,
  position,
  teamLabel,
  viewerUserId,
  joinable,
  addable,
  onJoin,
  onOpen,
  opensActions = false,
}: {
  occupant: Occupant | null;
  position: Position;
  teamLabel: string;
  viewerUserId: string;
  joinable: boolean;
  /** The Organizer may add a player here. */
  addable: boolean;
  onJoin: () => void;
  onOpen?: (userId: string) => void;
  opensActions?: boolean;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.predraw;
  const home = messages.tournament.home;
  const palette = useTonePalette();
  const positionName = messages.tournament.position[position];

  if (!occupant) {
    const label = tournamentSeatLabel({
      position,
      teamLabel,
      joinable,
      locale,
    });
    const pressable = joinable || addable;
    return (
      <Pressable
        accessibilityRole={pressable ? "button" : undefined}
        accessibilityLabel={label}
        accessibilityHint={
          addable ? messages.editTeams.openSpot.addPlayerHint : undefined
        }
        accessible
        disabled={!pressable}
        onPress={onJoin}
        style={{
          flex: 1,
          minHeight: sizes.touchTarget + 8,
          borderRadius: 8,
          justifyContent: "flex-end",
          padding: 8,
        }}
      >
        <Hatch radius={8} />
        <Text
          size="meta"
          tone="muted"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {joinable
            ? position === "left"
              ? m.takeLeft
              : m.takeRight
            : addable
              ? messages.group.addPlayer.action
              : positionName}
        </Text>
      </Pressable>
    );
  }

  const level = occupant.levelBand
    ? displayLabelFromStoredBand(occupant.levelBand)
    : null;
  const label = [
    occupant.userId === viewerUserId ? messages.common.you : occupant.name,
    position === "left" ? home.leftSeat : home.rightSeat,
    level,
  ]
    .filter(Boolean)
    .join(messages.tournament.listSeparator);
  const tile = (
    <View
      accessible={!onOpen}
      accessibilityLabel={onOpen ? undefined : label}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: sizes.touchTarget + 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 8,
        borderRadius: 8,
        borderWidth: hairline,
        borderColor: palette.rule,
      }}
    >
      <Avatar name={occupant.name} uri={occupant.image} size="sm" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" weight="medium" numberOfLines={1}>
          {occupant.userId === viewerUserId
            ? messages.common.you
            : occupant.name}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {[positionName, level].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </View>
  );

  if (!onOpen) {
    return tile;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={
        opensActions ? m.opensPlayerActionsHint : m.opensProfileHint
      }
      onPress={() => onOpen(occupant.userId)}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      {tile}
    </Pressable>
  );
}

function TeamRow({
  row,
  side,
  viewerUserId,
  canTakeSeat,
  onTakeSeat,
  onOpenSeat,
  onOpenPlayer,
  playerOpensActions,
}: {
  row: TournamentTeamRow;
  side: TournamentDetailsSide | null;
  viewerUserId: string;
  canTakeSeat: boolean;
  onTakeSeat: PreDrawHandlers["onTakeSeat"];
  onOpenSeat: PreDrawHandlers["onOpenSeat"];
  onOpenPlayer: PreDrawHandlers["onOpenPlayer"];
  playerOpensActions: PreDrawHandlers["playerOpensActions"];
}) {
  const locale = useLocale();
  const messages = useMessages();
  const teamLabel = formatGameSideLabel(
    "friendly_tournament",
    row.sideIndex,
    locale,
  );
  const joinable = canTakeSeat && !row.isViewer;
  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          size="eyebrow"
          tone="muted"
          style={{ width: 22 }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {row.indexLabel}
        </Text>
        <Text size="body" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
          {teamLabel}
        </Text>
        {row.isViewer ? (
          <Text size="eyebrow" tone="muted">
            {messages.tournament.home.yourTeamTag}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["left", "right"] as const).map((position) => (
          <SeatTile
            key={position}
            occupant={side?.[position] ?? null}
            position={position}
            teamLabel={teamLabel}
            viewerUserId={viewerUserId}
            joinable={joinable && side?.[position] == null}
            addable={onOpenSeat != null && side?.[position] == null}
            onJoin={() =>
              onOpenSeat
                ? onOpenSeat({ sideIndex: row.sideIndex, position }, joinable)
                : onTakeSeat({ sideIndex: row.sideIndex, position })
            }
            onOpen={onOpenPlayer}
            opensActions={
              side?.[position] != null &&
              (playerOpensActions?.(side[position].userId) ?? false)
            }
          />
        ))}
      </View>
    </View>
  );
}

function TeamsCard({
  game,
  view,
  onTakeSeat,
  onOpenSeat,
  onOpenPlayer,
  playerOpensActions,
}: {
  game: TournamentDetails;
  view: TournamentHomeView;
  onTakeSeat: PreDrawHandlers["onTakeSeat"];
  onOpenSeat: PreDrawHandlers["onOpenSeat"];
  onOpenPlayer: PreDrawHandlers["onOpenPlayer"];
  playerOpensActions: PreDrawHandlers["playerOpensActions"];
}) {
  const locale = useLocale();
  const messages = useMessages();
  const [expanded, setExpanded] = useState(false);
  const rows = tournamentTeamRows(game.sides, game.viewerUserId, locale);
  const countLine = tournamentTeamsCountLine(
    view.field.full,
    view.field.halfOpen,
    locale,
  );
  const sideOf = (sideIndex: number) =>
    game.sides.find((side) => side.sideIndex === sideIndex) ?? null;
  const renderRow = (row: TournamentTeamRow) => (
    <View key={row.sideIndex}>
      <Hairline />
      <TeamRow
        row={row}
        side={sideOf(row.sideIndex)}
        viewerUserId={game.viewerUserId}
        canTakeSeat={view.canTakeSeat}
        onTakeSeat={onTakeSeat}
        onOpenSeat={onOpenSeat}
        onOpenPlayer={onOpenPlayer}
        playerOpensActions={playerOpensActions}
      />
    </View>
  );

  return (
    <Card
      title={messages.tournament.home.teamsHeading}
      meta={countLine || undefined}
      flush
    >
      {rows.head.map(renderRow)}
      {rows.collapsedCount > 0 ? (
        <View>
          <Hairline />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((open) => !open)}
            style={{
              minHeight: sizes.touchTarget,
              justifyContent: "center",
              paddingHorizontal: 16,
            }}
          >
            <Text size="meta" tone="muted">
              {expanded
                ? messages.mobileTournament.predraw.showFewerTeams
                : tournamentCollapsedTeamsLabel(rows.collapsedCount, locale)}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {expanded ? rows.collapsed.map(renderRow) : null}
      {rows.tail.map(renderRow)}
    </Card>
  );
}

function SeatsCard({ view }: { view: TournamentHomeView }) {
  const locale = useLocale();
  const messages = useMessages();
  const palette = useTonePalette();
  const { field } = view;
  if (field.seatTotal < 1) {
    return null;
  }
  return (
    <Surface style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <Text size="body" weight="semibold" accessibilityRole="header">
          {messages.tournament.home.seatsHeading}
        </Text>
        <Text
          size="meta"
          tone="muted"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {tournamentSeatsTakenLine(field.seatsTaken, field.seatTotal, locale)}
        </Text>
      </View>
      <View
        accessible
        accessibilityLabel={tournamentSeatsTakenSrLabel(
          field.seatsTaken,
          field.seatTotal,
          locale,
        )}
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}
      >
        {Array.from({ length: field.seatTotal }, (_, index) => {
          const filled = index < field.seatsTaken;
          return (
            <View
              key={index}
              style={{
                width: SEAT_CELL,
                height: SEAT_CELL,
                borderRadius: 3,
                backgroundColor: filled ? palette.foreground : undefined,
              }}
            >
              {filled ? null : <Hatch radius={3} />}
            </View>
          );
        })}
      </View>
    </Surface>
  );
}

function ScheduleCard({
  view,
  venueName,
}: {
  view: TournamentHomeView;
  venueName: string | null;
}) {
  const locale = useLocale();
  const messages = useMessages();
  if (view.schedule.length === 0) {
    return null;
  }
  return (
    <Card
      title={messages.tournament.poolTable.yourRounds}
      meta={messages.tournament.home.yourRoundsPredrawCaption}
      flush
    >
      {view.schedule.map((round) => (
        <View key={round.roundNumber}>
          <Hairline />
          <View
            style={{
              minHeight: sizes.touchTarget,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Text size="eyebrow" tone="muted" style={{ width: 28 }}>
              {messages.tournament.card.roundShort(round.roundNumber)}
            </Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="body" numberOfLines={1}>
                {formatGameStart(round.start, locale)}
              </Text>
              {venueName ? (
                <Text size="meta" tone="muted" numberOfLines={1}>
                  {venueName}
                </Text>
              ) : null}
            </View>
            <OpenSlot label={messages.tournament.home.notDrawn} />
          </View>
        </View>
      ))}
    </Card>
  );
}

export function DetailRows({
  rows,
}: {
  rows: readonly { label: string; value: string }[];
}) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <Surface padded={false}>
      {rows.map((row, index) => (
        <View key={`${row.label}-${row.value}`}>
          {index > 0 ? <Hairline /> : null}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              padding: 16,
            }}
          >
            <Text size="body" tone="muted">
              {row.label}
            </Text>
            <Text size="body" style={{ flexShrink: 1, textAlign: "right" }}>
              {row.value}
            </Text>
          </View>
        </View>
      ))}
    </Surface>
  );
}

function RegisterTeam({
  game,
  handlers,
}: {
  game: TournamentDetails;
  handlers: PreDrawHandlers;
}) {
  const locale = useLocale();
  const m = useMessages().mobileTournament.predraw;
  if (game.eligibleTeams.length === 0) {
    return (
      <Text size="meta" tone="muted">
        {m.needCompleteTeam}
      </Text>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {game.eligibleTeams.length > 1 ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={m.teamGroup}
          style={{ gap: 8 }}
        >
          {game.eligibleTeams.map((team) => (
            <Button
              key={team.id}
              label={m.teamWithMembers(team.name, team.memberNames.join(" / "))}
              variant={handlers.teamId === team.id ? "default" : "outline"}
              selected={handlers.teamId === team.id}
              onPress={() => handlers.onTeamIdChange(team.id)}
            />
          ))}
        </View>
      ) : null}
      <Button
        label={registerTeamAction(locale)}
        size="lg"
        pending={handlers.registerTeamPending}
        disabled={handlers.teamId.length === 0}
        onPress={() => handlers.onRegisterTeam(handlers.teamId)}
      />
    </View>
  );
}

export function PreDrawView({
  game,
  view,
  handlers,
}: {
  game: TournamentDetails;
  view: TournamentHomeView;
  handlers: PreDrawHandlers;
}) {
  const locale = useLocale();
  const levelCard = levelRangeRequestCard(game, locale);
  return (
    <View style={{ gap: 16 }}>
      <Hero view={view} viewerUserId={game.viewerUserId} />
      {levelCard ? (
        <LevelRequestCard
          card={levelCard}
          pending={handlers.levelRequestPending}
          onRequest={handlers.onRequestLevel}
        />
      ) : null}
      {view.joinKind === "register_team" ? (
        <RegisterTeam game={game} handlers={handlers} />
      ) : null}
      <TeamsCard
        game={game}
        view={view}
        onTakeSeat={handlers.onTakeSeat}
        onOpenSeat={handlers.onOpenSeat}
        onOpenPlayer={handlers.onOpenPlayer}
        playerOpensActions={handlers.playerOpensActions}
      />
      <SeatsCard view={view} />
      <ScheduleCard view={view} venueName={game.venue?.name ?? null} />
    </View>
  );
}

export function TournamentTail({
  view,
  leavePending,
  onLeave,
}: {
  view: TournamentHomeView;
  leavePending: boolean;
  onLeave: () => void;
}) {
  const home = useMessages().tournament.home;
  return (
    <View style={{ gap: 16 }}>
      <DetailRows rows={view.detailRows} />
      {view.canLeaveGame ? (
        <Button
          label={home.leaveTheSeat}
          variant="outline"
          size="lg"
          pending={leavePending}
          onPress={onLeave}
        />
      ) : null}
      <Text size="meta" tone="muted">
        {home.closingLine}
      </Text>
    </View>
  );
}
