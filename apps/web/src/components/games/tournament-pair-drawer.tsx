"use client";

import { XIcon } from "lucide-react";
import * as React from "react";

import { formatGameClock } from "@repo/domain/format-game-start";
import {
  pairKey,
  poolPlaysRound,
  type RoundPairing,
} from "@repo/domain/tournament-pairing";

import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Hatch } from "~/components/ui/hatch";
import { CloseButton } from "~/components/ui/nav-icon-button";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import {
  ROUND_CARD,
  TeamMark,
  TeamNames,
  teamShortName,
  type RoundsTeam,
  type TournamentRoundsData,
} from "./tournament-round-parts";
import { type TournamentRoundsActions } from "./use-tournament-rounds";

function teamsIn(pairings: readonly RoundPairing[]) {
  return new Set(
    pairings.flatMap((pairing) => [
      pairing.slot1GameTeamId,
      pairing.slot2GameTeamId,
    ]),
  );
}

export function TournamentPairDrawer({
  gameId,
  data,
  roundNumber,
  teams,
  viewerUserId,
  actions,
  onClose,
}: {
  gameId: string;
  data: TournamentRoundsData;
  roundNumber: number | null;
  teams: ReadonlyMap<string, RoundsTeam>;
  viewerUserId: string;
  actions: TournamentRoundsActions;
  onClose: () => void;
}) {
  const m = useMessages().tournamentRounds;
  const locale = useLocale();
  const round = data.rounds.find((item) => item.roundNumber === roundNumber);
  const [pairings, setPairings] = React.useState<RoundPairing[]>([]);
  const [picked, setPicked] = React.useState<string | null>(null);

  React.useEffect(() => {
    setPicked(null);
    setPairings(
      round?.state === "draft"
        ? round.matches.map((match) => ({
            slot1GameTeamId: match.slot1GameTeamId,
            slot2GameTeamId: match.slot2GameTeamId,
          }))
        : [],
    );
    // Load the stored draft only when a different Round opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundNumber]);

  const metIn = React.useMemo(() => {
    const met = new Map<string, number>();
    for (const other of data.rounds) {
      if (other.roundNumber === roundNumber) {
        continue;
      }
      for (const match of other.matches) {
        met.set(
          pairKey(match.slot1GameTeamId, match.slot2GameTeamId),
          other.roundNumber,
        );
      }
    }
    return met;
  }, [data.rounds, roundNumber]);

  if (!round || roundNumber == null) {
    return null;
  }

  const busy = actions.save.isPending || actions.post.isPending;
  const taken = teamsIn(pairings);
  const playingPools = new Set(
    data.pools
      .filter((pool) =>
        poolPlaysRound(
          pool.gameTeamIds.length,
          roundNumber,
          data.suggestedRoundCount,
        ),
      )
      .map((pool) => pool.poolIndex),
  );
  const free = data.teams.filter(
    (team) => !taken.has(team.gameTeamId) && playingPools.has(team.poolIndex),
  );
  const pickedTeam = picked ? teams.get(picked) : undefined;
  const nextSlot = round.slots[pairings.length];
  const left = Math.max(round.expectedMatchCount - pairings.length, 0);

  async function store(next: RoundPairing[], fill: boolean) {
    if (roundNumber == null) {
      return;
    }
    try {
      const saved = await actions.save.mutateAsync({
        gameId,
        roundNumber,
        pairings: next,
        fill,
      });
      setPairings(saved.pairings);
    } catch {
      return;
    }
  }

  function tap(teamId: string) {
    if (busy) {
      return;
    }
    if (!picked || picked === teamId) {
      setPicked(picked === teamId ? null : teamId);
      return;
    }
    const team = teams.get(teamId);
    if (team?.poolIndex !== pickedTeam?.poolIndex) {
      setPicked(teamId);
      return;
    }
    const next = [
      ...pairings,
      { slot1GameTeamId: picked, slot2GameTeamId: teamId },
    ];
    setPairings(next);
    setPicked(null);
    void store(next, false);
  }

  function remove(index: number) {
    const next = pairings.filter((_, position) => position !== index);
    setPairings(next);
    void store(next, false);
  }

  async function post() {
    if (roundNumber == null) {
      return;
    }
    try {
      await actions.post.mutateAsync({ gameId, roundNumbers: [roundNumber] });
      onClose();
    } catch {
      return;
    }
  }

  function freeLine(team: RoundsTeam) {
    if (!pickedTeam) {
      return m.pair.points(team.points);
    }
    if (team.poolIndex !== pickedTeam.poolIndex) {
      return m.pair.otherPool;
    }
    const met = metIn.get(pairKey(pickedTeam.gameTeamId, team.gameTeamId));
    return met != null
      ? m.pair.playedIn(met)
      : `${m.pair.points(team.points)}. ${m.pair.notPlayed}`;
  }

  return (
    <Drawer
      open={roundNumber != null}
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose();
        }
      }}
    >
      <DrawerContent className="mt-0 h-dvh max-h-dvh rounded-none p-0 data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-dvh [&>div.bg-muted]:hidden">
        <div className="flex h-full min-h-0 flex-col">
          <div className="bg-ink text-paper shrink-0 px-[22px] pb-[22px] pt-[22px]">
            <CloseButton
              variant="boxed"
              surface="ink"
              onClick={onClose}
              disabled={busy}
            />
            <DrawerTitle className="text-paper font-expanded text-display mt-6 leading-none tracking-[-0.03em]">
              {m.pair.title(roundNumber)}
            </DrawerTitle>
            <DrawerDescription className="text-dim text-meta mt-2.5 leading-relaxed">
              {m.pair.lead}
            </DrawerDescription>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-[22px] py-[22px]">
            <section>
              <div className="flex items-baseline justify-between gap-3 pb-2.5">
                <h3 className="font-expanded text-title tracking-[-0.03em]">
                  {m.pair.gamesIn(roundNumber)}
                </h3>
                <p className="text-muted-foreground text-meta">
                  {m.pair.made(pairings.length, round.expectedMatchCount)}
                </p>
              </div>
              <ul className={cn(ROUND_CARD, "divide-rule divide-y")}>
                {Array.from(
                  { length: round.expectedMatchCount },
                  (_, index) => {
                    const pairing = pairings[index];
                    const slot = round.slots[index];
                    const isNext = index === pairings.length;
                    return (
                      <li
                        key={index}
                        className={cn(
                          "flex min-h-14 items-center gap-3 px-4 py-3",
                          isNext && pickedTeam && "bg-wash",
                        )}
                      >
                        <span className="w-14 shrink-0">
                          <span
                            className={cn(
                              "text-meta block font-semibold",
                              !pairing && !isNext && "text-muted-foreground",
                            )}
                          >
                            {slot?.courtName}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {slot
                              ? formatGameClock(slot.startTime, locale)
                              : ""}
                          </span>
                        </span>
                        {pairing ? (
                          <>
                            <TeamMark
                              team={teams.get(pairing.slot1GameTeamId)}
                              isViewer={false}
                            />
                            <TeamNames
                              team={teams.get(pairing.slot1GameTeamId)}
                              viewerUserId={viewerUserId}
                              className="flex-1"
                            />
                            <span className="text-muted-foreground text-meta">
                              {m.round.vs}
                            </span>
                            <TeamNames
                              team={teams.get(pairing.slot2GameTeamId)}
                              viewerUserId={viewerUserId}
                              className="flex-1"
                            />
                            <TeamMark
                              team={teams.get(pairing.slot2GameTeamId)}
                              isViewer={false}
                            />
                            <button
                              type="button"
                              aria-label={m.pair.removeGame(
                                teamShortName(
                                  teams.get(pairing.slot1GameTeamId),
                                ),
                                teamShortName(
                                  teams.get(pairing.slot2GameTeamId),
                                ),
                              )}
                              disabled={busy}
                              onClick={() => remove(index)}
                              className="border-rule focus-visible:ring-ring/50 inline-flex size-11 shrink-0 items-center justify-center rounded-md border outline-none focus-visible:ring-[3px]"
                            >
                              <XIcon aria-hidden="true" className="size-4" />
                            </button>
                          </>
                        ) : isNext && pickedTeam ? (
                          <>
                            <TeamMark team={pickedTeam} isViewer />
                            <TeamNames
                              team={pickedTeam}
                              viewerUserId={viewerUserId}
                              className="flex-1"
                            />
                            <span className="text-muted-foreground text-meta">
                              {m.round.vs}
                            </span>
                            <span className="text-muted-foreground text-meta flex-1 text-end">
                              {m.pair.pickBelow}
                            </span>
                            <Hatch className="border-rule size-9 shrink-0 rounded-md border border-dashed" />
                          </>
                        ) : (
                          <Hatch className="border-rule h-9 flex-1 rounded-md border border-dashed" />
                        )}
                      </li>
                    );
                  },
                )}
              </ul>
            </section>

            {free.length > 0 ? (
              <section>
                <div className="flex items-baseline justify-between gap-3 pb-2.5">
                  <h3 className="font-expanded text-title tracking-[-0.03em]">
                    {m.pair.freeTeams}
                  </h3>
                  <p className="text-muted-foreground text-meta">
                    {m.pair.left(
                      free.length,
                      pickedTeam ? (nextSlot?.courtName ?? null) : null,
                    )}
                  </p>
                </div>
                <ul className={cn(ROUND_CARD, "divide-rule divide-y")}>
                  {free.map((team) => {
                    const met =
                      pickedTeam != null &&
                      (team.poolIndex !== pickedTeam.poolIndex ||
                        metIn.has(
                          pairKey(pickedTeam.gameTeamId, team.gameTeamId),
                        ));
                    const isPicked = team.gameTeamId === picked;
                    return (
                      <li key={team.gameTeamId}>
                        <button
                          type="button"
                          aria-pressed={isPicked}
                          disabled={busy}
                          onClick={() => tap(team.gameTeamId)}
                          className={cn(
                            "focus-visible:ring-ring/50 flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
                            isPicked && "bg-wash",
                          )}
                        >
                          <TeamMark
                            team={team}
                            isViewer={isPicked}
                            muted={met}
                          />
                          <TeamNames
                            team={team}
                            viewerUserId={viewerUserId}
                            muted={met}
                            className="flex-1"
                          />
                          <span className="text-muted-foreground text-meta shrink-0 text-end">
                            {freeLine(team)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-muted-foreground text-meta mt-2.5 leading-relaxed">
                  {m.pair.note}
                </p>
              </section>
            ) : null}
          </div>

          <div className="border-rule flex shrink-0 gap-2.5 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
            <Button
              type="button"
              size="lg"
              className="flex-1 font-semibold"
              disabled={busy || left > 0}
              aria-busy={actions.post.isPending}
              onClick={() => void post()}
            >
              {actions.post.isPending
                ? m.round.posting
                : m.pair.post(roundNumber, left)}
            </Button>
            {left > 0 ? (
              <Button
                type="button"
                size="lg"
                variant="outline"
                disabled={busy}
                aria-busy={actions.save.isPending}
                onClick={() => void store(pairings, true)}
              >
                {actions.save.isPending ? m.pair.filling : m.pair.fillRest}
              </Button>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
