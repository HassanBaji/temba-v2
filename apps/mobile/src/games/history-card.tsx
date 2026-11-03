import { radii } from "@repo/design-tokens";
import { setLabel, setShortLabel } from "@repo/domain/game-copy";
import type { HubHistoryRow } from "@repo/domain/hub-game-row";
import {
  matchHistoryCardModel,
  PENDING_SET_COLUMNS,
  type HistoryTeamRow,
} from "@repo/domain/match-history-card";
import { resultMarkLabel } from "@repo/domain/result-mark";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { ResultMark } from "../primitives/result-mark";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { CardShell } from "./card-parts";

const SCORE_WIDTH = 28;

function SetHeader({ columns }: { columns: number }) {
  const locale = useLocale();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", justifyContent: "flex-end", gap: 6 }}
    >
      {Array.from({ length: columns }, (_, index) => (
        <Text
          key={index}
          size="eyebrow"
          tone="muted"
          mono
          accessibilityLabel={setLabel(index, locale)}
          style={{ width: SCORE_WIDTH, textAlign: "center" }}
        >
          {setShortLabel(index, locale)}
        </Text>
      ))}
    </View>
  );
}

function TeamRow({ team }: { team: HistoryTeamRow }) {
  const palette = useTonePalette();
  const openSeats = Math.max(team.seats - team.members.length, 0);

  return (
    <View
      accessible
      accessibilityLabel={[
        team.label,
        team.note,
        team.scores?.map((score) => score.games).join(", "),
      ]
        .filter(Boolean)
        .join(". ")}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: radii.lg,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: hairline,
        borderColor: team.outlined ? palette.foreground : palette.rule,
        backgroundColor: team.filled ? palette.wash : palette.background,
      }}
    >
      <View style={{ flexDirection: "row", gap: 2 }}>
        {team.members.map((member) => (
          <Avatar
            key={member.id}
            name={member.name}
            uri={member.image}
            size="sm"
          />
        ))}
        {Array.from({ length: openSeats }, (_, index) => (
          <View key={`open-${index}`} style={{ width: 24, height: 24 }}>
            <Hatch radius={radii.slot} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          weight={team.filled || team.outlined ? "semibold" : "regular"}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {team.label}
        </Text>
        <Text
          size="eyebrow"
          tone="muted"
          mono
          uppercase
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {team.note}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {team.scores
          ? team.scores.map((score, index) => (
              <Text
                key={index}
                size="lead"
                width="expanded"
                weight="bold"
                tone={score.wonSet ? "default" : "muted"}
                style={{ width: SCORE_WIDTH, textAlign: "center" }}
              >
                {score.games}
              </Text>
            ))
          : Array.from({ length: PENDING_SET_COLUMNS }, (_, index) => (
              <View key={index} style={{ width: SCORE_WIDTH, height: 26 }}>
                <Hatch radius={radii.sm} />
              </View>
            ))}
      </View>
    </View>
  );
}

export function HistoryCard({
  row,
  onOpen,
}: {
  row: HubHistoryRow;
  onOpen: (gameId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages().mobileTournament.history;
  const model = matchHistoryCardModel(row, locale);
  const won = model.outcome === "won";
  const outcomeLabel = resultMarkLabel(model.outcome, locale);

  return (
    <CardShell
      label={m.accessibleName(outcomeLabel, model.meta)}
      onPress={() => onOpen(row.id)}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <ResultMark variant={model.outcome} decorative />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
          >
            <Text
              size="title"
              width="expanded"
              weight="bold"
              tone={won ? "default" : "muted"}
            >
              {outcomeLabel}
            </Text>
            <Text size="meta" tone="muted">
              {model.scored
                ? m.inSets(model.tally.won, model.tally.lost)
                : m.noScoreYet}
            </Text>
          </View>
          <Text size="meta" tone="muted" numberOfLines={1}>
            {model.meta}
          </Text>
        </View>
        {model.groupName ? (
          <Text
            size="eyebrow"
            tone="muted"
            mono
            uppercase
            numberOfLines={1}
            style={{ maxWidth: "36%" }}
          >
            {model.groupName}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 6 }}>
        {model.scored ? <SetHeader columns={model.setColumns} /> : null}
        {model.teams.map((team) => (
          <TeamRow key={team.side} team={team} />
        ))}
      </View>
    </CardShell>
  );
}
