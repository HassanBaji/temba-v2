"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import { SportPicker } from "~/components/temba/sport-picker";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { teamCreateInput } from "@repo/domain/teams";
import { DEFAULT_SPORT, isSport, type Sport } from "@repo/domain/sport";
import { api } from "~/trpc/react";

const FIELD_IDS = { name: "team-name", sport: "team-sport" };

export default function NewTeamPage() {
  const m = useMessages();
  return (
    <React.Suspense
      fallback={
        <DashboardShell
          title={m.team.createLabel}
          description={m.team.createDescription}
        >
          {null}
        </DashboardShell>
      }
    >
      <NewTeamForm />
    </React.Suspense>
  );
}

function NewTeamForm() {
  const m = useMessages();
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [pickedSport, setSport] = React.useState<Sport>(DEFAULT_SPORT);

  const groupId = searchParams.get("groupId");
  const tagGroup = api.groups.byId.useQuery(
    { id: groupId ?? "" },
    { enabled: groupId != null },
  );
  const tag =
    groupId && tagGroup.data?.canCreateTeam && isSport(tagGroup.data.sport)
      ? {
          id: tagGroup.data.id,
          name: tagGroup.data.name ?? m.group.untitled,
          sport: tagGroup.data.sport,
        }
      : null;
  const sport = tag?.sport ?? pickedSport;

  const createTeam = api.teams.create.useMutation({
    onSuccess: async (team) => {
      toast.success(m.team.toast.created);
      await utils.teams.mine.invalidate();
      if (team.groupTag) {
        await utils.groups.byId.invalidate({ id: team.groupTag.id });
      }
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
    createTeam.mutate(teamCreateInput({ name, sport, groupId: tag?.id }));
  }

  return (
    <DashboardShell
      title={m.team.createLabel}
      description={m.team.createDescription}
    >
      <Card variant="outlined" className="w-full">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(createTeam.error)}
          />
          <FieldGroup>
            {tag ? (
              <p className="text-body text-muted-foreground">
                {m.team.groupTag.createNote(tag.name)}
              </p>
            ) : (
              <Field>
                <FieldTitle id="team-sport-label">
                  {m.team.sportLabel}
                </FieldTitle>
                <SportPicker
                  id={FIELD_IDS.sport}
                  labelledBy="team-sport-label"
                  value={sport}
                  onChange={setSport}
                  disabled={createTeam.isPending}
                />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="team-name">{m.team.nameLabel}</FieldLabel>
              <Input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={255}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "team-name-error" : undefined}
              />
              <FieldDescription>{m.team.nameHint}</FieldDescription>
              <FieldError id="team-name-error">{nameError}</FieldError>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={
                createTeam.isPending || (groupId != null && tagGroup.isLoading)
              }
            >
              {createTeam.isPending
                ? m.webDashboard.creating
                : m.team.createLabel}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/teams">{m.common.cancel}</Link>
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
