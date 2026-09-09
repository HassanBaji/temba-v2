"use client";

import { ArrowLeftRight } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ListRow } from "~/components/common/row-list";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { PreferredPositionDialog } from "~/components/you/preferred-position-dialog";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import {
  preferredPositionLabel,
  type PreferredPosition,
} from "~/lib/preferred-position";
import { api } from "~/trpc/react";

/**
 * The You row for Preferred Position: the stored answer, and an editor for it.
 *
 * The value is read from `users.onboardingState`, the same door the Onboarding
 * questionnaire reads, so a User backfilled by the migration — complete, with
 * no answer — sees `Not set` here and can answer without ever going through
 * `/onboarding`. Re-editing is ordinary: `users.setPreferredPosition` takes a
 * new answer over an existing one.
 *
 * Renders a `ListRow`, so it belongs inside a `RowList`.
 */
export function YouPreferredPositionRow() {
  const utils = api.useUtils();
  const state = api.users.onboardingState.useQuery();
  const editButtonRef = React.useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const setPreferredPosition = api.users.setPreferredPosition.useMutation({
    onSuccess: async () => {
      toast.success("Preferred Position saved");
      setDialogOpen(false);
      await utils.users.onboardingState.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const current = state.data?.preferredPosition ?? null;
  const label = preferredPositionLabel(current);
  // No `user` row yet (the Clerk webhook has not landed) or the read failed:
  // the write door would only fail, so the editor stays shut.
  const canEdit = state.data != null && !state.data.provisioning;

  function onSave(preferredPosition: PreferredPosition) {
    setPreferredPosition.mutate({ preferredPosition });
  }

  return (
    <>
      <ListRow
        leading={
          <ArrowLeftRight
            aria-hidden="true"
            className="size-5"
            strokeWidth={2}
          />
        }
        title="Preferred Position"
        meta="Your default side when you pick a Game seat"
        trailing={
          state.isLoading ? (
            <Skeleton className="h-8 w-20 rounded-md" />
          ) : (
            <Button
              ref={editButtonRef}
              type="button"
              variant="outline"
              size="sm"
              disabled={!canEdit}
              aria-label={`Edit Preferred Position, currently ${label}`}
              onClick={() => {
                setPreferredPosition.reset();
                setDialogOpen(true);
              }}
            >
              {label}
            </Button>
          )
        }
      />

      <PreferredPositionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        current={current}
        pending={setPreferredPosition.isPending}
        error={setPreferredPosition.error}
        onSave={onSave}
        restoreFocusRef={editButtonRef}
      />
    </>
  );
}
