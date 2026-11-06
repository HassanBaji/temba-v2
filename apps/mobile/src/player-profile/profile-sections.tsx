import { useUser } from "@clerk/expo";
import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import type {
  EarlyDaysView,
  ProfileFormView,
  ProfilePositionView,
  ProfileStatTile,
  ProfileStreaksView,
  WithViewerView,
} from "@repo/domain/player-profile-page";
import type { CourtSideFill } from "@repo/domain/player-profile";
import { Users } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Circle, Line, Rect } from "react-native-svg";

import { Avatar } from "../primitives/avatar";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { initialsFor } from "../primitives/initials";
import { ResultMark } from "../primitives/result-mark";
import { Surface } from "../primitives/surface";
import {
  SurfaceToneContext,
  useTonePalette,
} from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { SectionHead } from "../profile/profile-parts";
import type { ProfileMatchRow } from "./player-profile-model";

const GLYPH_WIDTH = 62;
const GLYPH_HEIGHT = 86;
const TILE_PADDING = {
  paddingHorizontal: spacing.compact,
  paddingVertical: 16,
};

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <Surface
      padded={false}
      radius="card"
      style={[{ overflow: "hidden" }, style]}
    >
      {children}
    </Surface>
  );
}

function VerticalRule() {
  const palette = useTonePalette();
  return <View style={{ width: hairline, backgroundColor: palette.rule }} />;
}

const FORM_GAP = 6;

/** Ten result marks, oldest first, with the first and last dates under them. */
export function FormMarks({ form }: { form: ProfileFormView }) {
  const [width, setWidth] = useState(0);
  const count = form.slots.length;
  const size = count > 0 ? (width - FORM_GAP * (count - 1)) / count : 0;
  return (
    <View accessible accessibilityLabel={form.spoken} style={{ gap: 6 }}>
      <View
        onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
        style={{ flexDirection: "row", gap: FORM_GAP, minHeight: size }}
      >
        {size > 0
          ? form.slots.map((slot, index) => (
              <ResultMark key={index} variant={slot} size={size} decorative />
            ))
          : null}
      </View>
      {form.ends ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text size="eyebrow" tone="muted">
            {form.ends.oldest}
          </Text>
          <Text size="eyebrow" tone="muted">
            {form.ends.newest}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function EarlyDaysCard({
  view,
  form,
}: {
  view: EarlyDaysView;
  form: ProfileFormView;
}) {
  return (
    <Card style={{ ...TILE_PADDING, gap: 4 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Text size="title" width="expanded" weight="bold">
          {view.title}
        </Text>
        {view.since ? (
          <Text size="meta" tone="muted">
            {view.since}
          </Text>
        ) : null}
      </View>
      <Text size="meta" tone="muted">
        {view.note}
      </Text>
      <View style={{ marginTop: 12 }}>
        <FormMarks form={form} />
      </View>
    </Card>
  );
}

function StreakColumn({
  label,
  value,
  unit,
  spoken,
  children,
}: {
  label: string;
  value: string;
  unit: string;
  spoken: string;
  children?: React.ReactNode;
}) {
  return (
    <View
      accessible
      accessibilityLabel={spoken}
      style={{ flex: 1, ...TILE_PADDING, gap: 6 }}
    >
      <Text size="eyebrow" tone="muted">
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Text size="statTotal" width="expanded" weight="bold">
          {value}
        </Text>
        <Text size="meta" tone="muted">
          {unit}
        </Text>
      </View>
      {children}
    </View>
  );
}

export function StreakTiles({
  view,
  labels,
}: {
  view: ProfileStreaksView;
  labels: { current: string; best: string };
}) {
  return (
    <Card style={{ flexDirection: "row" }}>
      <StreakColumn
        label={labels.current}
        value={view.current.value}
        unit={view.current.unit}
        spoken={view.current.spoken}
      >
        {view.current.marks > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {Array.from({ length: view.current.marks }, (_, index) => (
              <ResultMark key={index} variant="won" size={14} decorative />
            ))}
          </View>
        ) : null}
      </StreakColumn>
      <VerticalRule />
      <StreakColumn
        label={labels.best}
        value={view.best.value}
        unit={view.best.unit}
        spoken={view.best.spoken}
      >
        {view.best.when ? (
          <Text size="eyebrow" tone="muted">
            {view.best.when}
          </Text>
        ) : null}
      </StreakColumn>
    </Card>
  );
}

const PITCH_SPOT_Y = { gk: 78, def: 63, mid: 43, fwd: 20 } as const;
const PITCH_STROKE = 1.5;

function Pitch({
  spot,
}: {
  spot: Extract<ProfilePositionView, { sport: "football" }>["spot"];
}) {
  const ink = colors.ink;
  return (
    <Svg
      width={GLYPH_WIDTH}
      height={GLYPH_HEIGHT}
      viewBox={`0 0 ${GLYPH_WIDTH} ${GLYPH_HEIGHT}`}
    >
      <Rect
        x={1}
        y={1}
        width={60}
        height={84}
        rx={3}
        fill={colors.paper}
        stroke={ink}
        strokeWidth={PITCH_STROKE}
      />
      <Line
        x1={1}
        y1={43}
        x2={61}
        y2={43}
        stroke={ink}
        strokeWidth={PITCH_STROKE}
      />
      <Circle
        cx={31}
        cy={43}
        r={7}
        fill="none"
        stroke={ink}
        strokeWidth={PITCH_STROKE}
      />
      <Rect
        x={16}
        y={1}
        width={30}
        height={12}
        fill="none"
        stroke={ink}
        strokeWidth={PITCH_STROKE}
      />
      <Rect
        x={16}
        y={73}
        width={30}
        height={12}
        fill="none"
        stroke={ink}
        strokeWidth={PITCH_STROKE}
      />
      {spot ? (
        <Circle
          cx={31}
          cy={PITCH_SPOT_Y[spot]}
          r={7}
          fill={ink}
          stroke={colors.paper}
          strokeWidth={2.5}
        />
      ) : null}
    </Svg>
  );
}

function NearSide({ fill }: { fill: CourtSideFill }) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: fill === "ink" ? palette.foreground : undefined,
      }}
    >
      {fill === "hatch" ? <Hatch radius={0} bordered={false} /> : null}
    </View>
  );
}

