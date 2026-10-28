"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { DeclareLevelDialog } from "~/components/you/declare-level-dialog";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { type SelfDeclareChoice } from "@repo/domain/level-bands";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

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
