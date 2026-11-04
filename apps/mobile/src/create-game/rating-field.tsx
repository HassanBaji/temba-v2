import { createRatingChoice } from "@repo/domain/create-game-flow";
import { View } from "react-native";

import { useLocale } from "../i18n/locale-provider";
import { ChoiceCard } from "../primitives/choice-card";
import { HelperNote, StepSection } from "./step-section";

export function RatingField({
  groupVerified,
  rated,
  onRated,
}: {
  groupVerified: boolean;
  rated: boolean;
  onRated: (rated: boolean) => void;
}) {
  const locale = useLocale();
  const choice = createRatingChoice({ groupVerified, rated, locale });
  return (
    <StepSection title={choice.title}>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {choice.options.map((option) => (
          <ChoiceCard
            key={String(option.rated)}
            role="radio"
            variant="card"
            selected={rated === option.rated}
            title={option.label}
            description={option.description ?? undefined}
            onPress={() => onRated(option.rated)}
          />
        ))}
      </View>
      <HelperNote>{choice.note}</HelperNote>
    </StepSection>
  );
}
