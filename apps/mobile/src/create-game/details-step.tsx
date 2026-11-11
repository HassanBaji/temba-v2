import { spacing } from "@repo/design-tokens";
import {
  createFlowPriceChips,
  createFlowSeatsLabel,
  createRatingChoice,
  createRatingChoiceShown,
  friendlyTournamentCourtsLabel,
  friendlyTournamentFormatLabel,
  gameTeamOfTwoCopy,
  parseCreateMatchMinutes,
  priceChipIsSelected,
} from "@repo/domain/create-game-flow";
import type { CreateVenuePicker } from "@repo/domain/create-game-flow";
import { friendlyTournamentPlan } from "@repo/domain/create-game-submit";
import { unratedLabel } from "@repo/domain/game-rating-impact";
import { LEVEL_BAND_SELECT_NONE } from "@repo/domain/level-range";
import { mvpModeCopy, type MvpMode } from "@repo/domain/marks";
import type { Sport } from "@repo/domain/sport";
import { GAME_CUSTOM_NAME_MAX_LENGTH } from "@repo/domain/game-custom-name";
import {
  groupsThenKnockoutReviewValue,
  knockoutOnlyReviewValue,
} from "@repo/domain/tournament-knockout";
import {
  resolveRoundCount,
  reviewRoundsValue,
} from "@repo/domain/tournament-sizing";
import { sizeTournamentRounds } from "@repo/domain/tournament-schedule";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { TextField } from "../primitives/text-field";
import { ChipGrid } from "./chips";
import { FootballSizeFields } from "./football-size-fields";
import {
  LevelRangeField,
  LevelRangeHelper,
  LevelRangeRows,
} from "./level-range-field";
import { MoneyField } from "./money-field";
import { MvpModeField } from "./mvp-mode-field";
import { RatingField } from "./rating-field";
import { ReviewCard, type ReviewRow } from "./review-card";
import type { StepProps } from "./step-props";
import { HelperNote, StepSection } from "./step-section";

const PRICE_COLUMNS = 4;
const SEGMENT_COLUMNS = 2;

type DetailsProps = StepProps & {
  groupName: string | null;
  groupVerified: boolean;
  picker: CreateVenuePicker | null;
};

function PriceField({
  state,
  errors,
  dispatch,
  teamPrice = false,
}: StepProps & { teamPrice?: boolean }) {
  const { draft } = state;
  const locale = useLocale();
  const m = useMessages();
  const copy = m.mobileCreateGame.price;
  const teamPriceCopy = teamPrice
    ? gameTeamOfTwoCopy(draft.pricePerPlayer, locale)
    : null;
  return (
    <StepSection title={copy.title} note={m.common.optional}>
      <MoneyField
        value={draft.pricePerPlayer}
        onChangeText={(price) => dispatch({ kind: "setPrice", price })}
        accessibilityLabel={copy.inputLabel}
        error={errors.pricePerPlayerFils}
      />
      <ChipGrid
        label={copy.title}
        columns={PRICE_COLUMNS}
        selection="soft"
        chips={createFlowPriceChips(locale).map((chip) => ({
          value: chip.value,
          label: chip.label,
        }))}
        isSelected={(value) => priceChipIsSelected(value, draft.pricePerPlayer)}
        onSelect={(price) => dispatch({ kind: "setPrice", price })}
      />
      <HelperNote>
        {teamPriceCopy ? copy.teamFreeNote(teamPriceCopy) : copy.freeNote}
      </HelperNote>
    </StepSection>
  );
}

function CustomNameField({ state, errors, dispatch }: StepProps) {
  const m = useMessages();
  const copy = m.mobileCreateGame.name;
  return (
    <StepSection title={copy.title} note={m.common.optional}>
      <TextField
        label={copy.gameLabel}
        value={state.draft.customName}
        maxLength={GAME_CUSTOM_NAME_MAX_LENGTH}
        onChangeText={(customName) =>
          dispatch({ kind: "setCustomName", customName })
        }
        error={errors.customName}
      />
      <HelperNote>{copy.hint}</HelperNote>
    </StepSection>
  );
}

function FriendlyMvpField({ state, dispatch }: StepProps) {
  return (
    <MvpModeField
      mode={state.mvpMode}
      onSelect={(mode) => dispatch({ kind: "setMvpMode", mode })}
    />
  );
}

