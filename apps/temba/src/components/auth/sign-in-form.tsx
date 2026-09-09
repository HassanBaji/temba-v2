"use client";

import { useClerk } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { OauthButtons } from "~/components/auth/oauth-buttons";
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

export function SignInForm({ redirectUrl }: { redirectUrl: string | null }) {
  const router = useRouter();
  const { setActive } = useClerk();
  const { signIn, isLoaded } = useSignIn();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [split, setSplit] = React.useState<SplitFormError | null>(null);

  const identifierError = split?.fieldErrors.identifier;
  const passwordError = split?.fieldErrors.password;
  const completeUrl = authCompleteUrl(redirectUrl);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !signIn) {
      return;
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
          <FieldLabel
            htmlFor={FIELD_IDS.identifier}
            className="text-meta text-muted-foreground"
          >
            Email, username, or phone
          </FieldLabel>
          <Input
            id={FIELD_IDS.identifier}
            name="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            aria-invalid={Boolean(identifierError)}
            aria-describedby={
              identifierError ? `${FIELD_IDS.identifier}-error` : undefined
            }
            className={cn(AUTH_INPUT_CLASS)}
            disabled={pending}
          />
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
