import { useSignIn } from "@clerk/expo/legacy";
import { DEFAULT_CALLING_COUNTRY_ISO } from "@repo/domain/phone-number";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AuthScreen, goBackOrWelcome } from "../../src/auth/auth-screen";
import {
  SOMETHING_WENT_WRONG,
  fieldError,
  resolveSignInIdentifier,
  splitSignInError,
  type IdentifierMode,
} from "../../src/auth/clerk-forms";
import { FormErrorSummary } from "../../src/auth/form-error-summary";
import { OauthButtons } from "../../src/auth/oauth-buttons";
import { PhoneField } from "../../src/auth/phone-field";
import { type SplitFormError } from "../../src/lib/form-error";
import { Button } from "../../src/primitives/button";
import { Text } from "../../src/primitives/text";
import { TextField } from "../../src/primitives/text-field";

const MODE_DESCRIPTIONS: Record<IdentifierMode, string> = {
  username: "Use your Temba username and password.",
  phone: "Use the number your Groups know you by.",
};

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [mode, setMode] = useState<IdentifierMode>("username");
  const [username, setUsername] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_CALLING_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);
  const usePhone = mode === "phone";

  async function onSubmit() {
    if (pending || !signIn) {
      return;
    }
    const resolved = resolveSignInIdentifier({
      mode,
      username,
      countryIso,
      national,
    });
    if (!resolved.ok) {
      setSplit(resolved.split);
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signIn.create({
        identifier: resolved.identifier,
        password,
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        return;
      }
      if (result.status === "needs_second_factor") {
        router.push("/factor-two");
        return;
      }
      setSplit(SOMETHING_WENT_WRONG);
    } catch (err) {
      setSplit(splitSignInError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthScreen
      onBack={goBackOrWelcome}
      crossLink={{
        label: "Create account",
        onPress: () => router.replace("/sign-up"),
      }}
      title="Sign in"
      description={MODE_DESCRIPTIONS[mode]}
      footer={
        <Text size="meta" tone="muted">
          Invited to a Group? Open your invite link.
        </Text>
      }
    >
      <FormErrorSummary message={split?.globalMessage} />
      <View style={{ gap: 18 }}>
        {usePhone ? (
          <PhoneField
            label="Mobile number"
            countryIso={countryIso}
            national={national}
            onCountryIsoChange={setCountryIso}
            onNationalChange={setNational}
            error={fieldError(split, "identifier")}
            disabled={pending}
          />
        ) : (
          <TextField
            label="Username"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            editable={!pending}
            error={fieldError(split, "identifier")}
          />
        )}
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          hitSlop={8}
          onPress={() => {
            setMode(usePhone ? "username" : "phone");
            setSplit(null);
          }}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ textDecorationLine: "underline" }}>
            {usePhone ? "Use username" : "Use phone"}
          </Text>
        </Pressable>
        <TextField
          label="Password"
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => void onSubmit()}
          editable={!pending}
          error={fieldError(split, "password")}
        />
        <Pressable
          accessibilityRole="link"
          hitSlop={8}
          onPress={() => router.push("/reset-password")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ textDecorationLine: "underline" }}>
            Forgot password
          </Text>
        </Pressable>
      </View>
      <Button
        label="Sign in"
        size="lg"
        pending={pending}
        disabled={!isLoaded}
        onPress={() => void onSubmit()}
      />
      <OauthButtons />
    </AuthScreen>
  );
}
