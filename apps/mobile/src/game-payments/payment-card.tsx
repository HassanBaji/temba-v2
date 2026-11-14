import { radii } from "@repo/design-tokens";
import {
  paymentMark,
  viewerPaymentCard,
  type ViewerPayment,
} from "@repo/domain/game-payments";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { PaymentMarkIcon } from "./payment-mark";

const ROW_PADDING = { paddingHorizontal: 16, paddingVertical: 14 } as const;
const MARK_SIZE = 22;

export function PaymentSectionHead({
  title,
  meta,
}: {
  title: string;
  meta?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text size="title" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
      {meta ? (
        <Text size="meta" tone="muted">
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

export function PaymentBox({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.paper,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

function BoxFooter({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={{
        borderTopWidth: hairline,
        borderTopColor: colors.rule,
        paddingHorizontal: 16,
        paddingVertical: 11,
      }}
    >
      {children}
    </View>
  );
}

/** The viewer's share on a Game that tracks payments (design Payments 1a–1e, 3b). */
export function PaymentCard({
  payment,
  priceFils,
  pending,
  onClaim,
  onUnclaim,
}: {
  payment: ViewerPayment;
  priceFils: number;
  pending: boolean;
  onClaim: () => void;
  onUnclaim: () => void;
}) {
  const locale = useLocale();
  const m = useMessages().gamePayments;
  const now = useNow();
  const [sheetOpen, setSheetOpen] = useState(false);
  const card = viewerPaymentCard(payment, priceFils, locale, now);
  const price = formatPricePerPlayerFils(priceFils, locale) ?? "";
  const mark = paymentMark(payment.status, payment.free);
  const canClaim = card.kind === "due" || card.kind === "returned";

  return (
    <View style={{ gap: 10 }}>
      <PaymentSectionHead title={m.member.title} meta={m.member.each(price)} />
      <PaymentBox>
        <View
          style={{
            ...ROW_PADDING,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <PaymentMarkIcon mark={mark} size={MARK_SIZE} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text weight="semibold">{card.title}</Text>
            <Text size="eyebrow" tone="muted">
              {card.hint}
            </Text>
          </View>
          {canClaim ? (
            <Button
              label={m.member.claimAction}
              onPress={() => setSheetOpen(true)}
            />
          ) : null}
        </View>
        {card.kind === "claimed" ? (
          <BoxFooter>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 4 }}
            >
              <Text size="eyebrow" tone="muted">
                {m.member.undoPrompt}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={pending}
                hitSlop={8}
                onPress={onUnclaim}
              >
                <Text
                  size="eyebrow"
                  style={{ textDecorationLine: "underline" }}
                >
                  {m.member.undoAction}
                </Text>
              </Pressable>
            </View>
          </BoxFooter>
        ) : card.kind === "paid" ? null : (
          <BoxFooter>
            <Text size="eyebrow" tone="muted">
              {card.note}
            </Text>
          </BoxFooter>
        )}
      </PaymentBox>
      <ClaimSheet
        visible={sheetOpen}
        price={price}
        pending={pending}
        onClose={() => setSheetOpen(false)}
        onSubmit={() => {
          onClaim();
          setSheetOpen(false);
        }}
      />
    </View>
  );
}

/** One confirmation, then it goes to the Organizer (design Payments 1b). */
function ClaimSheet({
  visible,
  price,
  pending,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  price: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const colors = useColors();
  const m = useMessages().gamePayments.claimSheet;
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={m.title}
      subtitle={m.description}
      closeButton
    >
      <PaymentBox>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Text tone="muted">{m.amount}</Text>
          <Text weight="semibold">{price}</Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: hairline,
            borderTopColor: colors.rule,
          }}
        >
          <Text tone="muted">{m.to}</Text>
          <Text>{m.organizer}</Text>
        </View>
      </PaymentBox>
      <Text size="eyebrow" tone="muted">
        {m.note}
      </Text>
      <Button label={m.submit} size="lg" pending={pending} onPress={onSubmit} />
    </Sheet>
  );
}
