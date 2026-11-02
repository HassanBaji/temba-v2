import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import {
  DEFAULT_CALLING_COUNTRY_ISO,
  formatInternationalNumber,
} from "@repo/domain/phone-number";
import {
  userDisplayName,
  validateUserNames,
} from "@repo/domain/user-display-name";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AuthScreen, goBackOrWelcome } from "../../src/auth/auth-screen";
import {
  SOMETHING_WENT_WRONG,
  fieldError,
  hasClerkErrorCode,
  resolvePhone,
} from "../../src/auth/clerk-forms";
import { CodeForm } from "../../src/auth/code-form";
import { FormErrorSummary } from "../../src/auth/form-error-summary";
import { OauthButtons } from "../../src/auth/oauth-buttons";
import { PasswordField } from "../../src/auth/password-field";
import { passwordMeetsMinimum } from "../../src/auth/password-strength";
import { PhoneField } from "../../src/auth/phone-field";
import {
  FRESH_ACCOUNT_TARGET,
  setPostAuthTarget,
} from "../../src/auth/post-auth-target";
import { TermsMicrocopy } from "../../src/auth/terms-microcopy";
import { type SplitFormError } from "../../src/lib/form-error";
import { Button } from "../../src/primitives/button";
import { InitialsTile } from "../../src/primitives/initials-tile";
import { Surface } from "../../src/primitives/surface";
import { Text } from "../../src/primitives/text";
import { TextField } from "../../src/primitives/text-field";

type Step = "phone" | "code" | "name" | "password";
/** Which Clerk object the code step verifies: a known number or a new one. */
type Door = "sign-in" | "sign-up";

type SessionOutcome = {
  status: string | null;
  createdSessionId: string | null;
};

