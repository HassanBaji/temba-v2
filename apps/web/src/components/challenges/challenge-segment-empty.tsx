"use client";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";

/** Open and Mine before anything can be posted: a hatched row where Challenges will list. */
export function ChallengeSegmentEmpty({
  segment,
  onGoToTeams,
}: {
  segment: "open" | "mine";
  onGoToTeams: () => void;
}) {
  const m = useMessages();
  const copy = m.challenge[segment];
  return (
    <div className="border-rule p-4.5 space-y-4 rounded-xl border">
      <div className="flex items-center gap-3">
        <Hatch radius="md" className="block size-10 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Hatch radius="sm" className="block h-3 w-full" />
          <Hatch radius="sm" className="block h-3 w-3/5" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-title font-semibold">{copy.emptyTitle}</h2>
        <p className="text-body text-muted-foreground">{copy.emptyCopy}</p>
        <p className="text-body text-muted-foreground">{copy.untilThen}</p>
      </div>
      <Button type="button" variant="outline" onClick={onGoToTeams}>
        {m.challenge.goToTeams}
      </Button>
    </div>
  );
}
