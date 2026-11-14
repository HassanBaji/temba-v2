import { radii } from "@repo/design-tokens";
import { createPaymentSummary } from "@repo/domain/game-payments";
import {
  formatMajorUnitsFromFils,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";
import type { Locale } from "@repo/i18n/locale";
import type { Messages } from "@repo/i18n/messages";
import { Hand, Wallet } from "lucide-react-native";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { SwitchRow } from "../profile-settings/settings-rows";
import { useColors } from "../theme/theme-provider";
import type { StepProps } from "./step-props";
import { StepSection } from "./step-section";

/**
 * Track payments, and on football whether keepers play free, shown only once
 * the Game has a price (design Payments 3a).
 */
export function PaymentTrackingField({
  state,
  dispatch,
  playersAllowed,
  football = false,
}: Pick<StepProps, "state" | "dispatch"> & {
  /** Seats that pay when the Game is full, before any keepers are left out. */
  playersAllowed: number;
  football?: boolean;
}) {
  const colors = useColors();
  const locale = useLocale();
  const m = useMessages();
  const copy = m.gamePayments.create;
  const { draft } = state;
  const price = parseOptionalPricePerPlayerFils(draft.pricePerPlayer, locale);
  const fils = price.ok ? (price.fils ?? 0) : 0;
  if (fils <= 0) {
    return null;
  }
  const summary = createPaymentSummary(
    {
      priceFils: fils,
      playersAllowed,
      football,
      keepersPlayFree: draft.keepersPlayFree,
    },
    locale,
  );

  return (
    <StepSection title={copy.whoPays}>
      <View
        style={{
          borderRadius: radii.card,
          borderWidth: hairline,
          borderColor: colors.rule,
          backgroundColor: colors.paper,
          overflow: "hidden",
        }}
      >
        <SwitchRow
          icon={Wallet}
          title={copy.trackTitle}
          sub={copy.trackDescription}
          value={draft.trackPayments}
          onChange={(trackPayments) =>
            dispatch({ kind: "setTrackPayments", trackPayments })
          }
        />
        {football && draft.trackPayments ? (
          <>
            <Hairline />
            <SwitchRow
              icon={Hand}
              title={copy.keepersTitle}
              sub={copy.keepersDescription}
              value={draft.keepersPlayFree}
              onChange={(keepersPlayFree) =>
                dispatch({ kind: "setKeepersPlayFree", keepersPlayFree })
              }
            />
          </>
        ) : null}
      </View>
      {draft.trackPayments ? (
        <View
          style={{
            backgroundColor: colors.wash,
            borderWidth: hairline,
            borderColor: colors.rule,
            borderRadius: radii.surface,
            paddingHorizontal: 18,
            paddingVertical: 16,
            gap: 6,
          }}
        >
          <Text size="eyebrow" tone="muted">
            {copy.toCollect}
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
          >
            <Text size="display" width="expanded" weight="bold">
              {formatMajorUnitsFromFils(summary.totalFils)}
            </Text>
            <Text tone="muted">{m.createGame.price.currency}</Text>
          </View>
          <View
            style={{
              marginTop: 6,
              paddingTop: 12,
              borderTopWidth: hairline,
              borderTopColor: colors.dimrule,
            }}
          >
            <Text size="meta" tone="muted">
              {summary.note}
            </Text>
          </View>
        </View>
      ) : (
        <Text size="eyebrow" tone="muted">
          {copy.notTracked}
        </Text>
      )}
    </StepSection>
  );
}

/** The review card's Payments row, once the Game has a price. */
export function paymentReviewValue(
  draft: StepProps["state"]["draft"],
  football: boolean,
  messages: Messages,
  locale: Locale,
) {
  const price = parseOptionalPricePerPlayerFils(draft.pricePerPlayer, locale);
  if (!price.ok || (price.fils ?? 0) <= 0) {
    return null;
  }
  const copy = messages.gamePayments.create;
  return {
    label: copy.reviewLabel,
    value: !draft.trackPayments
      ? copy.reviewNotTracked
      : football && draft.keepersPlayFree
        ? copy.reviewTrackedKeepersFree
        : copy.reviewTracked,
  };
}
