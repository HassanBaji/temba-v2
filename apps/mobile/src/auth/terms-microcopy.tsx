import { TERMS_MINIMUM_AGE } from "@repo/domain/terms";
import { router } from "expo-router";

import { useMessages } from "../i18n/locale-provider";
import { Text } from "../primitives/text";

/**
 * Consent is this line plus `legalAccepted: true` on create: no checkbox
 * (ADR-0049). `lead` is the sentence that goes before it, such as the SMS
 * rates note on the phone step.
 */
export function TermsMicrocopy({ lead }: { lead?: string }) {
  const m = useMessages();
  return (
    <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
      {lead ? `${lead} ` : null}
      {m.mobileHome.termsMicrocopy.before(TERMS_MINIMUM_AGE)}
      <Text
        size="eyebrow"
        accessibilityRole="link"
        onPress={() => router.push("/terms")}
        style={{ textDecorationLine: "underline" }}
      >
        {m.mobileHome.termsMicrocopy.termsLink}
      </Text>
      {m.mobileHome.termsMicrocopy.after}
    </Text>
  );
}
