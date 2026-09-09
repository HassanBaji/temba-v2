"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { OauthButtons } from "~/components/auth/oauth-buttons";
import { PhoneField } from "~/components/auth/phone-field";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import { authAppPathUrl, authCompleteUrl } from "~/lib/auth-redirect";
import {
  CLERK_AUTH_ERROR_COPY,
  splitClerkAuthError,
} from "~/lib/clerk-auth-error";
import type { SplitFormError } from "~/lib/form-mutation-error";
import { DEFAULT_CALLING_COUNTRY_ISO, assembleE164 } from "~/lib/phone-number";
import { cn } from "~/lib/utils";

const FIELD_IDS = {
  identifier: "sign-in-identifier",
  password: "sign-in-password",
};

const AUTH_INPUT_CLASS =
  "border-rule h-13 min-h-13 rounded-lg px-4 text-base md:text-base focus-visible:border-ink focus-visible:ring-0";

function splitSignInError(err: unknown): SplitFormError {
  const split = splitClerkAuthError(err);
  const identifierMessage = split.fieldErrors.identifier;
  if (identifierMessage === CLERK_AUTH_ERROR_COPY.form_identifier_not_found) {
    const rest = { ...split.fieldErrors };
    delete rest.identifier;
    return {
      fieldErrors: rest,
      globalMessage:
        CLERK_AUTH_ERROR_COPY.form_identifier_not_found ??
        "No account matches that. Try a different one, or create an account.",
    };
  }
  return split;
}

type IdentifierMode = "username" | "phone";

export function SignInForm({ redirectUrl }: { redirectUrl: string | null }) {
  const router = useRouter();
  const { setActive } = useClerk();
  const { signIn, isLoaded } = useSignIn();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [mode, setMode] = React.useState<IdentifierMode>("username");
  const [username, setUsername] = React.useState("");
  const [countryIso, setCountryIso] = React.useState(
    DEFAULT_CALLING_COUNTRY_ISO,
  );
  const [national, setNational] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [split, setSplit] = React.useState<SplitFormError | null>(null);
  const shouldFocusIdentifier = React.useRef(false);

  const identifierError = split?.fieldErrors.identifier;
  const passwordError = split?.fieldErrors.password;
  const completeUrl = authCompleteUrl(redirectUrl);
  const usePhone = mode === "phone";

  React.useLayoutEffect(() => {
    if (!shouldFocusIdentifier.current) {
      return;
    }
    shouldFocusIdentifier.current = false;
    document.getElementById(FIELD_IDS.identifier)?.focus();
  }, [mode]);

  function switchMode() {
    shouldFocusIdentifier.current = true;
    setMode(usePhone ? "username" : "phone");
    setSplit(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !signIn) {
      return;
    }
    let identifier = username.trim();
    if (usePhone) {
      const assembled = assembleE164(countryIso, national);
      if (!assembled.ok) {
        const next: SplitFormError = {
          fieldErrors: {
            identifier:
              CLERK_AUTH_ERROR_COPY.form_param_format_invalid ??
              "That doesn't look right. Check the format and try again.",
          },
          globalMessage: null,
        };
        setSplit(next);
        document.getElementById(FIELD_IDS.identifier)?.focus();
        return;
      }
      identifier = assembled.e164;
    }
    setPending(true);
    setSplit(null);
    try {
      const result = await signIn.create({ identifier, password });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({
          session: result.createdSessionId,
          redirectUrl: completeUrl,
        });
        router.replace(completeUrl);
        return;
      }
      if (result.status === "needs_second_factor") {
        router.push(authAppPathUrl("/login/factor-two", redirectUrl));
        return;
      }
      setPending(false);
      setSplit({
        fieldErrors: {},
        globalMessage: "Something went wrong. Try again.",
      });
      summaryRef.current?.focus();
    } catch (err) {
      const next = splitSignInError(err);
      setSplit(next);
      setPending(false);
      const firstField = Object.keys(next.fieldErrors)[0];
      if (firstField === "identifier" || firstField === "password") {
        document.getElementById(FIELD_IDS[firstField])?.focus();
        return;
      }
      summaryRef.current?.focus();
    }
  }

  return (
    <form className="flex flex-col gap-[18px]" onSubmit={onSubmit} noValidate>
      <FormErrorSummary ref={summaryRef} message={split?.globalMessage} />
      <FieldGroup className="gap-[18px]">
        <Field>
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel
              htmlFor={FIELD_IDS.identifier}
              className="text-meta text-muted-foreground"
            >
              {usePhone ? "Mobile number" : "Username"}
            </FieldLabel>
            <button
              type="button"
              className="text-body text-ink underline"
              onClick={switchMode}
              disabled={pending}
            >
              {usePhone ? "Use username" : "Use phone"}
            </button>
          </div>
          {usePhone ? (
            <PhoneField
              id={FIELD_IDS.identifier}
              name="identifier"
              countryIso={countryIso}
              national={national}
              onCountryIsoChange={setCountryIso}
              onNationalChange={setNational}
              invalid={Boolean(identifierError)}
              describedBy={
                identifierError ? `${FIELD_IDS.identifier}-error` : undefined
              }
              disabled={pending}
            />
          ) : (
            <Input
              id={FIELD_IDS.identifier}
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              aria-invalid={Boolean(identifierError)}
              aria-describedby={
                identifierError ? `${FIELD_IDS.identifier}-error` : undefined
              }
              className={cn(AUTH_INPUT_CLASS)}
              disabled={pending}
            />
          )}
          {identifierError ? (
            <FieldError id={`${FIELD_IDS.identifier}-error`}>
              {identifierError}
            </FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel
            htmlFor={FIELD_IDS.password}
            className="text-meta text-muted-foreground"
          >
            Password
          </FieldLabel>
          <Input
            id={FIELD_IDS.password}
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={
              passwordError ? `${FIELD_IDS.password}-error` : undefined
            }
            className={cn(AUTH_INPUT_CLASS)}
            disabled={pending}
          />
          {passwordError ? (
            <FieldError id={`${FIELD_IDS.password}-error`}>
              {passwordError}
            </FieldError>
          ) : null}
        </Field>
      </FieldGroup>
      <p>
        <Link
          href={authAppPathUrl("/login/reset-password", redirectUrl)}
          className="text-body text-ink underline"
        >
          Forgot password
        </Link>
      </p>
      <Button
        type="submit"
        size="auth"
        aria-busy={pending}
        disabled={!isLoaded || pending}
        className="bg-ink text-paper hover:bg-dimrule w-full font-semibold"
      >
        Sign in
      </Button>
      <OauthButtons flow="sign-in" redirectUrl={redirectUrl} />
    </form>
  );
}
