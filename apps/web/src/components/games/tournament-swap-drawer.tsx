"use client";

import * as React from "react";

import {
  repairLaterDrafts,
  swapPairing,
  swapRepairSeed,
  type RoundRepeat,
  type RoundSlotState,
} from "@repo/domain/tournament-pairing";

import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import { CloseButton } from "~/components/ui/nav-icon-button";
import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import {
  TeamMark,
  TeamNames,
  teamShortName,
  type RoundsMatch,
  type RoundsTeam,
  type TournamentRoundsData,
} from "./tournament-round-parts";
import { type TournamentRoundsActions } from "./use-tournament-rounds";

export type SwapTarget = {
  roundNumber: number;
  match: RoundsMatch;
};

export function madeRoundsOf(data: TournamentRoundsData): RoundSlotState[] {
  return data.rounds.flatMap((round) =>
    round.matches.length === 0
      ? []
      : [
          {
            roundNumber: round.roundNumber,
            draft: round.state === "draft",
            pairings: round.matches.map((match) => ({
              slot1GameTeamId: match.slot1GameTeamId,
              slot2GameTeamId: match.slot2GameTeamId,
            })),
          },
        ],
  );
}

export function TournamentSwapDrawer({
  gameId,
  data,
  target,
  teams,
  viewerUserId,
  actions,
  onClose,
}: {
  gameId: string;
  data: TournamentRoundsData;
  target: SwapTarget | null;
  teams: ReadonlyMap<string, RoundsTeam>;
  viewerUserId: string;
  actions: TournamentRoundsActions;
  onClose: () => void;
}) {
  const m = useMessages().tournamentRounds;
  const [chosen, setChosen] = React.useState<string | null>(null);
  React.useEffect(() => {
    setChosen(null);
  }, [target?.match.slot1GameTeamId, target?.roundNumber]);

  const round = target
    ? data.rounds.find((item) => item.roundNumber === target.roundNumber)
    : undefined;
  const keepId = target?.match.slot1GameTeamId ?? "";
  const oldOpponentId = target?.match.slot2GameTeamId ?? "";
  const keepTeam = teams.get(keepId);
  const oldOpponent = teams.get(oldOpponentId);
  const poolIndex = target?.match.poolIndex ?? null;

  const options = React.useMemo(() => {
    if (!target || !round) {
      return [];
    }
    const current = round.matches.map((match) => ({
      slot1GameTeamId: match.slot1GameTeamId,
      slot2GameTeamId: match.slot2GameTeamId,
    }));
    const made = madeRoundsOf(data);
    return round.matches.flatMap((match) => {
      if (match === target.match || match.poolIndex !== poolIndex) {
        return [];
      }
      return [match.slot1GameTeamId, match.slot2GameTeamId].map((teamId) => {
        const partnerId =
          teamId === match.slot1GameTeamId
            ? match.slot2GameTeamId
            : match.slot1GameTeamId;
        const swapped = swapPairing(current, keepId, teamId) ?? current;
        const repaired = repairLaterDrafts({
          pools: data.pools,
          suggested: data.suggestedRoundCount,
          roundCount: data.roundCount,
          rounds: made.map((item) =>
            item.roundNumber === target.roundNumber
              ? { ...item, pairings: swapped }
              : item,
          ),
          changedRound: target.roundNumber,
          seed: swapRepairSeed({
            gameId,
            roundNumber: target.roundNumber,
            gameTeamId: keepId,
            opponentGameTeamId: teamId,
          }),
        });
        return {
          teamId,
          court: match.courtName ?? "",
          partnerId,
          repeats: repaired.repeats,
        };
      });
    });
  }, [data, gameId, keepId, poolIndex, round, target]);

  const selected = options.find((option) => option.teamId === chosen);
  const busy = actions.swap.isPending;

  async function confirm() {
    if (!target || !chosen) {
      return;
    }
    try {
      await actions.swap.mutateAsync({
        gameId,
        roundNumber: target.roundNumber,
        gameTeamId: keepId,
        opponentGameTeamId: chosen,
      });
      onClose();
    } catch {
      return;
    }
  }

  function repeatLine(repeat: RoundRepeat) {
    const pair = `${teamShortName(teams.get(repeat.pairing.slot1GameTeamId))} / ${teamShortName(teams.get(repeat.pairing.slot2GameTeamId))}`;
    return m.repeats.line(repeat.roundNumber, pair);
  }

  return (
    <Drawer
      open={target != null}
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose();
        }
      }}
    >
      <DrawerContent className="px-[22px] pb-[max(22px,env(safe-area-inset-bottom))]">
        {target ? (
          <div className="mx-auto flex max-h-[80dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DrawerTitle className="text-h1">
                  {m.swap.title(
                    target.roundNumber,
                    target.match.courtName ?? "",
                  )}
                </DrawerTitle>
                <DrawerDescription className="text-meta mt-2 leading-relaxed">
                  {m.swap.lead(
                    teamShortName(keepTeam),
                    teamShortName(oldOpponent),
                  )}
                </DrawerDescription>
              </div>
              <CloseButton variant="boxed" onClick={onClose} disabled={busy} />
            </div>

            <div className="border-ink rounded-card flex items-center gap-3 border p-3">
              <TeamMark team={keepTeam} isViewer={false} />
              <TeamNames
                team={keepTeam}
                viewerUserId={viewerUserId}
                className="flex-1"
              />
              <span className="text-muted-foreground text-meta">
                {m.round.vs}
              </span>
              {selected ? (
                <>
                  <TeamNames
                    team={teams.get(selected.teamId)}
                    viewerUserId={viewerUserId}
                    className="flex-1 text-end"
                  />
                  <TeamMark
                    team={teams.get(selected.teamId)}
                    isViewer={false}
                  />
                </>
              ) : (
                <>
                  <span className="text-muted-foreground text-meta flex-1 text-end">
                    {m.swap.chooseBelow}
                  </span>
                  <span
                    aria-hidden="true"
                    className="hatch border-rule size-9 shrink-0 rounded-md border border-dashed"
                  />
                </>
              )}
            </div>

            <p className="text-muted-foreground text-meta">
              {m.swap.teamsInRound(target.roundNumber)}
            </p>
            <div
              role="radiogroup"
              aria-label={m.swap.teamsInRound(target.roundNumber)}
              className="border-rule rounded-card divide-rule divide-y overflow-hidden border"
            >
              {options.map((option) => {
                const team = teams.get(option.teamId);
                const active = option.teamId === chosen;
                return (
                  <button
                    key={option.teamId}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setChosen(option.teamId)}
                    className={cn(
                      "focus-visible:ring-ring/50 flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
                      active && "bg-wash",
                    )}
                  >
                    <TeamMark team={team} isViewer={false} />
                    <TeamNames
                      team={team}
                      viewerUserId={viewerUserId}
                      className="flex-1"
                    />
                    <span className="text-muted-foreground text-meta max-w-[50%] text-end">
                      {m.swap.consequence(
                        option.court,
                        teamShortName(oldOpponent),
                        teamShortName(teams.get(option.partnerId)),
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {selected && selected.repeats.length > 0 ? (
              <div role="status" className="text-meta">
                <p className="font-semibold">{m.swap.repeats}</p>
                <ul className="text-muted-foreground mt-1 list-disc ps-5">
                  {selected.repeats.map((repeat) => (
                    <li
                      key={`${repeat.roundNumber}-${repeat.pairing.slot1GameTeamId}-${repeat.pairing.slot2GameTeamId}`}
                    >
                      {repeatLine(repeat)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-muted-foreground text-meta leading-relaxed">
              {m.swap.note}
            </p>
            <Button
              type="button"
              size="lg"
              className="w-full font-semibold"
              disabled={!chosen || busy}
              aria-busy={busy}
              onClick={() => void confirm()}
            >
              {busy ? m.swap.swapping : m.swap.confirm}
            </Button>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