export default function SignIn() {
  const signInApi = useSignIn();
  const signUpApi = useSignUp();
  const { signIn, setActive } = signInApi;
  const { signUp } = signUpApi;
  const isLoaded = signInApi.isLoaded && signUpApi.isLoaded;

  const [step, setStep] = useState<Step>("phone");
  const [door, setDoor] = useState<Door>("sign-in");
  const [countryIso, setCountryIso] = useState(DEFAULT_CALLING_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pending, setPending] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);

  const formattedPhone = formatInternationalNumber(countryIso, national);

  function backToPhone() {
    setStep("phone");
    setDoor("sign-in");
    setSplit(null);
    setCode("");
    setUsePassword(false);
    setPassword("");
  }

  async function activate(outcome: SessionOutcome): Promise<boolean> {
    if (
      outcome.status === "complete" &&
      outcome.createdSessionId &&
      setActive
    ) {
      if (door === "sign-up") {
        setPostAuthTarget(FRESH_ACCOUNT_TARGET);
      }
      await setActive({ session: outcome.createdSessionId });
      return true;
    }
    return false;
  }

  async function startSignUp(e164: string) {
    if (!signUp) {
      setSplit(SOMETHING_WENT_WRONG);
      return;
    }
    await signUp.create({ phoneNumber: e164, legalAccepted: true });
    await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
    setDoor("sign-up");
    setCode("");
    setStartedAt(Date.now());
    setStep("code");
  }

  async function onSendCode() {
    if (pending || !signIn) {
      return;
    }
    const phone = resolvePhone(countryIso, national, "identifier");
    if (!phone.ok) {
      setSplit(phone.split);
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const attempt = await signIn.create({ identifier: phone.e164 });
      const factor = attempt.supportedFirstFactors?.find(
        (item) => item.strategy === "phone_code",
      );
      if (!factor) {
        setSplit(SOMETHING_WENT_WRONG);
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: "phone_code",
        phoneNumberId: factor.phoneNumberId,
      });
      setPhoneNumberId(factor.phoneNumberId);
      setDoor("sign-in");
      setCode("");
      setStartedAt(Date.now());
      setStep("code");
    } catch (err) {
      if (hasClerkErrorCode(err, "form_identifier_not_found")) {
        try {
          await startSignUp(phone.e164);
        } catch (signUpErr) {
          setSplit(splitClerkAuthError(signUpErr));
        }
        return;
      }
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    if (pending || !signIn || !signUp) {
      return;
    }
    setPending(true);
    try {
      if (door === "sign-up") {
        await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      } else if (phoneNumberId) {
        await signIn.prepareFirstFactor({
          strategy: "phone_code",
          phoneNumberId,
        });
      }
      setStartedAt(Date.now());
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  async function onVerifyCode() {
    if (pending || !signIn || !signUp) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      if (door === "sign-in") {
        const result = await signIn.attemptFirstFactor({
          strategy: "phone_code",
          code,
        });
        if (await activate(result)) {
          return;
        }
        if (result.status === "needs_second_factor") {
          router.push("/factor-two");
          return;
        }
        setSplit(SOMETHING_WENT_WRONG);
        return;
      }
      const result = await signUp.attemptPhoneNumberVerification({ code });
      if (await activate(result)) {
        return;
      }
      setStep("name");
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  async function onSignInWithPassword() {
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "password",
        password,
      });
      if (await activate(result)) {
        return;
      }
      if (result.status === "needs_second_factor") {
        router.push("/factor-two");
        return;
      }
      setSplit(SOMETHING_WENT_WRONG);
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  async function onSaveName() {
    if (pending || !signUp) {
      return;
    }
    const names = validateUserNames({ firstName, lastName });
    if (!names.ok) {
      setSplit({ fieldErrors: names.fieldErrors, globalMessage: null });
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signUp.update({
        firstName: names.firstName,
        lastName: names.lastName,
      });
      if (await activate(result)) {
        return;
      }
      setStep("password");
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  async function onCreateAccount() {
    if (pending || !signUp || !passwordMeetsMinimum(password)) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signUp.update({ password });
      if (!(await activate(result))) {
        setSplit(SOMETHING_WENT_WRONG);
      }
    } catch (err) {
      setSplit(splitClerkAuthError(err));
    } finally {
      setPending(false);
    }
  }

  if (step === "code") {
    return (
      <AuthScreen
        onBack={backToPhone}
        title="Enter the code"
        footer={
          <Text size="eyebrow" tone="muted">
            Codes expire after a short time. Too many wrong tries will lock this
            number.
          </Text>
        }
      >
        <CodeForm
          destination={formattedPhone}
          changeLabel="Change number"
          onChangeIdentifier={backToPhone}
          code={code}
          onCodeChange={setCode}
          onVerify={() => void onVerifyCode()}
          onResend={() => void onResend()}
          startedAt={startedAt}
          pending={pending}
          globalMessage={split?.globalMessage ?? null}
          codeError={fieldError(split, "code")}
        />
        {door === "sign-in" ? (
          usePassword ? (
            <View style={{ gap: 12 }}>
              <PasswordField
                label="Password"
                autoComplete="current-password"
                textContentType="password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => void onSignInWithPassword()}
                editable={!pending}
                error={fieldError(split, "password")}
              />
              <Button
                label="Sign in with password"
                size="lg"
                variant="outline"
                pending={pending}
                disabled={password.length === 0}
                onPress={() => void onSignInWithPassword()}
              />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setUsePassword(true)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text
                tone="muted"
                style={{ textAlign: "center", textDecorationLine: "underline" }}
              >
                Sign in with password instead
              </Text>
            </Pressable>
          )
        ) : null}
      </AuthScreen>
    );
  }

  if (step === "name") {
    const preview = userDisplayName({ firstName, lastName }) ?? "Your name";
    return (
      <AuthScreen
        onBack={backToPhone}
        progress={{ step: 1, total: 2 }}
        title="What should we call you?"
        description="Shown to organizers and the people you play with."
        action={
          <Button
            label="Continue"
            size="lg"
            pending={pending}
            onPress={() => void onSaveName()}
          />
        }
        footer={
          <Text size="eyebrow" tone="muted">
            Photo, email, sports and level can be added later from Profile.
          </Text>
        }
      >
        <FormErrorSummary message={split?.globalMessage} />
        <TextField
          label="First name"
          autoComplete="given-name"
          textContentType="givenName"
          autoFocus
          value={firstName}
          onChangeText={setFirstName}
          editable={!pending}
          error={fieldError(split, "firstName", "first_name")}
        />
        <TextField
          label="Last name"
          autoComplete="family-name"
          textContentType="familyName"
          value={lastName}
          onChangeText={setLastName}
          onSubmitEditing={() => void onSaveName()}
          editable={!pending}
          error={fieldError(split, "lastName", "last_name")}
        />
        <Surface
          padded={false}
          radius="card"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            paddingVertical: 14,
            paddingHorizontal: 18,
          }}
        >
          <InitialsTile name={preview} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text weight="semibold" numberOfLines={1}>
              {preview}
            </Text>
            <Text size="meta" tone="muted">
              {formattedPhone}
            </Text>
          </View>
          <Text size="eyebrow" tone="muted" mono uppercase>
            Preview
          </Text>
        </Surface>
      </AuthScreen>
    );
  }

  if (step === "password") {
    return (
      <AuthScreen
        onBack={() => {
          setStep("name");
          setSplit(null);
        }}
        progress={{ step: 2, total: 2 }}
        title="Pick a password"
        description="For signing in on a new phone."
        action={
          <Button
            label="Create account"
            size="lg"
            pending={pending}
            disabled={!passwordMeetsMinimum(password)}
            onPress={() => void onCreateAccount()}
          />
        }
        footer={
          <Text size="eyebrow" tone="muted">
            You can change it later from Settings.
          </Text>
        }
      >
        <FormErrorSummary message={split?.globalMessage} />
        <PasswordField
          label="Password"
          strength
          autoFocus
          autoComplete="password-new"
          textContentType="newPassword"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => void onCreateAccount()}
          editable={!pending}
          error={fieldError(split, "password")}
        />
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      onBack={goBackOrWelcome}
      title="What's your number?"
      description="We text a six digit code to confirm it's you. If the number is new to us, we create your account."
      footer={
        <Text size="meta" tone="muted">
          Invited to a Group? Open your invite link.
        </Text>
      }
    >
      <FormErrorSummary message={split?.globalMessage} />
      <PhoneField
        label="Mobile number"
        countryIso={countryIso}
        national={national}
        onCountryIsoChange={setCountryIso}
        onNationalChange={setNational}
        error={fieldError(split, "identifier", "phone_number", "phoneNumber")}
        disabled={pending}
      />
      <Button
        label="Send code"
        size="lg"
        pending={pending}
        disabled={!isLoaded}
        onPress={() => void onSendCode()}
      />
      <TermsMicrocopy lead="Standard SMS rates may apply." />
      <OauthButtons disabled={pending} />
    </AuthScreen>
  );
}
