import { MVP_MODES, mvpModeCopy, type MvpMode } from "@repo/domain/marks";
import { Fragment } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { ChoiceCard } from "../primitives/choice-card";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { HelperNote, StepSection } from "./step-section";

export function MvpModeChoices({
  mode,
  onSelect,
}: {
  mode: MvpMode;
  onSelect: (mode: MvpMode) => void;
}) {
  const locale = useLocale();
  const title = useMessages().createGame.mvp.title;
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View accessibilityRole="radiogroup" accessibilityLabel={title}>
        {MVP_MODES.map((option, index) => {
          const copy = mvpModeCopy(option, locale);
          return (
            <Fragment key={option}>
              {index > 0 ? <Hairline /> : null}
              <ChoiceCard
                variant="row"
                role="radio"
                selected={option === mode}
                title={copy.label}
                description={copy.description}
                onPress={() => onSelect(option)}
              />
            </Fragment>
          );
        })}
      </View>
    </Surface>
  );
}

/** Create step 4: how the MVP is decided, with the help line for the pick. */
export function MvpModeField({
  mode,
  onSelect,
}: {
  mode: MvpMode;
  onSelect: (mode: MvpMode) => void;
}) {
  const locale = useLocale();
  const copy = useMessages().createGame.mvp;
  return (
    <StepSection title={copy.title} note={copy.decidedAfterGame}>
      <MvpModeChoices mode={mode} onSelect={onSelect} />
      <HelperNote>{mvpModeCopy(mode, locale).help}</HelperNote>
    </StepSection>
  );
}
