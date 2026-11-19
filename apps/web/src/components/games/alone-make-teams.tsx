"use client";

import {
  balanceAloneTeams,
  shuffleAloneTeams,
  swapAloneSlots,
  type AloneSlot,
} from "@repo/domain/alone-teams";
import { formatGameStart } from "@repo/domain/format-game-start";
import { gameDisplayName } from "@repo/domain/game-custom-name";
import { shortPlayerName } from "@repo/domain/player-name";
import { ScaleIcon, ShuffleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Skeleton } from "~/components/ui/skeleton";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

import {
  aloneDraftNote,
  aloneMakeTeamsRows,
  alonePlayers,
  initialAloneDraft,
  type AloneDraft,
  type AloneMakeTeamsSlot,
} from "./alone-teams-view";

function SlotButton({
  slot,
  isViewer,
  picked,
  onClick,
}: {
  slot: AloneMakeTeamsSlot;
  isViewer: boolean;
  picked: boolean;
  onClick: () => void;
}) {
  const m = useMessages();
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring/50 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border px-2.5 text-start outline-none transition-colors focus-visible:ring-[3px]",
        picked
          ? "bg-control text-on-control border-ink"
          : "border-rule bg-paper text-ink hover:bg-wash",
      )}
    >
      <span dir="auto" className="text-meta min-w-0 flex-1 truncate">
        {isViewer ? m.common.you : shortPlayerName(slot.name)}
      </span>
      {slot.meta ? (
        <span
          className={cn(
            "shrink-0 font-mono text-[10px] tracking-[0.04em]",
            picked ? "text-on-control-muted" : "text-muted-foreground",
          )}
        >
          {slot.meta}
        </span>
      ) : null}
    </button>
  );
}

/**
 * 3a: the Organizer of an Alone-only Social pairs the players, by level or by
 * hand, then posts the teams (ADR-0096).
 */
