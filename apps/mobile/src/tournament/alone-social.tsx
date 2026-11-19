import { radii, sizes, spacing } from "@repo/design-tokens";
import { shortPlayerName } from "@repo/domain/player-name";
import type {
  TournamentDetails,
  TournamentHomeView,
} from "@repo/domain/tournament-details";
import {
  Pencil,
  Plus,
  Share as ShareIcon,
  Shuffle,
  Users,
} from "lucide-react-native";
import { useState, type ComponentType } from "react";
import { Pressable, View, type ColorValue } from "react-native";

import { Card } from "../home/card";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { CachedImage } from "../primitives/cached-image";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { initialsFor } from "../primitives/initials";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import {
  openSeatCount,
  postedOrganizerTitle,
  postedPlayerCard,
  viewerPairing,
} from "./alone-teams-model";

const GRID_GAP = 8;
const ICON_TILE = 40;

export type AloneSocialHandlers = {
  /** Server: the Organizer may open Make teams and post (ADR-0096). */
  canMakeTeams: boolean;
  minPlayers: number;
  onMakeTeams: () => void;
  onShareTeams: () => void;
  onOpenDraw: () => void;
  onEditTeams: (() => void) | null;
  /** Tap a player on the list: the Organizer's actions, or the profile. */
  onOpenPlayer?: (userId: string) => void;
  /** Tap an open seat: take it, or the Organizer adds a player. */
  onOpenSeat?: () => void;
};

type IconComponent = ComponentType<{ size: number; color: ColorValue }>;

function IconTile({ icon: Icon }: { icon: IconComponent }) {
  const palette = useTonePalette();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: ICON_TILE,
        height: ICON_TILE,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: palette.rule,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={sizes.iconRow} color={palette.foreground} />
    </View>
  );
}

/** The mono "Alone" tag beside the hero's eyebrow. */
export function AloneTag() {
  const palette = useTonePalette();
  const m = useMessages().aloneTeams.hero;
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
        {m.tag}
      </Text>
    </View>
  );
}

/** The hero's teams tile and seat caption while the list fills. */
export function AloneHeroFigures({
  teamCount,
  count,
  cap,
}: {
  teamCount: number;
  count: number;
  cap: number | null;
}) {
  const m = useMessages().aloneTeams.hero;
  const full = cap != null && count >= cap;
  return (
    <View style={{ gap: 8 }}>
      <View>
        <Text size="h2" width="expanded" weight="bold">
          {String(teamCount)}
        </Text>
        <Text size="meta" tone="muted">
          {m.teamsLater}
        </Text>
      </View>
      <Text size="meta" tone="muted">
        {full ? m.seatsReady : m.seatsWaiting}
      </Text>
    </View>
  );
}

/** Organizer, before posting: the one focus is making the teams. */
export function AloneMakeTeamsCard({
  count,
  cap,
  handlers,
}: {
  count: number;
  cap: number | null;
  handlers: AloneSocialHandlers;
}) {
  const m = useMessages().aloneTeams.organizerCard;
  if (!handlers.canMakeTeams) {
    return (
      <View
        style={{
          borderRadius: radii.surface,
          padding: spacing.surface,
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
        }}
      >
        <Hatch radius={radii.surface} />
        <IconTile icon={Users} />
        <Text size="meta" tone="muted" style={{ flex: 1, minWidth: 0 }}>
          {m.needMore(handlers.minPlayers, count)}
        </Text>
      </View>
    );
  }
  return (
    <Surface tone="ink" style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <IconTile icon={Users} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text size="lead" weight="semibold" accessibilityRole="header">
            {cap != null && count >= cap
              ? m.allIn(count)
              : m.someIn(count, cap ?? count)}
          </Text>
          <Text size="meta" tone="muted">
            {m.body}
          </Text>
        </View>
      </View>
      <Button label={m.action} onPress={handlers.onMakeTeams} />
    </Surface>
  );
}

