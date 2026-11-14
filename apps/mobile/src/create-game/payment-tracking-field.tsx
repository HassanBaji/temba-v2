import { radii, sizes } from "@repo/design-tokens";
import {
  createPaymentSummary,
  formatPaymentFigure,
} from "@repo/domain/game-payments";
import { parseOptionalPricePerPlayerFils } from "@repo/domain/price-per-player";
import type { Locale } from "@repo/i18n/locale";
import type { Messages } from "@repo/i18n/messages";
import { Hand, Wallet, type LucideIcon } from "lucide-react-native";
import { Pressable, Switch, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { hairline } from "../primitives/hairline-width";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import type { StepProps } from "./step-props";
import { StepSection } from "./step-section";

const ICON_TILE = 36;
const PADEL_PLAYERS = 4;

function SwitchRow({
  icon: Icon,
  title,
  description,
  value,
  first,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  value: boolean;
  first: boolean;
  onChange: (value: boolean) => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessible={false}
      onPress={() => onChange(!value)}
      style={{
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: first ? 0 : hairline,
        borderTopColor: colors.rule,
      }}
    >
      <View
        style={{
          width: ICON_TILE,
          height: ICON_TILE,
          borderRadius: radii.md,
          borderWidth: hairline,
          borderColor: colors.rule,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={colors.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold">{title}</Text>
        <Text size="eyebrow" tone="muted">
          {description}
        </Text>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={description}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.rule, true: colors.ink }}
        thumbColor={value ? colors.paper : colors.onControl}
        ios_backgroundColor={colors.rule}
      />
    </Pressable>
  );
}

/**
 * Track payments, and on football whether keepers play free, shown only once
 * the Game has a price (design Payments 3a).
 */
export function PaymentTrackingField({
  state,
  dispatch,
  football = false,
}: StepProps & { football?: boolean }) {
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
      playersAllowed: football ? draft.playersAllowed : PADEL_PLAYERS,
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
          description={copy.trackDescription}
          value={draft.trackPayments}
          first
          onChange={(trackPayments) =>
            dispatch({ kind: "setTrackPayments", trackPayments })
          }
        />
        {football && draft.trackPayments ? (
          <SwitchRow
            icon={Hand}
            title={copy.keepersTitle}
            description={copy.keepersDescription}
            value={draft.keepersPlayFree}
            first={false}
            onChange={(keepersPlayFree) =>
              dispatch({ kind: "setKeepersPlayFree", keepersPlayFree })
            }
          />
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
              {formatPaymentFigure(summary.totalFils)}
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
