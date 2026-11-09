import { radii, spacing } from "@repo/design-tokens";
import type {
  GameInviteHeroTile,
  gameInviteHeroModel,
} from "@repo/domain/game-invite-hero";
import { View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import { useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const HERO_PADDING_BOTTOM = 22;
const NAV_TO_STATUS_GAP = 24;
const COLUMNS = 6;
const TILE_HEIGHT = 44;
const TILE_GAP = 6;
const TILE_RADIUS = 9;
const NOTE_MARK = 36;
const BACK_FALLBACK = "/profile";

export type InviteHeroNote = {
  text: string;
  groupName: string | null;
  groupImageUrl: string | null;
};

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

function Tag({ label }: { label: string }) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: palette.rule,
        borderRadius: radii.slot,
        paddingVertical: 4,
        paddingHorizontal: 7,
      }}
    >
      <Text size="eyebrow" tone="muted" mono uppercase>
        {label}
      </Text>
    </View>
  );
}

function Tile({ tile }: { tile: GameInviteHeroTile | null }) {
  const palette = useTonePalette();
  const m = useMessages();
  if (!tile) {
    return <View style={{ flex: 1 }} />;
  }
  if (tile.kind === "open") {
    return (
      <View
        accessible
        accessibilityLabel={m.mobileInvite.link.hero.openSeatA11y}
        style={{ flex: 1, height: TILE_HEIGHT }}
      >
        <Hatch radius={TILE_RADIUS} />
      </View>
    );
  }
  return (
    <View
      style={{
        flex: 1,
        height: TILE_HEIGHT,
        borderRadius: TILE_RADIUS,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tile.isViewer ? palette.foreground : palette.wash,
      }}
    >
      <Text
        size="meta"
        weight="semibold"
        style={{
          color: tile.isViewer ? palette.background : palette.foreground,
        }}
      >
        {tile.initials}
      </Text>
    </View>
  );
}

function TileGrid({
  tiles,
  label,
}: {
  tiles: GameInviteHeroTile[];
  label: string;
}) {
  const rows: (GameInviteHeroTile | null)[][] = [];
  for (let index = 0; index < tiles.length; index += COLUMNS) {
    const row: (GameInviteHeroTile | null)[] = tiles.slice(
      index,
      index + COLUMNS,
    );
    while (row.length < COLUMNS) {
      row.push(null);
    }
    rows.push(row);
  }
  if (rows.length === 0) {
    return null;
  }
  return (
    <View accessible accessibilityLabel={label} style={{ gap: TILE_GAP }}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={{ flexDirection: "row", gap: TILE_GAP }}>
          {row.map((tile, index) => (
            <Tile key={index} tile={tile} />
          ))}
        </View>
      ))}
    </View>
  );
}

function NoteCard({ note }: { note: InviteHeroNote }) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: hairline,
        borderColor: palette.rule,
        borderRadius: radii.card,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      {note.groupName ? (
        <View style={{ width: NOTE_MARK, height: NOTE_MARK }}>
          <Avatar
            name={note.groupName}
            uri={note.groupImageUrl}
            size="default"
            radius={radii.sm}
          />
        </View>
      ) : null}
      <Text size="meta" tone="muted" style={{ flex: 1, minWidth: 0 }}>
        {note.text}
      </Text>
    </View>
  );
}

/**
 * The ink head of a Game Invite link (design "Join via link" 1a): when and
 * where, who is in with the open seats hatched, and how the viewer came.
 */
export function InviteGameHero({
  model,
  note,
  seats,
  countHint,
  afterTiles,
}: {
  model: ReturnType<typeof gameInviteHeroModel>;
  note: InviteHeroNote | null;
  /** Replaces the roster tiles, e.g. the court to pick a seat on. */
  seats?: React.ReactNode;
  /** `tap a seat, pick your side after`, beside the count. */
  countHint?: string | null;
  /** Under the roster, e.g. the football Sit here tile. */
  afterTiles?: React.ReactNode;
}) {
  const palette = useTonePalette();
  return (
    <Surface
      tone="ink"
      style={{
        paddingTop: spacing.compact,
        paddingBottom: HERO_PADDING_BOTTOM,
        borderRadius: 0,
        borderWidth: 0,
      }}
    >
      <LightStatusBar />
      <View style={{ gap: NAV_TO_STATUS_GAP }}>
        <ScreenHeader
          nav="back"
          fallback={BACK_FALLBACK}
          actions={<Tag label={model.tag} />}
        />
        <View style={{ gap: 6 }}>
          <Text size="meta" tone="muted">
            {model.status}
          </Text>
          {model.time ? (
            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel={`${model.time} ${model.meridiem ?? ""}`}
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                columnGap: 8,
              }}
            >
              <Text size="heroTime" width="expanded" weight="bold">
                {model.time}
              </Text>
              {model.meridiem ? (
                <Text size="title" tone="muted">
                  {model.meridiem}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View>
            {model.dayLine ? <Text size="lead">{model.dayLine}</Text> : null}
            {model.detailLine ? (
              <Text size="meta" tone="muted">
                {model.detailLine}
              </Text>
            ) : null}
          </View>
        </View>
        <View
          style={{
            gap: 12,
            borderTopWidth: hairline,
            borderTopColor: palette.rule,
            paddingTop: 18,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
            }}
          >
            <Text size="meta" weight="semibold">
              {model.countLine}
            </Text>
            {countHint ? (
              <Text size="eyebrow" tone="muted" style={{ flexShrink: 1 }}>
                {countHint}
              </Text>
            ) : model.sport ? (
              <Text size="meta" tone="muted">
                {model.sport}
              </Text>
            ) : null}
          </View>
          {seats ?? <TileGrid tiles={model.tiles} label={model.rosterA11y} />}
          {afterTiles}
          {note ? <NoteCard note={note} /> : null}
        </View>
      </View>
    </Surface>
  );
}