/** Everyone else, before posting: the teams are not made yet. */
export function AloneWaitingCard({ cap }: { cap: number }) {
  const m = useMessages().aloneTeams.waiting;
  return (
    <View
      style={{
        borderRadius: radii.surface,
        padding: spacing.surface,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
      }}
    >
      <Hatch radius={radii.surface} />
      <IconTile icon={Shuffle} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold" accessibilityRole="header">
          {m.title}
        </Text>
        <Text size="meta" tone="muted">
          {m.body(cap)}
        </Text>
      </View>
    </View>
  );
}

const PHOTO = 24;

function PlayerCell({
  name,
  image,
  isViewer,
  onPress,
}: {
  name: string;
  image: string | null;
  isViewer: boolean;
  onPress?: () => void;
}) {
  const palette = useTonePalette();
  const messages = useMessages();
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = image != null && image.length > 0 && failed !== image;
  const shown = isViewer
    ? messages.aloneTeams.players.you
    : shortPlayerName(name);
  const ink = isViewer ? palette.onControl : undefined;
  const cell = (
    <View
      style={{
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: isViewer ? palette.control : palette.rule,
        backgroundColor: isViewer ? palette.control : undefined,
      }}
    >
      {showImage ? (
        <CachedImage
          uri={image}
          contentFit="cover"
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ width: PHOTO, height: PHOTO, borderRadius: radii.sm }}
          onError={() => setFailed(image)}
        />
      ) : (
        <Text
          size="eyebrow"
          weight="semibold"
          style={ink ? { color: ink } : undefined}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {initialsFor(name)}
        </Text>
      )}
      <Text
        size="meta"
        numberOfLines={1}
        style={[{ flexShrink: 1 }, ink ? { color: ink } : null]}
      >
        {shown}
      </Text>
    </View>
  );
  if (!onPress) {
    return (
      <View
        accessible
        accessibilityLabel={isViewer ? shown : name}
        style={{ flex: 1 }}
      >
        {cell}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isViewer ? shown : name}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.6 : 1 })}
    >
      {cell}
    </Pressable>
  );
}

function OpenSeatCell({ onPress }: { onPress?: () => void }) {
  const palette = useTonePalette();
  const m = useMessages().aloneTeams.players;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={m.openSeat}
      accessible
      disabled={!onPress}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: radii.md,
      }}
    >
      <Hatch radius={radii.md} />
      <Plus size={13} color={palette.muted} />
      <Text size="meta" tone="muted">
        {m.openSeat}
      </Text>
    </Pressable>
  );
}

type GridCell =
  | { kind: "player"; id: string; name: string; image: string | null }
  | { kind: "open"; key: string };

/** Players in sign-up order, then the open seats, two to a row. */
export function AlonePlayersCard({
  game,
  handlers,
}: {
  game: TournamentDetails;
  handlers: AloneSocialHandlers;
}) {
  const m = useMessages().aloneTeams.players;
  const cap = game.playersAllowed ?? null;
  const players = game.registeredPlayers;
  const cells: GridCell[] = [
    ...players.map((player) => ({
      kind: "player" as const,
      id: player.id,
      name: player.name,
      image: player.image,
    })),
    ...Array.from(
      { length: openSeatCount(players.length, cap) },
      (_, index) => ({
        kind: "open" as const,
        key: `open-${index}`,
      }),
    ),
  ];
  const rows: GridCell[][] = [];
  for (let index = 0; index < cells.length; index += 2) {
    rows.push(cells.slice(index, index + 2));
  }
  return (
    <View style={{ gap: 8 }}>
      <Card
        title={m.title}
        meta={m.count(players.length, cap ?? players.length)}
      >
        <View
          style={{ gap: GRID_GAP, paddingHorizontal: 12, paddingBottom: 12 }}
        >
          {rows.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={{ flexDirection: "row", gap: GRID_GAP }}
            >
              {row.map((cell) =>
                cell.kind === "player" ? (
                  <PlayerCell
                    key={cell.id}
                    name={cell.name}
                    image={cell.image}
                    isViewer={cell.id === game.viewerUserId}
                    onPress={
                      handlers.onOpenPlayer
                        ? () => handlers.onOpenPlayer?.(cell.id)
                        : undefined
                    }
                  />
                ) : (
                  <OpenSeatCell key={cell.key} onPress={handlers.onOpenSeat} />
                ),
              )}
              {row.length < 2 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))}
        </View>
      </Card>
      <Text size="meta" tone="muted">
        {game.isOrganizer ? m.organizerNote : m.note}
      </Text>
    </View>
  );
}

