"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthLoading } from "~/components/auth/auth-loading";
import { AuthScreen } from "~/components/auth/auth-screen";
import { useLocale, useMessages } from "~/components/locale-provider";
import { NotNowLink, TaskActions } from "~/components/onboarding/task-actions";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  globalFormErrorMessage,
  type SplitFormError,
} from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import {
  validateUserNames,
  type NameFieldErrors,
} from "@repo/domain/user-display-name";

const FIELD_IDS = {
  firstName: "profile-name-first",
  lastName: "profile-name-last",
};

function Fields({
  user,
  backHref,
}: {
  user: {
    firstName: string | null;
    lastName: string | null;
    update: (params: {
      firstName: string;
      lastName: string;
    }) => Promise<unknown>;
  };
  backHref: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [firstName, setFirstName] = React.useState(user.firstName ?? "");
  const [lastName, setLastName] = React.useState(user.lastName ?? "");
  const [fieldErrors, setFieldErrors] = React.useState<NameFieldErrors>({});
  const [clerkError, setClerkError] = React.useState<SplitFormError | null>(
    null,
  );
  const [savingClerk, setSavingClerk] = React.useState(false);
  const setName = api.users.setName.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      await utils.users.invalidate();
      router.replace(backHref);
    },
  });

  const pending = savingClerk || setName.isPending || setName.isSuccess;
  const globalMessage =
    clerkError?.globalMessage ?? globalFormErrorMessage(setName.error);
  const firstNameError =
    fieldErrors.firstName ??
    clerkError?.fieldErrors.first_name ??
    clerkError?.fieldErrors.firstName;
  const lastNameError =
    fieldErrors.lastName ??
    clerkError?.fieldErrors.last_name ??
    clerkError?.fieldErrors.lastName;

  React.useEffect(() => {
    if (!globalMessage) {
      return;
    }
    summaryRef.current?.focus();
  }, [globalMessage]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const names = validateUserNames({ firstName, lastName }, locale);
    if (!names.ok) {
      setFieldErrors(names.fieldErrors);
      document
        .getElementById(
          names.fieldErrors.firstName
            ? FIELD_IDS.firstName
            : FIELD_IDS.lastName,
        )
        ?.focus();
      return;
    }
    setFieldErrors({});
    setClerkError(null);
    setSavingClerk(true);
    try {
      // Clerk first, then our row, so both agree before the webhook lands.
      await user.update({
        firstName: names.firstName,
        lastName: names.lastName,
      });
    } catch (err) {
      setClerkError(splitClerkAuthError(err, locale));
      setSavingClerk(false);
      return;
    }
    setSavingClerk(false);
    setName.mutate({ firstName: names.firstName, lastName: names.lastName });
  }

  return (
    <AuthScreen
      backHref={backHref}
      backLabel={m.common.back}
      eyebrow={m.webAuth.onboarding.eyebrow.name}
      title={m.webAuth.onboarding.name.title}
      description={m.webAuth.onboarding.name.description}
    >
      <form className="flex flex-col gap-[18px]" onSubmit={onSubmit} noValidate>
        <FormErrorSummary ref={summaryRef} message={globalMessage} />
        <FieldGroup className="gap-[18px]">
          <Field>
            <FieldLabel
              htmlFor={FIELD_IDS.firstName}
              className="text-meta text-muted-foreground"
            >
              {m.webAuth.phoneAuth.firstName}
            </FieldLabel>
            <Input
              id={FIELD_IDS.firstName}
              name="firstName"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              aria-invalid={Boolean(firstNameError)}
              aria-describedby={
                firstNameError ? `${FIELD_IDS.firstName}-error` : undefined
              }
              size="lg"
              disabled={pending}
            />
            {firstNameError ? (
              <FieldError id={`${FIELD_IDS.firstName}-error`}>
                {firstNameError}
              </FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel
              htmlFor={FIELD_IDS.lastName}
              className="text-meta text-muted-foreground"
            >
              {m.webAuth.phoneAuth.lastName}
            </FieldLabel>
            <Input
              id={FIELD_IDS.lastName}
              name="lastName"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              aria-invalid={Boolean(lastNameError)}
              aria-describedby={
                lastNameError ? `${FIELD_IDS.lastName}-error` : undefined
              }
              size="lg"
              disabled={pending}
            />
            {lastNameError ? (
              <FieldError id={`${FIELD_IDS.lastName}-error`}>
                {lastNameError}
              </FieldError>
            ) : null}
          </Field>
        </FieldGroup>
        <TaskActions>
          <Button
            type="submit"
            size="lg"
            pending={pending}
            pendingLabel={m.common.saving}
            className="w-full font-semibold"
          >
            {m.webAuth.onboarding.name.saveName}
          </Button>
          <NotNowLink href={backHref} disabled={pending} />
        </TaskActions>
      </form>
    </AuthScreen>
  );
}

/** The "Add your name" Profile task: Clerk first, then `users.setName`. */
export function NameTask({ backHref }: { backHref: string }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return (
      <AuthScreen brand>
        <AuthLoading />
      </AuthScreen>
    );
  }

  return <Fields user={user} backHref={backHref} />;
}
