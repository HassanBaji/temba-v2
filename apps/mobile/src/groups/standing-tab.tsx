import { spacing } from "@repo/design-tokens";
import type { GroupHomeData } from "@repo/domain/group-data";
import { groupStandingState } from "@repo/domain/group-join";
import { View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { hairline as hairlineWidth } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import {
  LEVEL_PROVISIONAL_NOTE,
  STANDING_NOT_MEMBER_COPY,
  STANDING_NO_RESULTS_COPY,
  standingRowView,
  standingStats,
  type StandingRowView,
} from "./group-home-model";
import { LevelCell } from "./level-cell";
import { Notice } from "./notice";

const POSITION_WIDTH = 28;
const RECORD_WIDTH = 48;
const LEVEL_WIDTH = 56;

function HeaderCell({ label, width }: { label: string; width?: number }) {
  return (
    <Text
      size="eyebrow"
      tone="muted"
      mono
      uppercase
      style={{ width, flex: width ? undefined : 1 }}
    >
      {label}
    </Text>
  );
}

function RowBody({ row }: { row: StandingRowView }) {
  return (
    <View
      accessible
      accessibilityLabel={row.accessibilityLabel}
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: spacing.surface,
        paddingVertical: 12,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: POSITION_WIDTH }}
      >
        <Text size="lead" width="expanded" weight="bold">
          {row.position}
        </Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flex: 1, minWidth: 0 }}
      >
        <Text weight={row.isViewer ? "semibold" : "regular"} numberOfLines={1}>
          {row.name}
        </Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: RECORD_WIDTH, alignItems: "flex-end" }}
      >
        <Text width="expanded">{row.record}</Text>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: LEVEL_WIDTH, alignItems: "flex-end" }}
      >
        <LevelCell view={row.level} />
      </View>
    </View>
  );
}

function StandingTable({ rows }: { rows: StandingRowView[] }) {
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: spacing.surface,
          paddingVertical: 12,
        }}
      >
        <HeaderCell label="#" width={POSITION_WIDTH} />
        <HeaderCell label="Player" />
        <HeaderCell label="W-L" width={RECORD_WIDTH} />
        <HeaderCell label="Level" width={LEVEL_WIDTH} />
      </View>
      {rows.map((row) => (
        <View key={row.key}>
          <Hairline />
          {row.isViewer ? (
            <Surface tone="ink" padded={false} radius="md">
              <RowBody row={row} />
            </Surface>
          ) : (
            <RowBody row={row} />
          )}
        </View>
      ))}
      <Hairline />
      <View style={{ padding: spacing.surface }}>
        <Text size="eyebrow" tone="muted" mono uppercase>
          {LEVEL_PROVISIONAL_NOTE}
        </Text>
      </View>
    </Surface>
  );
}

function StatCell({
  value,
  label,
  divided,
}: {
  value: number;
  label: string;
  divided: boolean;
}) {
  const palette = useTonePalette();
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={{
        flex: 1,
        padding: spacing.surface,
        gap: 2,
        borderLeftWidth: divided ? hairlineWidth : 0,
        borderLeftColor: palette.rule,
      }}
    >
      <Text size="figure" width="expanded" weight="bold">
        {value}
      </Text>
      <Text size="eyebrow" tone="muted" mono uppercase>
        {label}
      </Text>
    </View>
  );
}

function StatPair({ data }: { data: GroupHomeData }) {
  return (
    <Surface padded={false} style={{ flexDirection: "row" }}>
      {standingStats(data).map((stat, index) => (
        <StatCell key={stat.label} {...stat} divided={index > 0} />
      ))}
    </Surface>
  );
}

export function StandingTab({ data }: { data: GroupHomeData }) {
  const state = groupStandingState({
    isMember: data.membership != null,
    leaderboard: data.standing.leaderboard,
  });
  if (state.kind === "not-member") {
    return <Notice {...STANDING_NOT_MEMBER_COPY} />;
  }
  return (
    <View style={{ gap: spacing.compact }}>
      {state.showNoResultsNotice ? (
        <Notice {...STANDING_NO_RESULTS_COPY} />
      ) : null}
      {state.showTable ? (
        <>
          <StandingTable
            rows={data.standing.leaderboard.map(standingRowView)}
          />
          <StatPair data={data} />
        </>
      ) : null}
    </View>
  );
}
