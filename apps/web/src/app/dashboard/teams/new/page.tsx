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
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import {
  TEAM_CREATED_TOAST,
  TEAM_CREATE_DESCRIPTION,
  TEAM_CREATE_LABEL,
  TEAM_NAME_HINT,
  TEAM_NAME_LABEL,
  teamNameInput,
} from "@repo/domain/teams";
import { api } from "~/trpc/react";

const FIELD_IDS = { name: "team-name" };

export default function NewTeamPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");

  const createTeam = api.teams.create.useMutation({
    onSuccess: async (team) => {
      toast.success(TEAM_CREATED_TOAST);
      await utils.teams.mine.invalidate();
      router.push(`/dashboard/teams/${team.id}`);
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(error, FIELD_IDS, summaryRef.current);
    },
  });

  const nameError = fieldErrorMessage(createTeam.error, "name");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createTeam.isPending) {
      return;
    }
    createTeam.mutate({
      name: teamNameInput(name),
      sport: "padel",
    });
  }

  return (
    <DashboardShell
      title={TEAM_CREATE_LABEL}
      description={TEAM_CREATE_DESCRIPTION}
    >
      <Card variant="outlined" className="w-full">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(createTeam.error)}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="team-name">{TEAM_NAME_LABEL}</FieldLabel>
              <Input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "team-name-error" : undefined}
              />
              <FieldDescription>{TEAM_NAME_HINT}</FieldDescription>
              <FieldError id="team-name-error">{nameError}</FieldError>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? "Creating…" : TEAM_CREATE_LABEL}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/teams">Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