/** The MVP choice and when marks open, repeated on a Friendly game's review card. */
function mvpReviewRows(mode: MvpMode, locale: Locale): ReviewRow[] {
  const m = messagesFor(locale);
  return [
    { label: m.createGame.mvp.title, value: mvpModeCopy(mode, locale).label },
    { label: m.createGame.mvp.marks, value: m.marks.window.opensAfterScore },
  ];
}

function customNameReviewRows(customName: string, locale: Locale): ReviewRow[] {
  const trimmed = customName.trim();
  return trimmed
    ? [
        {
          label: messagesFor(locale).mobileCreateGame.review.name,
          value: trimmed,
        },
      ]
    : [];
}

export function FootballDetailsStep(props: DetailsProps) {
  const { state, groupName, picker } = props;
  const { draft } = state;
  const tierShown = createRatingChoiceShown({
    sport: "football",
    hasGroup: Boolean(draft.groupId),
    groupVerified: props.groupVerified,
  });
  const locale = useLocale();
  const m = useMessages();
  const review = m.mobileCreateGame.review;
  const venue = picker?.venues.find((item) => item.id === draft.venueId);
  const pitch =
    draft.courtId === "none"
      ? undefined
      : venue?.courts.find((item) => item.id === draft.courtId);
  const venueName = venue?.name ?? review.venue;

  return (
    <View style={{ gap: spacing.section }}>
      <CustomNameField {...props} />
      <FootballSizeFields {...props} />
      <PriceField {...props} />
      <FriendlyMvpField {...props} />
      {tierShown ? <DetailsRatingField {...props} sport="football" /> : null}
      <ReviewCard
        rows={[
          ...customNameReviewRows(draft.customName, locale),
          { label: review.group, value: groupName ?? review.group },
          { label: review.sport, value: m.common.football },
          {
            label: review.venue,
            value: pitch
              ? review.venueAndCourt(venueName, pitch.name)
              : venueName,
          },
          {
            label: review.size,
            value: createFlowSeatsLabel("football", draft, locale),
          },
          tierShown
            ? ratingReviewRow(props, locale, "football")
            : { label: review.rating, value: unratedLabel(locale) },
          ...mvpReviewRows(state.mvpMode, locale),
        ]}
      />
    </View>
  );
}

function DetailsRatingField({
  state,
  dispatch,
  groupVerified,
  sport,
}: DetailsProps & { sport?: Sport }) {
  return (
    <RatingField
      groupVerified={groupVerified}
      sport={sport}
      rated={state.draft.rated}
      onRated={(rated) => dispatch({ kind: "setRated", rated })}
    />
  );
}

function ratingReviewRow(
  { state, groupVerified }: DetailsProps,
  locale: Locale,
  sport?: Sport,
): ReviewRow {
  const choice = createRatingChoice({
    groupVerified,
    rated: state.draft.rated,
    locale,
    sport,
  });
  return {
    label: messagesFor(locale).mobileCreateGame.review.rating,
    value: choice.scopeLabel,
  };
}

