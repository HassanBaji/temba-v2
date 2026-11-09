"use client";

import { Check } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { initials } from "@repo/domain/initials";
import {
  initialSquadSelection,
  squadProgressSegments,
  squadRosterOrder,
  squadRosterPreview,
  squadRosterRowMeta,
  squadSelectionIsFull,
  squadSheetCopy,
  toggleSquadSelection,
} from "@repo/domain/matchday-squad";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { CloseButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

function CheckMark({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-[6px]",
        selected ? "bg-control text-on-control" : "border-input border",
      )}
    >
      {selected ? <Check className="size-3.5" strokeWidth={2} /> : null}
    </span>
  );
}

/** One bar segment per seat: solid once someone is named into it, hatched while open. */
function SquadProgress({
  selectedCount,
  sideSize,
  label,
}: {
  selectedCount: number;
  sideSize: number;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${sideSize + 3}, minmax(0, 1fr))`,
      }}
    >
      {squadProgressSegments(selectedCount, sideSize).map((segment, index) =>
        segment.filled ? (
          <span key={index} className="bg-control h-2 rounded-[4px]" />
        ) : (
          <span
            key={index}
            className="hatch border-input h-2 rounded-[4px] border"
          />
        ),
      )}
    </div>
  );
}

/**
 * Name your squad (6b): the Team's Roster as a checklist, Captain first,
 * then whoever is named, then the rest, with role, Level and "Added by you,
 * not on Temba" per row, the seat bar over it, and "Confirm squad, N named".
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
  const sheetCopy = m.challenge.squad.sheet;
  const locale = useLocale();
  const rowIdPrefix = React.useId();
  const team = api.teams.byId.useQuery({ id: teamId }, { enabled: open });
  const members = React.useMemo(() => team.data?.members ?? [], [team.data]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [order, setOrder] = React.useState<string[]>([]);
  const [expanded, setExpanded] = React.useState(false);
  const [seeded, setSeeded] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSeeded(false);
      setExpanded(false);
      return;
    }
    if (seeded || !team.data) {
      return;
    }
    const rosterIds = team.data.members.map((member) => member.userId);
    const initial = initialSquadSelection(
      namedUserIds,
      team.data.captainUserId,
      rosterIds,
    );
    setSelected(initial);
    setOrder(squadRosterOrder(rosterIds, team.data.captainUserId, initial));
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
  const viewerIsCaptain = members.some(
    (member) => member.isViewer && member.isCreator,
  );
  const rows = [
    ...order.flatMap((userId) => {
      const member = members.find((candidate) => candidate.userId === userId);
      return member ? [member] : [];
    }),
    ...members.filter((member) => !order.includes(member.userId)),
  ];
  const preview = squadRosterPreview(rows, sideSize, selected.length, expanded);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]"
        showCloseButton={false}
      >
        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate({ gameId, teamId, userIds: selected });
          }}
        >
          <div className="flex items-start justify-between gap-3 px-[22px] pt-[22px]">
            <ResponsiveDialogHeader className="min-w-0 p-0 text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
              <ResponsiveDialogTitle className="font-expanded text-h1 leading-none tracking-[-0.03em]">
                {copy.title}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="text-meta text-muted-foreground mt-1 leading-normal">
                {copy.help}
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <CloseButton
              variant="boxed"
              label={sheetCopy.close}
              onClick={() => onOpenChange(false)}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-[22px] py-5">
            <div>
              <p
                className="flex items-baseline justify-between gap-3 pb-2"
                aria-live="polite"
              >
                <span className="text-[14px] font-semibold">
                  {copy.namedLine}
                </span>
                <span className="text-muted-foreground text-[12px]">
                  {copy.rosterLine}
                </span>
              </p>
              <SquadProgress
                selectedCount={selected.length}
                sideSize={sideSize}
                label={copy.counter}
              />
              <p className="text-muted-foreground mt-1.5 flex justify-between gap-3 text-[11px]">
                <span>{copy.sideCounter}</span>
                <span>{copy.reserveCounter}</span>
              </p>
              {copy.stateLine ? (
                <p className="text-meta mt-2">{copy.stateLine}</p>
              ) : null}
            </div>

            {team.error ? (
              <p role="alert" className="text-meta font-medium">
                {sheetCopy.rosterLoadFailed}
              </p>
            ) : !team.data ? (
              <Skeleton className="h-48 w-full rounded-[14px]" />
            ) : (
              <div className="border-rule bg-paper divide-rule divide-y overflow-hidden rounded-[14px] border">
                <ul className="divide-rule divide-y">
                  {preview.visible.map((member) => {
                    const isSelected = selected.includes(member.userId);
                    const blocked = full && !isSelected;
                    const meta = squadRosterRowMeta(
                      {
                        userId: member.userId,
                        name: member.name,
                        role: member.footballRole,
                        position: member.footballPosition,
                        levelBand: member.levelBand,
                        unclaimed: member.unclaimed,
                        isViewer: member.isViewer,
                        isCaptain: member.isCreator,
                      },
                      viewerIsCaptain,
                      locale,
                    );
                    return (
                      <li key={member.userId}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={
                            isSelected
                              ? sheetCopy.deselect(member.name)
                              : sheetCopy.select(member.name)
                          }
                          aria-describedby={
                            meta ? `${rowIdPrefix}-${member.userId}` : undefined
                          }
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
                            "focus-visible:ring-ring/50 flex min-h-14 w-full items-center gap-3 px-4 py-[11px] text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
                            blocked
                              ? "cursor-default opacity-45"
                              : "hover:bg-wash",
                          )}
                        >
                          <CheckMark selected={isSelected} />
                          <span
                            aria-hidden="true"
                            className={cn(
                              "flex size-[34px] shrink-0 items-center justify-center rounded-[9px] border text-[12px] font-semibold",
                              member.isViewer
                                ? "border-control-edge bg-control text-on-control"
                                : "border-rule bg-paper text-ink",
                            )}
                          >
                            {initials(member.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-semibold">
                              {member.name}
                            </span>
                            {meta ? (
                              <span
                                id={`${rowIdPrefix}-${member.userId}`}
                                className="text-muted-foreground block truncate text-[12px]"
                              >
                                {meta}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {preview.hiddenCount > 0 ? (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-ink focus-visible:ring-ring/50 block w-full px-4 py-3 text-start text-[12px] outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
                    onClick={() => setExpanded(true)}
                  >
                    {sheetCopy.moreOnRoster(preview.hiddenCount)}
                  </button>
                ) : null}
              </div>
            )}

            <p className="text-muted-foreground text-[12px] leading-normal">
              {copy.footer}
            </p>
            {save.error ? (
              <p role="alert" className="text-meta font-medium">
                {save.error.message}
              </p>
            ) : null}
          </div>

          <div className="mt-auto shrink-0 px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-1">
            <Button
              type="submit"
              className="h-[52px] w-full rounded-lg text-[15px] font-semibold"
              disabled={!seeded || save.isPending}
              aria-busy={save.isPending}
            >
              {copy.confirmLabel}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
