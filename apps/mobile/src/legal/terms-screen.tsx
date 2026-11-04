import { View } from "react-native";

import { AuthScreen } from "../auth/auth-screen";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Text } from "../primitives/text";
import {
  TERMS_SECTIONS,
  termsUpdatedLabel,
  type TermsClause,
} from "@repo/domain/terms";

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
  const m = useMessages();
  const locale = useLocale();
  return (
    <AuthScreen
      onBack={props.onBack}
      eyebrow={m.mobileHome.terms.lastUpdated(termsUpdatedLabel(locale))}
      title={m.mobileHome.terms.title}
      description={m.mobileHome.terms.description}
      action={
        props.onAgree ? (
          <Button
            label={m.mobileHome.terms.agreeAndContinue}
            size="lg"
            onPress={props.onAgree}
          />
        ) : undefined
      }
    >
      {locale === "ar" ? (
        <Text size="meta" tone="muted">
          {m.mobileHome.terms.englishGoverns}
        </Text>
      ) : null}
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
