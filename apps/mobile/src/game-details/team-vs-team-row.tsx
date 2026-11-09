import { radii } from "@repo/design-tokens";
import {
  challengeTeamVsTeamView,
  type ChallengeTeamSide,
} from "@repo/domain/challenge-game-details";
import { View } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { Text } from "../primitives/text";
import { ChallengeInitials } from "./challenge-initials";

const CREST = 36;

type TeamView = ReturnType<typeof challengeTeamVsTeamView>["home"];

function TeamSide({ team, end }: { team: TeamView; end: boolean }) {
  return (
    <View
      style={{
        flexShrink: 1,
        minWidth: 0,
        flexDirection: end ? "row-reverse" : "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <ChallengeInitials
        initials={team.initials}
        size={CREST}
        radius={radii.md}
        expanded
      />
      <View style={{ flexShrink: 1, minWidth: 0 }}>
        <Text
          weight="semibold"
          numberOfLines={2}
          style={{ textAlign: end ? "right" : "left" }}
        >
          {team.name}
        </Text>
        <Text
          size="eyebrow"
          tone="muted"
          style={{ textAlign: end ? "right" : "left" }}
        >
          {team.recordLine}
        </Text>
      </View>
    </View>
  );
}

/**
 * Both Teams of a Challenge Game on one row: crest, name and record (with
 * "you captain" on the viewer's own Team), head-to-head or "first meeting"
 * between them, the second Team mirrored.
 */
export function TeamVsTeamRow({
  sides,
  sport,
}: {
  sides: readonly ChallengeTeamSide[];
  sport: string | null;
}) {
  const locale = useLocale();
  const view = challengeTeamVsTeamView(sides, sport, locale);
  return (
    <View
      accessible
      accessibilityLabel={view.accessibilityLabel}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <TeamSide team={view.home} end={false} />
      <Text size="eyebrow" tone="muted" style={{ flexShrink: 0 }}>
        {view.middleLine}
      </Text>
      <TeamSide team={view.away} end />
    </View>
  );
}
