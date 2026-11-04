import { radii, sizes, spacing } from "@repo/design-tokens";
import { Pressable, View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { FormSlot } from "../primitives/form-slot";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import {
  DifferenceBox,
  GroupTile,
  SectionHead,
  ShareBar,
} from "./profile-parts";
import type {
  FormSlotView,
  GroupLevelRowView,
  PartnerRow,
  RecentRow,
  ScaleView,
} from "./profile-model";

const MARKER = 12;
const GENERAL_MARKER = 16;
const SCALE_HEIGHT = 50;

function ListCard({ children }: { children: React.ReactNode[] }) {
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {children.map((child, index) => (
        <View key={index}>
          {index > 0 ? <Hairline /> : null}
          {child}
        </View>
      ))}
    </Surface>
  );
}

function LevelScale({ scale }: { scale: ScaleView }) {
  const palette = useTonePalette();
  return (
    <View style={{ padding: 16, gap: 6 }}>
      <View style={{ height: SCALE_HEIGHT }}>
        <View
          style={{
            position: "absolute",
            start: 0,
            end: 0,
            top: 30,
            height: hairline,
            backgroundColor: palette.rule,
          }}
        />
        {scale.markers.map((marker) => {
          const size = marker.general ? GENERAL_MARKER : MARKER;
          return (
            <View
              key={marker.key}
              accessible
              accessibilityLabel={marker.spoken}
              style={{
                position: "absolute",
                start: `${marker.percent}%`,
                top: 0,
                width: 36,
                marginStart: -18,
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text
                size="eyebrow"
                mono
                tone={marker.general ? "default" : "muted"}
                weight={marker.general ? "semibold" : "regular"}
              >
                {marker.tag}
              </Text>
              <View
                style={{
                  marginTop: (GENERAL_MARKER - size) / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderWidth: 1.5,
                  borderColor: palette.foreground,
                  backgroundColor: marker.general
                    ? palette.foreground
                    : palette.background,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ height: 16 }}>
        {scale.ticks.map((tick, index) => (
          <Text
            key={tick.key}
            size="eyebrow"
            mono
            tone="muted"
            style={{
              position: "absolute",
              start: `${tick.percent}%`,
              marginStart: index === 0 ? 0 : index === 1 ? -10 : -24,
            }}
          >
            {tick.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function GroupLevelRowItem({
  row,
  selected = false,
  onPress,
}: {
  row: GroupLevelRowView;
  selected?: boolean;
  onPress?: () => void;
}) {
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor:
          pressed || selected ? palette.wash : palette.background,
      })}
    >
      <GroupTile initials={row.initials} hatched={row.provisional} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold" numberOfLines={1}>
          {row.name}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {row.sub}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
          <Text weight="bold" width="expanded" ltr>
            {row.band}
          </Text>
          <Text size="meta" tone="muted">
            {row.level}
          </Text>
        </View>
        {row.difference ? (
          <DifferenceBox
            label={row.difference.label}
            above={row.difference.above}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export function LevelsByGroup({
  title,
  meta,
  note,
  scale,
  rows,
  onOpenGroup,
}: {
  title: string;
  meta?: string;
  note: string;
  scale: ScaleView | null;
  rows: GroupLevelRowView[];
  onOpenGroup?: (groupId: string) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <SectionHead title={title} meta={meta} />
      <ListCard>
        {[
          scale ? <LevelScale key="scale" scale={scale} /> : null,
          ...rows.map((row) => (
            <GroupLevelRowItem
              key={row.groupId}
              row={row}
              onPress={onOpenGroup ? () => onOpenGroup(row.groupId) : undefined}
            />
          )),
        ].filter((child) => child !== null)}
      </ListCard>
      <Text size="eyebrow" tone="muted">
        {note}
      </Text>
    </View>
  );
}

/** Ten form slots, oldest first, with each Match's Level change under it. */
export function LastTenStrip({
  title,
  record,
  slots,
}: {
  title: string;
  record: string;
  slots: FormSlotView[];
}) {
  const m = useMessages();
  const showDeltas = slots.some((slot) => slot.delta != null);
  return (
    <View style={{ gap: 10 }}>
      <SectionHead title={title} meta={record} />
      <View style={{ flexDirection: "row", gap: 4 }}>
        {slots.map((slot) => (
          <View
            key={slot.key}
            accessible
            accessibilityLabel={slot.spoken}
            style={{ flex: 1, minWidth: 0, gap: 4, alignItems: "center" }}
          >
            <View
              style={{ alignSelf: "stretch", flexDirection: "row" }}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
            >
              <FormSlot variant={slot.variant} compact />
            </View>
            {showDeltas ? (
              <Text size="eyebrow" tone="muted" mono numberOfLines={1}>
                {slot.delta ?? " "}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text size="eyebrow" tone="muted">
          {m.you.form.older}
        </Text>
        <Text size="eyebrow" tone="muted">
          {m.you.form.latest}
        </Text>
      </View>
    </View>
  );
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Surface
      radius="card"
      style={{ flex: 1, minWidth: 0, padding: 16, gap: 4 }}
    >
      <Text size="eyebrow" tone="muted">
        {label}
      </Text>
      <Text size="h2" width="expanded" weight="bold" numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Surface>
  );
}

export function PartnersCard({
  title,
  meta,
  rows,
  empty,
  onOpen,
}: {
  title: string;
  meta: string;
  rows: PartnerRow[];
  empty: string;
  onOpen: (userId: string) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      <SectionHead title={title} meta={rows.length > 0 ? meta : undefined} />
      {rows.length === 0 ? (
        <Text size="meta" tone="muted">
          {empty}
        </Text>
      ) : (
        <ListCard>
          {rows.map((row) => (
            <Pressable
              key={row.userId}
              accessibilityRole="button"
              accessibilityLabel={row.spoken}
              onPress={() => onOpen(row.userId)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Avatar name={row.name} uri={row.image} radius={radii.sm} />
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <Text size="meta" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {row.name}
                  </Text>
                  <Text size="meta" weight="semibold">
                    {row.record}
                  </Text>
                </View>
                <ShareBar percent={row.percent} />
              </View>
              <View style={{ width: 40, alignItems: "flex-end" }}>
                <Text size="eyebrow" tone="muted">
                  {`${row.percent}%`}
                </Text>
              </View>
            </Pressable>
          ))}
        </ListCard>
      )}
    </View>
  );
}

export function RecentMatches({
  title,
  meta,
  rows,
  onOpenGame,
}: {
  title: string;
  meta: string;
  rows: RecentRow[];
  onOpenGame: (gameId: string) => void;
}) {
  const m = useMessages();
  return (
    <View style={{ gap: 12 }}>
      <SectionHead title={title} meta={rows.length > 0 ? meta : undefined} />
      {rows.length === 0 ? (
        <Text size="meta" tone="muted">
          {m.you.recent.empty}
        </Text>
      ) : (
        <ListCard>
          {rows.map((row) => (
            <Pressable
              key={row.matchId}
              accessibilityRole={row.canOpenGame ? "button" : undefined}
              disabled={!row.canOpenGame}
              onPress={() => onOpenGame(row.gameId)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <ResultMark variant={row.outcome} size={16} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text size="meta" numberOfLines={1}>
                  {row.title}
                </Text>
                <Text size="eyebrow" tone="muted" numberOfLines={1}>
                  {row.sub}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Text size="meta" weight="semibold">
                  {row.score}
                </Text>
                {row.delta ? (
                  <Text size="eyebrow" tone="muted">
                    {row.delta}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </ListCard>
      )}
    </View>
  );
}

export const SECTION_GAP = spacing.section;
