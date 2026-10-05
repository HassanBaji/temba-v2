import { radii } from "@repo/design-tokens";
import { ONE_DAY_OVERRUN_MESSAGE } from "@repo/domain/tournament-sizing";
import { View } from "react-native";

import { hairline } from "../primitives/hairline-width";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import type { TournamentScheduleSummary } from "./create-summary";

export function ScheduleCard({
  summary,
}: {
  summary: TournamentScheduleSummary;
}) {
  const palette = useTonePalette();
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      style={{
        gap: 6,
        padding: 16,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: palette.foreground,
      }}
    >
      {summary.kind === "pickCourts" ? (
        <Text tone="muted">{summary.message}</Text>
      ) : (
        <>
          <Text size="lead" width="expanded">
            {summary.title}
          </Text>
          <Text size="meta" tone="muted">
            {summary.detail}
          </Text>
          {summary.overruns ? (
            <Text size="meta" weight="semibold">
              {ONE_DAY_OVERRUN_MESSAGE}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}
