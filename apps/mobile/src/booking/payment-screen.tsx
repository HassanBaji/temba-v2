import { colors, radii, sizes } from "@repo/design-tokens";
import { courtFace } from "@repo/domain/court-sport-copy";
import {
  isOnlinePaymentMethod,
  type OnlinePaymentMethod,
} from "@repo/domain/booking-payment";
import { formatGameClock } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  ExternalLink,
  Lock,
  RotateCw,
  TimerOff,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ConfirmSheet } from "../game-details/confirm-sheet";
import { Button } from "../primitives/button";
import { ChoiceCard } from "../primitives/choice-card";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { HeaderIconButton, ScreenHeader } from "../primitives/screen-header";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api, type RouterOutputs } from "../trpc/react";
import { courtNounTitle } from "./book-sport";
import { BookingHero, Notice, PAYMENT_METHOD_ICONS } from "./booking-parts";
import {
  bookingPath,
  bookingRef,
  checkoutMethods,
  minutesBetween,
  paymentMethod,
  untilLabel,
  venuePath,
  whenLine,
} from "./booking-model";
import {
  PAYMENT_POLL_MS,
  holdCountdown,
  isSlowWait,
  methodName,
  paymentCopy,
  paymentView,
  retryMethods,
  shouldPoll,
  type PaymentCopy,
  type PaymentView,
} from "./payment-model";

type Booking = RouterOutputs["bookings"]["byId"];

const COUNTDOWN_TICK_MS = 1000;
const MARK_SIZE = 84;
const MARK_ICON = { waiting: 26, settled: 30 } as const;
const SPINNER_STROKE = 1.5;
const SPIN_MS = 1100;
const STATUS_DOT = 7;
const COPY_WIDTH = 300;
const CARD_GAP = 22;

function useSecondClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function isWaiting(view: PaymentView | null) {
  return view?.kind === "open" || view?.kind === "checking";
}

