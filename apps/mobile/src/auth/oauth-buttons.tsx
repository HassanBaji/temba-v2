import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import { clerkGlobalErrorMessage } from "@repo/domain/clerk-auth-error";
import { withGoogleLocale } from "@repo/domain/google-locale";
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button, type ButtonVariant } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";
import { FormErrorSummary } from "./form-error-summary";

type OAuthOutcome = {
  createdSessionId: string | null;
  setActive?: (params: { session: string }) => Promise<void>;
  signUp?: { status: string | null };
  cancelled?: boolean;
};

export function OauthButtons({
  disabled = false,
  variant = "outline",
  divider = true,
}: {
  disabled?: boolean;
  variant?: ButtonVariant;
  divider?: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clerk's useSSO gives no way to set Google's page language, so this is its
  // create, browse, reload and transfer steps with `hl` added.
  async function continueWithGoogle(): Promise<OAuthOutcome> {
    if (!signInLoaded || !signUpLoaded) {
      return { createdSessionId: null, cancelled: true };
    }
    const redirectUrl = AuthSession.makeRedirectUri({ path: "sso-callback" });
    await signIn.create({ strategy: "oauth_google", redirectUrl });
    const googleUrl =
      signIn.firstFactorVerification.externalVerificationRedirectURL;
    if (!googleUrl) {
      return { createdSessionId: null };
    }
    const session = await WebBrowser.openAuthSessionAsync(
      withGoogleLocale(googleUrl.toString(), locale),
      redirectUrl,
    );
    if (session.type !== "success") {
      return { createdSessionId: null, cancelled: true };
    }
    const rotatingTokenNonce =
      new URL(session.url).searchParams.get("rotating_token_nonce") ?? "";
    await signIn.reload({ rotatingTokenNonce });
    if (signIn.firstFactorVerification.status === "transferable") {
      await signUp.create({ transfer: true });
    }
    return {
      createdSessionId: signUp.createdSessionId ?? signIn.createdSessionId,
      setActive,
      signUp,
    };
  }

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
        setError(m.auth.clerkError.generic);
      }
    } catch (err) {
      setError(clerkGlobalErrorMessage(err, locale));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      {divider ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ flex: 1 }}>
            <Hairline />
          </View>
          <Text size="eyebrow" tone="muted" mono>
            {m.mobileHome.oauth.or}
          </Text>
          <View style={{ flex: 1 }}>
            <Hairline />
          </View>
        </View>
      ) : null}
      <FormErrorSummary message={error} />
      <Button
        label={m.mobileHome.oauth.continueWithGoogle}
        size="lg"
        variant={variant}
        pending={pending}
        disabled={pending || disabled}
        onPress={() => {
          void run(continueWithGoogle);
        }}
      />
    </View>
  );
}
