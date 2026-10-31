"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { DeclareLevelDialog } from "~/components/you/declare-level-dialog";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { type SelfDeclareChoice } from "@repo/domain/level-bands";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export function HomeDeclareLevel({
  surface = "home",
  sport = DEFAULT_SPORT,
}: {
  surface?: "home" | "profile";
  sport?: Sport;
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
        Place yourself on the {sport} ladder. You can do this once, before you
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
        sport={sport}
        pending={selfDeclare.isPending}
        error={selfDeclare.error}
        onDeclare={(choice: SelfDeclareChoice) => {
          selfDeclare.mutate({ sport, choice });
        }}
        restoreFocusRef={declareButtonRef}
      />
    </div>
  );
}
