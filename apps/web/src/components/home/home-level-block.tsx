"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { SurfaceLabel } from "~/components/common/surface-label";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { DeclareLevelDialog } from "~/components/you/declare-level-dialog";
import { homeLevelView } from "@repo/domain/home-level";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import {
  type LevelBand,
  type SelfDeclareChoice,
} from "@repo/domain/level-bands";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

const CHANGE_ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  none: ArrowRight,
} as const;

export function HomeLevelBlock({
  band,
  level,
  provisional,
  ratedMatchesRemaining,
  history,
  progressPercent,
}: {
  band: LevelBand;
  level: string;
  provisional: boolean;
  ratedMatchesRemaining: number;
  history: string[];
  progressPercent: number | null;
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(true);
  }, []);

  const view = homeLevelView({
    band,
    level,
    provisional,
    ratedMatchesRemaining,
    history,
    progressPercent,
  });
  const ChangeIcon = view.change ? CHANGE_ICONS[view.change.direction] : null;

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <SurfaceLabel meta="Padel">Level</SurfaceLabel>
      <div className="flex items-stretch gap-4 px-[22px] pb-[22px] pt-1">
        <p className="font-expanded text-[88px] leading-none">
          {view.displayBand}
        </p>
        <div className="bg-rule w-px self-stretch" />
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
            <p className="font-expanded text-2xl tabular-nums leading-none">
              {view.level}{" "}
            </p>
            <span className="text-muted-foreground text-meta mt-1">Level</span>
          </div>
          {view.change && ChangeIcon ? (
            <div className="flex items-center gap-1">
              <ChangeIcon aria-hidden="true" className="size-6 shrink-0" />
              <div className="flex items-center gap-2">
                <p className="font-expanded text-2xl">
                  <span className="sr-only">{view.change.spoken} </span>
                  {view.change.amount}
                </p>
                <p className="text-muted-foreground text-meta mt-1">
                  {view.change.windowLabel}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {!view.progress ? (
        <p className="border-rule text-meta border-t px-[22px] py-3">
          Top Level band
        </p>
      ) : (
        <div className="border-rule space-y-2 border-t p-[22px]">
          <p className="text-muted-foreground text-meta">
            {view.progress.label}
          </p>
          <div
            aria-hidden="true"
            className={
              provisional
                ? "hatch h-2 w-full overflow-hidden rounded-full"
                : "bg-wash h-2 w-full overflow-hidden rounded-full"
            }
          >
            <div
              className="bg-ink h-full"
              style={{
                width: drawn ? `${view.progress.percent}%` : "0%",
                transition: "width 700ms ease-out",
              }}
            />
          </div>
        </div>
      )}

      <div className="border-rule text-meta flex items-center gap-2 border-t px-[22px] py-3">
        <span
          aria-hidden="true"
          className={
            provisional ? "hatch size-3 shrink-0" : "bg-ink size-3 shrink-0"
          }
        />
        <p>
          <span className="font-semibold">{view.legend.lead}</span>
          {view.legend.rest}
        </p>
      </div>
    </section>
  );
}

export function HomeDeclareLevel({
  surface = "home",
}: {
  surface?: "home" | "profile";
}) {
  const declareButtonRef = useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = api.useUtils();
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

  return (
    <div
      className={cn(
        "border-rule bg-paper border",
        surface === "profile" ? "rounded-card p-5" : "rounded-xl p-[22px]",
      )}
    >
      <p className="text-lead font-semibold">Declare your Level</p>
      <p className="text-muted-foreground text-meta mt-1">
        Place yourself on the padel ladder. You can do this once, before you
        have a Rated Match.
      </p>
      <Button
        ref={declareButtonRef}
        type="button"
        className="mt-4"
        onClick={() => {
          selfDeclare.reset();
          setDialogOpen(true);
        }}
      >
        Declare Level
      </Button>
      <DeclareLevelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={selfDeclare.isPending}
        error={selfDeclare.error}
        onDeclare={(choice: SelfDeclareChoice) => {
          selfDeclare.mutate({ sport: "padel", choice });
        }}
        restoreFocusRef={declareButtonRef}
      />
    </div>
  );
}

export function HomeLevel() {
  const me = api.ratings.me.useQuery();

  if (me.isLoading) {
    return (
      <div aria-busy="true" className="border-rule rounded-xl border p-[22px]">
        <Skeleton className="h-20 w-24" />
        <Skeleton className="mt-4 h-[58px] w-full" />
      </div>
    );
  }

  if (me.error) {
    return (
      <ErrorState
        variant="inline"
        title="Level could not be loaded"
        message={me.error.message}
        onRetry={() => {
          void me.refetch();
        }}
      />
    );
  }

  if (!me.data) {
    return null;
  }

  if (!me.data.rating) {
    return me.data.canSelfDeclare ? <HomeDeclareLevel /> : null;
  }

  return (
    <HomeLevelBlock
      band={me.data.rating.levelBand}
      level={me.data.rating.level}
      provisional={me.data.rating.provisional}
      ratedMatchesRemaining={me.data.rating.ratedMatchesRemaining}
      history={me.data.history}
      progressPercent={me.data.progressPercent}
    />
  );
}
