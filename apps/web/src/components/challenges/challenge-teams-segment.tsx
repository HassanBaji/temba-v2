"use client";

import Link from "next/link";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { Section } from "~/components/layout/section";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import {
  teamCardView,
  teamCreateFromGroupOptions,
  type TeamCardInput,
  type TeamGroupTagInput,
} from "@repo/domain/teams";

const NEW_TEAM_HREF = "/dashboard/teams/new";

function newTeamHref(groupId?: string) {
  return groupId
    ? `${NEW_TEAM_HREF}?groupId=${encodeURIComponent(groupId)}`
    : NEW_TEAM_HREF;
}

export type ChallengeTeamInvite = {
  id: string;
  displayName: string;
  invitedBy: { name: string | null };
};

function RecordTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      aria-hidden="true"
      className="border-border flex min-w-14 flex-col items-center rounded-md border px-2.5 py-1.5"
    >
      <span className="text-body font-semibold tabular-nums">{value}</span>
      <span className="text-eyebrow text-muted-foreground font-mono uppercase">
        {label}
      </span>
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
  const copy = m.challenge.teams;
  if (error) {
    return (
      <Section title={copy.invitedTitle}>
        <ErrorState
          headingLevel={3}
          className="py-6"
          title={m.invite.inbox.errorTitle}
          message={error.message}
          onRetry={onRetry}
        />
      </Section>
    );
  }
  if (!invites || invites.length === 0) {
    return null;
  }
  return (
    <Section title={copy.invitedTitle}>
      <RowList>
        {invites.map((invite) => (
          <ListRow
            key={invite.id}
            stackTrailing
            leading={<EntityMonogram name={invite.displayName} size="lg" />}
            title={invite.displayName}
            meta={copy.invitedBy(
              invite.invitedBy.name ?? m.team.memberFallback,
            )}
            trailing={
              <Button
                type="button"
                aria-label={copy.joinA11y(invite.displayName)}
                pending={acceptingId === invite.id}
                onClick={() => onAccept(invite.id)}
              >
                {copy.join}
              </Button>
            }
          />
        ))}
      </RowList>
    </Section>
  );
}

/** 1d: the first Team drawn as a hatched crest, then the ways to make one. */
function NoTeamYet({
  organizedGroups,
}: {
  organizedGroups: readonly TeamGroupTagInput[];
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.challenge.teams;
  return (
    <div className="border-border space-y-4 rounded-lg border p-5">
      <div className="flex items-center gap-3">
        <Hatch radius="md" className="block size-10 shrink-0" />
        <Hatch radius="sm" className="block h-3 min-w-0 flex-1" />
      </div>
      <div className="space-y-2">
        <h2 className="text-title font-semibold">{copy.emptyTitle}</h2>
        <p className="text-body text-muted-foreground">{copy.emptyCopy}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={newTeamHref()}>{copy.createFirst}</Link>
        </Button>
        {teamCreateFromGroupOptions(organizedGroups, locale).map((option) => (
          <Button key={option.groupId} asChild variant="outline">
            <Link href={newTeamHref(option.groupId)}>{option.label}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ChallengeTeamsSegment({
  teams,
  teamsLoading,
  teamsError,
  invites,
  invitesError,
  organizedGroups,
  acceptingId,
  onAccept,
  onRetryTeams,
  onRetryInvites,
}: {
  teams: TeamCardInput[] | undefined;
  teamsLoading: boolean;
  teamsError: { message: string } | null;
  invites: ChallengeTeamInvite[] | undefined;
  invitesError: { message: string } | null;
  organizedGroups: readonly TeamGroupTagInput[];
  acceptingId: string | null;
  onAccept: (inviteId: string) => void;
  onRetryTeams: () => void;
  onRetryInvites: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.challenge.teams;
  const invited = (invites?.length ?? 0) > 0;
  const createTeam = (
    <Button asChild variant="outline">
      <Link href={newTeamHref()}>{copy.createTeam}</Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      <InvitedTo
        invites={invites}
        error={invitesError}
        acceptingId={acceptingId}
        onAccept={onAccept}
        onRetry={onRetryInvites}
      />

      {teamsLoading ? <ListPageSkeleton rows={3} /> : null}

      {teamsError ? (
        <ErrorState
          title={m.team.errorTitle}
          message={teamsError.message}
          onRetry={onRetryTeams}
        />
      ) : null}

      {teams?.length === 0 ? (
        invited ? (
          createTeam
        ) : (
          <NoTeamYet organizedGroups={organizedGroups} />
        )
      ) : null}

      {teams && teams.length > 0 ? (
        <div className="space-y-4">
          <RowList>
            {teams.map((team) => {
              const card = teamCardView(team, locale);
              return (
                <ListRow
                  key={card.id}
                  asChild
                  leading={<EntityMonogram name={card.title} size="lg" />}
                  title={card.title}
                  meta={card.line}
                  trailing={
                    <RecordTile
                      label={card.record.label}
                      value={card.record.value}
                    />
                  }
                >
                  <Link
                    href={`/dashboard/teams/${card.id}`}
                    aria-label={card.accessibilityLabel}
                  />
                </ListRow>
              );
            })}
          </RowList>
          {createTeam}
        </div>
      ) : null}
    </div>
  );
}
