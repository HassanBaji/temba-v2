import { colors } from "@repo/design-tokens";
import { SPORT_LABELS, SPORTS, type Sport } from "@repo/domain/sport";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { SportGlyph } from "./sport-glyph";

export function SportToggleRow(props: {
  value: readonly Sport[];
  onToggle: (sport: Sport) => void;
  disabled: boolean;
}) {
  return (
    <View
      accessibilityRole="toolbar"
      accessibilityLabel="Sports"
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
    >
      {SPORTS.map((sport) => {
        const on = props.value.includes(sport);
        return (
          <View key={sport} style={{ minWidth: "30%", flexGrow: 1 }}>
            <Button
              label={SPORT_LABELS[sport]}
              variant={on ? "default" : "outline"}
              selected={on}
              disabled={props.disabled}
              icon={
                <SportGlyph
                  sport={sport}
                  color={on ? colors.paper : colors.ink}
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
