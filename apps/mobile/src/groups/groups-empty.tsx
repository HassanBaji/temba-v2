import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import {
  MY_GROUPS_EMPTY_COPY,
  MY_GROUPS_EMPTY_TITLE,
  MY_GROUPS_PLACEHOLDER_TITLE,
  PUBLIC_GROUPS_EMPTY_TITLE,
  PUBLIC_GROUPS_PREVIEW_MONOGRAMS,
  publicGroupsEmptyLine,
} from "@repo/domain/groups-list-empty-states";
import type { PublicGroupSportFilter } from "@repo/domain/sport";
import { Users } from "lucide-react-native";
import { View } from "react-native";

import { NotSetCell } from "../lib/not-set-cell";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

const MONOGRAM_SIZE = 40;
const NEXT_GAME_WIDTH = 52;

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

function HatchedMonogram() {
  return (
    <View style={{ width: MONOGRAM_SIZE, height: MONOGRAM_SIZE }}>
      <Hatch radius={radii.sm} />
    </View>
  );
}

/**
 * The Mine tab before the first Group, in the "Group empty states" language:
 * the first Group drawn as a hatched row, its Standing and next Game not set.
 */
export function MyGroupsEmpty({
  onCreate,
  onBrowsePublic,
}: {
  onCreate: () => void;
  onBrowsePublic: () => void;
}) {
  return (
    <View style={{ gap: spacing.compact }}>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        <View style={{ padding: spacing.surface, gap: spacing.compact }}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <HatchedMonogram />
            <Text tone="muted" numberOfLines={1} style={{ flex: 1 }}>
              {MY_GROUPS_PLACEHOLDER_TITLE}
            </Text>
            <View style={{ width: NEXT_GAME_WIDTH, height: sizes.touchTarget }}>
              <Hatch />
            </View>
          </View>
          <EmptyHeading
            title={MY_GROUPS_EMPTY_TITLE}
            line={MY_GROUPS_EMPTY_COPY}
          />
        </View>
        <Hairline />
        <View style={{ flexDirection: "row" }}>
          <NotSetCell label="Standing" divided={false} />
          <NotSetCell label="Next Game" divided />
        </View>
      </Surface>
      <View style={{ gap: 8 }}>
        <Button label="Create Group" size="lg" onPress={onCreate} />
        <Button
          label="Browse public Groups"
          size="lg"
          variant="outline"
          icon={<Users size={sizes.iconAction} color={colors.ink} />}
          onPress={onBrowsePublic}
        />
      </View>
    </View>
  );
}

/** The Public tab with nothing to join: hatched monograms where Groups will list. */
export function PublicGroupsEmpty({
  sportFilter,
  onCreate,
}: {
  sportFilter: PublicGroupSportFilter;
  onCreate: () => void;
}) {
  return (
    <View style={{ gap: spacing.compact }}>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        <View style={{ padding: spacing.surface, gap: spacing.compact }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text size="meta" tone="muted">
              Public Groups
            </Text>
            <Text size="meta" tone="muted">
              None open
            </Text>
          </View>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ flexDirection: "row", gap: 6 }}
          >
            {Array.from(
              { length: PUBLIC_GROUPS_PREVIEW_MONOGRAMS },
              (_, index) => (
                <HatchedMonogram key={index} />
              ),
            )}
          </View>
          <EmptyHeading
            title={PUBLIC_GROUPS_EMPTY_TITLE}
            line={publicGroupsEmptyLine(sportFilter)}
          />
        </View>
      </Surface>
      <Button label="Create Group" size="lg" onPress={onCreate} />
    </View>
  );
}
