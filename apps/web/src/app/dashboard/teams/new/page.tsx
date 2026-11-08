"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Section } from "~/components/layout/section";
import { TileChoices } from "~/components/onboarding/onboarding-choices";
import { TeamAddPlayersDialog } from "~/components/teams/team-add-players-dialog";
import { TeamRosterDraftList } from "~/components/teams/team-roster-draft-list";
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
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { DEFAULT_SPORT, isSport, type Sport } from "@repo/domain/sport";
import {
  addDraftInvites,
  addDraftPhone,
  EMPTY_TEAM_ROSTER_DRAFT,
  removeDraftRow,
  rosterDraftCreateInput,
  rosterDraftForSport,
  rosterDraftSpotsLeft,
  rosterDraftView,
  teamSportChoices,
  type TeamRosterDraft,
} from "@repo/domain/team-roster-draft";
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
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [pickedSport, setSport] = React.useState<Sport>(DEFAULT_SPORT);
  const [draft, setDraft] = React.useState<TeamRosterDraft>(
    EMPTY_TEAM_ROSTER_DRAFT,
  );
  const [addOpen, setAddOpen] = React.useState(false);

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
  const organized = api.games.listCreateGroups.useQuery();
  const groups = (organized.data ?? [])
    .filter((group) => group.sport === sport)
    .sort((a, b) => Number(b.id === tag?.id) - Number(a.id === tag?.id));

  const fitted = rosterDraftForSport(draft, sport);
  const roster = rosterDraftView(
    fitted,
    { sport, captainName: m.common.you, groupName: tag?.name ?? null },
    locale,
  );

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
    createTeam.mutate(
      rosterDraftCreateInput({ name, sport, groupId: tag?.id }, fitted),
    );
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
            {tag ? (
              <p className="text-body text-muted-foreground">
                {m.team.groupTag.createNote(tag.name)}
              </p>
            ) : (
              <Field>
                <FieldTitle id="team-sport-label">
                  {m.team.sportLabel}
                </FieldTitle>
                <div id={FIELD_IDS.sport}>
                  <TileChoices
                    label={m.team.sportLabel}
                    choices={teamSportChoices(locale)}
                    value={sport}
                    onSelect={(next) => {
                      setSport(next);
                      setDraft((current) => rosterDraftForSport(current, next));
                    }}
                  />
                </div>
                {roster.helper ? (
                  <FieldDescription>{roster.helper}</FieldDescription>
                ) : null}
              </Field>
            )}
          </FieldGroup>

          <Section title={m.team.roster.title}>
            <TeamRosterDraftList
              roster={roster}
              onAddMore={() => setAddOpen(true)}
              onRemove={(key) =>
                setDraft((current) => removeDraftRow(current, key))
              }
              disabled={createTeam.isPending}
            />
          </Section>

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

      <TeamAddPlayersDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        sport={sport}
        spotsLeft={rosterDraftSpotsLeft(fitted, sport)}
        groups={groups}
        target={{
          kind: "draft",
          listedUserIds: fitted.invites.map((invite) => invite.userId),
          listedPhones: fitted.phones.map((phone) => phone.e164),
          onAddPhone: (phone) =>
            setDraft((current) => addDraftPhone(current, phone, sport)),
          onAddInvites: (invites) =>
            setDraft((current) => addDraftInvites(current, invites, sport)),
        }}
      />
    </DashboardShell>
  );
}
