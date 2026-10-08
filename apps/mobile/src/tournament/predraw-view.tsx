import { sizes } from "@repo/design-tokens";
import { formatGameStart } from "@repo/domain/format-game-start";
import { REGISTER_TEAM_ACTION } from "@repo/domain/game-copy";
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
  LEAVE_THE_SEAT_LABEL,
  NOT_DRAWN_TRAILER,
  OPEN_POSITION_SR_LABEL,
  SEATS_HEADING,
  TEAMS_HEADING,
  TOURNAMENT_CLOSING_LINE,
  YOUR_ROUNDS_PREDRAW_CAPTION,
  YOUR_TEAM_LABEL,
  YOUR_TEAM_TAG,
  tournamentCollapsedTeamsLabel,
  tournamentSeatsTakenLine,
  tournamentSeatsTakenSrLabel,
  tournamentTeamRows,
  tournamentTeamsCountLine,
  type TournamentTeamRow,
} from "@repo/domain/tournament-home";
import { YOUR_ROUNDS_HEADING } from "@repo/domain/tournament-pool-table";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Card } from "../home/card";
import { LevelRequestCard } from "../game-details/level-request-card";
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
  onRegisterTeam: (teamId: string) => void;
  onRequestLevel: () => void;
  onOpenPlayer?: (userId: string) => void;
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
  if (!occupant) {
    return (
      <View
        accessible
        accessibilityLabel={OPEN_POSITION_SR_LABEL}
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
          {isViewer ? "You" : occupant.name}
        </Text>
        <Text size="eyebrow" tone="muted">
          {position === "left" ? "Left seat" : "Right seat"}
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
            {YOUR_TEAM_LABEL}
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
  onJoin,
  onOpen,
}: {
  occupant: Occupant | null;
  position: Position;
  teamLabel: string;
  viewerUserId: string;
  joinable: boolean;
  onJoin: () => void;
  onOpen?: (userId: string) => void;
}) {
  const palette = useTonePalette();
  const positionName = position === "left" ? "Left" : "Right";

  if (!occupant) {
    const label = tournamentSeatLabel({ position, teamLabel, joinable });
    return (
      <Pressable
        accessibilityRole={joinable ? "button" : undefined}
        accessibilityLabel={label}
        accessible
        disabled={!joinable}
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
          {joinable ? `Take ${positionName.toLowerCase()}` : positionName}
        </Text>
      </Pressable>
    );
  }

  const level = occupant.levelBand
    ? displayLabelFromStoredBand(occupant.levelBand)
    : null;
  const label = [
    occupant.userId === viewerUserId ? "You" : occupant.name,
    `${positionName} seat`,
    level,
  ]
    .filter(Boolean)
    .join(", ");
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
          {occupant.userId === viewerUserId ? "You" : occupant.name}
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
      accessibilityHint="Opens their Player profile"
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
  onOpenPlayer,
}: {
  row: TournamentTeamRow;
  side: TournamentDetailsSide | null;
  viewerUserId: string;
  canTakeSeat: boolean;
  onTakeSeat: PreDrawHandlers["onTakeSeat"];
  onOpenPlayer: PreDrawHandlers["onOpenPlayer"];
}) {
  const teamLabel = formatGameSideLabel("friendly_tournament", row.sideIndex);
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
            {YOUR_TEAM_TAG}
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
            onJoin={() => onTakeSeat({ sideIndex: row.sideIndex, position })}
            onOpen={onOpenPlayer}
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
  onOpenPlayer,
}: {
  game: TournamentDetails;
  view: TournamentHomeView;
  onTakeSeat: PreDrawHandlers["onTakeSeat"];
  onOpenPlayer: PreDrawHandlers["onOpenPlayer"];
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = tournamentTeamRows(game.sides, game.viewerUserId);
  const countLine = tournamentTeamsCountLine(
    view.field.full,
    view.field.halfOpen,
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
        onOpenPlayer={onOpenPlayer}
      />
    </View>
  );

  return (
    <Card title={TEAMS_HEADING} meta={countLine || undefined} flush>
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
                ? "Show fewer Game teams"
                : tournamentCollapsedTeamsLabel(rows.collapsedCount)}
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
          {SEATS_HEADING}
        </Text>
        <Text
          size="meta"
          tone="muted"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {tournamentSeatsTakenLine(field.seatsTaken, field.seatTotal)}
        </Text>
      </View>
      <View
        accessible
        accessibilityLabel={tournamentSeatsTakenSrLabel(
          field.seatsTaken,
          field.seatTotal,
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
  if (view.schedule.length === 0) {
    return null;
  }
  return (
    <Card title={YOUR_ROUNDS_HEADING} meta={YOUR_ROUNDS_PREDRAW_CAPTION} flush>
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
              {`R${round.roundNumber}`}
            </Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="body" numberOfLines={1}>
                {formatGameStart(round.start)}
              </Text>
              {venueName ? (
                <Text size="meta" tone="muted" numberOfLines={1}>
                  {venueName}
                </Text>
              ) : null}
            </View>
            <OpenSlot label={NOT_DRAWN_TRAILER} />
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
  if (game.eligibleTeams.length === 0) {
    return (
      <Text size="meta" tone="muted">
        You need a complete Team whose both partners are allowed on this Game.
      </Text>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {game.eligibleTeams.length > 1 ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Team"
          style={{ gap: 8 }}
        >
          {game.eligibleTeams.map((team) => (
            <Button
              key={team.id}
              label={`${team.name} (${team.memberNames.join(" / ")})`}
              variant={handlers.teamId === team.id ? "default" : "outline"}
              selected={handlers.teamId === team.id}
              onPress={() => handlers.onTeamIdChange(team.id)}
            />
          ))}
        </View>
      ) : null}
      <Button
        label={REGISTER_TEAM_ACTION}
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
  const levelCard = levelRangeRequestCard(game);
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
        onOpenPlayer={handlers.onOpenPlayer}
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
  return (
    <View style={{ gap: 16 }}>
      <DetailRows rows={view.detailRows} />
      {view.canLeaveGame ? (
        <Button
          label={LEAVE_THE_SEAT_LABEL}
          variant="outline"
          size="lg"
          pending={leavePending}
          onPress={onLeave}
        />
      ) : null}
      <Text size="meta" tone="muted">
        {TOURNAMENT_CLOSING_LINE}
      </Text>
    </View>
  );
}
