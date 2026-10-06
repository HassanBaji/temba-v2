import { useSSO } from "@clerk/expo";
import { clerkGlobalErrorMessage } from "@repo/domain/clerk-auth-error";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { SOMETHING_WENT_WRONG } from "./clerk-forms";
import { FormErrorSummary } from "./form-error-summary";

type OAuthOutcome = {
  createdSessionId: string | null;
  setActive?: (params: { session: string }) => Promise<void>;
  signUp?: { status: string | null };
  cancelled?: boolean;
};

export function OauthButtons() {
  const { startSSOFlow } = useSSO();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(start: () => Promise<OAuthOutcome>) {
    if (pending) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const outcome = await start();
      if (outcome.createdSessionId && outcome.setActive) {
        await outcome.setActive({ session: outcome.createdSessionId });
        return;
      }
      if (outcome.signUp?.status === "missing_requirements") {
        router.push("/continue");
        return;
      }
      if (!outcome.cancelled) {
        setError(SOMETHING_WENT_WRONG.globalMessage);
      }
    } catch (err) {
      setError(clerkGlobalErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Hairline />
        </View>
        <Text size="eyebrow" tone="muted" mono>
          OR
        </Text>
        <View style={{ flex: 1 }}>
          <Hairline />
        </View>
      </View>
      <FormErrorSummary message={error} />
      <Button
        label="Continue with Google"
        size="lg"
        variant="outline"
        pending={pending}
        disabled={pending}
        onPress={() => {
          void run(async () => {
            const result = await startSSOFlow({ strategy: "oauth_google" });
            return {
              createdSessionId: result.createdSessionId,
              setActive: result.setActive,
              signUp: result.signUp,
              cancelled: result.authSessionResult?.type !== "success",
            };
          });
        }}
      />
    </View>
  );
}
