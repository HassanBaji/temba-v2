import { View } from "react-native";

import { AuthScreen } from "../auth/auth-screen";
import { Button } from "../primitives/button";
import { Text } from "../primitives/text";
import { TERMS_SECTIONS, TERMS_UPDATED, type TermsClause } from "./terms";

function Clause({ clause }: { clause: TermsClause }) {
  return (
    <View style={{ gap: 6 }}>
      <Text tone="muted">
        {clause.label ? <Text weight="semibold">{clause.label} </Text> : null}
        {clause.text}
      </Text>
      {clause.bullets?.map((bullet) => (
        <View key={bullet} style={{ flexDirection: "row", gap: 8 }}>
          <Text tone="muted" accessibilityElementsHidden>
            •
          </Text>
          <Text tone="muted" style={{ flex: 1 }}>
            {bullet}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function TermsScreen(props: {
  onBack: () => void;
  onAgree?: () => void;
}) {
  return (
    <AuthScreen
      onBack={props.onBack}
      eyebrow={`Last updated ${TERMS_UPDATED}`}
      title="Terms and Conditions"
      description="What you agree to when you create an account or use Temba."
      action={
        props.onAgree ? (
          <Button
            label="Agree and continue"
            size="lg"
            onPress={props.onAgree}
          />
        ) : undefined
      }
    >
      {TERMS_SECTIONS.map((section) => (
        <View key={section.number} style={{ gap: 10 }}>
          <Text size="lead" weight="semibold" accessibilityRole="header">
            {section.number}. {section.title}
          </Text>
          {section.clauses.map((clause, index) => (
            <Clause key={clause.label ?? index} clause={clause} />
          ))}
        </View>
      ))}
    </AuthScreen>
  );
}
