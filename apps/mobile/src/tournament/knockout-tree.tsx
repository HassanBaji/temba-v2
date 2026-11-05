import { sizes } from "@repo/design-tokens";
import { knockoutPlaceSideTags } from "@repo/domain/tournament-details";
import { cancelMatchAction } from "@repo/domain/game-copy";
import {
  canCancelKnockoutPlace,
  knockoutPlaceMetaLine,
  knockoutRoundDayLine,
  knockoutSideLabel,
  type KnockoutMatchPlace,
  type KnockoutViewPlace,
  type KnockoutViewRound,
  type KnockoutViewSide,
} from "@repo/domain/tournament-knockout-view";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { gameTeamPlayers } from "../player-profile/game-player-links";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { ScoreLine } from "../primitives/score-pair";
import { Text } from "../primitives/text";
import type { GameTeamLinks } from "./game-team-sheet";

const SIDE_ROW = {
  minHeight: sizes.touchTarget,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingVertical: 4,
} as const;

function SideRow({
  side,
  resultTag = null,
  walkover = false,
  links,
}: {
  side: KnockoutViewSide;
  resultTag?: string | null;
  walkover?: boolean;
  links?: GameTeamLinks;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const isTeam = side.kind === "team";
  const isViewer = side.kind === "team" && side.team.isViewer;
  const label = knockoutSideLabel(side, locale);
  const players =
    side.kind === "team" && links
      ? gameTeamPlayers(links.gameTeams, side.team.gameTeamId)
      : [];
  const content = (
    <>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 32,
          justifyContent: "center",
          paddingHorizontal: isTeam ? 0 : 10,
        }}
      >
        {isTeam ? null : <Hatch radius={4} />}
        <Text
          size="body"
          tone={isTeam ? "default" : "muted"}
          weight={isViewer ? "semibold" : "regular"}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      {isViewer ? (
        <Text size="meta" tone="muted">
          {messages.tournament.home.yourTeamTag}
        </Text>
      ) : null}
      {walkover ? (
        <Text size="meta" tone="muted" weight="semibold">
          {messages.tournament.knockoutView.walkover}
        </Text>
      ) : null}
      {resultTag ? (
        <Text size="meta" weight="semibold">
          {resultTag}
        </Text>
      ) : null}
    </>
  );

  if (!links || players.length === 0) {
    return <View style={SIDE_ROW}>{content}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={messages.mobileTournament.knockout.teamPlayersHint}
      onPress={() => links.onOpenTeam({ name: label, players })}
      style={({ pressed }) => ({ ...SIDE_ROW, opacity: pressed ? 0.6 : 1 })}
    >
      {content}
    </Pressable>
  );
}

type CancelMatch = (place: KnockoutMatchPlace) => void;

function PlaceCard({
  place,
  isFinal,
  onCancelMatch,
  links,
}: {
  place: KnockoutViewPlace;
  isFinal: boolean;
  onCancelMatch?: CancelMatch;
  links?: GameTeamLinks;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const knockoutView = messages.tournament.knockoutView;
  const meta =
    place.kind === "match"
      ? knockoutPlaceMetaLine(place.startTime, place.courtName, locale)
      : null;
  return (
    <Surface style={{ gap: 4 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <Text size="eyebrow" weight="semibold" uppercase>
          {place.label}
        </Text>
        {meta ? (
          <Text size="meta" tone="muted">
            {meta}
          </Text>
        ) : null}
      </View>
      {place.kind === "match" ? (
        <View>
          <SideRow
            side={place.slot1}
            {...knockoutPlaceSideTags(place, 1, isFinal, locale)}
            links={links}
          />
          <Hairline />
          <SideRow
            side={place.slot2}
            {...knockoutPlaceSideTags(place, 2, isFinal, locale)}
            links={links}
          />
          {place.scoreLabel ? (
            <ScoreLine
              score={place.scoreLabel}
              size="meta"
              tone="muted"
              style={{ paddingTop: 8 }}
            />
          ) : null}
          {place.needsDecidingSet ? (
            <Text size="meta" tone="muted" style={{ paddingTop: 8 }}>
              {knockoutView.decidingSet}
            </Text>
          ) : null}
          {onCancelMatch && canCancelKnockoutPlace(place) ? (
            <View style={{ flexDirection: "row", paddingTop: 8 }}>
              <Button
                label={cancelMatchAction(locale)}
                accessibilityLabel={messages.mobileTournament.organizer.cancelMatchSr(
                  place.label,
                )}
                size="sm"
                variant="outline"
                onPress={() => onCancelMatch(place)}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <View>
          <SideRow side={place.side} links={links} />
          <Hairline />
          <View
            accessible
            accessibilityLabel={knockoutView.bye}
            style={{
              minHeight: sizes.touchTarget,
              justifyContent: "center",
              paddingHorizontal: 10,
              marginVertical: 4,
            }}
          >
            <Hatch radius={4} />
            <Text
              size="body"
              tone="muted"
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              {knockoutView.bye}
            </Text>
          </View>
        </View>
      )}
    </Surface>
  );
}

function Round({
  round,
  isFinal,
  onCancelMatch,
  links,
}: {
  round: KnockoutViewRound;
  isFinal: boolean;
  onCancelMatch?: CancelMatch;
  links?: GameTeamLinks;
}) {
  const locale = useLocale();
  const day = knockoutRoundDayLine(round, locale);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text size="title" weight="semibold" accessibilityRole="header">
          {round.name}
        </Text>
        {day ? (
          <Text size="meta" tone="muted">
            {day}
          </Text>
        ) : null}
      </View>
      {round.places.map((place) => (
        <PlaceCard
          key={`${place.kind}-${place.position}`}
          place={place}
          isFinal={isFinal}
          onCancelMatch={onCancelMatch}
          links={links}
        />
      ))}
    </View>
  );
}

export function KnockoutTree({
  rounds,
  onCancelMatch,
  links,
}: {
  rounds: readonly KnockoutViewRound[];
  onCancelMatch?: CancelMatch;
  links?: GameTeamLinks;
}) {
  return (
    <View style={{ gap: 24 }}>
      {rounds.map((round, index) => (
        <Round
          key={round.round}
          round={round}
          isFinal={index === rounds.length - 1}
          onCancelMatch={onCancelMatch}
          links={links}
        />
      ))}
    </View>
  );
}
