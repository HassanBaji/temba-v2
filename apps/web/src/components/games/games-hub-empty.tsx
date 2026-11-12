import { Users } from "lucide-react";
import Link from "next/link";

import { NotSetCell } from "~/components/temba/not-set-cell";
import { ResultMark } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";
import type { SportFilter } from "@repo/domain/football-hub";
import {
  GAMES_HISTORY_PREVIEW_MARKS,
  gamesHistoryEmptyCopy,
  gamesHistoryEmptyTitle,
  gamesHistoryPreviewFigures,
  gamesHubEmptyLine,
  gamesHubEmptySeats,
  gamesHubEmptyTitle,
  publicGamesEmptyLine,
  publicGamesEmptyTitle,
} from "@repo/domain/games-hub-empty-states";
import { groupsTabQuery } from "@repo/domain/groups-tab";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cardFrame } from "~/lib/page-layout";

function EmptyHeading({ title, line }: { title: string; line: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-expanded text-h1 leading-tight">{title}</h2>
      <p className="text-body text-muted-foreground">{line}</p>
    </div>
  );
}

/**
 * The Upcoming tab before any Game, in the "Group empty states" language: the
 * next Game drawn as a placeholder card with every seat hatched.
 */
export function GamesHubUpcomingEmpty({
  sportFilter,
}: {
  sportFilter: SportFilter;
}) {
  const locale = useLocale();
  const m = useMessages();
  return (
    <div className="flex flex-col gap-[22px]">
      <section className={cardFrame}>
        <div className="flex flex-col gap-[18px] p-5">
          <p className="text-meta text-muted-foreground flex justify-between gap-3">
            <span>{m.webGame.hubEmpty.nextGame}</span>
            <span>{m.webGame.hubEmpty.notScheduled}</span>
          </p>
          <div aria-hidden="true" className="flex flex-wrap gap-1.5">
            {Array.from({ length: gamesHubEmptySeats(sportFilter) }, (_, i) => (
              <span key={i} className="hatch size-[34px] rounded-[9px]" />
            ))}
          </div>
          <EmptyHeading
            title={gamesHubEmptyTitle(locale)}
            line={gamesHubEmptyLine(sportFilter, locale)}
          />
        </div>
        <dl className="border-rule divide-rule grid grid-cols-2 divide-x border-t">
          <NotSetCell label={m.createGame.steps.when} />
          <NotSetCell label={m.createGame.steps.where} />
        </dl>
      </section>
      <div className="flex flex-col gap-2">
        <Button asChild size="lg" className="text-body w-full font-semibold">
          <Link href="/dashboard/games/new">
            {m.webGame.hubEmpty.createGame}
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="text-body w-full font-semibold"
        >
          <Link href={`/dashboard/groups${groupsTabQuery("public")}`}>
            <Users aria-hidden="true" />
            {m.webGame.hubEmpty.findAGroup}
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * The Public tab with no Public Game to show: an open Game drawn with every
 * seat hatched, and the way to make one.
 */
export function GamesHubPublicEmpty({
  sportFilter,
}: {
  sportFilter: SportFilter;
}) {
  const locale = useLocale();
  const m = useMessages();
  return (
    <div className="flex flex-col gap-[22px]">
      <section className={cardFrame}>
        <div className="flex flex-col gap-[18px] p-5">
          <div aria-hidden="true" className="flex flex-wrap gap-1.5">
            {Array.from({ length: gamesHubEmptySeats("padel") }, (_, i) => (
              <span key={i} className="hatch size-[34px] rounded-[9px]" />
            ))}
          </div>
          <EmptyHeading
            title={publicGamesEmptyTitle(locale)}
            line={publicGamesEmptyLine(sportFilter, locale)}
          />
        </div>
      </section>
      <Button asChild size="lg" className="text-body w-full font-semibold">
        <Link href="/dashboard/games/new">{m.webGame.hubEmpty.createGame}</Link>
      </Button>
    </div>
  );
}

/**
 * The Played tab before the first result: the recent form drawn with
 * not-played marks and its figures at zero.
 */
export function GamesHubPlayedEmpty() {
  const locale = useLocale();
  const m = useMessages();
  return (
    <section className={cardFrame}>
      <div className="flex flex-col gap-[18px] p-5">
        <p className="text-meta text-muted-foreground flex justify-between gap-3">
          <span>{m.webGame.hubEmpty.recentForm}</span>
          <span>{m.webGame.hubEmpty.noResultsYet}</span>
        </p>
        <div aria-hidden="true" className="flex gap-1.5">
          {Array.from({ length: GAMES_HISTORY_PREVIEW_MARKS }, (_, i) => (
            <ResultMark
              key={i}
              variant="not-played"
              decorative
              className="size-[34px]"
            />
          ))}
        </div>
        <EmptyHeading
          title={gamesHistoryEmptyTitle(locale)}
          line={gamesHistoryEmptyCopy(locale)}
        />
      </div>
      <dl className="border-rule divide-rule flex divide-x border-t">
        {gamesHistoryPreviewFigures(locale).map((label) => (
          <div
            key={label}
            className="flex min-w-0 flex-1 flex-col-reverse items-center gap-1 py-4"
          >
            <dt className="text-eyebrow text-muted-foreground">{label}</dt>
            <dd className="font-expanded text-muted-foreground/40 text-[22px] tabular-nums leading-none">
              0
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
