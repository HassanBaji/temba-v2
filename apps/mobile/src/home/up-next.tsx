import { radii, sizes, spacing } from "@repo/design-tokens";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import { ArrowRight, Plus, Search } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { SportGlyph } from "../lib/sport-glyph";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import type { HomeNavTarget } from "./home-target";
import { SectionTitle } from "./section-title";
import type { OpenWeekRow } from "@repo/domain/home-open-week";

import {
  upNextRowView,
  type UpNextItem,
  type UpNextRowView,
} from "./up-next-model";

type Navigate = (target: HomeNavTarget) => void;

const DETAIL_ICON = 12;
const ARROW_ICON = 16;
const DAY_COLUMN = 50;
const ACTION_TILE_HEIGHT = 48;
const JOIN_HEIGHT = 36;

export function UpNextHeading({ label }: { label: string }) {
  const m = useMessages();
  return <SectionTitle title={m.mobileHome.upNext.title} meta={label} />;
}

function DayTime({ day, time }: { day: string; time: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: DAY_COLUMN }}
    >
      <Text size="eyebrow" tone="muted" numberOfLines={1}>
        {day}
      </Text>
      <Text weight="bold" width="expanded" numberOfLines={1}>
        {time}
      </Text>
    </View>
  );
}

function TitleLines({
  title,
  detail,
  sport,
}: {
  title: string;
  detail: string | null;
  sport: UpNextRowView["sport"];
}) {
  const palette = useTonePalette();
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text weight="semibold" numberOfLines={1}>
        {title}
      </Text>
      {detail ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <SportGlyph sport={sport} color={palette.muted} size={DETAIL_ICON} />
          <Text
            size="eyebrow"
            tone="muted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {detail}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function rowTarget(item: UpNextItem): HomeNavTarget {
  return item.kind === "booking"
    ? { kind: "booking", bookingId: item.booking.id }
    : { kind: "game", gameId: item.game.id };
}

function trailingLabel(row: UpNextRowView): string | null {
  if (!row.trailing || row.trailing.kind === "bars") {
    return null;
  }
  return row.trailing.label;
}

function AllGamesRow({ onNavigate }: { onNavigate: Navigate }) {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => onNavigate({ kind: "browse-games" })}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget + 4,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text weight="semibold">{m.home.upNextCard.allGames}</Text>
      <ArrowRight
        size={ARROW_ICON}
        color={palette.foreground}
        style={mirrorInRtl}
      />
    </Pressable>
  );
}

/** The games after the card, then All games as the list's last row. */
export function UpNextList({
  items,
  onNavigate,
}: {
  items: readonly UpNextItem[];
  onNavigate: Navigate;
}) {
  const locale = useLocale();
  const now = useNow();
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {items.map((item) => {
        const row = upNextRowView(item, now, locale);
        const trailing = trailingLabel(row);
        return (
          <View key={row.key}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={row.spoken}
              onPress={() => onNavigate(rowTarget(item))}
              style={({ pressed }) => ({
                minHeight: sizes.touchTarget + 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <DayTime day={row.day} time={row.time} />
              <TitleLines
                title={row.title}
                detail={row.detail}
                sport={row.sport}
              />
              {trailing ? (
                <Text
                  size="eyebrow"
                  tone="muted"
                  numberOfLines={1}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {trailing}
                </Text>
              ) : null}
            </Pressable>
            <Hairline />
          </View>
        );
      })}
      <AllGamesRow onNavigate={onNavigate} />
    </Surface>
  );
}

function OutlineTile({
  label,
  icon: Icon,
  onPress,
}: {
  label: string;
  icon: typeof Search;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: ACTION_TILE_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: radii.lg,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.paper,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={ARROW_ICON} color={colors.ink} />
      <Text weight="semibold">{label}</Text>
    </Pressable>
  );
}

function OpenGameRow({
  row,
  onNavigate,
}: {
  row: OpenWeekRow;
  onNavigate: Navigate;
}) {
  const m = useMessages();
  const colors = useColors();
  const open: HomeNavTarget = { kind: "game", gameId: row.gameId };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.mobileHome.join.parts(
          [row.title, row.day, row.time, row.detail ?? ""].filter(Boolean),
        )}
        onPress={() => onNavigate(open)}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <DayTime day={row.day} time={row.time} />
        <TitleLines title={row.title} detail={row.detail} sport={row.sport} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.home.upNextCard.joinSpoken(row.title)}
        hitSlop={(sizes.touchTarget - JOIN_HEIGHT) / 2}
        onPress={() => onNavigate(open)}
        style={({ pressed }) => ({
          height: JOIN_HEIGHT,
          paddingHorizontal: 14,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          backgroundColor: colors.ink,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text size="meta" weight="semibold" style={{ color: colors.paper }}>
          {m.home.upNextCard.join}
        </Text>
      </Pressable>
    </View>
  );
}

/** Nothing booked this week: open seats in the User's Groups, then find or create. */
export function UpNextEmpty({
  openGames,
  createAction,
  onNavigate,
}: {
  openGames: readonly OpenWeekRow[];
  createAction: HomeNoGamesCreateAction;
  onNavigate: Navigate;
}) {
  const m = useMessages();
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        style={{
          gap: 10,
          paddingHorizontal: spacing.compact,
          paddingTop: spacing.surface,
          paddingBottom: spacing.compact,
        }}
      >
        <Hatch radius={0} bordered={false} />
        <Text size="h1Lg" width="expanded" accessibilityRole="header">
          {m.mobileHome.upNext.weekOpen}
        </Text>
        <Text size="meta" tone="muted">
          {openGames.length > 0
            ? m.home.upNextCard.openWeekBody(openGames.length)
            : m.mobileHome.upNext.emptyBody}
        </Text>
      </View>
      {openGames.map((row) => (
        <View key={row.key}>
          <Hairline />
          <OpenGameRow row={row} onNavigate={onNavigate} />
        </View>
      ))}
      <Hairline />
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: 16,
        }}
      >
        <OutlineTile
          label={m.mobileHome.upNext.findAGame}
          icon={Search}
          onPress={() => onNavigate({ kind: "browse-games" })}
        />
        <OutlineTile
          label={createAction.label}
          icon={Plus}
          onPress={() => onNavigate(createAction.target)}
        />
      </View>
    </Surface>
  );
}
