import { useSSO } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import { clerkGlobalErrorMessage } from "@repo/domain/clerk-auth-error";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, View } from "react-native";

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
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    provider: "google" | "apple",
    start: () => Promise<OAuthOutcome>,
  ) {
    if (pending) {
      return;
    }
    setError(null);
    setPending(provider);
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
      setPending(null);
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
      {Platform.OS === "ios" ? (
        <Button
          label="Continue with Apple"
          size="lg"
          pending={pending === "apple"}
          disabled={pending !== null}
          onPress={() => {
            void run("apple", async () => {
              const result = await startAppleAuthenticationFlow();
              return {
                createdSessionId: result.createdSessionId,
                setActive: result.setActive,
                signUp: result.signUp,
                cancelled: result.signUp?.status == null,
              };
            });
          }}
        />
      ) : null}
      <Button
        label="Continue with Google"
        size="lg"
        variant="outline"
        pending={pending === "google"}
        disabled={pending !== null}
        onPress={() => {
          void run("google", async () => {
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
