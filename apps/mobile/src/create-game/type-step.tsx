import { CREATE_GAME_TYPE_CARDS } from "@repo/domain/create-game-flow";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { FieldError } from "./chips";
import type { StepProps } from "./step-props";

export function TypeStep({ state, errors, dispatch }: StepProps) {
  return (
    <View style={{ gap: 12 }}>
      <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
        {CREATE_GAME_TYPE_CARDS.map((card) => {
          const selected = state.type === card.id;
          return (
            <Surface key={card.id} style={{ gap: 8 }}>
              <Text size="lead" weight="semibold">
                {card.title}
              </Text>
              <Text size="meta" tone="muted">
                {card.description}
              </Text>
              <Text size="meta" tone="muted">
                {card.rating}
              </Text>
              <Button
                label={
                  selected ? `${card.title} selected` : `Pick ${card.title}`
                }
                variant={selected ? "default" : "outline"}
                selected={selected}
                onPress={() => dispatch({ kind: "selectType", type: card.id })}
              />
            </Surface>
          );
        })}
      </View>
      <FieldError message={errors.type} />
    </View>
  );
}
