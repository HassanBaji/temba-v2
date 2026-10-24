import { SPORT_LABELS, type Sport } from "@repo/domain/sport";

import { ChoiceRow } from "./choice-row";
import { SportGlyph } from "./sport-glyph";

export function SportChoiceRow(props: {
  sports: readonly Sport[];
  value: Sport;
  onSelect: (sport: Sport) => void;
  disabled: boolean;
}) {
  return (
    <ChoiceRow
      label="Sport"
      choices={props.sports.map((sport) => ({
        value: sport,
        label: SPORT_LABELS[sport],
        icon: (color: string) => <SportGlyph sport={sport} color={color} />,
      }))}
      value={props.value}
      onSelect={props.onSelect}
      disabled={props.disabled}
    />
  );
}
