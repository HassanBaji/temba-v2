import { colors } from "@repo/design-tokens";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { Notice } from "./booking-parts";
import { bookingPath, venuePath } from "./booking-model";
import {
  PAYMENT_POLL_MS,
  holdCountdown,
  paymentView,
  shouldPoll,
} from "./payment-model";

const COUNTDOWN_TICK_MS = 1000;

function useSecondClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function PaymentScreen({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const now = useSecondClock();
  const opened = useRef<string | null>(null);
  const finished = useRef(false);
  const [browserOpen, setBrowserOpen] = useState(false);

  const booking = api.bookings.byId.useQuery({ bookingId });
  const state = api.bookings.paymentState.useQuery(
    { bookingId },
    {
      refetchInterval: (query) =>
        shouldPoll(query.state.data) && !browserOpen ? PAYMENT_POLL_MS : false,
    },
  );
  const confirm = api.bookings.confirmPayment.useMutation();
  const retry = api.bookings.retryPayment.useMutation({
    onSuccess: () => void state.refetch(),
    onError: (error) => toast.show(error.message),
  });

  const openPage = useCallback(
    async (redirectUrl: string) => {
      opened.current = redirectUrl;
      setBrowserOpen(true);
      try {
        await WebBrowser.openAuthSessionAsync(
          redirectUrl,
          Linking.createURL("book/bookings"),
        );
      } finally {
        setBrowserOpen(false);
      }
      await confirm.mutateAsync({ bookingId }).catch(() => undefined);
      await state.refetch();
    },
    [bookingId, confirm, state],
  );

  useEffect(() => {
    const next = state.data ? paymentView(state.data) : null;
    if (next?.kind === "open" && opened.current !== next.redirectUrl) {
      void openPage(next.redirectUrl);
    }
    if (next?.kind === "done" && !finished.current) {
      finished.current = true;
      void utils.bookings.listMine.invalidate();
      void utils.bookings.byId.invalidate({ bookingId });
      router.replace(`${bookingPath(bookingId)}/booked`);
    }
  }, [state.data, openPage, router, utils, bookingId]);

  const view = state.data ? paymentView(state.data) : null;

  const countdown = holdCountdown(state.data?.holdExpiresAt ?? null, now);
  const venueId = booking.data?.venue.id;

  return (
    <Screen>
      <ScreenHeader title="Payment" nav="close" fallback="/book" />
      {state.error ? (
        <Notice
          title="Payment could not be checked"
          description={state.error.message}
          actionLabel="Try again"
          onAction={() => void state.refetch()}
        />
      ) : view === null ||
        view.kind === "waiting" ||
        view.kind === "open" ||
        view.kind === "done" ? (
        <Surface style={{ gap: 12, alignItems: "flex-start" }}>
          <ActivityIndicator color={colors.ink} />
          <Text size="lead" weight="semibold" accessibilityLiveRegion="polite">
            {view?.kind === "waiting"
              ? view.title
              : view?.kind === "open"
                ? "Finish paying on the payment page"
                : "Preparing payment"}
          </Text>
          <Text size="meta" tone="muted">
            {view?.kind === "waiting"
              ? view.description
              : "Pay by card or BenefitPay, then come back here."}
          </Text>
          {view?.kind === "open" ? (
            <Button
              label="Open payment page"
              variant="outline"
              disabled={browserOpen}
              onPress={() => void openPage(view.redirectUrl)}
            />
          ) : null}
        </Surface>
      ) : view.kind === "failed" ? (
        <Notice
          title={view.title}
          description={view.description}
          actionLabel={retry.isPending ? "Retrying…" : "Try again"}
          onAction={() => retry.mutate({ bookingId })}
        />
      ) : (
        <Notice
          title={view.title}
          description={view.description}
          actionLabel="Pick a time"
          onAction={() =>
            venueId
              ? router.replace(venuePath(venueId))
              : router.replace("/book")
          }
        />
      )}
      {countdown && view?.kind !== "expired" ? (
        <View style={{ alignItems: "center" }}>
          <Text size="meta" tone="muted">
            {`Court held for ${countdown}`}
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
