import { spacing } from "@repo/design-tokens";
import { challengeGameView } from "@repo/domain/challenge-card";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import type { ChallengeDetail } from "./challenges-model";

type ChallengeGame = NonNullable<ChallengeDetail["game"]>;

function Row({ label, lines }: { label: string; lines: string[] }) {
  return (
    <View style={{ gap: 2, paddingVertical: 10 }}>
      <Text size="eyebrow" tone="muted" mono uppercase>
        {label}
      </Text>
      {lines.map((line) => (
        <Text key={line}>{line}</Text>
      ))}
    </View>
  );
}

/** The confirmed state: the Challenge Game, its place and cost, who decided, and each squad. */
export function ChallengeGameSummary({
  game,
  onOpen,
}: {
  game: ChallengeGame;
  onOpen: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view = challengeGameView(game, locale);
  const copy = m.challenge.detail.game;
  const [home, away] = game.sides;
  const upcoming =
    !game.cancelled && new Date(game.startsAt).getTime() > Date.now();
  return (
    <Surface
      tone={upcoming ? "ink" : "paper"}
      padded={false}
      style={{ paddingHorizontal: spacing.surface }}
    >
      <View style={{ gap: 4, paddingTop: spacing.surface }}>
        <Text size="eyebrow" mono uppercase>
          {copy.title}
        </Text>
        <Text size="title" weight="semibold">
          {m.challenge.mine.acceptedLine(
            home?.displayName ?? m.team.memberFallback,
            away?.displayName ?? m.team.memberFallback,
          )}
        </Text>
        {view.cancelledLine ? (
          <Text weight="semibold" accessibilityRole="alert">
            {view.cancelledLine}
          </Text>
        ) : null}
      </View>
      <Row label={copy.when} lines={[view.whenLine]} />
      <Hairline />
      <Row label={view.placeLabel} lines={[view.placeLine, view.bookLine]} />
      <Hairline />
      <Row label={copy.cost} lines={[view.costLine]} />
      {view.squads.length > 0 ? (
        <>
          <Hairline />
          <Row
            label={copy.squads}
            lines={view.squads.map(
              (squad) =>
                `${squad.title}${m.group.metaSeparator}${squad.counter}`,
            )}
          />
        </>
      ) : null}
      <Hairline />
      <View style={{ gap: spacing.compact, paddingVertical: spacing.surface }}>
        <Text size="meta" tone="muted">
          {view.decidedLine}
        </Text>
        <Button label={copy.open} onPress={onOpen} />
      </View>
    </Surface>
  );
}
