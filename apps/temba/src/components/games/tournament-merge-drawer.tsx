"use client";

import { TournamentHalfTeamsPanel } from "~/components/games/tournament-half-teams-panel";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import { CloseButton } from "~/components/ui/nav-icon-button";
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
      <p className="text-body mt-2 font-semibold">{MERGE_BANNER_TITLE}</p>
      <p className="text-muted-foreground text-meta mt-1.5 leading-relaxed">
        {mergePairCopy({
          firstName: first.occupant.name,
          secondName: second.occupant.name,
          completesField,
          teamCount,
        })}
      </p>
      <Button
        type="button"
        onClick={onOpen}
        className="mt-4 w-full font-semibold"
      >
        {MERGE_BANNER_ACTION_LABEL}
      </Button>
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
      <p className="text-body mt-2 font-semibold">{MERGE_MANY_TITLE}</p>
      <p className="text-muted-foreground text-meta mt-1.5 leading-relaxed">
        {mergeManyHalfTeamsCopy(halfTeamCount)}
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onOpen}
        className="border-ink mt-4 w-full font-semibold"
      >
        {MERGE_SEATS_ACTION_LABEL}
      </Button>
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
              <CloseButton
                variant="boxed"
                onClick={close}
                disabled={mergePending}
              />
              <p className="text-eyebrow text-muted-foreground uppercase tracking-[0.06em]">
                {ORGANIZER_EYEBROW}
              </p>
            </div>
            <DrawerTitle className="font-expanded mt-6 text-[38px] leading-none tracking-[-0.03em]">
              {MERGE_DRAWER_TITLE}
            </DrawerTitle>
            <DrawerDescription className="text-body mt-2.5 leading-relaxed">
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
