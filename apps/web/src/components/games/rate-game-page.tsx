"use client";

import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  rateGameDraft,
  rateGameSubmission,
  rateGameView,
  setDraftRating,
  toggleDraftMvp,
  type RateGameDraft,
  type RateGameRow,
  type RateGameSheet,
  type RateGameSide,
  type RateGameView,
} from "@repo/domain/performance-rating";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  EyeOffIcon,
  LockIcon,
  StarIcon,
} from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { BibChip } from "~/components/games/football-bibs";
import { PageTitle } from "~/components/layout/page-title";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { gameHomeHref } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { invalidateRatingReads } from "~/trpc/invalidate-rating-reads";
import { api, type RouterOutputs } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

type Sheet = RouterOutputs["games"]["performanceRatingSheet"];

function Frame({ gameId, children }: { gameId: string; children: ReactNode }) {
  const m = useMessages();
  return (
    <DashboardShell
      title={m.rating.performance.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[26px] pb-6">
        <header className="mt-6 flex items-center gap-3 lg:mt-2">
          <BackButton
            href={gameHomeHref(gameId)}
            label={m.webTournament.backToGame}
          />
          <PageTitle className="text-ink">
            {m.rating.performance.title}
          </PageTitle>
        </header>
        {children}
      </div>
    </DashboardShell>
  );
}

export function Hero({ hero }: { hero: RateGameView["hero"] }) {
  return (
    <section className="border-rule bg-wash rounded-[16px] border px-[18px] py-4">
      <div className="text-eyebrow flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-[7px]">
          <span className="font-semibold">{hero.sport}</span>
          {hero.groupName ? (
            <span className="text-muted-foreground truncate">
              {hero.groupName}
            </span>
          ) : null}
        </span>
        <span className="font-semibold">{hero.status}</span>
      </div>
      <div className="mt-3.5 flex items-center justify-center gap-4">
        <span className="flex items-center gap-[7px] font-semibold">
          <BibChip bib={hero.slot1.bib} />
          {hero.slot1.name}
        </span>
        {hero.score ? (
          <span className="font-expanded text-display font-bold tabular-nums">
            {hero.score}
          </span>
        ) : null}
        <span className="flex items-center gap-[7px]">
          <BibChip bib={hero.slot2.bib} />
          {hero.slot2.name}
        </span>
      </div>
      {hero.line ? (
        <p className="text-eyebrow text-muted-foreground mt-2 text-center">
          {hero.line}
        </p>
      ) : null}
    </section>
  );
}

function PrivacyPanel({
  privacy,
}: {
  privacy: NonNullable<RateGameView["privacy"]>;
}) {
  return (
    <section className="border-rule flex items-center gap-3 rounded-[16px] border px-4 py-3">
      <span className="border-rule flex size-8 shrink-0 items-center justify-center rounded-[10px] border">
        <EyeOffIcon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-meta font-semibold">{privacy.title}</p>
        <p className="text-eyebrow text-muted-foreground">
          {privacy.description}
        </p>
      </div>
    </section>
  );
}

function PlayerRow({
  row,
  disabled,
  onPick,
  onStar,
}: {
  row: RateGameRow;
  disabled: boolean;
  onPick: (value: number) => void;
  onStar: () => void;
}) {
  return (
    <li className="border-rule border-t px-4 pb-3.5 pt-3">
      <div className="flex items-center gap-2.5">
        <UserAvatar name={row.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{row.name}</span>
          {row.detail ? (
            <span className="text-eyebrow text-muted-foreground block">
              {row.detail}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "font-expanded text-h2 min-w-7 text-right font-bold tabular-nums",
            row.value === null && "text-muted-foreground",
          )}
        >
          {row.valueLabel}
        </span>
        {row.star ? (
          <button
            type="button"
            aria-label={row.star.spoken}
            aria-pressed={row.star.on}
            disabled={disabled}
            onClick={onStar}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-[9px] border",
              row.star.on
                ? "border-ink bg-ink text-paper"
                : "border-rule bg-paper text-muted-foreground",
            )}
          >
            <StarIcon aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div
        role="radiogroup"
        aria-label={row.spoken}
        className="mt-2.5 flex gap-[3px]"
      >
        {row.cells.map((cell) => (
          <button
            key={cell.value}
            type="button"
            role="radio"
            aria-checked={cell.state === "selected"}
            aria-label={cell.spoken}
            disabled={disabled}
            onClick={() => onPick(cell.value)}
            className={cn(
              "text-eyebrow h-[30px] flex-1 rounded-[7px] border tabular-nums",
              cell.state === "selected" && "border-ink bg-ink text-paper",
              cell.state === "below" && "border-rule bg-wash text-ink",
              cell.state === "above" &&
                "border-rule bg-paper text-muted-foreground",
            )}
          >
            {cell.value}
          </button>
        ))}
      </div>
    </li>
  );
}

function SelfRow({ self }: { self: NonNullable<RateGameSide["self"]> }) {
  return (
    <li className="hatch border-rule flex items-center gap-2.5 border-t px-4 py-3">
      <UserAvatar name={self.playerName} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{self.name}</span>
        <span className="text-eyebrow text-muted-foreground block">
          {self.note}
        </span>
      </span>
      <LockIcon aria-hidden="true" className="text-muted-foreground size-4" />
    </li>
  );
}

function SideBlock({
  side,
  open,
  disabled,
  onToggle,
  onPick,
  onStar,
}: {
  side: RateGameSide;
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onPick: (userId: string, value: number) => void;
  onStar: (userId: string) => void;
}) {
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon;
  return (
    <section className="border-rule bg-paper overflow-hidden rounded-[14px] border">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? side.hideLabel : side.showLabel}
        onClick={onToggle}
        className="text-meta flex min-h-11 w-full items-center gap-2 px-4 text-left"
      >
        <BibChip bib={side.bib} />
        <span className="font-semibold">{side.name}</span>
        <span className="text-muted-foreground min-w-0 flex-1 truncate">
          {open ? null : side.collapsedLine}
        </span>
        {open && side.aside ? (
          <span className="text-eyebrow text-muted-foreground">
            {side.aside}
          </span>
        ) : null}
        <Chevron aria-hidden="true" className="size-4" />
      </button>
      {open ? (
        <ul>
          {side.rows.map((row) => (
            <PlayerRow
              key={row.userId}
              row={row}
              disabled={disabled}
              onPick={(value) => onPick(row.userId, value)}
              onStar={() => onStar(row.userId)}
            />
          ))}
          {side.self ? <SelfRow self={side.self} /> : null}
        </ul>
      ) : null}
    </section>
  );
}

function RateGameForm({ gameId, sheet }: { gameId: string; sheet: Sheet }) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const input: RateGameSheet = sheet;
  const [draft, setDraft] = useState<RateGameDraft>(() => rateGameDraft(input));
  const view = rateGameView(input, draft, locale);
  const [open, setOpen] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      view.sides.map((side) => [side.slot, side.openByDefault]),
    ),
  );
  const setMvp = api.marks.setMvp.useMutation({ meta: OWN_ERROR_UI });
  const submit = api.games.submitPerformanceRatings.useMutation({
    meta: OWN_ERROR_UI,
  });
  const pending = setMvp.isPending || submit.isPending;

  async function send() {
    const payload = rateGameSubmission(draft, input);
    try {
      if (payload.mvpUserId) {
        await setMvp.mutateAsync({ gameId, userId: payload.mvpUserId });
      }
      await submit.mutateAsync({ gameId, ratings: payload.ratings });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : m.common.tryAgain);
      return;
    }
    toast.success(view.submitted);
    await Promise.all([
      utils.games.performanceRatingSheet.invalidate({ gameId }),
      utils.games.performanceRatingResult.invalidate({ gameId }),
      utils.games.byId.invalidate({ id: gameId }),
      utils.games.footballBoard.invalidate({ gameId }),
      utils.marks.forGame.invalidate({ gameId }),
      invalidateRatingReads(utils),
    ]);
    router.push(gameHomeHref(gameId));
  }

  return (
    <>
      <Hero hero={view.hero} />
      {view.privacy && !view.notice ? (
        <PrivacyPanel privacy={view.privacy} />
      ) : null}
      {view.notice ? (
        <section className="border-rule rounded-[16px] border px-[22px] py-5">
          <p className="text-lead font-semibold">{view.notice.title}</p>
          <p className="text-meta text-muted-foreground mt-1">
            {view.notice.description}
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-title font-semibold">{view.heading}</h2>
            <span className="text-meta text-muted-foreground">
              {view.headingAside}
            </span>
          </div>
          {view.sides.map((side) => (
            <SideBlock
              key={side.slot}
              side={side}
              open={open[side.slot] ?? false}
              disabled={!view.canSubmit || pending}
              onToggle={() =>
                setOpen((current) => ({
                  ...current,
                  [side.slot]: !current[side.slot],
                }))
              }
              onPick={(userId, value) =>
                setDraft((current) => setDraftRating(current, userId, value))
              }
              onStar={(userId) =>
                setDraft((current) => toggleDraftMvp(current, input, userId))
              }
            />
          ))}
          <p className="text-eyebrow text-muted-foreground">{view.footnote}</p>
        </div>
      )}
      {view.canSubmit ? (
        <div className="border-rule flex items-center gap-3.5 border-t pt-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold" aria-live="polite">
              {view.footer.title}
            </p>
            {view.footer.subline ? (
              <p className="text-meta text-muted-foreground truncate">
                {view.footer.subline}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="lg"
            pending={pending}
            pendingLabel={m.common.saving}
            onClick={() => void send()}
            className="font-semibold"
          >
            {view.footer.submit}
          </Button>
        </div>
      ) : null}
    </>
  );
}

/**
 * Rate the game. In Organizer mode the Organizer scores every player 1 to
 * 10 and stars the MVP; Submit closes the Rating window and everyone's Tier
 * points move. When everyone rates, a player scores teammates and, if they
 * want, opponents, and may change them until the window closes.
 */
export function RateGamePage({ gameId }: { gameId: string }) {
  const m = useMessages();
  const query = api.games.performanceRatingSheet.useQuery({ gameId });

  if (isNotFoundError(query.error)) {
    notFound();
  }

  return (
    <Frame gameId={gameId}>
      {query.data ? (
        <RateGameForm
          key={`${query.data.matchId}:${query.data.state}`}
          gameId={gameId}
          sheet={query.data}
        />
      ) : query.error ? (
        <ErrorState
          title={m.rating.performance.loadFailed}
          error={query.error}
          onRetry={() => {
            void query.refetch();
          }}
        />
      ) : (
        <>
          <Skeleton className="h-36 rounded-[16px]" />
          <Skeleton className="h-80 rounded-[16px]" />
        </>
      )}
    </Frame>
  );
}
