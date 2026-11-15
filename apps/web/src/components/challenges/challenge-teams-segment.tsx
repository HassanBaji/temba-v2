"use client";

import Link from "next/link";
import { EyeIcon, MailIcon, PlusIcon, UsersIcon } from "lucide-react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { Surface } from "~/components/ui/surface";
import {
  challengeTeamInviteView,
  challengeTeamRowView,
  type ChallengeTeamInviteInput,
  type ChallengeTeamRowInput,
} from "@repo/domain/challenges-tab";
import {
  teamCreateFromGroupOptions,
  type TeamGroupTagInput,
} from "@repo/domain/teams";

const NEW_TEAM_HREF = "/dashboard/teams/new";

function newTeamHref(groupId?: string) {
  return groupId
    ? `${NEW_TEAM_HREF}?groupId=${encodeURIComponent(groupId)}`
    : NEW_TEAM_HREF;
}

const LIST_FRAME =
  "border-rule divide-rule bg-paper divide-y overflow-hidden rounded-card border";

const ROW = "flex items-center gap-3 px-4 py-3.5";

export type ChallengeTeamInvite = ChallengeTeamInviteInput;

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 pb-2.5">
      <h2 className="font-expanded text-title">{title}</h2>
      {hint ? <p className="text-meta text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function InvitedTo({
  invites,
  error,
  acceptingId,
  onAccept,
  onRetry,
}: {
  invites: ChallengeTeamInvite[] | undefined;
  error: { message: string } | null;
  acceptingId: string | null;
  onAccept: (inviteId: string) => void;
  onRetry: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.challenge.teams;
  if (error) {
    return (
      <section>
        <SectionHead title={copy.invitedTitle} />
        <ErrorState
          headingLevel={3}
          className="py-6"
          title={m.invite.inbox.errorTitle}
          error={error}
          onRetry={onRetry}
        />
      </section>
    );
  }
  if (!invites || invites.length === 0) {
    return null;
  }
  return (
    <section>
      <SectionHead
        title={copy.invitedTitle}
        hint={m.challenge.tab.teams.pending(invites.length)}
      />
      <ul className={LIST_FRAME}>
        {invites.map((invite) => {
          const view = challengeTeamInviteView(invite, locale);
          return (
            <li key={view.id} className={ROW}>
              <EntityMonogram name={view.title} size="xl" tone="control" />
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold">{view.title}</p>
                <p className="text-eyebrow text-muted-foreground mt-0.5">
                  {view.line}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8.5 min-h-8.5 text-meta font-semibold"
                aria-label={view.joinA11y}
                pending={acceptingId === view.id}
                onClick={() => onAccept(view.id)}
              >
                {copy.join}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 1d's tiles: you, then the seats a padel pair and a football side still need. */
function SeatsSketch({ viewerName }: { viewerName: string | null }) {
  const m = useMessages();
  const you = viewerName ?? m.challenge.tab.teams.you;
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-2.5">
      <span className="flex gap-1">
        <EntityMonogram name={you} size="md" tone="inverse" />
        <Hatch tone="ink" radius="md" className="size-8.5 block" />
      </span>
      <span className="text-eyebrow text-dim">
        {m.challenge.tab.sports.padel}
      </span>
      <span className="bg-dimrule mx-1 h-6 w-px" />
      <span className="flex gap-1">
        <EntityMonogram name={you} size="2xs" tone="inverse" />
        {Array.from({ length: 5 }, (_, index) => (
          <Hatch
            key={index}
            tone="ink"
            radius="slot"
            className="block size-5"
          />
        ))}
      </span>
      <span className="text-eyebrow text-dim">
        {m.challenge.tab.sports.football}
      </span>
    </div>
  );
}

/** 1d: no Team yet. The ways to make one on black, then what you can do until then. */
function NoTeamYet({
  organizedGroups,
  viewerName,
  invited,
}: {
  organizedGroups: readonly TeamGroupTagInput[];
  viewerName: string | null;
  invited: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.challenge.tab.teams;
  return (
    <>
      <Surface
        tone="ink"
        radius="surface"
        className="gap-4.5 py-5.5 flex flex-col rounded-[18px] px-5"
      >
        <div>
          <h2 className="font-expanded text-h2 leading-[1.05]">
            {copy.emptyTitle}
          </h2>
          <p className="text-body text-dim mt-2 leading-normal">
            {copy.emptyCopy}
          </p>
        </div>
        <SeatsSketch viewerName={viewerName} />
        <Button
          asChild
          variant="inverse"
          className="text-body h-12.5 rounded-lg font-semibold"
        >
          <Link href={newTeamHref()}>{m.challenge.teams.createFirst}</Link>
        </Button>
        {teamCreateFromGroupOptions(organizedGroups, locale).map((option) => (
          <Button
            key={option.groupId}
            asChild
            variant="outline-inverse"
            className="h-12 rounded-lg font-normal"
          >
            <Link href={newTeamHref(option.groupId)}>
              <UsersIcon aria-hidden="true" />
              {option.label}
            </Link>
          </Button>
        ))}
      </Surface>
      <section>
        <p className="text-meta text-muted-foreground pb-2.5">
          {copy.untilThen}
        </p>
        <ul className={LIST_FRAME}>
          <li className={ROW}>
            <EyeIcon
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
            />
            <span className="text-meta text-muted-foreground leading-normal">
              {copy.browse}
            </span>
          </li>
          {invited ? null : (
            <li className={ROW}>
              <MailIcon
                aria-hidden="true"
                className="text-muted-foreground size-4 shrink-0"
              />
              <span className="text-meta text-muted-foreground leading-normal">
                {copy.invites}
              </span>
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

/** 1c: your Teams with their records, Create team, the Teams you're invited to, and the footnote. */
export function ChallengeTeamsSegment({
  teams,
  teamsLoading,
  teamsError,
  invites,
  invitesError,
  organizedGroups,
  viewerName = null,
  acceptingId,
  onAccept,
  onRetryTeams,
  onRetryInvites,
}: {
  teams: ChallengeTeamRowInput[] | undefined;
  teamsLoading: boolean;
  teamsError: { message: string } | null;
  invites: ChallengeTeamInvite[] | undefined;
  invitesError: { message: string } | null;
  organizedGroups: readonly TeamGroupTagInput[];
  viewerName?: string | null;
  acceptingId: string | null;
  onAccept: (inviteId: string) => void;
  onRetryTeams: () => void;
  onRetryInvites: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.challenge.teams;
  const invitedTo = (
    <InvitedTo
      invites={invites}
      error={invitesError}
      acceptingId={acceptingId}
      onAccept={onAccept}
      onRetry={onRetryInvites}
    />
  );

  if (teamsLoading) {
    return <ListPageSkeleton rows={3} />;
  }
  if (teamsError) {
    return (
      <ErrorState
        title={m.team.errorTitle}
        message={teamsError.message}
        onRetry={onRetryTeams}
      />
    );
  }
  if (!teams || teams.length === 0) {
    return (
      <div className="space-y-5.5">
        <NoTeamYet
          organizedGroups={organizedGroups}
          viewerName={viewerName}
          invited={(invites?.length ?? 0) > 0}
        />
        {invitedTo}
      </div>
    );
  }

  return (
    <div className="space-y-6.5">
      <div className="space-y-2.5">
        <ul className={LIST_FRAME}>
          {teams.map((team) => {
            const view = challengeTeamRowView(team, locale);
            return (
              <li key={view.id}>
                <Link
                  href={`/dashboard/teams/${view.id}`}
                  aria-label={view.accessibilityLabel}
                  className={`${ROW} hover:bg-muted/40 focus-visible:ring-ring/50 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset`}
                >
                  <EntityMonogram
                    name={view.title}
                    image={view.imageUrl}
                    size="xl"
                    tone="control"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-semibold">{view.title}</p>
                    <p className="text-eyebrow text-muted-foreground mt-0.5">
                      {view.line}
                    </p>
                  </div>
                  <div aria-hidden="true" className="shrink-0 text-end">
                    <p className="font-expanded text-lead">
                      {view.record.value}
                    </p>
                    <p className="text-eyebrow text-muted-foreground">
                      {view.record.label}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <Button
          asChild
          variant="outline"
          className="border-rule h-12 w-full rounded-lg font-semibold shadow-none"
        >
          <Link href={newTeamHref()}>
            <PlusIcon aria-hidden="true" />
            {copy.createTeam}
          </Link>
        </Button>
      </div>
      {invitedTo}
      <p className="text-eyebrow text-muted-foreground leading-normal">
        {m.challenge.tab.teams.footnote}
      </p>
    </div>
  );
}
