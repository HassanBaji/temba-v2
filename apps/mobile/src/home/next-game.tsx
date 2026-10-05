import { spacing } from "@repo/design-tokens";
import { formatHomeKickoff } from "@repo/domain/home-countdown";
import {
  homeNextGameActions,
  homeNextGameSecondaryLine,
  homeNextGameStatus,
} from "@repo/domain/home-next-game";
import { homeNoGamesCopy } from "@repo/domain/home-no-games";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { Card } from "./card";
import type { HomeContent, HomeNextGameModel } from "./home-model";
import type { HomeNavTarget } from "./home-target";
import { SeatRow } from "./seat-row";

const CLOCK_TICK_MS = 30_000;

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function Kickoff({ startsAt }: { startsAt: Date }) {
  const kickoff = formatHomeKickoff(startsAt);
  return (
    <View
      accessible
      accessibilityLabel={`${kickoff.time} ${kickoff.meridiem} ${kickoff.relativeDay}`}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        columnGap: 8,
      }}
    >
      <Text size="heroTime" width="expanded" weight="bold">
        {kickoff.time}
      </Text>
      <Text size="title" tone="muted">
        {kickoff.meridiem} {kickoff.relativeDay}
      </Text>
    </View>
  );
}

function Heading({ left, status }: { left: string; status: string | null }) {
  return (
    <View
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
    >
      <Text
        size="meta"
        tone="muted"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {left}
      </Text>
      {status ? (
        <Text size="meta" tone="muted">
          {status}
        </Text>
      ) : null}
    </View>
  );
}

export function NextGame({
  game,
  onNavigate,
}: {
  game: HomeNextGameModel;
  onNavigate: (target: HomeNavTarget) => void;
}) {
  const now = useNow();

  if (game.kind === "tournament") {
    const { row } = game;
    const subline =
      row.kind === "tournament" ? row.teamsLine : (row.opponentLine ?? "");
    return (
      <Surface tone="ink" style={{ gap: 16 }}>
        <Heading
          left={row.title}
          status={row.kind === "tournament_match" ? row.roundTag : null}
        />
        <Kickoff startsAt={row.startsAt} />
        {subline ? (
          <Text size="meta" tone="muted">
            {subline}
          </Text>
        ) : null}
        <Button
          label={
            row.kind === "tournament" && row.actionLabel
              ? row.actionLabel
              : "View game"
          }
          onPress={() => onNavigate({ kind: "game", gameId: game.id })}
        />
      </Surface>
    );
  }

  const status = homeNextGameStatus(game.phase, game.startsAt, now);
  const { primary, details } = homeNextGameActions({
    gameId: game.id,
    phase: game.phase,
    hasOpenSeat: game.seats.some((seat) => !seat.filled),
  });
  const secondary = homeNextGameSecondaryLine(
    game.courtLabel,
    game.formatLabel,
  );

  return (
    <Surface tone="ink" style={{ gap: 16 }}>
      <Heading left={game.venueName} status={status} />
      <View style={{ gap: 8 }}>
        <Kickoff startsAt={game.startsAt} />
        {secondary ? (
          <Text size="meta" tone="muted">
            {secondary}
          </Text>
        ) : null}
      </View>
      <SeatRow seats={game.seats} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={primary.label}
          onPress={() => onNavigate(primary.target)}
        />
        {details ? (
          <Button
            label="Details"
            variant="outline-inverse"
            onPress={() => onNavigate(details)}
          />
        ) : null}
      </View>
    </Surface>
  );
}

export function NoGames({
  action,
  onNavigate,
}: {
  action: HomeContent["noGamesAction"];
  onNavigate: (target: HomeNavTarget) => void;
}) {
  return (
    <Card>
      <View style={{ padding: spacing.surface, gap: 4 }}>
        <Text size="lead" weight="semibold">
          No games booked
        </Text>
        <Text size="meta" tone="muted">
          {homeNoGamesCopy(action)}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          {action ? (
            <Button
              label={action.label}
              onPress={() => onNavigate(action.target)}
            />
          ) : null}
          <Button
            label="Browse"
            variant="outline"
            onPress={() => onNavigate({ kind: "browse-games" })}
          />
        </View>
      </View>
    </Card>
  );
}
