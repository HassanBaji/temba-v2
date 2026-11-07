import { SPORTS, type Sport } from "@repo/domain/sport";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { useColors } from "../theme/theme-provider";
import { SportGlyph } from "./sport-glyph";

export function SportToggleRow(props: {
  value: readonly Sport[];
  onToggle: (sport: Sport) => void;
  disabled: boolean;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel={m.mobilePlayer.lib.sports}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
    >
      {SPORTS.map((sport) => {
        const on = props.value.includes(sport);
        return (
          <View key={sport} style={{ minWidth: "30%", flexGrow: 1 }}>
            <Button
              label={m.common[sport]}
              variant={on ? "default" : "outline"}
              selected={on}
              disabled={props.disabled}
              icon={
                <SportGlyph
                  sport={sport}
                  color={on ? colors.onControl : colors.ink}
                />
              }
              onPress={() => props.onToggle(sport)}
            />
          </View>
        );
      })}
    </View>
  );
}
