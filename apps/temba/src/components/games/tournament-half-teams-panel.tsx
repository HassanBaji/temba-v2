"use client";

import * as React from "react";

import { ListRow, RowList } from "~/components/common/row-list";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { formatGameSideLabel } from "~/components/games/game-side-label";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Field, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  MERGE_TAKES_EFFECT_COPY,
  defaultMergePositions,
  halfTeamMergeHint,
  halfTeamsFromSides,
  openPositionLabel,
  seatedPositionLabel,
  swapMergePositions,
  type HalfTeam,
  type MergePositionAssignment,
} from "~/lib/tournament-half-teams";

type Side = {
  sideIndex: number;
  gameTeamId: string | null;
  left: { userId: string; name: string; image: string | null } | null;
  right: { userId: string; name: string; image: string | null } | null;
};

function halfTeamById(halfTeams: HalfTeam[], gameTeamId: string | null) {
  if (!gameTeamId) {
    return null;
  }
  return halfTeams.find((team) => team.gameTeamId === gameTeamId) ?? null;
}

function assignmentFor(
  first: HalfTeam | null,
  swapped: boolean,
): MergePositionAssignment | null {
  if (!first) {
    return null;
  }
  const defaults = defaultMergePositions(first);
  return swapped ? swapMergePositions(defaults) : defaults;
}

export function TournamentHalfTeamsPanel({
  sides,
  format,
  mergePending,
  mergeError,
  onMerge,
}: {
  sides: Side[];
  format: string;
  mergePending: boolean;
  mergeError: { message: string; data?: { zodError?: unknown } | null } | null;
  onMerge: (input: {
    firstGameTeamId: string;
    secondGameTeamId: string;
    firstPosition: "left" | "right";
    secondPosition: "left" | "right";
  }) => void | Promise<void>;
}) {
  const halfTeams = halfTeamsFromSides(sides);
  const [firstId, setFirstId] = React.useState("");
  const [secondId, setSecondId] = React.useState("");
  const [swapped, setSwapped] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const first =
    halfTeamById(halfTeams, firstId) ??
    (halfTeams.length >= 1 ? (halfTeams[0] ?? null) : null);
  const selectedSecond = halfTeamById(halfTeams, secondId);
  const second =
    selectedSecond && selectedSecond.gameTeamId !== first?.gameTeamId
      ? selectedSecond
      : (halfTeams.find((team) => team.gameTeamId !== first?.gameTeamId) ??
        null);
  const assignment = assignmentFor(first, swapped);
  const hint = halfTeamMergeHint(halfTeams.length);
  const canMerge = Boolean(first && second && assignment);

  function openConfirm() {
    if (!canMerge) {
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmMerge() {
    if (!first || !second || !assignment || mergePending) {
      return;
    }
    try {
      await onMerge({
        firstGameTeamId: first.gameTeamId,
        secondGameTeamId: second.gameTeamId,
        firstPosition: assignment.firstPosition,
        secondPosition: assignment.secondPosition,
      });
      setConfirmOpen(false);
      setSwapped(false);
    } catch {
      return;
    }
  }

  return (
    <Card variant="outlined" className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-title font-medium">Half teams</h3>
        <p className="text-muted-foreground text-sm">
          A Half team has one Position taken. Merge two into one Game team.
        </p>
      </div>

      {halfTeams.length === 0 ? (
        <p className="text-muted-foreground text-sm">No Half teams</p>
      ) : (
        <RowList aria-label="Half teams">
          {halfTeams.map((team) => (
            <ListRow
              key={team.gameTeamId}
              leading={
                <UserAvatar
                  name={team.occupant.name}
                  image={team.occupant.image}
                  size="lg"
                />
              }
              title={team.occupant.name}
              subtitle={`${formatGameSideLabel(format, team.sideIndex)} · ${openPositionLabel(team.openPosition)}`}
            />
          ))}
        </RowList>
      )}

      {hint ? <p className="text-body font-medium">{hint}</p> : null}

      {halfTeams.length >= 2 && first && second ? (
        <div className="space-y-3">
          {halfTeams.length > 2 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="first-half-team">
                  First Half team
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
                  <SelectTrigger id="first-half-team">
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
                  Second Half team
                </FieldLabel>
                <Select
                  value={second.gameTeamId}
                  onValueChange={(value) => {
                    setSecondId(value);
                    setSwapped(false);
                  }}
                >
                  <SelectTrigger id="second-half-team">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {halfTeams
                      .filter((team) => team.gameTeamId !== first.gameTeamId)
                      .map((team) => (
                        <SelectItem
                          key={team.gameTeamId}
                          value={team.gameTeamId}
                        >
                          {team.occupant.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          ) : null}
          <Button type="button" onClick={openConfirm} disabled={mergePending}>
            Merge into one Game team
          </Button>
        </div>
      ) : null}

      <ResponsiveDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (mergePending && !next) {
            return;
          }
          setConfirmOpen(next);
          if (!next) {
            setSwapped(false);
          }
        }}
      >
        <ResponsiveDialogContent showCloseButton={false}>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Merge Half teams</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {MERGE_TAKES_EFFECT_COPY}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          {first && second && assignment ? (
            <div className="space-y-3">
              <RowList>
                <ListRow
                  leading={
                    <UserAvatar
                      name={first.occupant.name}
                      image={first.occupant.image}
                      size="lg"
                    />
                  }
                  title={first.occupant.name}
                  subtitle={seatedPositionLabel(assignment.firstPosition)}
                />
                <ListRow
                  leading={
                    <UserAvatar
                      name={second.occupant.name}
                      image={second.occupant.image}
                      size="lg"
                    />
                  }
                  title={second.occupant.name}
                  subtitle={seatedPositionLabel(assignment.secondPosition)}
                />
              </RowList>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSwapped((value) => !value)}
                disabled={mergePending}
              >
                Swap
              </Button>
              <FormErrorSummary message={globalFormErrorMessage(mergeError)} />
            </div>
          ) : null}
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={mergePending}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={mergePending || !canMerge}
              aria-busy={mergePending}
              onClick={() => {
                void confirmMerge();
              }}
            >
              {mergePending ? "Merge…" : "Merge"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </Card>
  );
}
