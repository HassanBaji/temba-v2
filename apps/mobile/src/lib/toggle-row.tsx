import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Text } from "../primitives/text";

export function ToggleRow(props: {
  label: string;
  help: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const m = useMessages();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="medium">{props.label}</Text>
        <Text size="meta" tone="muted">
          {props.help}
        </Text>
      </View>
      <Button
        label={props.value ? m.common.on : m.common.off}
        accessibilityLabel={
          props.value
            ? m.mobilePlayer.lib.toggleOn(props.label)
            : m.mobilePlayer.lib.toggleOff(props.label)
        }
        variant={props.value ? "default" : "outline"}
        selected={props.value}
        disabled={props.disabled}
        onPress={() => props.onChange(!props.value)}
      />
    </View>
  );
}
