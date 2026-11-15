"use client";

import { Inbox } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";
import { SectionTitle } from "~/components/home/section-title";
import { useLocale, useMessages } from "~/components/locale-provider";
import { useRequestAnswers } from "~/components/requests/request-answers-provider";
import {
  RequestList,
  RequestRowItem,
  RequestsFootnote,
} from "~/components/requests/request-card";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { Button } from "~/components/ui/button";
import {
  waitingBulkApproveLabel,
  waitingCountLabel,
  waitingGameFill,
  waitingGameHeading,
} from "@repo/domain/waiting-requests";
import { gameHomeHref } from "~/lib/dashboard-paths";
import {
  allRequestsView,
  type GameRequestsSection,
} from "@repo/domain/request-answers";

function GameRequests({ section }: { section: GameRequestsSection }) {
  const locale = useLocale();
  const { approveMany } = useRequestAnswers();
  const { game, waiting } = section;
  const bulkLabel = waitingBulkApproveLabel(waiting.length, locale);
  return (
    <>
      <div className="bg-wash flex items-center gap-3 px-4 py-3">
        <SportGlyph sport={game.sport} className="size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <Link
            href={gameHomeHref(game.id)}
            className="text-meta focus-visible:ring-ring/50 block truncate rounded-sm font-semibold outline-none hover:underline focus-visible:ring-[3px]"
          >
            {waitingGameHeading(game, locale)}
          </Link>
          <p className="text-eyebrow text-muted-foreground truncate">
            {waitingGameFill(
              game,
              {
                heldSeats: section.heldSeats,
                approvedSeats: section.approvedSeats,
              },
              locale,
            )}
          </p>
        </div>
        {bulkLabel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-rule bg-paper shrink-0 rounded-lg font-semibold shadow-none"
            onClick={() => approveMany(waiting)}
          >
            {bulkLabel}
          </Button>
        ) : null}
      </div>
      {section.rows.map((row) => (
        <RequestRowItem key={row.request.id} row={row} />
      ))}
    </>
  );
}

/** All requests 2c: seat requests by Game, then requests to join a Group. */
export default function AllRequestsPage() {
  const m = useMessages();
  const locale = useLocale();
  const { rows, isLoading, error, refetch } = useRequestAnswers();
  const view = allRequestsView(rows);

  function content() {
    if (isLoading) {
      return <ListPageSkeleton rows={3} />;
    }
    if (error) {
      return (
        <ErrorState
          title={m.requests.allTitle}
          message={error.message}
          onRetry={refetch}
        />
      );
    }
    if (rows.length === 0) {
      return (
        <EmptyState
          icon={Inbox}
          title={m.requests.nothingWaiting}
          description={m.requests.nothingWaitingNote}
        />
      );
    }
    return (
      <div className="flex flex-col gap-[26px]">
        {view.games.length > 0 ? (
          <section className="flex flex-col gap-3">
            <SectionTitle
              title={m.requests.games}
              meta={waitingCountLabel(view.gameWaitingCount, locale)}
            />
            <RequestList>
              {view.games.map((section) => (
                <GameRequests key={section.game.id} section={section} />
              ))}
            </RequestList>
            <RequestsFootnote>{m.requests.gamesNote}</RequestsFootnote>
          </section>
        ) : null}
        {view.groups.length > 0 ? (
          <section className="flex flex-col gap-3">
            <SectionTitle
              title={m.requests.groups}
              meta={waitingCountLabel(view.groupWaitingCount, locale)}
            />
            <RequestList>
              {view.groups.map((row) => (
                <RequestRowItem key={row.request.id} row={row} />
              ))}
            </RequestList>
          </section>
        ) : null}
      </div>
    );
  }

  return <DashboardShell title={m.requests.title}>{content()}</DashboardShell>;
}
