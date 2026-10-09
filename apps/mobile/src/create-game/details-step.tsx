import { spacing } from "@repo/design-tokens";
import {
  CREATE_FLOW_OPEN_SEATS_LABEL,
  CREATE_FLOW_PRICE_CHIPS,
  KNOCKOUT_ONLY_FORMAT_LABEL,
  KNOCKOUT_REVIEW_LABEL,
  TOURNAMENT_FORMAT_LABEL,
  friendlyTournamentCourtsLabel,
  friendlyTournamentFormatLabel,
  gameTeamOfTwoCopy,
  parseCreateMatchMinutes,
  priceChipIsSelected,
} from "@repo/domain/create-game-flow";
import type { CreateVenuePicker } from "@repo/domain/create-game-flow";
import { friendlyTournamentPlan } from "@repo/domain/create-game-submit";
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
  resolveRoundCount,
  reviewRoundsValue,
  ROUNDS_LABEL,
  WHO_CAN_TAKE_A_SEAT_LABEL,
  WITH_A_PARTNER_ONLY_LABEL,
} from "@repo/domain/tournament-sizing";
import { sizeTournamentRounds } from "@repo/domain/tournament-schedule";
import { View } from "react-native";

import { TextField } from "../primitives/text-field";
import { ChipGrid } from "./chips";
import {
  LevelRangeField,
  LevelRangeHelper,
  LevelRangeRows,
} from "./level-range-field";
import { MoneyField } from "./money-field";
import { ReviewCard, type ReviewRow } from "./review-card";
import type { StepProps } from "./step-props";
import { HelperNote, StepSection } from "./step-section";

const PRICE_COLUMNS = 4;
const SEGMENT_COLUMNS = 2;
const FREE_PRICE_COPY = "Zero means free. Temba does not collect payment.";

type DetailsProps = StepProps & {
  groupName: string | null;
  picker: CreateVenuePicker | null;
};

function PriceField({
  state,
  errors,
  dispatch,
  teamPrice = false,
}: StepProps & { teamPrice?: boolean }) {
  const { draft } = state;
  const teamPriceCopy = teamPrice
    ? gameTeamOfTwoCopy(draft.pricePerPlayer)
    : null;
  return (
    <StepSection title="Price per player" note="Optional">
      <MoneyField
        value={draft.pricePerPlayer}
        onChangeText={(price) => dispatch({ kind: "setPrice", price })}
        accessibilityLabel="Price per player in BD"
        error={errors.pricePerPlayerFils}
      />
      <ChipGrid
        label="Price per player"
        columns={PRICE_COLUMNS}
        selection="soft"
        chips={CREATE_FLOW_PRICE_CHIPS.map((chip) => ({
          value: chip.value,
          label: chip.label,
        }))}
        isSelected={(value) => priceChipIsSelected(value, draft.pricePerPlayer)}
        onSelect={(price) => dispatch({ kind: "setPrice", price })}
      />
      <HelperNote>
        {teamPriceCopy
          ? `${teamPriceCopy}. ${FREE_PRICE_COPY}`
          : FREE_PRICE_COPY}
      </HelperNote>
    </StepSection>
  );
}

export function GameDetailsStep(props: DetailsProps) {
  const { state, groupName, picker } = props;
  const { draft } = state;
  const venue = picker?.venues.find((item) => item.id === draft.venueId);
  const court =
    draft.courtId === "none"
      ? undefined
      : venue?.courts.find((item) => item.id === draft.courtId);
  const venueName = venue?.name ?? "Venue";

  return (
    <View style={{ gap: spacing.section }}>
      <LevelRangeField {...props} />
      <PriceField {...props} />
      <ReviewCard
        rows={[
          { label: "Group", value: groupName ?? "Group" },
          {
            label: "Venue",
            value: court ? `${venueName}, ${court.name}` : venueName,
          },
          { label: "Seats", value: CREATE_FLOW_OPEN_SEATS_LABEL },
        ]}
      />
    </View>
  );
}

function WhoCanEnter(props: StepProps) {
  const { state, dispatch } = props;
  const { draft } = state;
  const showRange =
    draft.preferLevelRange ||
    draft.levelMin !== LEVEL_BAND_SELECT_NONE ||
    draft.levelMax !== LEVEL_BAND_SELECT_NONE;
  return (
    <StepSection title="Who can enter" note="Optional">
      <ChipGrid
        label="Who can enter"
        columns={SEGMENT_COLUMNS}
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
      {showRange ? <LevelRangeRows {...props} openLink={false} /> : null}
      <LevelRangeHelper />
    </StepSection>
  );
}

function tournamentReviewRows({
  state,
  groupName,
  picker,
}: DetailsProps): ReviewRow[] {
  const { draft } = state;
  const { sizing, knockoutTree, poolKnockoutTree, knockoutOnly } =
    friendlyTournamentPlan(draft);
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
  const knockout = knockoutTree
    ? knockoutOnlyReviewValue(knockoutTree)
    : poolKnockoutTree && sizing
      ? groupsThenKnockoutReviewValue({
          tree: poolKnockoutTree,
          poolCount: sizing.poolCount,
          qualifiersPerPool: draft.qualifiersPerPool,
        })
      : null;

  return [
    { label: "Group", value: groupName ?? "Group" },
    { label: "Venue", value: venue?.name ?? "Venue" },
    {
      label: TOURNAMENT_FORMAT_LABEL,
      value: knockoutOnly
        ? KNOCKOUT_ONLY_FORMAT_LABEL
        : friendlyTournamentFormatLabel(
            sizing?.poolCount ?? draft.poolCount,
            poolKnockoutTree != null,
          ),
    },
    ...(knockout ? [{ label: KNOCKOUT_REVIEW_LABEL, value: knockout }] : []),
    ...(sizing && rounds
      ? [
          {
            label: ROUNDS_LABEL,
            value: reviewRoundsValue(rounds.roundCount, sizing.roundCount),
          },
        ]
      : []),
    { label: "Courts", value: friendlyTournamentCourtsLabel(courtNames) },
    {
      label: "Game length",
      value: minutes.ok ? `${minutes.minutes} min` : "Game length",
    },
    { label: COUNTS_FOR_RATING_LABEL, value: COUNTS_FOR_RATING_YES },
  ];
}

export function TournamentDetailsStep(props: DetailsProps) {
  const { state, errors, dispatch, groupName } = props;
  const { draft } = state;

  return (
    <View style={{ gap: spacing.section }}>
      <WhoCanEnter {...props} />
      <PriceField {...props} teamPrice />
      <StepSection title="Name">
        <TextField
          label="Tournament name"
          value={draft.name}
          onChangeText={(name) => dispatch({ kind: "setName", name })}
          error={errors.name}
        />
      </StepSection>
      <StepSection title={WHO_CAN_TAKE_A_SEAT_LABEL}>
        <ChipGrid
          label={WHO_CAN_TAKE_A_SEAT_LABEL}
          columns={SEGMENT_COLUMNS}
          chips={[
            { value: "group", label: groupName ?? "Group" },
            { value: "public", label: ANYONE_WITH_THE_LINK_LABEL },
          ]}
          isSelected={(value) => (value === "public") === draft.isPublic}
          onSelect={(value) =>
            dispatch({ kind: "setPublic", isPublic: value === "public" })
          }
        />
      </StepSection>
      <StepSection title={HOW_PEOPLE_JOIN_LABEL}>
        <ChipGrid
          label={HOW_PEOPLE_JOIN_LABEL}
          columns={SEGMENT_COLUMNS}
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
      </StepSection>
      <ReviewCard rows={tournamentReviewRows(props)} />
    </View>
  );
}
