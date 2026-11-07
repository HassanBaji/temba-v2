import { radii, sizes, spacing } from "@repo/design-tokens";
import {
  PUBLIC_GROUPS_PREVIEW_MONOGRAMS,
  publicGroupsEmptyLine,
} from "@repo/domain/groups-list-empty-states";
import type { PublicGroupSportFilter } from "@repo/domain/sport";
import { Users } from "lucide-react-native";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { NotSetCell } from "../lib/not-set-cell";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

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
  const m = useMessages();
  const colors = useColors();
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
              {m.group.list.placeholderTitle}
            </Text>
            <View style={{ width: NEXT_GAME_WIDTH, height: sizes.touchTarget }}>
              <Hatch />
            </View>
          </View>
          <EmptyHeading
            title={m.group.list.mineEmptyTitle}
            line={m.group.list.mineEmptyCopy}
          />
        </View>
        <Hairline />
        <View style={{ flexDirection: "row" }}>
          <NotSetCell
            label={m.mobileGroup.list.empty.standing}
            divided={false}
          />
          <NotSetCell label={m.mobileGroup.list.nextGame} divided />
        </View>
      </Surface>
      <View style={{ gap: 8 }}>
        <Button label={m.group.create.submit} size="lg" onPress={onCreate} />
        <Button
          label={m.mobileGroup.list.empty.browsePublic}
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
  const locale = useLocale();
  const m = useMessages();
  return (
    <View style={{ gap: spacing.compact }}>
      <Surface padded={false} style={{ overflow: "hidden" }}>
        <View style={{ padding: spacing.surface, gap: spacing.compact }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text size="meta" tone="muted">
              {m.mobileGroup.list.empty.publicGroups}
            </Text>
            <Text size="meta" tone="muted">
              {m.mobileGroup.list.empty.noneOpen}
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
            title={m.group.list.publicEmptyTitle}
            line={publicGroupsEmptyLine(sportFilter, locale)}
          />
        </View>
      </Surface>
      <Button label={m.group.create.submit} size="lg" onPress={onCreate} />
    </View>
  );
}
