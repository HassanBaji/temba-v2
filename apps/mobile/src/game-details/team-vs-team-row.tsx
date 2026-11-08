import {
  challengeTeamVsTeamView,
  type ChallengeTeamSide,
} from "@repo/domain/challenge-game-details";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { InitialsTile } from "../primitives/initials-tile";
import { Text } from "../primitives/text";

type TeamView = ReturnType<typeof challengeTeamVsTeamView>["home"];

function TeamColumn({ team, end }: { team: TeamView; end: boolean }) {
  const align = end ? "flex-end" : "flex-start";
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 6, alignItems: align }}>
      <InitialsTile name={team.name} size="lg" />
      <Text
        weight="semibold"
        numberOfLines={2}
        style={{ textAlign: end ? "right" : "left" }}
      >
        {team.name}
      </Text>
      <Text size="meta" tone="muted" mono>
        {`${team.recordLabel} ${team.recordValue}`}
      </Text>
    </View>
  );
}

/** Both Teams of a Challenge Game: crest, name and record, then head-to-head or "First meeting". */
export function TeamVsTeamRow({
  sides,
  sport,
}: {
  sides: readonly ChallengeTeamSide[];
  sport: string | null;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view = challengeTeamVsTeamView(sides, sport, locale);
  return (
    <View
      accessible
      accessibilityLabel={view.accessibilityLabel}
      style={{ gap: 10 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TeamColumn team={view.home} end={false} />
        <Text size="title" tone="muted">
          {m.challenge.gameDetails.versus}
        </Text>
        <TeamColumn team={view.away} end />
      </View>
      <Text size="meta" tone="muted" style={{ textAlign: "center" }}>
        {view.headToHeadLine}
      </Text>
    </View>
  );
}