export function PaymentScreen({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const now = useSecondClock();
  const opened = useRef<string | null>(null);
  const finished = useRef(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [waitingSince, setWaitingSince] = useState<Date | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const booking = api.bookings.byId.useQuery({ bookingId });
  const venueId = booking.data?.venue.id;

  function leaveForVenue() {
    if (booking.data) {
      router.replace(
        venuePath(booking.data.venue.id, booking.data.court.sport),
      );
    } else {
      router.dismissTo("/book");
    }
  }

  const venue = api.bookings.venueForBooking.useQuery(
    { venueId: venueId ?? "" },
    { enabled: venueId !== undefined },
  );
  const state = api.bookings.paymentState.useQuery(
    { bookingId },
    {
      refetchInterval: (query) =>
        shouldPoll(query.state.data) && !browserOpen ? PAYMENT_POLL_MS : false,
    },
  );
  const confirm = api.bookings.confirmPayment.useMutation();
  const retry = api.bookings.retryPayment.useMutation({
    onSuccess: () => {
      setChoosing(false);
      void state.refetch();
    },
    onError: (error) => toast.show(error.message),
  });
  const cancel = api.bookings.cancel.useMutation({
    onSuccess: async () => {
      setReleasing(false);
      finished.current = true;
      toast.show(
        `${booking.data ? courtNounTitle(booking.data.court.sport) : "Court"} released`,
      );
      await Promise.all([
        utils.bookings.listMine.invalidate(),
        utils.bookings.venueAvailability.invalidate(),
      ]);
      leaveForVenue();
    },
    onError: (error) => {
      setReleasing(false);
      toast.show(error.message);
    },
  });

  const view = state.data ? paymentView(state.data) : null;
  const method = state.data?.method ?? null;

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

  const checkStatus = useCallback(async () => {
    setWaitingSince(new Date());
    await confirm.mutateAsync({ bookingId }).catch(() => undefined);
    await state.refetch();
  }, [bookingId, confirm, state]);

  useEffect(() => {
    if (view?.kind === "open" && opened.current !== view.redirectUrl) {
      void openPage(view.redirectUrl);
    }
    if (view?.kind === "done" && !finished.current) {
      finished.current = true;
      void utils.bookings.listMine.invalidate();
      void utils.bookings.byId.invalidate({ bookingId });
      router.replace(`${bookingPath(bookingId)}/booked`);
    }
  }, [view, openPage, router, utils, bookingId]);

  const viewKind = view?.kind;
  useEffect(() => {
    setWaitingSince(
      viewKind === "open" || viewKind === "checking" ? new Date() : null,
    );
  }, [viewKind]);

  if (!booking.data) {
    return (
      <Screen>
        <ScreenHeader nav="close" fallback="/book" />
        {booking.error ? (
          <Notice
            title="Payment could not be loaded"
            description={booking.error.message}
            actionLabel="Try again"
            onAction={() => void booking.refetch()}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Skeleton height={160} />
            <Skeleton height={120} />
          </View>
        )}
      </Screen>
    );
  }

  const data = booking.data;
  const price = formatBookingPriceFils(data.priceFils);
  const name = methodName(method);
  const countdown = holdCountdown(state.data?.holdExpiresAt ?? null, now);
  const slow = isWaiting(view) && isSlowWait(waitingSince, now);
  const shown = view ?? { kind: "preparing" as const };
  const status = shown.kind === "done" ? null : shown;
  const copy = status ? paymentCopy(status, { method, slow }) : null;
  const alternatives = venue.data
    ? retryMethods(checkoutMethods(venue.data.payment, Platform.OS))
    : [];
  const canSwitch = alternatives.some((entry) => entry !== method);
  const release = (
    <LinkButton
      label="Cancel and release the slot"
      onPress={() => setReleasing(true)}
    />
  );

  return (
    <Screen
      statusBarTone="ink"
      header={
        <BookingHero
          nav="close"
          fallback="/book"
          aside={
            countdown && view?.kind !== "expired" ? (
              <HoldLine countdown={countdown} />
            ) : null
          }
          eyebrow={`${data.venue.name} / ${bookingRef(data.id)}`}
          time={formatGameClock(data.startsAt)}
          until={untilLabel(data.endsAt)}
          subtitle={[
            whenLine(
              data.startsAt,
              minutesBetween(data.startsAt, data.endsAt),
              now,
            ),
            data.court.name,
          ].join(" / ")}
        />
      }
      footer={
        <View style={{ flex: 1, gap: 10 }}>
          {view?.kind === "open" ? (
            <>
              <Button
                label={name ? `Open ${name} again` : "Open payment page again"}
                size="lg"
                disabled={browserOpen}
                icon={
                  <ExternalLink size={sizes.iconRow} color={colors.paper} />
                }
                onPress={() => void openPage(view.redirectUrl)}
              />
              <Button
                label={slow ? "Check status now" : "I have paid, check status"}
                size="lg"
                variant="outline"
                pending={confirm.isPending}
                onPress={() => void checkStatus()}
              />
              {release}
            </>
          ) : view?.kind === "checking" ? (
            <>
              <Button
                label="Check status now"
                size="lg"
                variant="outline"
                pending={confirm.isPending}
                onPress={() => void checkStatus()}
              />
              {release}
            </>
          ) : view?.kind === "failed" ? (
            <>
              <Button
                label={name ? `Try ${name} again` : "Try again"}
                size="lg"
                pending={retry.isPending && !choosing}
                icon={<RotateCw size={sizes.iconRow} color={colors.paper} />}
                onPress={() => retry.mutate({ bookingId })}
              />
              {canSwitch ? (
                <Button
                  label="Pay another way"
                  size="lg"
                  variant="outline"
                  onPress={() => setChoosing(true)}
                />
              ) : null}
              {release}
            </>
          ) : view?.kind === "expired" ? (
            <Button label="Pick a time" size="lg" onPress={leaveForVenue} />
          ) : (
            release
          )}
        </View>
      }
    >
      {state.error ? (
        <Notice
          title="Payment could not be checked"
          description={state.error.message}
          actionLabel="Try again"
          onAction={() => void state.refetch()}
        />
      ) : status && copy ? (
        <StatusBody
          view={status}
          copy={copy}
          method={method}
          methodLabel={name}
          price={price}
        />
      ) : null}

      <AnotherWaySheet
        visible={choosing}
        methods={alternatives}
        failed={method}
        price={price}
        countdown={countdown}
        pending={retry.isPending}
        onClose={() => setChoosing(false)}
        onPay={(paymentMethod) => retry.mutate({ bookingId, paymentMethod })}
      />
      <ConfirmSheet
        request={
          releasing
            ? releaseRequest(data, () => cancel.mutate({ bookingId }))
            : null
        }
        pending={cancel.isPending}
        onClose={() => setReleasing(false)}
      />
    </Screen>
  );
}

function releaseRequest(booking: Booking, onConfirm: () => void) {
  const face = courtFace(booking.court.sport);
  return {
    title: `Release this ${face}?`,
    description: `Your booking is cancelled and the ${face} goes back on sale for others.`,
    confirmLabel: `Release ${face}`,
    cancelLabel: "Keep paying",
    onConfirm,
  };
}

function HoldLine({ countdown }: { countdown: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`Slot held for ${countdown}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
    >
      <Lock size={12} color={colors.dim} />
      <Text size="eyebrow" mono uppercase tone="muted">
        {`Slot held ${countdown}`}
      </Text>
    </View>
  );
}

function StatusBody({
  view,
  copy,
  method,
  methodLabel,
  price,
}: {
  view: Exclude<PaymentView, { kind: "done" }>;
  copy: PaymentCopy;
  method: string | null;
  methodLabel: string | null;
  price: string;
}) {
  const MethodIcon = methodIcon(method);
  const waiting = view.kind !== "failed" && view.kind !== "expired";

  return (
    <View style={{ alignItems: "center", gap: CARD_GAP }}>
      <View style={{ alignItems: "center", gap: 10 }}>
        <View style={{ marginBottom: 6 }}>
          <StatusMark
            spinning={waiting}
            icon={
              view.kind === "failed"
                ? X
                : view.kind === "expired"
                  ? TimerOff
                  : MethodIcon
            }
          />
        </View>
        <Text
          size="h1Lg"
          width="expanded"
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          style={{ textAlign: "center" }}
        >
          {copy.title}
        </Text>
        <Text
          size="meta"
          tone="muted"
          style={{ textAlign: "center", maxWidth: COPY_WIDTH }}
        >
          {copy.body}
        </Text>
      </View>

      {view.kind === "expired" ? null : (
        <View style={{ alignSelf: "stretch", gap: 14 }}>
          <View
            style={{
              borderWidth: hairline,
              borderColor: colors.rule,
              borderRadius: radii.card,
              padding: 14,
              gap: 10,
            }}
          >
            <CardRow label={waiting ? "Paying with" : "Tried"}>
              <MethodIcon size={14} color={colors.ink} />
              <Text size="meta">{methodLabel ?? "Payment page"}</Text>
            </CardRow>
            <CardRow label={waiting ? "Amount" : "Still to pay"}>
              <Text weight="semibold">{price}</Text>
            </CardRow>
            {copy.status ? (
              <CardRow label="Status" ruled>
                <View
                  style={{
                    width: STATUS_DOT,
                    height: STATUS_DOT,
                    borderRadius: STATUS_DOT / 2,
                    backgroundColor: colors.ink,
                  }}
                />
                <Text size="meta">{copy.status}</Text>
              </CardRow>
            ) : null}
          </View>
          {copy.hint ? (
            <Text
              size="eyebrow"
              tone="muted"
              style={{
                textAlign: "center",
                alignSelf: "center",
                maxWidth: COPY_WIDTH,
              }}
            >
              {copy.hint}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function methodIcon(method: string | null): LucideIcon {
  return isOnlinePaymentMethod(method)
    ? PAYMENT_METHOD_ICONS[method]
    : PAYMENT_METHOD_ICONS.card;
}

function CardRow({
  label,
  ruled = false,
  children,
}: {
  label: string;
  ruled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        paddingTop: ruled ? 10 : 0,
        borderTopWidth: ruled ? hairline : 0,
        borderTopColor: colors.rule,
      }}
    >
      <Text size="meta" tone="muted">
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flexShrink: 1,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** A ring around the method's icon: spinning while the screen waits. */
function StatusMark({
  spinning,
  icon: Icon,
}: {
  spinning: boolean;
  icon: LucideIcon;
}) {
  const reducedMotion = useReducedMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    if (!spinning || reducedMotion) {
      cancelAnimation(turn);
      turn.value = 0;
      return undefined;
    }
    turn.value = withRepeat(
      withTiming(1, { duration: SPIN_MS, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(turn);
  }, [spinning, reducedMotion, turn]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 360}deg` }],
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        width: MARK_SIZE,
        height: MARK_SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: MARK_SIZE / 2,
            borderWidth: spinning ? SPINNER_STROKE : 1,
            borderColor: spinning ? colors.rule : colors.ink,
            borderTopColor: colors.ink,
          },
          ring,
        ]}
      />
      <Icon
        size={spinning ? MARK_ICON.waiting : MARK_ICON.settled}
        color={colors.ink}
      />
    </View>
  );
}

function LinkButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text size="meta" tone="muted">
        {label}
      </Text>
    </Pressable>
  );
}

function AnotherWaySheet({
  visible,
  methods,
  failed,
  price,
  countdown,
  pending,
  onClose,
  onPay,
}: {
  visible: boolean;
  methods: readonly OnlinePaymentMethod[];
  failed: string | null;
  price: string;
  countdown: string | null;
  pending: boolean;
  onClose: () => void;
  onPay: (method: OnlinePaymentMethod) => void;
}) {
  const [picked, setPicked] = useState<OnlinePaymentMethod | null>(null);
  const choice =
    (picked !== failed ? picked : null) ??
    methods.find((entry) => entry !== failed) ??
    null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Pay another way"
      subtitle={
        countdown ? `${price}. Your slot stays held for ${countdown}.` : price
      }
      action={
        <HeaderIconButton
          icon={X}
          accessibilityLabel="Close"
          onPress={onClose}
        />
      }
    >
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {methods.map((entry) => {
          const justFailed = entry === failed;
          return (
            <ChoiceCard
              key={entry}
              role="radio"
              variant="card"
              selected={entry === choice}
              disabled={justFailed}
              title={methodName(entry) ?? entry}
              description={
                justFailed ? "Just failed" : paymentMethod(entry).detail
              }
              leading={PAYMENT_METHOD_ICONS[entry]}
              onPress={() => setPicked(entry)}
            />
          );
        })}
      </View>
      <Text size="eyebrow" tone="muted">
        Each way to pay opens its own secure payment page.
      </Text>
      <Button
        label={choice ? `Pay ${price} with ${methodName(choice)}` : "Pay"}
        size="lg"
        disabled={choice === null}
        pending={pending}
        onPress={() => {
          if (choice) {
            onPay(choice);
          }
        }}
      />
    </Sheet>
  );
}