/** The court seen from behind: the far half hatched, the near halves left and right. */
function Court({
  court,
}: {
  court: Extract<ProfilePositionView, { sport: "padel" }>["court"];
}) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        width: GLYPH_WIDTH,
        height: GLYPH_HEIGHT,
        borderWidth: PITCH_STROKE,
        borderColor: palette.foreground,
        borderRadius: radii.slot - 1,
        overflow: "hidden",
        direction: "ltr",
      }}
    >
      <View style={{ flex: 1 }}>
        <Hatch radius={0} bordered={false} />
      </View>
      <View style={{ height: 2, backgroundColor: palette.foreground }} />
      <View style={{ flex: 1, flexDirection: "row" }}>
        <NearSide fill={court.left} />
        <View
          style={{ width: hairline, backgroundColor: palette.foreground }}
        />
        <NearSide fill={court.right} />
      </View>
    </View>
  );
}

export function PositionCard({ view }: { view: ProfilePositionView }) {
  return (
    <Card
      style={{
        ...TILE_PADDING,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.compact,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {view.sport === "football" ? (
          <Pitch spot={view.spot} />
        ) : (
          <Court court={view.court} />
        )}
      </View>
      <View
        accessible
        accessibilityLabel={[view.label, view.value, view.detail]
          .filter(Boolean)
          .join(". ")}
        style={{ flex: 1, minWidth: 0, gap: 4 }}
      >
        <Text size="eyebrow" tone="muted">
          {view.label}
        </Text>
        <Text size="title" width="expanded" weight="bold">
          {view.value}
        </Text>
        {view.detail ? (
          <Text size="meta" tone="muted">
            {view.detail}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function StatTile({ tile }: { tile: ProfileStatTile }) {
  return (
    <View
      accessible
      accessibilityLabel={`${tile.label} ${tile.value}`}
      style={{
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 18,
        paddingVertical: 14,
      }}
    >
      {tile.locked ? <Hatch radius={0} bordered={false} /> : null}
      <Text
        size={tile.locked ? "body" : "h2"}
        width="expanded"
        weight="bold"
        tone={tile.locked ? "muted" : "default"}
        numberOfLines={1}
      >
        {tile.value}
      </Text>
      <Text size="eyebrow" tone="muted" style={{ marginTop: 3 }}>
        {tile.label}
      </Text>
    </View>
  );
}

export function StatsGrid({
  title,
  meta,
  tiles,
}: {
  title: string;
  meta: string;
  tiles: ProfileStatTile[];
}) {
  const rows = [tiles.slice(0, 2), tiles.slice(2, 4)];
  return (
    <View style={{ gap: 10 }}>
      <SectionHead title={title} meta={meta} />
      <Card>
        {rows.map((row, index) => (
          <View key={index}>
            {index > 0 ? <Hairline /> : null}
            <View style={{ flexDirection: "row" }}>
              {row.map((tile, column) => (
                <View
                  key={tile.label}
                  style={{ flex: 1, flexDirection: "row" }}
                >
                  {column > 0 ? <VerticalRule /> : null}
                  <StatTile tile={tile} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

const PAIR_TILE = 28;

function ViewerTile() {
  const { user } = useUser();
  return (
    <SurfaceToneContext.Provider value="ink">
      <View
        style={{
          width: PAIR_TILE,
          height: PAIR_TILE,
          borderRadius: radii.sm,
          backgroundColor: colors.ink,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text size="eyebrow">{initialsFor(user?.fullName ?? "")}</Text>
      </View>
    </SurfaceToneContext.Provider>
  );
}

export function WithViewerCard({
  view,
  playerName,
  playerImage,
}: {
  view: WithViewerView;
  playerName: string;
  playerImage: string | null;
}) {
  const palette = useTonePalette();
  return (
    <Card>
      <View accessible accessibilityLabel={view.spoken} style={TILE_PADDING}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View
            style={{ flexDirection: "row" }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <ViewerTile />
            <View style={{ marginStart: -6 }}>
              <Avatar
                name={playerName}
                uri={playerImage}
                size="sm"
                radius={radii.sm}
              />
            </View>
          </View>
          <Text
            size="body"
            weight="semibold"
            style={{ flex: 1 }}
            numberOfLines={1}
          >
            {view.title}
          </Text>
          {view.scope ? (
            <Text size="eyebrow" tone="muted">
              {view.scope}
            </Text>
          ) : null}
        </View>
        {view.columns ? (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
            {view.columns.map((column) => (
              <View key={column.label} style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Text size="eyebrow" tone="muted">
                  {column.label}
                </Text>
                <Text size="body">
                  <Text size="body" width="expanded" weight="bold">
                    {column.record}
                  </Text>
                  {column.detail ? ` ${column.detail}` : ""}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {view.empty ? (
          <Text size="meta" tone="muted" style={{ marginTop: 12 }}>
            {view.empty}
          </Text>
        ) : null}
      </View>
      {view.groups ? (
        <View
          style={{
            borderTopWidth: hairline,
            borderTopColor: palette.rule,
            paddingHorizontal: spacing.compact,
            paddingVertical: 11,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Users size={sizes.iconRow - 2} color={palette.muted} />
          <Text
            size="eyebrow"
            tone="muted"
            style={{ flex: 1 }}
            numberOfLines={1}
          >
            {view.groups}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

function MatchRow({
  row,
  onOpen,
}: {
  row: ProfileMatchRow;
  onOpen: (target: NonNullable<ProfileMatchRow["target"]>) => void;
}) {
  const target = row.target;
  return (
    <Pressable
      accessibilityRole={target ? "button" : undefined}
      accessibilityLabel={row.accessibilityLabel}
      disabled={!target}
      onPress={target ? () => onOpen(target) : undefined}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <ResultMark variant={row.outcome} size={18} decorative />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" numberOfLines={1}>
          {row.title}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {row.sub}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {row.score ? (
          <Text size="meta" weight="semibold" ltr numberOfLines={1}>
            {row.score}
          </Text>
        ) : null}
        {row.detail ? (
          <Text size="eyebrow" tone="muted">
            {row.detail}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function MatchList({
  rows,
  onOpen,
}: {
  rows: ProfileMatchRow[];
  onOpen: (target: NonNullable<ProfileMatchRow["target"]>) => void;
}) {
  return (
    <Card>
      {rows.map((row, index) => (
        <View key={row.key}>
          {index > 0 ? <Hairline /> : null}
          <MatchRow row={row} onOpen={onOpen} />
        </View>
      ))}
    </Card>
  );
}
