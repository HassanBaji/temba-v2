import {
  CREATE_FLOW_OPEN_SEATS_LABEL,
  CREATE_FLOW_PRICE_CHIPS,
  KNOCKOUT_ONLY_FORMAT_LABEL,
  KNOCKOUT_REVIEW_LABEL,
  TOURNAMENT_FORMAT_LABEL,
  friendlyGameKickoff,
  friendlyGamePreviewLine,
  friendlyTournamentCourtsLabel,
  friendlyTournamentFormatLabel,
  friendlyTournamentPreviewDetail,
  gameTeamOfTwoCopy,
  isLevelBoundDisabled,
  parseCreateMatchMinutes,
  priceChipIsSelected,
} from "@repo/domain/create-game-flow";
import type { CreateVenuePicker } from "@repo/domain/create-game-flow";
import { friendlyTournamentPlan } from "@repo/domain/create-game-submit";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import { LEVEL_BAND_SELECT_NONE } from "@repo/domain/level-range";
import {
  groupsThenKnockoutReviewValue,
  knockoutOnlyReviewValue,
} from "@repo/domain/tournament-knockout";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
} from "@repo/domain/tournament-home";
import {
  ALONE_OR_WITH_A_PARTNER_LABEL,
  ANYONE_WITH_THE_LINK_LABEL,
  HOW_PEOPLE_JOIN_LABEL,
  reviewRoundsValue,
  ROUNDS_LABEL,
  WHO_CAN_TAKE_A_SEAT_LABEL,
  WITH_A_PARTNER_ONLY_LABEL,
} from "@repo/domain/tournament-sizing";
import { sizeTournamentRounds } from "@repo/domain/tournament-schedule";
import { resolveRoundCount } from "@repo/domain/tournament-sizing";
import { View } from "react-native";

import { Section } from "../primitives/section";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { ChipGrid, FieldError } from "./chips";
import type { StepProps } from "./step-props";

type DetailsProps = StepProps & {
  groupName: string | null;
  picker: CreateVenuePicker | null;
};

function LevelRange({ state, errors, dispatch }: StepProps) {
  const { draft } = state;
  const showRange =
    draft.preferLevelRange ||
    draft.levelMin !== LEVEL_BAND_SELECT_NONE ||
    draft.levelMax !== LEVEL_BAND_SELECT_NONE;
  const bands = (bound: "min" | "max") =>
    [
      { value: LEVEL_BAND_SELECT_NONE, label: "Any" },
      ...ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => ({
        value: band,
        label: band,
        disabled: isLevelBoundDisabled(
          bound,
          band,
          bound === "min" ? draft.levelMax : draft.levelMin,
        ),
      })),
    ] as const;

  return (
    <Section title="Who can enter">
      <Text size="meta" tone="muted">
        Optional
      </Text>
      <ChipGrid
        label="Who can enter"
        chips={[
          { value: "anyone", label: "Anyone" },
          { value: "range", label: "Set a Level range" },
        ]}
        isSelected={(value) => (value === "range") === showRange}
        onSelect={(value) =>
          dispatch(
            value === "anyone"
              ? { kind: "openLevelRange" }
              : { kind: "setLevelBound", bound: "min", value: draft.levelMin },
          )
        }
      />
      {showRange ? (
        <>
          <Text weight="medium">Minimum Level</Text>
          <ChipGrid
            label="Minimum Level"
            chips={bands("min")}
            isSelected={(value) => value === draft.levelMin}
            onSelect={(value) =>
              dispatch({
                kind: "setLevelBound",
                bound: "min",
                value: value as typeof draft.levelMin,
              })
            }
          />
          <FieldError message={errors.levelMinTenths} />
          <Text weight="medium">Maximum Level</Text>
          <ChipGrid
            label="Maximum Level"
            chips={bands("max")}
            isSelected={(value) => value === draft.levelMax}
            onSelect={(value) =>
              dispatch({
                kind: "setLevelBound",
                bound: "max",
                value: value as typeof draft.levelMax,
              })
            }
          />
          <FieldError message={errors.levelMaxTenths} />
        </>
      ) : null}
    </Section>
  );
}

function Price({ state, errors, dispatch }: StepProps) {
  const { draft } = state;
  const teamPrice = gameTeamOfTwoCopy(draft.pricePerPlayer);
  return (
    <Section title="Price per player">
      <Text size="meta" tone="muted">
        Optional
      </Text>
      <ChipGrid
        label="Price per player"
        chips={CREATE_FLOW_PRICE_CHIPS.map((chip) => ({
          value: chip.value,
          label: chip.label,
        }))}
        isSelected={(value) => priceChipIsSelected(value, draft.pricePerPlayer)}
        onSelect={(price) => dispatch({ kind: "setPrice", price })}
        columns={3}
      />
      <TextField
        label="Price in BD"
        value={draft.pricePerPlayer}
        keyboardType="decimal-pad"
        onChangeText={(price) => dispatch({ kind: "setPrice", price })}
        error={errors.pricePerPlayerFils}
      />
      {teamPrice ? (
        <Text size="meta" tone="muted">
          {teamPrice}
        </Text>
      ) : null}
    </Section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}
    >
      <Text size="meta" tone="muted">
        {label}
      </Text>
      <Text
        size="meta"
        weight="medium"
        style={{ flexShrink: 1, textAlign: "right" }}
      >
        {value}
      </Text>
    </View>
  );
}

