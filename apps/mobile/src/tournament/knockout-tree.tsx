import { sizes } from "@repo/design-tokens";
import { knockoutPlaceSideTags } from "@repo/domain/tournament-details";
import { YOUR_TEAM_TAG } from "@repo/domain/tournament-home";
import { CANCEL_MATCH_ACTION } from "@repo/domain/game-copy";
import {
  KNOCKOUT_BYE_LABEL,
  KNOCKOUT_DECIDING_SET_COPY,
  KNOCKOUT_WALKOVER_TAG,
  canCancelKnockoutPlace,
  knockoutPlaceMetaLine,
  knockoutRoundDayLine,
  knockoutSideLabel,
  type KnockoutMatchPlace,
  type KnockoutViewPlace,
  type KnockoutViewRound,
  type KnockoutViewSide,
} from "@repo/domain/tournament-knockout-view";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";

function SideRow({
  side,
  resultTag = null,
  walkover = false,
}: {
  side: KnockoutViewSide;
  resultTag?: string | null;
  walkover?: boolean;
}) {
  const isTeam = side.kind === "team";
  const isViewer = side.kind === "team" && side.team.isViewer;
  const label = knockoutSideLabel(side);
  return (
    <View
      style={{
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 4,
      }}
    >
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
          {YOUR_TEAM_TAG}
        </Text>
      ) : null}
      {walkover ? (
        <Text size="meta" tone="muted" weight="semibold">
          {KNOCKOUT_WALKOVER_TAG}
        </Text>
      ) : null}
      {resultTag ? (
        <Text size="meta" weight="semibold">
          {resultTag}
        </Text>
      ) : null}
    </View>
  );
}

type CancelMatch = (place: KnockoutMatchPlace) => void;

function PlaceCard({
  place,
  isFinal,
  onCancelMatch,
}: {
  place: KnockoutViewPlace;
  isFinal: boolean;
  onCancelMatch?: CancelMatch;
}) {
  const meta =
    place.kind === "match"
      ? knockoutPlaceMetaLine(place.startTime, place.courtName)
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
          {place.code}
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
            {...knockoutPlaceSideTags(place, 1, isFinal)}
          />
          <Hairline />
          <SideRow
            side={place.slot2}
            {...knockoutPlaceSideTags(place, 2, isFinal)}
          />
          {place.scoreLabel ? (
            <Text size="meta" tone="muted" style={{ paddingTop: 8 }}>
              {place.scoreLabel}
            </Text>
          ) : null}
          {place.needsDecidingSet ? (
            <Text size="meta" tone="muted" style={{ paddingTop: 8 }}>
              {KNOCKOUT_DECIDING_SET_COPY}
            </Text>
          ) : null}
          {onCancelMatch && canCancelKnockoutPlace(place) ? (
            <View style={{ flexDirection: "row", paddingTop: 8 }}>
              <Button
                label={CANCEL_MATCH_ACTION}
                accessibilityLabel={`${CANCEL_MATCH_ACTION} ${place.code}`}
                size="sm"
                variant="outline"
                onPress={() => onCancelMatch(place)}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <View>
          <SideRow side={place.side} />
          <Hairline />
          <View
            accessible
            accessibilityLabel={KNOCKOUT_BYE_LABEL}
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
              {KNOCKOUT_BYE_LABEL}
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
}: {
  round: KnockoutViewRound;
  isFinal: boolean;
  onCancelMatch?: CancelMatch;
}) {
  const day = knockoutRoundDayLine(round);
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
        />
      ))}
    </View>
  );
}

export function KnockoutTree({
  rounds,
  onCancelMatch,
}: {
  rounds: readonly KnockoutViewRound[];
  onCancelMatch?: CancelMatch;
}) {
  return (
    <View style={{ gap: 24 }}>
      {rounds.map((round, index) => (
        <Round
          key={round.round}
          round={round}
          isFinal={index === rounds.length - 1}
          onCancelMatch={onCancelMatch}
        />
      ))}
    </View>
  );
}
