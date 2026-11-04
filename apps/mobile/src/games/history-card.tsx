import { radii } from "@repo/design-tokens";
import type { HubHistoryRow } from "@repo/domain/hub-game-row";
import {
  matchHistoryCardModel,
  PENDING_SET_COLUMNS,
  type HistoryTeamRow,
} from "@repo/domain/match-history-card";
import { resultMarkLabel } from "@repo/domain/result-mark";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { ResultMark } from "../primitives/result-mark";
import {
  SurfaceToneContext,
  useTonePalette,
} from "../primitives/surface-context";
import { Text } from "../primitives/text";

const INSET = 16;
const AVATAR_RING = 2;
const AVATAR_OVERLAP = 8;
const SCORE_MIN_WIDTH = 22;

function AvatarStack({ team }: { team: HistoryTeamRow }) {
  const palette = useTonePalette();

  if (team.avatars.length === 0) {
    return (
      <View style={{ width: 28, height: 28 }}>
        <Hatch radius={14} />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", paddingLeft: AVATAR_OVERLAP }}>
      {team.avatars.map((member) => (
        <View
          key={member.id}
          style={{
            marginLeft: -AVATAR_OVERLAP,
            borderRadius: 14,
            borderWidth: AVATAR_RING,
            borderColor: palette.background,
          }}
        >
          <Avatar name={member.name} uri={member.image} size="sm" />
        </View>
      ))}
    </View>
  );
}

function TeamScores({ team }: { team: HistoryTeamRow }) {
  if (!team.scores) {
    return (
      <View style={{ flexDirection: "row", gap: 6 }}>
        {Array.from({ length: PENDING_SET_COLUMNS }, (_, index) => (
          <View key={index} style={{ width: 22, height: 22 }}>
            <Hatch radius={radii.sm} />
          </View>
        ))}
      </View>
    );
  }

  const sets = team.scores.length > 1;

  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
      {team.scores.map((score, index) => (
        <Text
          key={index}
          size={sets ? "title" : "h2"}
          width="expanded"
          weight="bold"
          tone={score.lostSet ? "muted" : "default"}
          style={{ minWidth: SCORE_MIN_WIDTH, textAlign: "right" }}
        >
          {score.games}
        </Text>
      ))}
    </View>
  );
}

function TeamRow({ team }: { team: HistoryTeamRow }) {
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
        gap: 12,
        paddingVertical: 12,
      }}
    >
      <AvatarStack team={team} />
      <View
        style={{ flex: 1, minWidth: 0 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          numberOfLines={1}
          weight={team.side === "mine" ? "semibold" : "regular"}
          tone={team.lost ? "muted" : "default"}
        >
          {team.label}
        </Text>
        <Text size="eyebrow" tone="muted">
          {team.note}
        </Text>
      </View>
      <TeamScores team={team} />
    </View>
  );
}

function ResultStrip({
  outcome,
  scoreLine,
  day,
}: {
  outcome: HubHistoryRow["outcome"];
  scoreLine: string;
  day: string;
}) {
  const locale = useLocale();
  const palette = useTonePalette();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: INSET,
        paddingVertical: 12,
        backgroundColor: outcome === "won" ? palette.background : palette.wash,
      }}
    >
      <ResultMark variant={outcome} size={16} decorative />
      <Text weight="semibold">{resultMarkLabel(outcome, locale)}</Text>
      <Text size="meta" tone="muted">
        {scoreLine}
      </Text>
      <Text
        size="eyebrow"
        tone="muted"
        numberOfLines={1}
        style={{ marginLeft: "auto" }}
      >
        {day}
      </Text>
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
  const palette = useTonePalette();
  const model = matchHistoryCardModel(row, locale);
  const won = model.outcome === "won";

  return (
    <View
      style={{
        borderRadius: radii.surface,
        borderWidth: hairline,
        borderColor: won ? palette.foreground : palette.rule,
        backgroundColor: palette.background,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={m.accessibleName(
          resultMarkLabel(model.outcome, locale),
          model.scoreLine,
          model.meta,
        )}
        onPress={() => onOpen(row.id)}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <SurfaceToneContext.Provider value={won ? "ink" : "paper"}>
          <ResultStrip
            outcome={model.outcome}
            scoreLine={model.scoreLine}
            day={model.day}
          />
        </SurfaceToneContext.Provider>

        {model.sport || model.groupName ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingHorizontal: INSET,
              paddingTop: 10,
            }}
          >
            {model.sport ? (
              <View
                style={{
                  borderWidth: hairline,
                  borderColor: palette.rule,
                  borderRadius: radii.slot,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                }}
              >
                <Text size="eyebrow" tone="muted" mono uppercase>
                  {model.sport}
                </Text>
              </View>
            ) : null}
            {model.groupName ? (
              <Text
                size="eyebrow"
                tone="muted"
                mono
                uppercase
                numberOfLines={1}
                style={{ flexShrink: 1, marginLeft: "auto" }}
              >
                {model.groupName}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ paddingHorizontal: INSET, paddingTop: 4 }}>
          <TeamRow team={model.teams[0]} />
          <Hairline />
          <TeamRow team={model.teams[1]} />
        </View>

        <Hairline />
        <View
          style={{
            paddingHorizontal: INSET,
            paddingTop: 10,
            paddingBottom: 12,
          }}
        >
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {model.place}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