/** Organizer, once posted: the draw is next; Share, Edit and Make teams again sit under it. */
export function AlonePostedOrganizerCard({
  view,
  handlers,
}: {
  view: TournamentHomeView;
  handlers: AloneSocialHandlers;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.aloneTeams.posted;
  return (
    <View style={{ gap: 8 }}>
      <Surface tone="ink" style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <IconTile icon={Shuffle} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text size="lead" weight="semibold" accessibilityRole="header">
              {postedOrganizerTitle(view, locale)}
            </Text>
            <Text size="meta" tone="muted">
              {view.kingOfTheCourt
                ? messages.mobileTournament.organizer.kingOnWeb
                : m.organizerBody}
            </Text>
          </View>
        </View>
        {view.kingOfTheCourt ? null : (
          <Button label={m.openDraw} onPress={handlers.onOpenDraw} />
        )}
      </Surface>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={m.share}
            variant="outline"
            icon={<ShareIcon size={15} color={colors.ink} />}
            onPress={handlers.onShareTeams}
          />
        </View>
        {handlers.onEditTeams ? (
          <View style={{ flex: 1 }}>
            <Button
              label={messages.editTeams.action}
              variant="outline"
              icon={<Pencil size={15} color={colors.ink} />}
              onPress={handlers.onEditTeams}
            />
          </View>
        ) : null}
      </View>
      {handlers.canMakeTeams ? (
        <Button
          label={m.makeAgain}
          variant="outline"
          onPress={handlers.onMakeTeams}
        />
      ) : null}
    </View>
  );
}

/** A player, once posted: who they are with, or that they wait for a seat. */
export function AlonePostedPlayerCard({
  game,
  view,
}: {
  game: TournamentDetails;
  view: TournamentHomeView;
}) {
  const locale = useLocale();
  const pairing = viewerPairing(view.viewerSide, game.viewerUserId);
  const card = postedPlayerCard(pairing, locale);
  const viewer = pairing ? view.viewerSide?.[pairing.side] : null;
  const content = (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      {viewer && !card.waiting ? (
        <Avatar name={viewer.name} uri={viewer.image} />
      ) : (
        <IconTile icon={Users} />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold" accessibilityRole="header">
          {card.title}
        </Text>
        <Text size="meta" tone="muted">
          {card.body}
        </Text>
      </View>
    </View>
  );
  if (card.waiting) {
    return (
      <View style={{ borderRadius: radii.surface, padding: spacing.surface }}>
        <Hatch radius={radii.surface} />
        {content}
      </View>
    );
  }
  return <Surface>{content}</Surface>;
}

/** The odd player out after posting, waiting on the list for a seat. */
export function AloneUnseatedCard({ game }: { game: TournamentDetails }) {
  const messages = useMessages();
  const m = messages.aloneTeams.players;
  if (game.unseatedPlayers.length === 0) {
    return null;
  }
  return (
    <Card title={m.waitingTitle}>
      <View
        style={{
          gap: 8,
          paddingHorizontal: spacing.surface,
          paddingBottom: spacing.surface,
        }}
      >
        {game.unseatedPlayers.map((player) => (
          <Text key={player.id} weight="medium" numberOfLines={1}>
            {player.id === game.viewerUserId
              ? messages.common.you
              : player.name}
          </Text>
        ))}
        <Text size="meta" tone="muted">
          {m.waitingNote}
        </Text>
      </View>
    </Card>
  );
}
