import { spacing } from "@repo/design-tokens";
import { priceChipIsSelected } from "@repo/domain/create-game-flow";
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
import { LevelRangeField } from "./level-range-field";
import { MoneyField } from "./money-field";
import { ReviewCard } from "./review-card";
import { StepFooter, StepShell } from "./step-shell";
import { HelperNote, StepSection } from "./step-section";

const COST_COLUMNS = 2;

function initialBookingGameState(now: Date): CreateState {
  return { ...initialCreateState(now, undefined, "friendly_game"), step: 4 };
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
  const [state, dispatch] = useReducer(
    createReducer,
    now,
    initialBookingGameState,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const createGame = api.bookings.createGame.useMutation({
    onSuccess: async ({ gameId }) => {
      toast.show("Game created");
      await Promise.all([
        utils.bookings.byId.invalidate({ bookingId: booking.id }),
        utils.bookings.listMine.invalidate(),
        utils.games.listMyGames.invalidate(),
        utils.users.home.invalidate(),
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
    const request = bookingGameRequest(booking.id, state.draft);
    if (!request.ok) {
      setErrors(request.errors);
      return;
    }
    createGame.mutate(request.input);
  }, [booking.id, createGame, state.draft]);

  const perSeat = splitCourtCost(booking.priceFils);
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
        <StepSection title="Court cost" note="Optional">
          <ChipGrid
            label="Court cost"
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
            Shown to players as the price per seat. Temba does not collect it.
          </HelperNote>
        </StepSection>
        <LevelRangeField {...step} />
        <ReviewCard rows={bookingGameReviewRows(booking)} />
      </View>
    </StepShell>
  );
}
