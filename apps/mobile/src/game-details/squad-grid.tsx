import { radii, spacing } from "@repo/design-tokens";
import {
  squadCounterLine,
  squadSeatViews,
  type SquadPlayer,
} from "@repo/domain/matchday-squad";
import { View } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const COLUMNS = 3;
const SEAT_HEIGHT = 60;
const SEAT_GAP = 6;

type SeatView = ReturnType<typeof squadSeatViews>[number];

function Seat({ seat }: { seat: SeatView }) {
  const palette = useTonePalette();
  const reserve = seat.kind === "reserve";
  return (
    <View
      accessible
      accessibilityLabel={seat.accessibilityLabel}
      style={{
        flex: 1,
        minWidth: 0,
        height: SEAT_HEIGHT,
        borderRadius: radii.md,
        borderWidth: seat.player ? hairline : 0,
        borderColor: palette.rule,
        paddingHorizontal: 8,
        justifyContent: "center",
        gap: 2,
      }}
    >
      {seat.player ? (
        <>
          <Text size="meta" weight="semibold" numberOfLines={1}>
            {seat.player.name}
          </Text>
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {[reserve ? seat.label : null, seat.player.meta || null]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </>
      ) : (
        <>
          <Hatch radius={radii.md} />
          {reserve ? (
            <Text
              size="eyebrow"
              tone="muted"
              mono
              uppercase
              style={{ textAlign: "center" }}
            >
              {seat.label}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

function SeatRows({ seats }: { seats: SeatView[] }) {
  const rows: SeatView[][] = [];
  for (let index = 0; index < seats.length; index += COLUMNS) {
    rows.push(seats.slice(index, index + COLUMNS));
  }
  return (
    <View style={{ gap: SEAT_GAP }}>
      {rows.map((row) => (
        <View key={row[0]?.key} style={{ flexDirection: "row", gap: SEAT_GAP }}>
          {row.map((seat) => (
            <Seat key={seat.key} seat={seat} />
          ))}
          {Array.from({ length: COLUMNS - row.length }, (_, index) => (
            <View key={`spacer-${index}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * One side's Matchday squad: `side + 3` seats in naming order, named tiles
 * with their role, empty seats hatched, the last three labelled Reserve, the
 * counter line, and the squad button for whoever acts for this side.
 */
export function SquadGrid({
  title,
  named,
  sideSize,
  action,
}: {
  title: string;
  named: readonly SquadPlayer[];
  sideSize: number;
  action?: { label: string; accessibilityLabel: string; onPress: () => void };
}) {
  const locale = useLocale();
  const seats = squadSeatViews(named, sideSize, locale);
  return (
    <Surface style={{ gap: spacing.compact }}>
      <View style={{ gap: 2 }}>
        <Text size="title" weight="semibold" accessibilityRole="header">
          {title}
        </Text>
        <Text size="meta" tone="muted">
          {squadCounterLine(named.length, sideSize, locale)}
        </Text>
      </View>
      <SeatRows seats={seats.filter((seat) => seat.kind === "side")} />
      <SeatRows seats={seats.filter((seat) => seat.kind === "reserve")} />
      {action ? (
        <Button
          label={action.label}
          accessibilityLabel={action.accessibilityLabel}
          variant="outline"
          onPress={action.onPress}
        />
      ) : null}
    </Surface>
  );
}
