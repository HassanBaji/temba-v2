"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  splitClerkAuthError,
  type SplitClerkAuthError,
} from "@repo/domain/clerk-auth-error";

const FIELD_IDS = {
  current: "settings-password-current",
  next: "settings-password-new",
};

type PasswordUser = {
  passwordEnabled: boolean;
  updatePassword: (params: {
    currentPassword?: string;
    newPassword: string;
  }) => Promise<unknown>;
};

/** Change, or first set, the Clerk password on the account. */
export function PasswordDialog({
  open,
  onOpenChange,
  user,
  restoreFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PasswordUser;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.webYou.settings;
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<SplitClerkAuthError | null>(null);
  const needsCurrent = user.passwordEnabled;
  const currentError =
    error?.fieldErrors.current_password ?? error?.fieldErrors.currentPassword;
  const nextError =
    error?.fieldErrors.new_password ??
    error?.fieldErrors.newPassword ??
    error?.fieldErrors.password;

  React.useEffect(() => {
    if (!open) {
      setCurrent("");
      setNext("");
      setError(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (error?.globalMessage) {
      summaryRef.current?.focus();
    }
  }, [error]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || next === "" || (needsCurrent && current === "")) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await user.updatePassword({
        ...(needsCurrent ? { currentPassword: current } : {}),
        newPassword: next,
      });
      toast.success(copy.passwordSaved);
      onOpenChange(false);
    } catch (err) {
      setError(splitClerkAuthError(err, locale));
    } finally {
      setPending(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(value) => {
        if (pending && !value) {
          return;
        }
        onOpenChange(value);
      }}
    >
      <ResponsiveDialogContent restoreFocusRef={restoreFocusRef}>
        <form onSubmit={onSubmit} className="contents" noValidate>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {needsCurrent ? copy.changePassword : copy.setPassword}
            </ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <div className="flex flex-col gap-4 px-4 pb-4 md:px-0 md:pb-0">
            <FormErrorSummary
              ref={summaryRef}
              message={error?.globalMessage ?? null}
            />
            {needsCurrent ? (
              <Field>
                <FieldLabel htmlFor={FIELD_IDS.current}>
                  {copy.currentPassword}
                </FieldLabel>
                <Input
                  id={FIELD_IDS.current}
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  aria-invalid={Boolean(currentError)}
                  aria-describedby={
                    currentError ? `${FIELD_IDS.current}-error` : undefined
                  }
                  disabled={pending}
                />
                {currentError ? (
                  <FieldError id={`${FIELD_IDS.current}-error`}>
                    {currentError}
                  </FieldError>
                ) : null}
              </Field>
            ) : null}
            <Field>
              <FieldLabel htmlFor={FIELD_IDS.next}>
                {copy.newPassword}
              </FieldLabel>
              <Input
                id={FIELD_IDS.next}
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
                aria-invalid={Boolean(nextError)}
                aria-describedby={
                  nextError ? `${FIELD_IDS.next}-error` : undefined
                }
                disabled={pending}
              />
              {nextError ? (
                <FieldError id={`${FIELD_IDS.next}-error`}>
                  {nextError}
                </FieldError>
              ) : null}
            </Field>
          </div>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              {m.common.cancel}
            </Button>
            <Button
              type="submit"
              className="min-h-11"
              pending={pending}
              pendingLabel={m.common.saving}
              disabled={next === "" || (needsCurrent && current === "")}
            >
              {copy.savePassword}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
