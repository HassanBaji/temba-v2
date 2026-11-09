"use client";

import { Send } from "lucide-react";
import * as React from "react";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Switch } from "~/components/ui/switch";
import type { ChallengeCardView } from "@repo/domain/challenge-card";
import type { ChallengeNudgeView } from "@repo/domain/challenge-form";
import { cn } from "~/lib/utils";

import { ChallengeCardPreview } from "./challenge-card";
import {
  ChallengePostChip,
  ChallengePostFooter,
  ChallengePostGrid,
  ChallengePostHeader,
} from "./challenge-post-parts";

/** "Also send it straight to a team you've played?" and the switch; which Team when there are several. */
function NudgeRow({
  nudge,
  onNudge,
}: {
  nudge: ChallengeNudgeView;
  onNudge: (teamId: string | null) => void;
}) {
  const textId = React.useId();
  return (
    <div className="border-rule bg-paper rounded-card space-y-3 border px-4 py-3.5">
      <div className="flex items-center gap-3">
        <Send
          aria-hidden="true"
          className="text-ink size-[18px] shrink-0 rtl:-scale-x-100"
        />
        <p id={textId} className="text-meta text-muted-foreground flex-1">
          {nudge.before}
          <span className="text-ink font-semibold">{nudge.teamName}</span>
          {nudge.after}
        </p>
        <Switch
          aria-labelledby={textId}
          checked={nudge.on}
          onCheckedChange={(on) => onNudge(on ? nudge.firstTeamId : null)}
        />
      </div>
      {nudge.on && nudge.options.length > 1 ? (
        <ChallengePostGrid label={nudge.teamsLabel} columns={2}>
          {nudge.options.map((option) => (
            <ChallengePostChip
              key={option.value}
              label={option.label}
              selected={option.value === nudge.selected}
              onClick={() => onNudge(option.value)}
            />
          ))}
        </ChallengePostGrid>
      ) : null}
    </div>
  );
}

/** 3b: the card as the board will show it, what posting means, and the nudge. */
export function ChallengePostReview({
  card,
  rows,
  nudge,
  onNudge,
  error,
  pending,
  onEdit,
  onPost,
}: {
  card: ChallengeCardView;
  rows: { key: string; label: string; value: string }[];
  nudge: ChallengeNudgeView | null;
  onNudge: (teamId: string | null) => void;
  error: string | null;
  pending: boolean;
  onEdit: () => void;
  onPost: () => void;
}) {
  const m = useMessages();
  const copy = m.challenge.review;
  return (
    <>
      <ChallengePostHeader title={copy.title} onBack={onEdit} />
      <div className="space-y-[22px] pt-[22px]">
        <section className="space-y-2.5">
          <h2 className="text-meta text-muted-foreground">{copy.cardTitle}</h2>
          <ChallengeCardPreview card={card} />
        </section>
        <dl className="border-rule bg-paper rounded-card overflow-hidden border">
          {rows.map((row, index) => (
            <div
              key={row.key}
              className={cn(
                "text-body flex justify-between gap-4 px-[18px] py-3.5",
                index > 0 && "border-rule border-t",
              )}
            >
              <dt className="text-muted-foreground shrink-0">{row.label}</dt>
              <dd className="text-end">{row.value}</dd>
            </div>
          ))}
        </dl>
        {nudge ? <NudgeRow nudge={nudge} onNudge={onNudge} /> : null}
        <FormErrorSummary message={error} />
      </div>
      <ChallengePostFooter>
        <Button
          type="button"
          size="lg"
          className="flex-1"
          pending={pending}
          onClick={onPost}
        >
          {m.challenge.post.submit}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="text-muted-foreground w-[104px] font-normal"
          onClick={onEdit}
        >
          {m.challenge.post.edit}
        </Button>
      </ChallengePostFooter>
    </>
  );
}