export function GameDetailsStep(props: DetailsProps) {
  const { state, groupName, picker } = props;
  const { draft } = state;
  const venue = picker?.venues.find((item) => item.id === draft.venueId);
  const court = venue?.courts.find((item) => item.id === draft.courtId);
  const kickoff = friendlyGameKickoff(
    draft.day,
    draft.startTime,
    draft.finishTime,
  );
  const preview = friendlyGamePreviewLine({
    day: draft.startTime ? draft.day : "",
    groupName,
    venueName: venue?.name ?? null,
    courtName: court?.name ?? null,
  });

  return (
    <View style={{ gap: 24 }}>
      <LevelRange {...props} />
      <Price {...props} />
      <Surface style={{ gap: 8 }}>
        {kickoff ? (
          <>
            <Text size="title" weight="semibold">
              {kickoff.time}
            </Text>
            <Text size="meta" tone="muted">
              {kickoff.trailer}
            </Text>
          </>
        ) : null}
        <Text size="meta">{preview}</Text>
        <ReviewRow label="Group" value={groupName ?? "Group"} />
        <ReviewRow label="Venue" value={venue?.name ?? "Venue"} />
        <ReviewRow label="Seats" value={CREATE_FLOW_OPEN_SEATS_LABEL} />
      </Surface>
    </View>
  );
}

export function TournamentDetailsStep(props: DetailsProps) {
  const { state, errors, dispatch, groupName, picker } = props;
  const { draft } = state;
  const plan = friendlyTournamentPlan(draft);
  const { sizing, knockoutTree, poolKnockoutTree } = plan;
  const venue = picker?.venues.find((item) => item.id === draft.venueId);
  const courtNames =
    venue?.courts
      .filter((item) => draft.courtIds.includes(item.id))
      .map((item) => item.name) ?? [];
  const minutes = parseCreateMatchMinutes(draft.matchMinutes);
  const resolvedRounds = sizing
    ? resolveRoundCount(sizing.poolSizes, draft.roundCount)
    : null;
  const rounds =
    sizing && resolvedRounds != null
      ? sizeTournamentRounds(sizing.poolSizes, resolvedRounds)
      : null;

  return (
    <View style={{ gap: 24 }}>
      <Section title="Name">
        <TextField
          label="Tournament name"
          value={draft.name}
          onChangeText={(name) => dispatch({ kind: "setName", name })}
          error={errors.name}
        />
      </Section>
      <LevelRange {...props} />
      <Price {...props} />
      <Section title={WHO_CAN_TAKE_A_SEAT_LABEL}>
        <ChipGrid
          label={WHO_CAN_TAKE_A_SEAT_LABEL}
          chips={[
            { value: "group", label: groupName ?? "Group" },
            { value: "public", label: ANYONE_WITH_THE_LINK_LABEL },
          ]}
          isSelected={(value) => (value === "public") === draft.isPublic}
          onSelect={(value) =>
            dispatch({ kind: "setPublic", isPublic: value === "public" })
          }
        />
      </Section>
      <Section title={HOW_PEOPLE_JOIN_LABEL}>
        <ChipGrid
          label={HOW_PEOPLE_JOIN_LABEL}
          chips={[
            { value: "solo", label: ALONE_OR_WITH_A_PARTNER_LABEL },
            { value: "pair", label: WITH_A_PARTNER_ONLY_LABEL },
          ]}
          isSelected={(value) => (value === "solo") === draft.allowSoloRegister}
          onSelect={(value) =>
            dispatch({
              kind: "setAllowSolo",
              allowSoloRegister: value === "solo",
            })
          }
        />
      </Section>
      <Surface style={{ gap: 8 }}>
        <Text size="title" weight="semibold">
          {draft.name.trim() || "Friendly tournament"}
        </Text>
        <Text size="meta">
          {friendlyTournamentPreviewDetail({
            day: draft.day,
            venueName: venue?.name ?? null,
            courtNames,
          })}
        </Text>
        <ReviewRow label="Group" value={groupName ?? "Group"} />
        <ReviewRow label="Venue" value={venue?.name ?? "Venue"} />
        <ReviewRow
          label={TOURNAMENT_FORMAT_LABEL}
          value={
            plan.knockoutOnly
              ? KNOCKOUT_ONLY_FORMAT_LABEL
              : friendlyTournamentFormatLabel(
                  sizing?.poolCount ?? draft.poolCount,
                  poolKnockoutTree != null,
                )
          }
        />
        {knockoutTree ? (
          <ReviewRow
            label={KNOCKOUT_REVIEW_LABEL}
            value={knockoutOnlyReviewValue(knockoutTree)}
          />
        ) : null}
        {poolKnockoutTree && sizing ? (
          <ReviewRow
            label={KNOCKOUT_REVIEW_LABEL}
            value={groupsThenKnockoutReviewValue({
              tree: poolKnockoutTree,
              poolCount: sizing.poolCount,
              qualifiersPerPool: draft.qualifiersPerPool,
            })}
          />
        ) : null}
        {sizing && rounds ? (
          <ReviewRow
            label={ROUNDS_LABEL}
            value={reviewRoundsValue(rounds.roundCount, sizing.roundCount)}
          />
        ) : null}
        <ReviewRow
          label="Courts"
          value={friendlyTournamentCourtsLabel(courtNames)}
        />
        <ReviewRow
          label="Game length"
          value={minutes.ok ? `${minutes.minutes} min` : "Game length"}
        />
        <ReviewRow
          label={COUNTS_FOR_RATING_LABEL}
          value={COUNTS_FOR_RATING_YES}
        />
      </Surface>
    </View>
  );
}
