"use client";

import { ChallengePostForm } from "~/components/challenges/challenge-post-form";
import { DashboardShell } from "~/components/dashboard-shell";
import { useMessages } from "~/components/locale-provider";

export default function NewChallengePage() {
  const m = useMessages();
  return (
    <DashboardShell
      title={m.challenge.post.title}
      description={m.challenge.post.description}
    >
      <ChallengePostForm />
    </DashboardShell>
  );
}
