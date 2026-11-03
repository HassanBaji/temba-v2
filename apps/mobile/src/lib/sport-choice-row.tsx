import type { Sport } from "@repo/domain/sport";

import { useMessages } from "../i18n/locale-provider";
import { ChoiceRow } from "./choice-row";
import { SportGlyph } from "./sport-glyph";

export function SportChoiceRow(props: {
  sports: readonly Sport[];
  value: Sport;
  onSelect: (sport: Sport) => void;
  disabled: boolean;
}) {
  const m = useMessages();
  return (
    <ChoiceRow
      label={m.mobilePlayer.lib.sport}
      choices={props.sports.map((sport) => ({
        value: sport,
        label: m.common[sport],
        icon: (color: string) => <SportGlyph sport={sport} color={color} />,
      }))}
      value={props.value}
      onSelect={props.onSelect}
      disabled={props.disabled}
    />
  );
}
