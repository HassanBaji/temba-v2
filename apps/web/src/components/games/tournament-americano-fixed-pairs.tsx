"use client";

import { Link2Icon } from "lucide-react";
import * as React from "react";

import { shortPlayerName } from "@repo/domain/player-name";
import {
  AMERICANO_FIXED_PAIR_MAX,
  americanoFixedPairNumber,
  americanoFixedPairsLeft,
  americanoRotatingPlayers,
  type AmericanoPair,
} from "@repo/domain/tournament-americano";

import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { CloseButton } from "~/components/ui/nav-icon-button";
import { useMessages } from "~/components/locale-provider";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";

import {
  AmericanoPlayerChip,
  type AmericanoNames,
  type AmericanoPlayer,
  type MutationError,
} from "./tournament-americano-parts";
import { ROUND_CARD } from "./tournament-round-parts";

/** "You and Khalid Janahi": the viewer first, the names as `nameOf` gives them. */
function pairLabel(
  pair: AmericanoPair,
  viewerGamePlayerId: string | null,
  nameOf: (gamePlayerId: string) => string,
  join: (first: string, second: string) => string,
) {
  const [first, second] =
    pair[1] === viewerGamePlayerId ? [pair[1], pair[0]] : pair;
  return join(nameOf(first), nameOf(second));
}

/** A player's fixed pair number, looked up by User id as the players grid keys its seats. */
export function fixedPairNumberByUser(
  players: readonly AmericanoPlayer[],
  fixedPairs: readonly AmericanoPair[],
) {
  const gamePlayerOfUser = new Map(
    players.flatMap((player) =>
      player.userId ? [[player.userId, player.gamePlayerId] as const] : [],
    ),
  );
  return (userId: string) => {
    const gamePlayerId = gamePlayerOfUser.get(userId);
    return gamePlayerId
      ? americanoFixedPairNumber(fixedPairs, gamePlayerId)
      : null;
  };
}

function PairMark() {
  return (
    <span className="border-rule bg-paper inline-flex size-10 shrink-0 items-center justify-center rounded-md border">
      <Link2Icon aria-hidden="true" className="size-[18px]" />
    </span>
  );
}

