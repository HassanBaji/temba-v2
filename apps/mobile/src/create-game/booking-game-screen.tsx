import { PADEL_FRIENDLY_GAME_PLAYERS } from "@repo/domain/game-payments";
import { spacing } from "@repo/design-tokens";
import {
  createRatingChoice,
  createRatingChoiceShown,
  priceChipIsSelected,
} from "@repo/domain/create-game-flow";
import type { Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { useRouter } from "expo-router";
import { useCallback, useReducer, useState } from "react";
import { View } from "react-native";

import { bookingPath } from "../booking/booking-model";
import { gamePath } from "../games/games-model";
import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { FormErrorSummary } from "../auth/form-error-summary";
import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import {
  bookingGameHeader,
  bookingGameRequest,
  bookingGameReviewRows,
  bookingGameSport,
  splitCourtCost,
  type BookingGameSource,
} from "./booking-game-model";
import { ChipGrid } from "./chips";
import { createEntryHeader } from "./create-header";
import {
  createReducer,
  initialCreateState,
  type CreateState,
  type FieldErrors,
} from "./create-model";
import { FootballSizeFields } from "./football-size-fields";
import { GroupField, groupLabel } from "./group-field";
import { LevelRangeField } from "./level-range-field";
import { MoneyField } from "./money-field";
import { PaymentTrackingField } from "./payment-tracking-field";
import { RatingField } from "./rating-field";
import { ReviewCard } from "./review-card";
import { StepFooter, StepShell } from "./step-shell";
import { HelperNote, StepSection } from "./step-section";

const COST_COLUMNS = 2;

function initialBookingGameState(init: {
  now: Date;
  sport: Sport;
  locale: Locale;
}): CreateState {
  return {
    ...initialCreateState(init.now, init.locale, undefined, "friendly_game"),
    sport: init.sport,
    step: 4,
  };
}

export function BookingGameScreen({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const locale = useLocale();
  const m = useMessages();
  const booking = api.bookings.byId.useQuery({ bookingId });
  const fallback = bookingPath(bookingId);

  if (!booking.data) {
    return (
      <StepShell
        step={null}
        header={createEntryHeader(locale)}
        fallback={fallback}
      >
        {booking.error ? (
          <Surface accessibilityRole="alert" style={{ gap: 8 }}>
            <Text size="lead" weight="semibold">
              {m.mobileCreateGame.bookingGame.loadFailedTitle}
            </Text>
            <Text size="meta" tone="muted">
              {booking.error.message}
            </Text>
            <Button
              label={m.common.tryAgain}
              variant="outline"
              onPress={() => void booking.refetch()}
            />
          </Surface>
        ) : (
          <View style={{ gap: 12 }}>
            <Skeleton height={120} />
            <Skeleton height={56} />
          </View>
        )}
      </StepShell>
    );
  }

  if (!booking.data.canCreateGame) {
    return (
      <StepShell
        step={null}
        header={createEntryHeader(locale)}
        fallback={fallback}
      >
        <Surface style={{ gap: 8 }}>
          <Text size="lead" weight="semibold">
            {m.mobileCreateGame.bookingGame.unavailableTitle}
          </Text>
          <Text size="meta" tone="muted">
            {m.mobileCreateGame.bookingGame.unavailableBody}
          </Text>
          <Button
            label={m.mobileCreateGame.bookingGame.backToBooking}
            variant="outline"
            onPress={() => router.back()}
          />
        </Surface>
      </StepShell>
    );
  }

  return <BookingGameForm booking={booking.data} />;
}

function BookingGameForm({ booking }: { booking: BookingGameSource }) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const now = useNow();
  const locale = useLocale();
  const m = useMessages();
  const copy = m.mobileCreateGame.bookingGame;
  const sport = bookingGameSport(booking);
  const football = sport === "football";
  const [state, dispatch] = useReducer(
    createReducer,
    { now, sport, locale },
    initialBookingGameState,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const groups = api.games.listCreateGroups.useQuery();
  const sportGroups = (groups.data ?? []).filter(
    (group) => group.sport === sport,
  );
  const selectedGroup = sportGroups.find(
    (group) => group.id === state.draft.groupId,
  );
  const groupVerified = selectedGroup?.verified ?? false;
  const ratingShown = createRatingChoiceShown({
    sport,
    hasGroup: Boolean(selectedGroup),
    groupVerified,
  });
  const ratingScope = createRatingChoice({
    groupVerified,
    rated: ratingShown && state.draft.rated,
    locale,
    sport,
  }).scope;

  const createGame = api.bookings.createGame.useMutation({
    onSuccess: async ({ gameId }) => {
      toast.show(m.mobileCreateGame.toast.gameCreated);
      await Promise.all([
        utils.bookings.byId.invalidate({ bookingId: booking.id }),
        utils.bookings.listMine.invalidate(),
        utils.games.listMyGames.invalidate(),
        utils.users.home.invalidate(),
        state.draft.groupId
          ? utils.groups.byId.invalidate({ id: state.draft.groupId })
          : Promise.resolve(),
      ]);
      router.replace(gamePath(gameId));
    },
    onError: (error) => {
      const { fieldErrors, globalMessage } = splitTrpcFormError(error);
      setErrors(fieldErrors);
      setFormMessage(globalMessage);
      toast.show(globalMessage ?? error.message);
    },
  });

  const onDispatch = useCallback((action: Parameters<typeof dispatch>[0]) => {
    setErrors({});
    setFormMessage(null);
    dispatch(action);
  }, []);

  const onCreate = useCallback(() => {
    if (createGame.isPending) {
      return;
    }
    const request = bookingGameRequest(booking.id, state.draft, locale, sport);
    if (!request.ok) {
      setErrors(request.errors);
      return;
    }
    createGame.mutate(request.input);
  }, [booking.id, createGame, locale, sport, state.draft]);

  const perSeat = splitCourtCost(
    booking.priceFils,
    football ? state.draft.playersAllowed : undefined,
  );
  const step = { state, now, errors, dispatch: onDispatch };
  const costTitle = football ? copy.pitchCost : copy.courtCost;

  return (
    <StepShell
      step={null}
      header={bookingGameHeader(booking, now, locale)}
      fallback={bookingPath(booking.id)}
      footer={
        <StepFooter
          state={state}
          pending={createGame.isPending}
          onContinue={onCreate}
          onCancel={() => router.back()}
        />
      }
    >
      <FormErrorSummary message={formMessage} />
      <View style={{ gap: spacing.section }}>
        {sportGroups.length > 0 ? (
          <GroupField
            groups={sportGroups}
            groupId={state.draft.groupId}
            error={errors.groupId}
            noneLabel={m.mobileCreateGame.group.none}
            onSelect={(groupId) =>
              onDispatch({ kind: "setGroup", groupId, sport })
            }
          />
        ) : null}
        {football ? <FootballSizeFields {...step} /> : null}
        <StepSection title={costTitle} note={m.common.optional}>
          <ChipGrid
            label={costTitle}
            columns={COST_COLUMNS}
            chips={[
              { value: "0", label: copy.coverIt },
              { value: perSeat, label: copy.splitEach(perSeat) },
            ]}
            isSelected={(value) =>
              priceChipIsSelected(value, state.draft.pricePerPlayer)
            }
            onSelect={(price) => onDispatch({ kind: "setPrice", price })}
          />
          <MoneyField
            value={state.draft.pricePerPlayer}
            onChangeText={(price) => onDispatch({ kind: "setPrice", price })}
            accessibilityLabel={m.mobileCreateGame.price.inputLabel}
            error={errors.pricePerPlayerFils}
          />
          <HelperNote>
            {football ? copy.priceNotePlayer : copy.priceNoteSeat}
          </HelperNote>
        </StepSection>
        <PaymentTrackingField
          state={state}
          dispatch={onDispatch}
          football={football}
          playersAllowed={
            football ? state.draft.playersAllowed : PADEL_FRIENDLY_GAME_PLAYERS
          }
        />
        {football ? null : <LevelRangeField {...step} />}
        {ratingShown ? (
          <RatingField
            groupVerified={groupVerified}
            sport={sport}
            rated={state.draft.rated}
            onRated={(rated) => onDispatch({ kind: "setRated", rated })}
          />
        ) : null}
        <ReviewCard
          rows={bookingGameReviewRows(
            booking,
            locale,
            {
              sideSize: state.draft.sideSize,
              playersAllowed: state.draft.playersAllowed,
            },
            selectedGroup
              ? {
                  name: groupLabel(selectedGroup, locale),
                  ratingScope,
                }
              : null,
          )}
        />
      </View>
    </StepShell>
  );
}
