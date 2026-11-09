import { radii } from "@repo/design-tokens";
import {
  squadCounterParts,
  squadSeatViews,
  type SquadPlayer,
} from "@repo/domain/matchday-squad";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const COLUMNS = 3;
const SEAT_HEIGHT = 54;
const SEAT_GAP = 6;
const SQUAD_GAP = 12;

type SeatView = ReturnType<typeof squadSeatViews>[number];

function Seat({ seat }: { seat: SeatView }) {
  const palette = useTonePalette();
  return (
    <View
      accessible
      accessibilityLabel={seat.accessibilityLabel}
      style={{
        flex: 1,
        minWidth: 0,
        height: SEAT_HEIGHT,
        borderRadius: radii.md,
        backgroundColor: seat.player ? palette.wash : "transparent",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        paddingHorizontal: 4,
      }}
    >
      {seat.player ? (
        <>
          <Text size="eyebrow" weight="semibold" numberOfLines={1}>
            {seat.player.initials}
          </Text>
          {seat.player.code ? (
            <Text size="eyebrow" tone="muted" mono numberOfLines={1}>
              {seat.player.code}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Hatch radius={radii.md} />
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {seat.emptyLabel}
          </Text>
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
 * One side's Matchday squad: the counter, then `side + 3` seats three to a
 * row in naming order, named tiles with initials and role, empty seats
 * hatched "Open", the last three "Reserve". The second side mirrors its
 * counter.
 */
export function SquadGrid({
  title,
  named,
  sideSize,
  end,
}: {
  title: string;
  named: readonly SquadPlayer[];
  sideSize: number;
  end: boolean;
}) {
  const locale = useLocale();
  const m = useMessages();
  const seats = squadSeatViews(named, sideSize, locale);
  const counter = squadCounterParts(named.length, sideSize, locale);
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${m.challenge.squad.squadOf(title)}${m.group.metaSeparator}${counter.strong}${m.group.metaSeparator}${counter.muted}`}
        style={{
          flexDirection: end ? "row-reverse" : "row",
          justifyContent: "space-between",
          gap: 4,
        }}
      >
        <Text size="eyebrow" weight="semibold" numberOfLines={1}>
          {counter.strong}
        </Text>
        <Text
          size="eyebrow"
          tone="muted"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {counter.muted}
        </Text>
      </View>
      <SeatRows seats={seats} />
    </View>
  );
}

type SquadSide = {
  gameTeamId: string;
  name: string | null;
  named: readonly SquadPlayer[];
  sideSize: number;
};

/**
 * Both squads of a football Challenge Game side by side under the
 * team-vs-team row, the squad button for the side the viewer names, and the
 * note on who names them.
 */
export function ChallengeSquads({
  sides,
  action,
}: {
  sides: readonly SquadSide[];
  action?: { label: string; accessibilityLabel: string; onPress: () => void };
}) {
  const m = useMessages();
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: SQUAD_GAP }}>
        {sides.slice(0, 2).map((side, index) => (
          <SquadGrid
            key={side.gameTeamId}
            title={side.name ?? m.team.memberFallback}
            named={side.named}
            sideSize={side.sideSize}
            end={index === 1}
          />
        ))}
      </View>
      {action ? (
        <Button
          label={action.label}
          accessibilityLabel={action.accessibilityLabel}
          size="lg"
          onPress={action.onPress}
        />
      ) : null}
      <Text size="eyebrow" tone="muted" style={{ marginTop: -4 }}>
        {m.challenge.squad.note}
      </Text>
    </View>
  );
}
