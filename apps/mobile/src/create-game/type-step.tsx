import { radii } from "@repo/design-tokens";
import {
  createGameTypeCards,
  type CreateGameTypeId,
} from "@repo/domain/create-game-flow";
import { Shuffle, Trophy } from "lucide-react-native";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { ChoiceCard } from "../primitives/choice-card";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { FieldError } from "./chips";
import type { StepProps } from "./step-props";

const ICONS = { friendly_game: Shuffle, friendly_tournament: Trophy } as const;
const SEAT_COUNT = 4;
const SEAT_HEIGHT = 30;
const BRACKET_ROW_HEIGHT = 14;
const BRACKET_COLUMNS = 4;
const BRACKET_TOP_ROW = ["solid", "hatch", "solid", "hatch"] as const;

export function TypeStep({ state, errors, dispatch }: StepProps) {
  const note = useMessages().createGame.typeCards.countsNote;
  return (
    <View style={{ gap: 12 }}>
      <Text size="meta" tone="muted">
        {note}
      </Text>
      <TypeCards
        selected={state.type}
        onSelect={(type) => dispatch({ kind: "selectType", type })}
      />
      <FieldError message={errors.type} />
    </View>
  );
}

function TypeCards({
  selected,
  onSelect,
}: {
  selected: CreateGameTypeId | null;
  onSelect: (type: CreateGameTypeId) => void;
}) {
  const locale = useLocale();
  const copy = useMessages().mobileCreateGame.type;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={copy.title}
      style={{ gap: 14 }}
    >
      {createGameTypeCards(locale).map((card) => (
        <ChoiceCard
          key={card.id}
          role="radio"
          selected={selected === card.id}
          title={card.title}
          description={card.description}
          accessibilityLabel={copy.cardA11y(
            card.title,
            card.description,
            card.rating,
          )}
          leading={ICONS[card.id]}
          trailing="chevron"
          onPress={() => onSelect(card.id)}
        >
          {card.id === "friendly_game" ? <SeatStrip /> : <MiniBracket />}
        </ChoiceCard>
      ))}
    </View>
  );
}

function Illustration({ children }: { children: React.ReactNode }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      pointerEvents="none"
    >
      {children}
    </View>
  );
}

function SeatStrip() {
  return (
    <Illustration>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {Array.from({ length: SEAT_COUNT }, (_, index) => (
          <View key={index} style={{ flex: 1, height: SEAT_HEIGHT }}>
            <Hatch radius={radii.sm} />
          </View>
        ))}
      </View>
    </Illustration>
  );
}

function MiniBracket() {
  const palette = useTonePalette();
  const cell = {
    flex: 1,
    height: BRACKET_ROW_HEIGHT,
    borderRadius: radii.slot,
  };
  return (
    <Illustration>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {BRACKET_TOP_ROW.map((kind, index) =>
            kind === "solid" ? (
              <View
                key={index}
                style={[cell, { backgroundColor: palette.foreground }]}
              />
            ) : (
              <View key={index} style={cell}>
                <Hatch radius={radii.slot} />
              </View>
            ),
          )}
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {Array.from({ length: BRACKET_COLUMNS }, (_, index) => (
            <View
              key={index}
              style={[
                cell,
                { borderWidth: hairline, borderColor: palette.rule },
              ]}
            />
          ))}
        </View>
      </View>
    </Illustration>
  );
}