export function GameDetailsStep(props: DetailsProps) {
  const { state, groupName, picker } = props;
  const { draft } = state;
  const locale = useLocale();
  const review = useMessages().mobileCreateGame.review;
  const venue = picker?.venues.find((item) => item.id === draft.venueId);
  const court =
    draft.courtId === "none"
      ? undefined
      : venue?.courts.find((item) => item.id === draft.courtId);
  const venueName = venue?.name ?? review.venue;

  return (
    <View style={{ gap: spacing.section }}>
      <CustomNameField {...props} />
      <LevelRangeField {...props} />
      <PriceField {...props} />
      <FriendlyMvpField {...props} />
      <DetailsRatingField {...props} />
      <ReviewCard
        rows={[
          ...customNameReviewRows(draft.customName, locale),
          { label: review.group, value: groupName ?? review.group },
          {
            label: review.venue,
            value: court
              ? review.venueAndCourt(venueName, court.name)
              : venueName,
          },
          {
            label: review.seats,
            value: createFlowSeatsLabel("padel", draft, locale),
          },
          ratingReviewRow(props, locale),
          ...mvpReviewRows(state.mvpMode, locale),
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
  const m = useMessages();
  const copy = m.mobileCreateGame.whoCanEnter;
  return (
    <StepSection title={copy.title} note={m.common.optional}>
      <ChipGrid
        label={copy.title}
        columns={SEGMENT_COLUMNS}
        chips={[
          { value: "anyone", label: copy.anyone },
          { value: "range", label: copy.setRange },
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

function tournamentReviewRows(
  props: DetailsProps,
  locale: Locale,
): ReviewRow[] {
  const { state, groupName, picker } = props;
  const { draft } = state;
  const m = messagesFor(locale);
  const review = m.mobileCreateGame.review;
  const { sizing, knockoutTree, poolKnockoutTree, knockoutOnly } =
    friendlyTournamentPlan(draft);
  const venue = picker?.venues.find((item) => item.id === draft.venueId);
  const courtNames =
    venue?.courts
      .filter((item) => draft.courtIds.includes(item.id))
      .map((item) => item.name) ?? [];
  const minutes = parseCreateMatchMinutes(draft.matchMinutes, locale);
  const resolvedRounds = sizing
    ? resolveRoundCount(sizing.poolSizes, draft.roundCount)
    : null;
  const rounds =
    sizing && resolvedRounds != null
      ? sizeTournamentRounds(sizing.poolSizes, resolvedRounds)
      : null;
  const knockout = knockoutTree
    ? knockoutOnlyReviewValue(knockoutTree, locale)
    : poolKnockoutTree && sizing
      ? groupsThenKnockoutReviewValue({
          tree: poolKnockoutTree,
          poolCount: sizing.poolCount,
          qualifiersPerPool: draft.qualifiersPerPool,
          locale,
        })
      : null;

  return [
    { label: review.group, value: groupName ?? review.group },
    { label: review.venue, value: venue?.name ?? review.venue },
    {
      label: m.createGame.tournamentFormat,
      value: knockoutOnly
        ? m.createGame.knockoutOnly
        : friendlyTournamentFormatLabel(
            sizing?.poolCount ?? draft.poolCount,
            locale,
            poolKnockoutTree != null,
          ),
    },
    ...(knockout ? [{ label: m.createGame.knockout, value: knockout }] : []),
    ...(sizing && rounds
      ? [
          {
            label: m.tournament.sizing.roundsLabel,
            value: reviewRoundsValue(
              rounds.roundCount,
              sizing.roundCount,
              locale,
            ),
          },
        ]
      : []),
    {
      label: review.courts,
      value: friendlyTournamentCourtsLabel(courtNames, locale),
    },
    {
      label: review.gameLength,
      value: minutes.ok ? m.dates.minutes(minutes.minutes) : review.gameLength,
    },
    ratingReviewRow(props, locale),
  ];
}

export function TournamentDetailsStep(props: DetailsProps) {
  const { state, errors, dispatch, groupName, groupVerified } = props;
  const { draft } = state;
  const locale = useLocale();
  const m = useMessages();
  const sizingCopy = m.tournament.sizing;

  return (
    <View style={{ gap: spacing.section }}>
      <WhoCanEnter {...props} />
      <PriceField {...props} teamPrice />
      <StepSection title={m.mobileCreateGame.name.title}>
        <TextField
          label={m.mobileCreateGame.name.tournamentLabel}
          value={draft.name}
          onChangeText={(name) => dispatch({ kind: "setName", name })}
          error={errors.name}
        />
      </StepSection>
      <StepSection title={sizingCopy.whoCanTakeASeat}>
        <ChipGrid
          label={sizingCopy.whoCanTakeASeat}
          columns={SEGMENT_COLUMNS}
          chips={[
            {
              value: "group",
              label: groupName ?? m.mobileCreateGame.review.group,
            },
            ...(groupVerified
              ? [{ value: "public", label: sizingCopy.anyoneWithTheLink }]
              : []),
          ]}
          isSelected={(value) => (value === "public") === draft.isPublic}
          onSelect={(value) =>
            dispatch({ kind: "setPublic", isPublic: value === "public" })
          }
        />
      </StepSection>
      <DetailsRatingField {...props} />
      <StepSection title={sizingCopy.howPeopleJoin}>
        <ChipGrid
          label={sizingCopy.howPeopleJoin}
          columns={SEGMENT_COLUMNS}
          chips={[
            { value: "solo", label: sizingCopy.aloneOrWithPartner },
            { value: "pair", label: sizingCopy.withPartnerOnly },
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
      <ReviewCard rows={tournamentReviewRows(props, locale)} />
    </View>
  );
}
