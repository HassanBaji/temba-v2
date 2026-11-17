import { radii } from "@repo/design-tokens";
import type { AloneSide } from "@repo/domain/alone-teams";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";

const SIDE_CHOICES = ["left", "right", "either"] as const;
type SideChoice = (typeof SIDE_CHOICES)[number];

function sideFromChoice(choice: SideChoice): AloneSide | null {
  return choice === "either" ? null : choice;
}

/**
 * Take a seat on an Alone-only Social: only the side is left to pick, and it
 * is optional. The partner is picked by the organizer.
 */
export function AloneJoinSheet({
  visible,
  preferredPosition,
  pricePerPlayerFils,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  /** The side from the player's profile, to start the choice on. */
  preferredPosition: string | null;
  pricePerPlayerFils: number | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (side: AloneSide | null) => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.aloneTeams.join;
  const palette = useTonePalette();
  const [choice, setChoice] = useState<SideChoice>("either");

  useEffect(() => {
    if (visible) {
      setChoice(
        preferredPosition === "left" || preferredPosition === "right"
          ? preferredPosition
          : "either",
      );
    }
    // Seed only when the sheet opens; the profile may load while it is open.
  }, [visible]);

  const sideLabel: Record<SideChoice, string> = {
    left: m.left,
    right: m.right,
    either: m.either,
  };
  const price = formatPricePerPlayerFils(pricePerPlayerFils, locale);
  const rows = [
    { label: m.partner, value: m.partnerValue },
    ...(price
      ? [
          {
            label: messages.tournament.home.priceRow,
            value: messages.tournament.details.pricePerMatchValue(price),
          },
        ]
      : []),
  ];

  return (
    <Sheet visible={visible} onClose={onClose} title={m.title} closeButton>
      <View style={{ gap: 16 }}>
        <Text size="meta" tone="muted">
          {m.body}
        </Text>
        {error ? (
          <Text size="meta" weight="medium" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <View style={{ gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Text size="meta" tone="muted">
              {m.side}
            </Text>
            <Text size="eyebrow" tone="muted">
              {m.optional}
            </Text>
          </View>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={m.side}
            style={{ flexDirection: "row", gap: 8 }}
          >
            {SIDE_CHOICES.map((option) => (
              <View key={option} style={{ flex: 1 }}>
                <Button
                  label={sideLabel[option]}
                  variant={choice === option ? "default" : "outline"}
                  selected={choice === option}
                  onPress={() => setChoice(option)}
                />
              </View>
            ))}
          </View>
          <Text size="eyebrow" tone="muted">
            {m.sideHint}
          </Text>
        </View>
        <View
          style={{
            borderRadius: radii.lg,
            borderWidth: hairline,
            borderColor: palette.rule,
          }}
        >
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
                padding: 14,
                borderTopWidth: index > 0 ? hairline : 0,
                borderTopColor: palette.rule,
              }}
            >
              <Text tone="muted">{row.label}</Text>
              <Text style={{ flexShrink: 1, textAlign: "right" }}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
        <Button
          label={
            choice === "either" ? m.submit : m.submitWithSide(sideLabel[choice])
          }
          size="lg"
          pending={pending}
          onPress={() => onSubmit(sideFromChoice(choice))}
        />
      </View>
    </Sheet>
  );
}
