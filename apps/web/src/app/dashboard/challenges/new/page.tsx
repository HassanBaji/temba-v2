"use client";

import { ChallengePostForm } from "~/components/challenges/challenge-post-form";
import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";
import { use } from "react";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewChallengePage({
  searchParams,
}: {
  searchParams: Promise<{
    team?: string | string[];
    rematch?: string | string[];
  }>;
}) {
  const query = use(searchParams);
  const teamId = first(query.team);
  const opponentTeamId = first(query.rematch);
  const m = useMessages();
  return (
    <DashboardShell
      title={m.challenge.post.title}
      description={m.challenge.post.description}
    >
      <ChallengePostForm
        rematch={teamId && opponentTeamId ? { teamId, opponentTeamId } : null}
      />
    </DashboardShell>
  );
}
