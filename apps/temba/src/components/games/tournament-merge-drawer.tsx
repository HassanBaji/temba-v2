"use client";

import { X } from "lucide-react";

import { TournamentHalfTeamsPanel } from "~/components/games/tournament-half-teams-panel";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import {
  MERGE_BANNER_ACTION_LABEL,
  MERGE_BANNER_TITLE,
  MERGE_DRAWER_TITLE,
  MERGE_MANY_TITLE,
  MERGE_SEATS_ACTION_LABEL,
  ORGANIZER_EYEBROW,
  halfTeamsFromSides,
  mergeCompletesTheField,
  mergeDrawerLead,
  mergeManyHalfTeamsCopy,
  mergePairCopy,
} from "~/lib/tournament-half-teams";

type MergeSide = {
  sideIndex: number;
  gameTeamId: string | null;
  left: {
    userId: string;
    name: string;
    image: string | null;
  } | null;
  right: {
    userId: string;
    name: string;
    image: string | null;
  } | null;
};

type MergeInput = {
  firstGameTeamId: string;
  secondGameTeamId: string;
  firstPosition: "left" | "right";
  secondPosition: "left" | "right";
};

export function TournamentMergeBanner({
  sides,
  teamCount,
  onOpen,
}: {
  sides: MergeSide[];
  teamCount: number | null;
  onOpen: () => void;
}) {
  const halfTeams = halfTeamsFromSides(sides);
  const first = halfTeams[0];
  const second = halfTeams[1];
  if (!first || !second) {
    return null;
  }
  const completesField = mergeCompletesTheField(halfTeams);

  return (
    <div className="border-ink rounded-[14px] border p-5">
      <p className="text-eyebrow text-muted-foreground uppercase tracking-[0.06em]">
        {ORGANIZER_EYEBROW}
      </p>
      <p className="mt-2 text-[15px] font-semibold">{MERGE_BANNER_TITLE}</p>
      <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
        {mergePairCopy({
          firstName: first.occupant.name,
          secondName: second.occupant.name,
          completesField,
          teamCount,
        })}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="bg-ink text-paper mt-4 flex h-[46px] min-h-11 w-full items-center justify-center rounded-[12px] text-sm font-semibold"
      >
        {MERGE_BANNER_ACTION_LABEL}
      </button>
    </div>
  );
}

export function TournamentMergeEntry({
  halfTeamCount,
  onOpen,
}: {
  halfTeamCount: number;
  onOpen: () => void;
}) {
  return (
    <div className="border-rule rounded-[14px] border p-5">
      <p className="text-eyebrow text-muted-foreground uppercase tracking-[0.06em]">
        {ORGANIZER_EYEBROW}
      </p>
      <p className="mt-2 text-[15px] font-semibold">{MERGE_MANY_TITLE}</p>
      <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
        {mergeManyHalfTeamsCopy(halfTeamCount)}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="border-ink mt-4 flex h-[46px] min-h-11 w-full items-center justify-center rounded-[12px] border text-sm font-semibold"
      >
        {MERGE_SEATS_ACTION_LABEL}
      </button>
    </div>
  );
}

export function TournamentMergeDrawer({
  open,
  onOpenChange,
  sides,
  teamCount,
  mergePending,
  mergeError,
  onMerge,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sides: MergeSide[];
  teamCount: number | null;
  mergePending: boolean;
  mergeError: { message: string; data?: { zodError?: unknown } | null } | null;
  onMerge: (input: MergeInput) => void | Promise<void>;
}) {
  const halfTeams = halfTeamsFromSides(sides);
  const first = halfTeams[0];
  const second = halfTeams[1];
  const completesField = mergeCompletesTheField(halfTeams);
  const lead =
    first && second
      ? mergeDrawerLead({
          firstName: first.occupant.name,
          secondName: second.occupant.name,
          completesField,
          teamCount,
        })
      : MERGE_DRAWER_TITLE;

  function close() {
    if (mergePending) {
      return;
    }
    onOpenChange(false);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (mergePending && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <DrawerContent className="mt-0 h-dvh max-h-dvh rounded-none p-0 data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-dvh [&>div.bg-muted]:hidden">
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-rule shrink-0 px-[22px] pb-0 pt-[22px]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={close}
                disabled={mergePending}
                className="border-rule text-ink focus-visible:ring-ring/50 flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px] disabled:opacity-50"
                aria-label="Close"
              >
                <X aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>
              <p className="text-eyebrow text-muted-foreground uppercase tracking-[0.06em]">
                {ORGANIZER_EYEBROW}
              </p>
            </div>
            <DrawerTitle className="font-expanded mt-6 text-[38px] leading-none tracking-[-0.03em]">
              {MERGE_DRAWER_TITLE}
            </DrawerTitle>
            <DrawerDescription className="mt-2.5 text-[15px] leading-relaxed">
              {lead}
            </DrawerDescription>
          </div>
          <TournamentHalfTeamsPanel
            sides={sides}
            mergePending={mergePending}
            mergeError={mergeError}
            onMerge={onMerge}
            onDismiss={() => onOpenChange(false)}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
