import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import type { SportFilter } from "@repo/domain/football-hub";
import {
  GAMES_HISTORY_EMPTY_COPY,
  GAMES_HISTORY_EMPTY_TITLE,
  GAMES_HISTORY_PREVIEW_FIGURES,
  GAMES_HISTORY_PREVIEW_MARKS,
  GAMES_HUB_EMPTY_TITLE,
  gamesHubEmptyLine,
  gamesHubEmptySeats,
} from "@repo/domain/games-hub-empty-states";
import { Users } from "lucide-react-native";
import { View } from "react-native";

import { NotSetCell } from "../lib/not-set-cell";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { ResultMark } from "../primitives/result-mark";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

const SEAT_SIZE = 32;

function MetaRow({ start, end }: { start: string; end: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text size="meta" tone="muted">
        {start}
      </Text>
      <Text size="meta" tone="muted">
        {end}
      </Text>
    </View>
  );
}

function EmptyHeading({ title, line }: { title: string; line: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text size="h1" width="expanded" weight="bold" accessibilityRole="header">
        {title}
      </Text>
      <Text tone="muted">{line}</Text>
    </View>
  );
}

/**
 * The Upcoming tab before any Game, in the "Group empty states" language: the
 * next Game drawn as a placeholder card with every seat hatched.
 */
export function UpcomingEmpty({
  sportFilter,
  onCreate,
  onFindGroup,
}: {
  sportFilter: SportFilter;
  onCreate: () => void;
  onFindGroup: () => void;
}) {
  return (
    <View style={{ gap: spacing.compact }}>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        <View style={{ padding: spacing.surface, gap: spacing.compact }}>
          <MetaRow start="Next Game" end="Not scheduled" />
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
          >
            {Array.from(
              { length: gamesHubEmptySeats(sportFilter) },
              (_, index) => (
                <View
                  key={index}
                  style={{ width: SEAT_SIZE, height: SEAT_SIZE }}
                >
                  <Hatch radius={radii.sm} />
                </View>
              ),
            )}
          </View>
          <EmptyHeading
            title={GAMES_HUB_EMPTY_TITLE}
            line={gamesHubEmptyLine(sportFilter)}
          />
        </View>
        <Hairline />
        <View style={{ flexDirection: "row" }}>
          <NotSetCell label="When" divided={false} />
          <NotSetCell label="Where" divided />
        </View>
      </Surface>
      <View style={{ gap: 8 }}>
        <Button label="Create Game" size="lg" onPress={onCreate} />
        <Button
          label="Find a Group"
          size="lg"
          variant="outline"
          icon={<Users size={sizes.iconAction} color={colors.ink} />}
          onPress={onFindGroup}
        />
      </View>
    </View>
  );
}

/**
 * The Played tab before the first result: the recent form drawn with
 * not-played marks and its figures at zero.
 */
export function PlayedEmpty() {
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View style={{ padding: spacing.surface, gap: spacing.compact }}>
        <MetaRow start="Recent form" end="No results yet" />
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", gap: 6 }}
        >
          {Array.from({ length: GAMES_HISTORY_PREVIEW_MARKS }, (_, index) => (
            <ResultMark
              key={index}
              variant="not-played"
              size={SEAT_SIZE}
              decorative
            />
          ))}
        </View>
        <EmptyHeading
          title={GAMES_HISTORY_EMPTY_TITLE}
          line={GAMES_HISTORY_EMPTY_COPY}
        />
      </View>
      <Hairline />
      <View style={{ flexDirection: "row" }}>
        {GAMES_HISTORY_PREVIEW_FIGURES.map((label, index) => (
          <View
            key={label}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 4,
              paddingVertical: 16,
              borderLeftWidth: index > 0 ? hairline : 0,
              borderLeftColor: colors.rule,
            }}
          >
            <Text size="title" width="expanded" weight="bold" tone="muted">
              0
            </Text>
            <Text size="eyebrow" tone="muted" mono uppercase>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </Surface>
  );
}
