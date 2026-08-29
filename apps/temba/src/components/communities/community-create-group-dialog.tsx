"use client";

import { useEffect, useRef } from "react";

import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";

export function CommunityCreateGroupDialog({
  open,
  onOpenChange,
  pending,
  publicPending,
  privatePending,
  publicError,
  privateError,
  onCreatePublic,
  onCreatePrivate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  publicPending: boolean;
  privatePending: boolean;
  publicError?: {
    message: string;
    data?: { zodError?: unknown } | null;
  } | null;
  privateError?: {
    message: string;
    data?: { zodError?: unknown } | null;
  } | null;
  onCreatePublic: (name: string) => void;
  onCreatePrivate: (name: string) => void;
}) {
  const publicSummaryRef = useRef<HTMLDivElement>(null);
  const privateSummaryRef = useRef<HTMLDivElement>(null);
  const publicNameError = fieldErrorMessage(publicError, "name");
  const privateNameError = fieldErrorMessage(privateError, "name");

  useEffect(() => {
    if (!publicError) {
      return;
    }
    focusFormFailure(
      publicError,
      { name: "club-group-public-name" },
      publicSummaryRef.current,
    );
  }, [publicError]);

  useEffect(() => {
    if (!privateError) {
      return;
    }
    focusFormFailure(
      privateError,
      { name: "club-group-private-name" },
      privateSummaryRef.current,
    );
  }, [privateError]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create Club Group</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Owner or Admin only. Sport is padel.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-8 px-4 pb-4 md:px-0 md:pb-0">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (pending) {
                return;
              }
              const formData = new FormData(event.currentTarget);
              const nameValue = formData.get("name");
              if (typeof nameValue !== "string") {
                return;
              }
              const name = nameValue.trim();
              if (!name) {
                return;
              }
              onCreatePublic(name);
            }}
          >
            <h3 className="text-title font-semibold">Club Group Public</h3>
            <p className="text-body text-muted-foreground">
              Open to Community members. You join as a Group member.
            </p>
            <FormErrorSummary
              ref={publicSummaryRef}
              message={globalFormErrorMessage(publicError)}
            />
            <Field>
              <FieldLabel htmlFor="club-group-public-name">Name</FieldLabel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Input
                  id="club-group-public-name"
                  name="name"
                  required
                  maxLength={255}
                  className="flex-1"
                  aria-invalid={publicNameError ? true : undefined}
                  aria-describedby={
                    publicNameError ? "club-group-public-name-error" : undefined
                  }
                />
                <Button type="submit" disabled={pending}>
                  {publicPending ? "Creating…" : "Create Public"}
                </Button>
              </div>
              <FieldError id="club-group-public-name-error">
                {publicNameError}
              </FieldError>
            </Field>
          </form>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (pending) {
                return;
              }
              const formData = new FormData(event.currentTarget);
              const nameValue = formData.get("name");
              if (typeof nameValue !== "string") {
                return;
              }
              const name = nameValue.trim();
              if (!name) {
                return;
              }
              onCreatePrivate(name);
            }}
          >
            <h3 className="text-title font-semibold">Club Group Private</h3>
            <p className="text-body text-muted-foreground">
              Owner or Admin can send Lookup invites and copy Invite links. The
              Group creator may Lookup existing Members only.
            </p>
            <FormErrorSummary
              ref={privateSummaryRef}
              message={globalFormErrorMessage(privateError)}
            />
            <Field>
              <FieldLabel htmlFor="club-group-private-name">Name</FieldLabel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Input
                  id="club-group-private-name"
                  name="name"
                  required
                  maxLength={255}
                  className="flex-1"
                  aria-invalid={privateNameError ? true : undefined}
                  aria-describedby={
                    privateNameError
                      ? "club-group-private-name-error"
                      : undefined
                  }
                />
                <Button type="submit" disabled={pending}>
                  {privatePending ? "Creating…" : "Create Private"}
                </Button>
              </div>
              <FieldError id="club-group-private-name-error">
                {privateNameError}
              </FieldError>
            </Field>
          </form>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
