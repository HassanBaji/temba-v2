import { View } from "react-native";

import { Button } from "../primitives/button";

export function ChoiceRow<T extends string>(props: {
  label: string;
  choices: { value: T; label: string }[];
  value: T | "";
  onSelect: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={props.label}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
    >
      {props.choices.map((choice) => (
        <View key={choice.value} style={{ minWidth: "30%", flexGrow: 1 }}>
          <Button
            label={choice.label}
            variant={props.value === choice.value ? "default" : "outline"}
            selected={props.value === choice.value}
            disabled={props.disabled}
            onPress={() => props.onSelect(choice.value)}
          />
        </View>
      ))}
    </View>
  );
}
