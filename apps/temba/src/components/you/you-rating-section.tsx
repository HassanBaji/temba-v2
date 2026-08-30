"use client";

import { Gauge } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { Section } from "~/components/layout/section";
import { LevelBandBadge } from "~/components/temba/level-band-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { DeclareLevelDialog } from "~/components/you/declare-level-dialog";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { type SelfDeclareChoice } from "~/lib/level-bands";
import { api } from "~/trpc/react";

function YouLevelSkeleton() {
  return (
    <div aria-busy="true" className="space-y-3">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

export function YouRatingSection() {
  const utils = api.useUtils();
  const me = api.ratings.me.useQuery();
  const declareButtonRef = React.useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const selfDeclare = api.ratings.selfDeclare.useMutation({
    onSuccess: async () => {
      toast.success("Level saved");
      setDialogOpen(false);
      await utils.ratings.me.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  function onDeclare(choice: SelfDeclareChoice) {
    selfDeclare.mutate({ sport: "padel", choice });
  }

  return (
    <Section title="Level" description="Padel">
      {me.isLoading ? <YouLevelSkeleton /> : null}

      {me.error ? (
        <ErrorState
          title="Level could not be loaded"
          message={me.error.message}
          onRetry={() => {
            void me.refetch();
          }}
        />
      ) : null}

      {me.data?.rating ? (
        <Card variant="outlined">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-display font-bold tabular-nums tracking-[-0.02em]">
              <span className="sr-only">Level </span>
              {me.data.rating.level}
            </p>
            <LevelBandBadge band={me.data.rating.levelBand} />
            {me.data.rating.provisional ? (
              <Badge variant="secondary">Provisional</Badge>
            ) : null}
            <SportBadge sport="padel" />
          </div>
        </Card>
      ) : null}

      {me.data && !me.data.rating && me.data.canSelfDeclare ? (
        <Card variant="outlined" className="p-0">
          <EmptyState
            className="py-8"
            icon={Gauge}
            title="Declare your Level"
            description="Place yourself on the padel ladder. You can do this once, before you have a Rated Match."
            action={
              <Button
                ref={declareButtonRef}
                type="button"
                onClick={() => {
                  selfDeclare.reset();
                  setDialogOpen(true);
                }}
              >
                Declare Level
              </Button>
            }
          />
        </Card>
      ) : null}

      <DeclareLevelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={selfDeclare.isPending}
        error={selfDeclare.error}
        onDeclare={onDeclare}
        restoreFocusRef={declareButtonRef}
      />
    </Section>
  );
}
