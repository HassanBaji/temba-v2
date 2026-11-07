"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { UserAvatar } from "~/components/common/user-avatar";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useLocale, useMessages } from "~/components/locale-provider";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import {
  halfTeamsFromSides,
  mergeOccupantSubline,
  mergeOpenPositionLabel,
  mergeSwapHint,
  mergeTeamEyebrow,
  type HalfTeam,
  type MergePositionAssignment,
} from "@repo/domain/tournament-half-teams";
import { mergeSelection } from "@repo/domain/tournament-organizer";

type Side = {
  sideIndex: number;
  gameTeamId: string | null;
  left: {
    userId: string;
    name: string;
    image: string | null;
    levelBand?: HalfTeam["occupant"]["levelBand"];
  } | null;
  right: {
    userId: string;
    name: string;
    image: string | null;
    levelBand?: HalfTeam["occupant"]["levelBand"];
  } | null;
};

function occupantLevelLabel(team: HalfTeam) {
  const band = team.occupant.levelBand;
  return band ? displayLabelFromStoredBand(band) : null;
}

export function TournamentHalfTeamsPanel({
  sides,
  mergePending,
  mergeError,
  onMerge,
  onDismiss,
  knockoutOnly,
  linkToPlayers = false,
}: {
  sides: Side[];
  knockoutOnly: boolean;
  linkToPlayers?: boolean;
  mergePending: boolean;
  mergeError: { message: string; data?: { zodError?: unknown } | null } | null;
  onMerge: (input: {
    firstGameTeamId: string;
    secondGameTeamId: string;
    firstPosition: "left" | "right";
    secondPosition: "left" | "right";
  }) => void | Promise<void>;
  onDismiss: () => void;
}) {
  const m = useMessages();
  const halfTeams = halfTeamsFromSides(sides);
  const [firstId, setFirstId] = React.useState("");
  const [secondId, setSecondId] = React.useState("");
  const [swapped, setSwapped] = React.useState(false);

  const { first, second, assignment, invalidPair, canMerge } = mergeSelection({
    halfTeams,
    firstId,
    secondId,
    swapped,
  });

  async function confirmMerge() {
    if (!first || !second || !assignment || mergePending || invalidPair) {
      return;
    }
    try {
      await onMerge({
        firstGameTeamId: first.gameTeamId,
        secondGameTeamId: second.gameTeamId,
        firstPosition: assignment.firstPosition,
        secondPosition: assignment.secondPosition,
      });
      setSwapped(false);
      onDismiss();
    } catch {
      return;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto overscroll-contain px-[22px] py-[22px]">
        {halfTeams.length > 2 && first && second ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="first-half-team">
                {m.webTournament.merge.firstHalfTeam}
              </FieldLabel>
              <Select
                value={first.gameTeamId}
                onValueChange={(value) => {
                  setFirstId(value);
                  setSwapped(false);
                  if (value === second.gameTeamId) {
                    setSecondId("");
                  }
                }}
              >
                <SelectTrigger id="first-half-team" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {halfTeams.map((team) => (
                    <SelectItem key={team.gameTeamId} value={team.gameTeamId}>
                      {team.occupant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="second-half-team">
                {m.webTournament.merge.secondHalfTeam}
              </FieldLabel>
              <Select
                value={second.gameTeamId}
                onValueChange={(value) => {
                  setSecondId(value);
                  setSwapped(false);
                }}
              >
                <SelectTrigger
                  id="second-half-team"
                  className="min-h-11 w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {halfTeams
                    .filter((team) => team.gameTeamId !== first.gameTeamId)
                    .map((team) => (
                      <SelectItem key={team.gameTeamId} value={team.gameTeamId}>
                        {team.occupant.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        ) : null}

        {first && second ? (
          <div className="flex items-center gap-2.5">
            <HalfTeamCard team={first} linked={linkToPlayers} />
            <span
              aria-hidden="true"
              className="text-muted-foreground flex w-[26px] shrink-0 items-center justify-center"
            >
              <Plus className="size-[18px]" strokeWidth={2} />
            </span>
            <HalfTeamCard team={second} linked={linkToPlayers} />
          </div>
        ) : null}

        {first && second && assignment ? (
          <MergedPreview
            first={first}
            second={second}
            assignment={assignment}
            mergePending={mergePending}
            onSwap={() => setSwapped((value) => !value)}
          />
        ) : null}

        <FormErrorSummary
          message={
            invalidPair
              ? m.tournament.halfTeams.samePosition
              : globalFormErrorMessage(mergeError)
          }
        />
      </div>

      <div className="border-rule mt-auto flex shrink-0 flex-col gap-2.5 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
        <Button
          type="button"
          size="lg"
          className="w-full font-semibold"
          disabled={mergePending || !canMerge}
          aria-busy={mergePending}
          onClick={() => {
            void confirmMerge();
          }}
        >
          {mergePending
            ? m.webTournament.merge.merging
            : m.tournament.halfTeams.primaryAction}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={mergePending}
          onClick={() => {
            setSwapped(false);
            onDismiss();
          }}
        >
          {m.tournament.halfTeams.dismissAction}
        </Button>
        <p className="text-muted-foreground text-meta text-center leading-relaxed">
          {knockoutOnly
            ? m.tournament.halfTeams.takesEffectKnockout
            : m.tournament.halfTeams.takesEffect}
        </p>
      </div>
    </div>
  );
}

function HalfTeamCard({ team, linked }: { team: HalfTeam; linked: boolean }) {
  const m = useMessages();
  const locale = useLocale();
  const levelLabel = occupantLevelLabel(team);
  const openLabel = mergeOpenPositionLabel(team.openPosition, locale);

  return (
    <div className="border-rule rounded-card min-w-0 flex-1 border p-4">
      <p className="text-eyebrow text-muted-foreground tabular-nums">
        {mergeTeamEyebrow(team.sideIndex, locale)}
      </p>
      <div className="mt-3 flex items-center gap-2.5">
        <UserAvatar
          name={team.occupant.name}
          image={team.occupant.image}
          className="border-rule size-[34px] shrink-0 rounded-sm border"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          {linked ? (
            <Link
              href={playerProfilePath(team.occupant.userId)}
              dir="auto"
              className="text-body focus-visible:ring-ring/50 truncate rounded-sm underline-offset-2 outline-none [text-align:match-parent] hover:underline focus-visible:ring-[3px]"
            >
              {team.occupant.name}
            </Link>
          ) : (
            <span
              dir="auto"
              className="text-body truncate [text-align:match-parent]"
            >
              {team.occupant.name}
            </span>
          )}
          <span className="text-muted-foreground text-eyebrow">
            {mergeOccupantSubline(team.takenPosition, levelLabel, locale)}
          </span>
        </span>
      </div>
      <div className="border-rule relative mt-2 flex h-[52px] min-h-[52px] items-center justify-center overflow-hidden rounded-md border">
        <span aria-hidden="true" className="hatch absolute inset-0" />
        <span className="sr-only">{m.tournament.halfTeams.openPositionSr}</span>
        <span
          aria-hidden="true"
          className="text-muted-foreground text-eyebrow relative"
        >
          {openLabel}
        </span>
      </div>
    </div>
  );
}

function MergedPreview({
  first,
  second,
  assignment,
  mergePending,
  onSwap,
}: {
  first: HalfTeam;
  second: HalfTeam;
  assignment: MergePositionAssignment;
  mergePending: boolean;
  onSwap: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const left =
    assignment.firstPosition === "left"
      ? { team: first, position: assignment.firstPosition }
      : { team: second, position: assignment.secondPosition };
  const right =
    assignment.firstPosition === "right"
      ? { team: first, position: assignment.firstPosition }
      : { team: second, position: assignment.secondPosition };

  return (
    <div className="border-ink rounded-card border p-5">
      <p className="text-muted-foreground text-meta">
        {m.tournament.halfTeams.previewLabel}
      </p>
      {/* Left and Right are court sides, so the seats keep their side in Arabic. */}
      <div className="mt-3.5 flex gap-2 rtl:flex-row-reverse">
        <PreviewSeat occupant={left.team} position={left.position} />
        <PreviewSeat occupant={right.team} position={right.position} />
      </div>
      <div className="mt-3.5 flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-meta min-w-0 flex-1">
          {mergeSwapHint(
            second.occupant.name,
            assignment.firstPosition,
            locale,
          )}
        </p>
        <button
          type="button"
          onClick={onSwap}
          disabled={mergePending}
          className="focus-visible:ring-ring/50 text-meta min-h-11 min-w-11 shrink-0 rounded-sm font-semibold underline underline-offset-2 outline-none focus-visible:ring-[3px] disabled:opacity-50"
        >
          {m.tournament.halfTeams.swap}
        </button>
      </div>
    </div>
  );
}

function PreviewSeat({
  occupant,
  position,
}: {
  occupant: HalfTeam;
  position: MergePositionAssignment["firstPosition"];
}) {
  const m = useMessages();
  const positionLabel =
    position === "left"
      ? m.tournament.home.leftSeat
      : m.tournament.home.rightSeat;

  return (
    <div className="surface-focus flex h-16 min-h-16 min-w-0 flex-1 items-center gap-2.5 rounded-md px-3">
      <UserAvatar
        name={occupant.occupant.name}
        image={occupant.occupant.image}
        className="bg-dimrule text-on-focus size-[34px] shrink-0 rounded-sm"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          dir="auto"
          className="text-body truncate [text-align:match-parent]"
        >
          {occupant.occupant.name}
        </span>
        <span className="text-dim text-[11px] leading-none">
          {positionLabel}
        </span>
      </span>
    </div>
  );
}
