"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import type { GroupType } from "~/server/groups";

const FIELD_IDS = { name: "group-name", visibility: "group-type" };

export default function NewLooseGroupPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [visibility, setVisibility] = React.useState<GroupType>("public");

  const createLoosePublic = api.groups.createLoosePublic.useMutation({
    onSuccess: async (group) => {
      toast.success("Group created");
      await utils.groups.mine.invalidate();
      router.push(`/dashboard/groups/${group.id}`);
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(error, FIELD_IDS, summaryRef.current);
    },
  });

  const createLoosePrivate = api.groups.createLoosePrivate.useMutation({
    onSuccess: async (group) => {
      toast.success("Group Private created");
      await utils.groups.mine.invalidate();
      router.push(`/dashboard/groups/${group.id}`);
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(error, FIELD_IDS, summaryRef.current);
    },
  });

  const isPending = createLoosePublic.isPending || createLoosePrivate.isPending;
  const submitError = createLoosePublic.error ?? createLoosePrivate.error;
  const nameError = fieldErrorMessage(submitError, "name");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    if (visibility === "private") {
      createLoosePrivate.mutate({ name, sport: "padel" });
      return;
    }
    createLoosePublic.mutate({ name, sport: "padel" });
  }

  return (
    <DashboardShell
      title="Create Group"
      description="A squad outside any Community. Public joins via the Group URL; Private uses Lookup invites and 6-hour Invite links. You become a Group member."
    >
      <Card variant="outlined" className="w-full">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(submitError)}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="group-name">Name</FieldLabel>
              <Input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={255}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "group-name-error" : undefined}
              />
              <FieldError id="group-name-error">{nameError}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="group-type">Type</FieldLabel>
              <Select
                value={visibility}
                onValueChange={(value) =>
                  setVisibility(value as GroupType)
                }
              >
                <SelectTrigger id="group-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    Public (open-with-link)
                  </SelectItem>
                  <SelectItem value="private">
                    Private (Lookup invite + Invite link)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {visibility === "private"
                  ? "Only you can send Lookup invites and copy Invite links."
                  : "Share the Group URL. Anyone with the link can join."}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create Group"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/groups">Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
