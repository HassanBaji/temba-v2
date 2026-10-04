import { View } from "react-native";

import { Button } from "../primitives/button";
import { Text } from "../primitives/text";

export function ToggleRow(props: {
  label: string;
  help: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="medium">{props.label}</Text>
        <Text size="meta" tone="muted">
          {props.help}
        </Text>
      </View>
      <Button
        label={props.value ? "On" : "Off"}
        accessibilityLabel={`${props.label}, ${props.value ? "on" : "off"}`}
        variant={props.value ? "default" : "outline"}
        selected={props.value}
        disabled={props.disabled}
        onPress={() => props.onChange(!props.value)}
      />
    </View>
  );
}