/** 1a: the Organizer's way into fixed pairs, under Make the rounds. */
export function AmericanoFixedPairsCard({
  fixedPairs,
  names,
  viewerGamePlayerId,
  players,
  rounds,
  onOpen,
}: {
  fixedPairs: readonly AmericanoPair[];
  names: AmericanoNames;
  viewerGamePlayerId: string | null;
  players: number;
  rounds: number;
  onOpen: () => void;
}) {
  const messages = useMessages();
  const m = messages.tournamentAmericano.fixedPairs;
  const noRoom =
    fixedPairs.length === 0 &&
    americanoFixedPairsLeft({ players, rounds, fixedPairs: 0 }) === 0;
  const shortName = (id: string) =>
    id === viewerGamePlayerId
      ? messages.common.you
      : shortPlayerName(names.get(id)?.name ?? "");
  return (
    <div className="border-rule rounded-card bg-paper flex items-center gap-3 border p-4">
      <PairMark />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold leading-snug">{m.title}</p>
        {fixedPairs.length === 0 ? (
          <p className="text-muted-foreground text-meta leading-relaxed">
            {noRoom ? m.noRoom(rounds) : m.none(AMERICANO_FIXED_PAIR_MAX)}
          </p>
        ) : (
          <ul className="text-meta leading-relaxed">
            {fixedPairs.map((pair, index) => (
              <li key={pair.join("|")} dir="auto">
                <span className="text-muted-foreground">
                  {m.pairTag(index + 1)}
                </span>{" "}
                {pairLabel(pair, viewerGamePlayerId, shortName, m.pairNames)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        disabled={noRoom}
        onClick={onOpen}
      >
        {fixedPairs.length === 0 ? m.pick : m.change}
      </Button>
    </div>
  );
}

/**
 * 1b: tap one player, then their partner, to keep them together in every
 * Match. Up to two pairs, while everyone else still gets a new partner each
 * Round. Done saves the pairs; they lock when the Rounds are made.
 */
export function AmericanoFixedPairsSheet({
  open,
  onOpenChange,
  players,
  saved,
  seats,
  rounds,
  viewerGamePlayerId,
  pending,
  error,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: readonly AmericanoPlayer[];
  saved: readonly AmericanoPair[];
  /** The seats on the Social: the pairs must fit the Rounds once it is full. */
  seats: number;
  rounds: number;
  viewerGamePlayerId: string | null;
  pending: boolean;
  error: MutationError;
  onSave: (pairs: AmericanoPair[]) => Promise<void>;
}) {
  const messages = useMessages();
  const m = messages.tournamentAmericano.fixedPairs;
  const [pairs, setPairs] = React.useState<AmericanoPair[]>(() => [...saved]);
  const [picked, setPicked] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (open) {
      setPairs([...saved]);
      setPicked(null);
    }
  }, [open, saved]);

  const names: AmericanoNames = React.useMemo(
    () => new Map(players.map((player) => [player.gamePlayerId, player])),
    [players],
  );
  const left = americanoFixedPairsLeft({
    players: seats,
    rounds,
    fixedPairs: pairs.length,
  });
  const fullName = (id: string) =>
    id === viewerGamePlayerId
      ? messages.common.you
      : (names.get(id)?.name ?? "");
  const rotating = americanoRotatingPlayers(seats, pairs.length);
  const errorMessage = globalFormErrorMessage(error);
  const changed =
    pairs.length !== saved.length ||
    pairs.some(
      (pair, index) => pair.join("|") !== (saved[index] ?? []).join("|"),
    );

  function pick(id: string) {
    if (picked == null) {
      setPicked(id);
      return;
    }
    if (picked !== id) {
      setPairs((current) => [...current, [picked, id]]);
    }
    setPicked(null);
  }

  function done() {
    if (!changed) {
      onOpenChange(false);
      return;
    }
    void onSave(pairs).then(
      () => onOpenChange(false),
      () => undefined,
    );
  }

  const pickedName = picked
    ? picked === viewerGamePlayerId
      ? messages.common.you
      : shortPlayerName(names.get(picked)?.name ?? "")
    : null;

  return (
    <Drawer open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DrawerContent className="px-[22px] pb-[max(22px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle className="text-h1">{m.title}</DrawerTitle>
              <DrawerDescription className="text-meta mt-2 leading-relaxed">
                {m.lead}
              </DrawerDescription>
            </div>
            <CloseButton
              variant="boxed"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            />
          </div>

          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-expanded text-title tracking-[-0.03em]">
                {m.pairs}
              </h3>
              <p className="text-muted-foreground text-meta">
                {m.pairsCount(pairs.length, AMERICANO_FIXED_PAIR_MAX)}
              </p>
            </div>
            <ul className="flex flex-col gap-2">
              {pairs.map((pair, index) => {
                const label = pairLabel(
                  pair,
                  viewerGamePlayerId,
                  fullName,
                  m.pairNames,
                );
                return (
                  <li
                    key={pair.join("|")}
                    className={cn(ROUND_CARD, "flex items-center gap-3 p-3")}
                  >
                    <Link2Icon aria-hidden="true" className="size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p
                        dir="auto"
                        className="text-meta truncate font-semibold"
                      >
                        {label}
                      </p>
                      <p className="text-muted-foreground text-[12px]">
                        {m.together(rounds)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      aria-label={m.removeLabel(label)}
                      onClick={() =>
                        setPairs((current) =>
                          current.filter((_, other) => other !== index),
                        )
                      }
                    >
                      {m.remove}
                    </Button>
                  </li>
                );
              })}
              {left > 0 ? (
                <li
                  aria-live="polite"
                  className="border-rule text-muted-foreground text-meta relative flex min-h-12 items-center justify-center overflow-hidden rounded-md border border-dashed px-3 text-center"
                >
                  <span
                    aria-hidden="true"
                    className="hatch absolute inset-0 opacity-60"
                  />
                  <span className="relative">
                    {pickedName
                      ? m.partnerOf(pairs.length + 1, pickedName)
                      : m.next(pairs.length + 1)}
                  </span>
                </li>
              ) : null}
            </ul>
            {left === 0 ? (
              <p className="text-muted-foreground text-meta">
                {pairs.length >= AMERICANO_FIXED_PAIR_MAX
                  ? m.full(AMERICANO_FIXED_PAIR_MAX)
                  : m.tooFewToRotate(rounds)}
              </p>
            ) : null}
          </section>

          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-expanded text-title tracking-[-0.03em]">
                {m.players}
              </h3>
              <p className="text-muted-foreground text-meta">
                {players.length}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {players.map((player) => {
                const id = player.gamePlayerId;
                const pairNumber = americanoFixedPairNumber(pairs, id);
                const free = pairNumber == null && left > 0 && !pending;
                return (
                  <AmericanoPlayerChip
                    key={id}
                    name={player.name}
                    image={player.image}
                    isViewer={id === viewerGamePlayerId}
                    selected={picked === id}
                    pair={pairNumber ?? undefined}
                    label={picked === id ? m.selected(player.name) : undefined}
                    onClick={free ? () => pick(id) : undefined}
                  />
                );
              })}
            </div>
            <p className="text-muted-foreground text-meta leading-relaxed">
              {m.foot(rotating, rounds, left)}
            </p>
          </section>

          {errorMessage ? <FormErrorSummary message={errorMessage} /> : null}

          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            disabled={pending}
            aria-busy={pending}
            onClick={done}
          >
            {pending ? m.saving : m.done}
          </Button>
          <p className="text-muted-foreground text-meta text-center">
            {m.doneFoot}
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
