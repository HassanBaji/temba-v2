import { TERMS_MINIMUM_AGE } from "@repo/domain/terms";
import { router } from "expo-router";

import { Text } from "../primitives/text";

/**
 * Consent is this line plus `legalAccepted: true` on create: no checkbox
 * (ADR-0049). `lead` is the sentence that goes before it, such as the SMS
 * rates note on the phone step.
 */
export function TermsMicrocopy({ lead }: { lead?: string }) {
  return (
    <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
      {lead ? `${lead} ` : null}
      By continuing you confirm you are {TERMS_MINIMUM_AGE} or older and agree
      to the{" "}
      <Text
        size="eyebrow"
        accessibilityRole="link"
        onPress={() => router.push("/terms")}
        style={{ textDecorationLine: "underline" }}
      >
        Terms
      </Text>{" "}
      and Privacy Policy.
    </Text>
  );
}