export function AloneMakeTeams({ gameId }: { gameId: string }) {
  const messages = useMessages();
  const m = messages.aloneTeams.make;
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const gameHref = `/dashboard/games/${gameId}`;
  const game = api.games.byId.useQuery({ id: gameId });
  const sheet = api.games.teamsSheet.useQuery({ gameId });
  const [draft, setDraft] = React.useState<AloneDraft | null>(null);
  const [picked, setPicked] = React.useState<AloneSlot | null>(null);

  React.useEffect(() => {
    if (sheet.data && draft == null) {
      setDraft(initialAloneDraft(sheet.data));
    }
  }, [sheet.data, draft]);

  const post = api.games.postTeams.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(m.posted);
      await Promise.all([
        utils.games.byId.invalidate({ id: gameId }),
        utils.games.teamsSheet.invalidate({ gameId }),
        utils.games.listMyGames.invalidate(),
      ]);
      router.push(gameHref);
    },
  });

  const players = React.useMemo(() => sheet.data?.players ?? [], [sheet.data]);
  const fieldPlayers = React.useMemo(() => alonePlayers(players), [players]);
  const playerById = React.useMemo(
    () => new Map(fieldPlayers.map((player) => [player.id, player])),
    [fieldPlayers],
  );
  const back = (
    <Button variant="outline" asChild>
      <Link href={gameHref}>{messages.webTournament.backToGame}</Link>
    </Button>
  );
  const description = game.data
    ? [
        game.data.venue
          ? messages.webTournament.aloneTeams.contextLine(
              gameDisplayName(game.data, locale),
              game.data.venue.name,
            )
          : gameDisplayName(game.data, locale),
        game.data.windowStart
          ? formatGameStart(game.data.windowStart, locale)
          : null,
      ]
        .filter(Boolean)
        .join(". ")
    : undefined;

  function tap(slot: AloneSlot) {
    if (!draft) {
      return;
    }
    if (!picked) {
      setPicked(slot);
      return;
    }
    if (picked.pairIndex === slot.pairIndex && picked.side === slot.side) {
      setPicked(null);
      return;
    }
    setDraft({
      ...draft,
      pairs: swapAloneSlots(draft.pairs, picked, slot),
      mode: "edited",
    });
    setPicked(null);
  }

  let body: React.ReactNode;
  if (sheet.error) {
    body = (
      <ErrorState
        title={messages.webTournament.aloneTeams.loadFailed}
        error={sheet.error}
        onRetry={() => void sheet.refetch()}
      />
    );
  } else if (!sheet.data || !draft) {
    body = <Skeleton className="h-96 w-full rounded-xl" />;
  } else if (!sheet.data.canPost) {
    body = (
      <section className="border-rule bg-paper space-y-1 rounded-xl border p-5">
        <p className="text-body font-semibold">
          {sheet.data.drawPosted
            ? messages.aloneTeams.errors.drawPosted
            : m.tooFew(sheet.data.minPlayers)}
        </p>
      </section>
    );
  } else {
    const rows = aloneMakeTeamsRows(draft.pairs, players, locale);
    const note = aloneDraftNote(draft, playerById, locale);
    const reposting = sheet.data.teamsPostedAt != null;
    const unplacedName = draft.unplaced
      ? players.find((player) => player.userId === draft.unplaced)?.name
      : null;
    const pickedName = picked
      ? rows[picked.pairIndex]?.[picked.side].name
      : null;
    const viewerUserId = game.data?.viewerUserId ?? null;
    body = (
      <div className="space-y-5">
        <p className="text-muted-foreground text-meta">
          {m.intro(players.length)}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => {
              setPicked(null);
              setDraft({
                ...balanceAloneTeams(fieldPlayers),
                mode: "balanced",
              });
            }}
          >
            <ScaleIcon aria-hidden="true" />
            {m.balance}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => {
              setPicked(null);
              setDraft({
                ...shuffleAloneTeams(fieldPlayers),
                mode: "shuffled",
              });
            }}
          >
            <ShuffleIcon aria-hidden="true" />
            {m.shuffle}
          </Button>
        </div>
        {note ? (
          <p aria-live="polite" className="text-muted-foreground text-meta">
            {note}
          </p>
        ) : null}

        <div className="border-rule rounded-card overflow-hidden border">
          <div
            aria-hidden="true"
            className="text-muted-foreground border-rule flex items-center gap-2 border-b px-3 py-2 text-[11px]"
          >
            <span className="w-6 shrink-0">{m.columnNumber}</span>
            <span className="min-w-0 flex-1">{m.columnLeft}</span>
            <span className="min-w-0 flex-1">{m.columnRight}</span>
            <span className="w-11 shrink-0 text-end">{m.columnAverage}</span>
          </div>
          <ol className="divide-rule divide-y">
            {rows.map((row, pairIndex) => (
              <li
                key={row.number}
                className="flex items-center gap-2 px-3 py-2"
              >
                <span className="text-muted-foreground w-6 shrink-0 font-mono text-[11px]">
                  {row.number}
                </span>
                {/* Left and Right are court sides, so the pair keeps its order in Arabic. */}
                <div className="flex min-w-0 flex-[2] gap-1.5 rtl:flex-row-reverse">
                  {(["left", "right"] as const).map((side) => (
                    <SlotButton
                      key={side}
                      slot={row[side]}
                      isViewer={row[side].userId === viewerUserId}
                      picked={
                        picked?.pairIndex === pairIndex && picked.side === side
                      }
                      onClick={() => tap({ pairIndex, side })}
                    />
                  ))}
                </div>
                <span className="flex w-11 shrink-0 flex-col items-end">
                  <span className="text-body font-semibold tabular-nums">
                    {row.average}
                  </span>
                  {row.sameSide ? (
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {row.sameSide}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p aria-live="polite" className="text-muted-foreground text-meta">
          {pickedName ? m.swapSelected(pickedName) : m.swapHint}
        </p>
        {unplacedName ? (
          <p className="text-meta border-rule rounded-md border border-dashed px-3 py-2.5">
            {m.unplaced(unplacedName)}
          </p>
        ) : null}
        <p className="text-muted-foreground text-meta leading-relaxed">
          {m.legend}
        </p>

        <FormErrorSummary message={globalFormErrorMessage(post.error)} />
        <div className="border-rule bg-background sticky bottom-0 space-y-2 border-t py-4">
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            pending={post.isPending}
            onClick={() => post.mutate({ gameId, pairs: draft.pairs })}
          >
            {reposting ? m.postAgain : m.post}
          </Button>
          <p className="text-muted-foreground text-meta text-center">
            {reposting ? m.postAgainNote : m.postNote(draft.pairs.length * 2)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      title={m.title}
      description={description}
      action={back}
      isSubPage
      hideNav
    >
      {body}
    </DashboardShell>
  );
}
