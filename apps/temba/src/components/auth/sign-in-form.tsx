"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthScreen } from "~/components/auth/auth-screen";
import { OauthButtons } from "~/components/auth/oauth-buttons";
import { PhoneField } from "~/components/auth/phone-field";
import { Button, touchHitArea } from "~/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  authAppPathUrl,
  authCompleteUrl,
  authCrossLinkUrl,
} from "~/lib/auth-redirect";
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

function focusSplit(split: SplitFormError, summary: HTMLElement | null) {
  const firstField = Object.keys(split.fieldErrors)[0];
  if (firstField === "identifier" || firstField === "password") {
    document.getElementById(FIELD_IDS[firstField])?.focus();
    return;
  }
  summary?.focus();
}

const MODE_DESCRIPTIONS: Record<IdentifierMode, string> = {
  username: "Use your Temba username and password.",
  phone: "Use the number your Groups know you by.",
};

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

  // After render, so the input is enabled again and the summary is mounted.
  React.useEffect(() => {
    if (split) {
      focusSplit(split, summaryRef.current);
    }
  }, [split]);

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
    } catch (err) {
      setSplit(splitSignInError(err));
      setPending(false);
    }
  }

  return (
    <AuthScreen
      backHref={authCrossLinkUrl("/", redirectUrl)}
      backLabel="Back"
      crossLink={{
        href: authCrossLinkUrl("/signup", redirectUrl),
        label: "Create account",
      }}
      title="Sign in"
      description={MODE_DESCRIPTIONS[mode]}
      footer={
        <p className="text-meta text-muted-foreground">
          Invited to a Group? Open the invite link you were sent.
        </p>
      }
    >
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
                className={cn(
                  touchHitArea,
                  "text-body text-ink focus-visible:ring-ring/50 rounded-sm underline outline-none focus-visible:ring-[3px]",
                )}
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
                size="lg"
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
              size="lg"
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
            className={cn(touchHitArea, "text-body text-ink underline")}
          >
            Forgot password
          </Link>
        </p>
        <Button
          type="submit"
          size="lg"
          pending={pending}
          pendingLabel="Signing in…"
          disabled={!isLoaded}
          className="w-full font-semibold"
        >
          Sign in
        </Button>
        <OauthButtons flow="sign-in" redirectUrl={redirectUrl} />
      </form>
    </AuthScreen>
  );
}
