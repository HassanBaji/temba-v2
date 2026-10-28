import { spacing } from "@repo/design-tokens";
import { priceChipIsSelected } from "@repo/domain/create-game-flow";
import type { Sport } from "@repo/domain/sport";
import { useRouter } from "expo-router";
import { useCallback, useReducer, useState } from "react";
import { View } from "react-native";

import { bookingPath } from "../booking/booking-model";
import { gamePath } from "../games/games-model";
import { useNow } from "../games/use-now";
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
import { CREATE_ENTRY_HEADER } from "./create-header";
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
import { ReviewCard } from "./review-card";
import { StepFooter, StepShell } from "./step-shell";
import { HelperNote, StepSection } from "./step-section";

const COST_COLUMNS = 2;

function initialBookingGameState(init: {
  now: Date;
  sport: Sport;
}): CreateState {
  return {
    ...initialCreateState(init.now, undefined, "friendly_game"),
    sport: init.sport,
    step: 4,
  };
}

export function BookingGameScreen({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const booking = api.bookings.byId.useQuery({ bookingId });
  const fallback = bookingPath(bookingId);

  if (!booking.data) {
    return (
      <StepShell step={null} header={CREATE_ENTRY_HEADER} fallback={fallback}>
        {booking.error ? (
          <Surface accessibilityRole="alert" style={{ gap: 8 }}>
            <Text size="lead" weight="semibold">
              Booking could not be loaded
            </Text>
            <Text size="meta" tone="muted">
              {booking.error.message}
            </Text>
            <Button
              label="Try again"
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
      <StepShell step={null} header={CREATE_ENTRY_HEADER} fallback={fallback}>
        <Surface style={{ gap: 8 }}>
          <Text size="lead" weight="semibold">
            This booking can&apos;t have a new game
          </Text>
          <Text size="meta" tone="muted">
            A game needs a confirmed, upcoming booking that you hold and that
            has no game yet.
          </Text>
          <Button
            label="Back to booking"
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
  const sport = bookingGameSport(booking);
  const football = sport === "football";
  const [state, dispatch] = useReducer(
    createReducer,
    { now, sport },
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

  const createGame = api.bookings.createGame.useMutation({
    onSuccess: async ({ gameId }) => {
      toast.show("Game created");
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
    const request = bookingGameRequest(booking.id, state.draft, sport);
    if (!request.ok) {
      setErrors(request.errors);
      return;
    }
    createGame.mutate(request.input);
  }, [booking.id, createGame, sport, state.draft]);

  const perSeat = splitCourtCost(
    booking.priceFils,
    football ? state.draft.playersAllowed : undefined,
  );
  const step = { state, now, errors, dispatch: onDispatch };

  return (
    <StepShell
      step={null}
      header={bookingGameHeader(booking, now)}
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
            noneLabel="No group"
            onSelect={(groupId) =>
              onDispatch({ kind: "setGroup", groupId, sport })
            }
          />
        ) : null}
        {football ? <FootballSizeFields {...step} /> : null}
        <StepSection
          title={football ? "Pitch cost" : "Court cost"}
          note="Optional"
        >
          <ChipGrid
            label={football ? "Pitch cost" : "Court cost"}
            columns={COST_COLUMNS}
            chips={[
              { value: "0", label: "I cover it" },
              { value: perSeat, label: `Split, ${perSeat} each` },
            ]}
            isSelected={(value) =>
              priceChipIsSelected(value, state.draft.pricePerPlayer)
            }
            onSelect={(price) => onDispatch({ kind: "setPrice", price })}
          />
          <MoneyField
            value={state.draft.pricePerPlayer}
            onChangeText={(price) => onDispatch({ kind: "setPrice", price })}
            accessibilityLabel="Price per player in BD"
            error={errors.pricePerPlayerFils}
          />
          <HelperNote>
            {football
              ? "Shown to players as the price per player. Temba does not collect it."
              : "Shown to players as the price per seat. Temba does not collect it."}
          </HelperNote>
        </StepSection>
        {football ? null : <LevelRangeField {...step} />}
        <ReviewCard
          rows={bookingGameReviewRows(
            booking,
            {
              sideSize: state.draft.sideSize,
              playersAllowed: state.draft.playersAllowed,
            },
            selectedGroup
              ? {
                  name: groupLabel(selectedGroup),
                  rated: !football && selectedGroup.verified,
                }
              : null,
          )}
        />
      </View>
    </StepShell>
  );
}
