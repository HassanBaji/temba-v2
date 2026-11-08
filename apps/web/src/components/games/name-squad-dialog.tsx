"use client";

import { Check } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  initialSquadSelection,
  squadPlayerMeta,
  squadSelectionIsFull,
  squadSheetCopy,
  toggleSquadSelection,
} from "@repo/domain/matchday-squad";

import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { NotOnTembaTag } from "~/components/temba/seat";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

function PickMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]",
        selected ? "border-ink bg-ink text-paper" : "border-input",
      )}
    >
      {selected ? <Check className="size-3.5" /> : null}
    </span>
  );
}

/**
 * Name your squad (6b): the Team's Roster to pick from, Captain first when
 * nobody is named yet, with role, Level and "Not on Temba yet" per row.
 * Saving sends the whole list in naming order.
 */
export function NameSquadDialog({
  open,
  onOpenChange,
  gameId,
  teamId,
  sideSize,
  kickoff,
  namedUserIds,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  teamId: string;
  sideSize: number;
  kickoff: Date | string | null;
  namedUserIds: readonly string[];
  onSaved: () => Promise<unknown>;
}) {
  const m = useMessages();
  const locale = useLocale();
  const team = api.teams.byId.useQuery({ id: teamId }, { enabled: open });
  const members = team.data?.members ?? [];
  const [selected, setSelected] = React.useState<string[]>([]);
  const [seeded, setSeeded] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSeeded(false);
      return;
    }
    if (seeded || !team.data) {
      return;
    }
    setSelected(
      initialSquadSelection(
        namedUserIds,
        team.data.captainUserId,
        team.data.members.map((member) => member.userId),
      ),
    );
    setSeeded(true);
  }, [open, seeded, team.data, namedUserIds]);

  const save = api.games.nameChallengeSquad.useMutation({
    onSuccess: async () => {
      toast.success(m.challenge.squad.saved);
      await onSaved();
      onOpenChange(false);
    },
  });

  const copy = squadSheetCopy(
    {
      sideSize,
      selectedCount: selected.length,
      rosterCount: members.length,
      kickoff,
    },
    locale,
  );
  const full = squadSelectionIsFull(selected, sideSize);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate({ gameId, teamId, userIds: selected });
          }}
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{copy.title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {copy.help}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-4 pb-4 md:px-0 md:pb-0">
            <div className="space-y-1">
              <p className="font-semibold" aria-live="polite">
                {copy.counter}
              </p>
              <p className="text-meta text-muted-foreground">
                {[copy.sideCounter, copy.reserveCounter].join(
                  m.group.metaSeparator,
                )}
              </p>
              {copy.stateLine ? (
                <p className="text-meta">{copy.stateLine}</p>
              ) : null}
            </div>

            {team.error ? (
              <p role="alert" className="text-meta font-medium">
                {m.challenge.squad.sheet.rosterLoadFailed}
              </p>
            ) : !team.data ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ul>
                {members.map((member) => {
                  const isSelected = selected.includes(member.userId);
                  const blocked = full && !isSelected;
                  const meta = [
                    member.isCreator ? m.challenge.squad.sheet.captain : null,
                    squadPlayerMeta(
                      {
                        userId: member.userId,
                        name: member.name,
                        role: member.footballRole,
                        position: member.footballPosition,
                        levelBand: member.levelBand,
                      },
                      locale,
                    ) || null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={member.userId} className="border-rule border-b">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        aria-label={
                          isSelected
                            ? m.challenge.squad.sheet.deselect(member.name)
                            : m.challenge.squad.sheet.select(member.name)
                        }
                        aria-description={meta || undefined}
                        disabled={blocked || save.isPending}
                        onClick={() =>
                          setSelected((current) =>
                            toggleSquadSelection(
                              current,
                              member.userId,
                              sideSize,
                            ),
                          )
                        }
                        className={cn(
                          "focus-visible:ring-ring/50 min-h-15.5 flex w-full items-center gap-3 py-2.5 text-start outline-none focus-visible:ring-[3px]",
                          blocked
                            ? "cursor-default opacity-45"
                            : "hover:opacity-80",
                        )}
                      >
                        <UserAvatar
                          name={member.name}
                          image={member.image}
                          size="lg"
                          className="rounded-md"
                        />
                        <span className="min-w-0 flex-1 space-y-0.5">
                          <span className="block truncate font-semibold">
                            {member.name}
                          </span>
                          {member.unclaimed ? <NotOnTembaTag /> : null}
                          {meta ? (
                            <span className="text-eyebrow text-muted-foreground block truncate">
                              {meta}
                            </span>
                          ) : null}
                        </span>
                        <PickMark selected={isSelected} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="text-meta text-muted-foreground">{copy.footer}</p>
            {save.error ? (
              <p role="alert" className="text-meta font-medium">
                {save.error.message}
              </p>
            ) : null}
          </div>

          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={save.isPending}
              >
                {m.common.cancel}
              </Button>
            </ResponsiveDialogClose>
            <Button
              type="submit"
              className="min-h-11"
              disabled={!seeded || save.isPending}
              aria-busy={save.isPending}
            >
              {copy.confirmLabel}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
