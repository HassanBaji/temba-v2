"use client";

import { Section } from "~/components/layout/section";
import { useLocale, useMessages } from "~/components/locale-provider";
import { challengeCardView } from "@repo/domain/challenge-card";
import type { RouterOutputs } from "~/trpc/react";

import { ChallengeCard } from "./challenge-card";
import { ChallengeSegmentEmpty } from "./challenge-segment-empty";

type Posted = RouterOutputs["challenges"]["listMine"]["posted"];

/** Mine, posted section: the open Challenges of the Teams the viewer acts for. */
export function ChallengeMineSegment({
  posted,
  onGoToTeams,
}: {
  posted: Posted | undefined;
  onGoToTeams: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (!posted || posted.length === 0) {
    return <ChallengeSegmentEmpty segment="mine" onGoToTeams={onGoToTeams} />;
  }
  const now = new Date();
  return (
    <Section title={m.challenge.mine.postedTitle}>
      <ul className="space-y-3">
        {posted.map((challenge) => (
          <li key={challenge.id}>
            <ChallengeCard
              card={challengeCardView(
                {
                  ...challenge,
                  viewer: {
                    ineligibleReason: challenge.viewer.ineligibleReason,
                  },
                },
                locale,
                now,
              )}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}
