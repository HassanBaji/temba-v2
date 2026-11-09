"use client";

import { ChallengePostForm } from "~/components/challenges/challenge-post-form";
import { DashboardShell } from "~/components/dashboard-shell";
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
  return (
    <DashboardShell width="content" hidePageHeader hideMobileTopBar>
      <ChallengePostForm
        teamId={first(query.team) ?? null}
        opponentTeamId={first(query.rematch) ?? null}
      />
    </DashboardShell>
  );
}
