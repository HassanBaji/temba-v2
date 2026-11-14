"use client";

import { toast } from "sonner";

import { useRequestAnswers } from "~/components/requests/request-answers-provider";
import {
  RequestList,
  RequestRowItem,
  RequestsFootnote,
} from "~/components/requests/request-card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  levelRangeQueueVisible,
  levelRangeRequestCard,
} from "@repo/domain/level-range-request";
import { requestsQueueHeading } from "@repo/domain/seat-hold-request";
import { useLocale, useMessages } from "~/components/locale-provider";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import type { TournamentDetails } from "@repo/domain/tournament-details";
import {
  gameRequestRows,
  waitingRequestsOf,
} from "@repo/domain/request-answers";
import { isSeatRequest } from "@repo/domain/waiting-requests";

/** The Game fields the player's Level card and the Organizer's Requests queue read. */
type GameDetail = Pick<
  TournamentDetails,
  | "id"
  | "isOrganizer"
  | "sport"
  | "levelMinTenths"
  | "levelMaxTenths"
  | "viewerLevelTenths"
  | "canRequestLevelRange"
  | "levelRangeRequest"
>;

export function GameLevelRangePanel({ game }: { game: GameDetail }) {
  const locale = useLocale();
  const m = useMessages();
  const utils = api.useUtils();
  const requestLevelRange = api.games.requestLevelRange.useMutation({
    onSuccess: async () => {
      toast.success(m.level.request.sent);
      await utils.games.byId.invalidate({ id: game.id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });
  const requestCard = levelRangeRequestCard(game, locale);
  const { rows } = useRequestAnswers();
  const gameRows = game.isOrganizer ? gameRequestRows(rows, game.id) : [];
  const waiting = waitingRequestsOf(gameRows);
  const showOrganizerQueue =
    levelRangeQueueVisible(game) || gameRows.length > 0;
  const queueHeading = requestsQueueHeading(
    {
      levelRange: waiting.filter((request) => request.kind === "level_range")
        .length,
      seatHolds: waiting.filter((request) => request.kind === "seat_hold")
        .length,
    },
    locale,
  );
  const first = gameRows[0]?.request;
  const groupName = first && isSeatRequest(first) ? first.game.groupName : null;

  if (!requestCard && !showOrganizerQueue) {
    return null;
  }

  return (
    <div className="space-y-6">
      {requestCard ? (
        <Card variant="outlined" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-title font-medium">{requestCard.title}</h3>
            {requestCard.badge === "Pending" ? (
              <Badge variant="warning">{m.level.request.pending}</Badge>
            ) : null}
            {requestCard.badge === "Rejected" ? (
              <Badge variant="destructive">{m.level.request.rejected}</Badge>
            ) : null}
          </div>
          <p className="text-body text-muted-foreground">{requestCard.copy}</p>
          {requestCard.actionLabel ? (
            <Button
              type="button"
              disabled={
                requestLevelRange.isPending || !requestCard.actionEnabled
              }
              onClick={() => requestLevelRange.mutate({ gameId: game.id })}
            >
              {requestLevelRange.isPending
                ? m.webGame.levelRange.requesting
                : requestCard.actionLabel}
            </Button>
          ) : null}
        </Card>
      ) : null}

      {showOrganizerQueue ? (
        <section
          className="space-y-2.5"
          aria-labelledby="game-requests-heading"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="game-requests-heading"
              className="text-h2 font-bold tracking-[-0.02em]"
            >
              {m.game.requests.title}
            </h2>
            <p className="text-meta text-muted-foreground">{queueHeading}</p>
          </div>
          {gameRows.length > 0 ? (
            <>
              <RequestList>
                {gameRows.map((row) => (
                  <RequestRowItem key={row.request.id} row={row} />
                ))}
              </RequestList>
              <RequestsFootnote>
                {groupName
                  ? m.requests.gameNote(groupName)
                  : m.requests.gamesNote}
              </RequestsFootnote>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
