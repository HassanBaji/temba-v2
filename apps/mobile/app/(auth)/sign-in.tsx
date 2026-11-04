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
  fieldError,
  hasClerkErrorCode,
  resolvePhone,
  somethingWentWrong,
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
import { useLocale, useMessages } from "../../src/i18n/locale-provider";
import { type SplitFormError } from "../../src/lib/form-error";
import { Button } from "../../src/primitives/button";
import { InitialsTile } from "../../src/primitives/initials-tile";
import { Surface } from "../../src/primitives/surface";
import { Text } from "../../src/primitives/text";
import { TextField } from "../../src/primitives/text-field";

/**
 * A known number signs in with its password; a new one gets a code, then a
 * name and a new password (ADR-0049, ADR-0050). The code is sent on sign-up
 * and on "Forgot password?", which resets the password with a code and a new
 * password (ADR-0051).
 */
type Step =
  | "phone"
  | "password"
  | "code"
  | "name"
  | "new-password"
  | "reset-code"
  | "reset-password";

const SIGN_UP_STEPS: readonly Step[] = ["code", "name", "new-password"];

type SessionOutcome = {
  status: string | null;
  createdSessionId: string | null;
};

export default function SignIn() {
  const m = useMessages();
  const locale = useLocale();
  const signInApi = useSignIn();
  const signUpApi = useSignUp();
  const { signIn, setActive } = signInApi;
  const { signUp } = signUpApi;
  const isLoaded = signInApi.isLoaded && signUpApi.isLoaded;

  const [step, setStep] = useState<Step>("phone");
  const [countryIso, setCountryIso] = useState(DEFAULT_CALLING_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [code, setCode] = useState("");
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pending, setPending] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);

  const formattedPhone = formatInternationalNumber(countryIso, national);

  function backToPhone() {
    setStep("phone");
    setSplit(null);
    setCode("");
    setPassword("");
  }

  function backToPassword() {
    setStep("password");
    setSplit(null);
    setCode("");
  }

  async function activate(outcome: SessionOutcome): Promise<boolean> {
    if (
      outcome.status === "complete" &&
      outcome.createdSessionId &&
      setActive
    ) {
      if (SIGN_UP_STEPS.includes(step)) {
        setPostAuthTarget(FRESH_ACCOUNT_TARGET);
      }
      await setActive({ session: outcome.createdSessionId });
      return true;
    }
    return false;
  }

  async function startSignUp(e164: string) {
    if (!signUp) {
      setSplit(somethingWentWrong(locale));
      return;
    }
    await signUp.create({ phoneNumber: e164, legalAccepted: true });
    await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
    setCode("");
    setStartedAt(Date.now());
    setStep("code");
  }

  async function onContinue() {
    if (pending || !signIn) {
      return;
    }
    const phone = resolvePhone(countryIso, national, "identifier", locale);
    if (!phone.ok) {
      setSplit(phone.split);
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const attempt = await signIn.create({ identifier: phone.e164 });
      const hasPassword = attempt.supportedFirstFactors?.some(
        (item) => item.strategy === "password",
      );
      if (!hasPassword) {
        setSplit({
          fieldErrors: {},
          globalMessage: m.mobileHome.signIn.noPassword,
        });
        return;
      }
      setPassword("");
      setStep("password");
    } catch (err) {
      if (hasClerkErrorCode(err, "form_identifier_not_found")) {
        try {
          await startSignUp(phone.e164);
        } catch (signUpErr) {
          setSplit(splitClerkAuthError(signUpErr, locale));
        }
        return;
      }
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  async function onResend() {
    if (pending || !signUp) {
      return;
    }
    setPending(true);
    try {
      await signUp.preparePhoneNumberVerification({ strategy: "phone_code" });
      setStartedAt(Date.now());
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  async function onVerifyCode() {
    if (pending || !signUp) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signUp.attemptPhoneNumberVerification({ code });
      if (await activate(result)) {
        return;
      }
      setStep("name");
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
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
      setSplit(somethingWentWrong(locale));
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  async function sendResetCode(): Promise<boolean> {
    if (!signIn) {
      return false;
    }
    const phoneNumberId = signIn.supportedFirstFactors?.find(
      (item) => item.strategy === "reset_password_phone_code",
    )?.phoneNumberId;
    if (!phoneNumberId) {
      setSplit(somethingWentWrong(locale));
      return false;
    }
    await signIn.prepareFirstFactor({
      strategy: "reset_password_phone_code",
      phoneNumberId,
    });
    setStartedAt(Date.now());
    return true;
  }

  async function onForgotPassword() {
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      if (await sendResetCode()) {
        setCode("");
        setStep("reset-code");
      }
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  async function onResendResetCode() {
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    try {
      await sendResetCode();
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  async function onVerifyResetCode() {
    if (pending || !signIn) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_phone_code",
        code,
      });
      if (result.status === "needs_new_password") {
        setPassword("");
        setStep("reset-password");
        return;
      }
      if (await activate(result)) {
        return;
      }
      setSplit(somethingWentWrong(locale));
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  async function onSaveNewPassword() {
    if (pending || !signIn || !passwordMeetsMinimum(password)) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signIn.resetPassword({
        password,
        signOutOfOtherSessions: true,
      });
      if (await activate(result)) {
        return;
      }
      if (result.status === "needs_second_factor") {
        router.push("/factor-two");
        return;
      }
      setSplit(somethingWentWrong(locale));
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  async function onSaveName() {
    if (pending || !signUp) {
      return;
    }
    const names = validateUserNames({ firstName, lastName }, locale);
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
      setStep("new-password");
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
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
        setSplit(somethingWentWrong(locale));
      }
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  if (step === "password") {
    return (
      <AuthScreen
        onBack={backToPhone}
        title={m.mobileHome.signIn.enterYourPassword}
        description={m.mobileHome.signIn.forPhone(formattedPhone)}
        action={
          <Button
            label={m.common.signIn}
            size="lg"
            pending={pending}
            disabled={password.length === 0}
            onPress={() => void onSignInWithPassword()}
          />
        }
      >
        <FormErrorSummary message={split?.globalMessage} />
        <PasswordField
          label={m.mobileHome.fields.password}
          autoFocus
          autoComplete="current-password"
          textContentType="password"
          placeholder={m.mobileHome.fields.enterYourPassword}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => void onSignInWithPassword()}
          editable={!pending}
          error={fieldError(split, "password")}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            disabled={pending}
            onPress={() => void onForgotPassword()}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text
              tone="muted"
              style={{ textAlign: "center", textDecorationLine: "underline" }}
            >
              {m.mobileHome.signIn.forgotPassword}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            disabled={pending}
            onPress={backToPhone}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text
              tone="muted"
              style={{ textAlign: "center", textDecorationLine: "underline" }}
            >
              {m.mobileHome.code.changeNumber}
            </Text>
          </Pressable>
        </View>
      </AuthScreen>
    );
  }

  if (step === "reset-code") {
    return (
      <AuthScreen
        onBack={backToPassword}
        title={m.mobileHome.code.enterTheCode}
        description={m.mobileHome.signIn.toResetPassword}
        footer={
          <Text size="eyebrow" tone="muted">
            {m.mobileHome.code.expiryNumber}
          </Text>
        }
      >
        <CodeForm
          destination={formattedPhone}
          changeLabel={m.mobileHome.code.changeNumber}
          onChangeIdentifier={backToPhone}
          code={code}
          onCodeChange={setCode}
          onVerify={() => void onVerifyResetCode()}
          onResend={() => void onResendResetCode()}
          startedAt={startedAt}
          pending={pending}
          globalMessage={split?.globalMessage ?? null}
          codeError={fieldError(split, "code")}
        />
      </AuthScreen>
    );
  }

  if (step === "reset-password") {
    return (
      <AuthScreen
        onBack={backToPhone}
        title={m.mobileHome.signIn.pickNewPassword}
        description={m.mobileHome.signIn.forPhoneOtherDevices(formattedPhone)}
        action={
          <Button
            label={m.mobileHome.signIn.saveAndSignIn}
            size="lg"
            pending={pending}
            disabled={!passwordMeetsMinimum(password)}
            onPress={() => void onSaveNewPassword()}
          />
        }
      >
        <FormErrorSummary message={split?.globalMessage} />
        <PasswordField
          label={m.mobileHome.fields.newPassword}
          strength
          autoFocus
          autoComplete="password-new"
          textContentType="newPassword"
          placeholder={m.mobileHome.fields.atLeastEightCharacters}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => void onSaveNewPassword()}
          editable={!pending}
          error={fieldError(split, "password")}
        />
      </AuthScreen>
    );
  }

  if (step === "code") {
    return (
      <AuthScreen
        onBack={backToPhone}
        title={m.mobileHome.code.enterTheCode}
        footer={
          <Text size="eyebrow" tone="muted">
            {m.mobileHome.code.expiryNumber}
          </Text>
        }
      >
        <CodeForm
          destination={formattedPhone}
          changeLabel={m.mobileHome.code.changeNumber}
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
      </AuthScreen>
    );
  }

  if (step === "name") {
    const preview =
      userDisplayName({ firstName, lastName }) ?? m.mobileHome.signIn.yourName;
    return (
      <AuthScreen
        onBack={backToPhone}
        progress={{ step: 1, total: 2 }}
        title={m.mobileHome.nameForm.title}
        description={m.profile.checklist.tasks.name.description}
        action={
          <Button
            label={m.common.continue}
            size="lg"
            pending={pending}
            onPress={() => void onSaveName()}
          />
        }
        footer={
          <Text size="eyebrow" tone="muted">
            {m.mobileHome.signIn.nameFooter}
          </Text>
        }
      >
        <FormErrorSummary message={split?.globalMessage} />
        <TextField
          label={m.mobileHome.fields.firstName}
          autoComplete="given-name"
          textContentType="givenName"
          autoFocus
          value={firstName}
          onChangeText={setFirstName}
          editable={!pending}
          error={fieldError(split, "firstName", "first_name")}
        />
        <TextField
          label={m.mobileHome.fields.lastName}
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
            {m.mobileHome.signIn.preview}
          </Text>
        </Surface>
      </AuthScreen>
    );
  }

  if (step === "new-password") {
    return (
      <AuthScreen
        onBack={() => {
          setStep("name");
          setSplit(null);
        }}
        progress={{ step: 2, total: 2 }}
        title={m.mobileHome.signIn.pickPassword}
        description={m.mobileHome.signIn.pickPasswordDescription}
        action={
          <Button
            label={m.mobileHome.signIn.createAccount}
            size="lg"
            pending={pending}
            disabled={!passwordMeetsMinimum(password)}
            onPress={() => void onCreateAccount()}
          />
        }
        footer={
          <Text size="eyebrow" tone="muted">
            {m.mobileHome.signIn.changeLaterFromSettings}
          </Text>
        }
      >
        <FormErrorSummary message={split?.globalMessage} />
        <PasswordField
          label={m.mobileHome.fields.password}
          strength
          autoFocus
          autoComplete="password-new"
          textContentType="newPassword"
          placeholder={m.mobileHome.fields.atLeastEightCharacters}
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
      title={m.mobileHome.signIn.whatsYourNumber}
      description={m.mobileHome.signIn.numberDescription}
      footer={
        <Text size="meta" tone="muted">
          {m.mobileHome.signIn.invitedToGroup}
        </Text>
      }
    >
      <FormErrorSummary message={split?.globalMessage} />
      <PhoneField
        label={m.mobileHome.fields.mobileNumber}
        countryIso={countryIso}
        national={national}
        onCountryIsoChange={setCountryIso}
        onNationalChange={setNational}
        error={fieldError(split, "identifier", "phone_number", "phoneNumber")}
        disabled={pending}
      />
      <Button
        label={m.common.continue}
        size="lg"
        pending={pending}
        disabled={!isLoaded}
        onPress={() => void onContinue()}
      />
      <TermsMicrocopy lead={m.mobileHome.signIn.smsRates} />
      <OauthButtons disabled={pending} />
    </AuthScreen>
  );
}
