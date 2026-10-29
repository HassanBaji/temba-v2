import { Users } from "lucide-react";
import Link from "next/link";

import { NotSetCell } from "~/components/temba/not-set-cell";
import { ResultMark } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";
import type { SportFilter } from "@repo/domain/football-hub";
import {
  GAMES_HISTORY_EMPTY_COPY,
  GAMES_HISTORY_EMPTY_TITLE,
  GAMES_HISTORY_PREVIEW_FIGURES,
  GAMES_HISTORY_PREVIEW_MARKS,
  GAMES_HUB_EMPTY_TITLE,
  gamesHubEmptyLine,
  gamesHubEmptySeats,
} from "@repo/domain/games-hub-empty-states";
import { groupsTabQuery } from "@repo/domain/groups-tab";
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
  return (
    <div className="flex flex-col gap-[22px]">
      <section className={cardFrame}>
        <div className="flex flex-col gap-[18px] p-5">
          <p className="text-meta text-muted-foreground flex justify-between gap-3">
            <span>Next Game</span>
            <span>Not scheduled</span>
          </p>
          <div aria-hidden="true" className="flex flex-wrap gap-1.5">
            {Array.from({ length: gamesHubEmptySeats(sportFilter) }, (_, i) => (
              <span key={i} className="hatch size-[34px] rounded-[9px]" />
            ))}
          </div>
          <EmptyHeading
            title={GAMES_HUB_EMPTY_TITLE}
            line={gamesHubEmptyLine(sportFilter)}
          />
        </div>
        <dl className="border-rule divide-rule grid grid-cols-2 divide-x border-t">
          <NotSetCell label="When" />
          <NotSetCell label="Where" />
        </dl>
      </section>
      <div className="flex flex-col gap-2">
        <Button asChild size="lg" className="text-body w-full font-semibold">
          <Link href="/dashboard/games/new">Create Game</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="text-body w-full font-semibold"
        >
          <Link href={`/dashboard/groups${groupsTabQuery("public")}`}>
            <Users aria-hidden="true" />
            Find a Group
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * The Played tab before the first result: the recent form drawn with
 * not-played marks and its figures at zero.
 */
export function GamesHubPlayedEmpty() {
  return (
    <section className={cardFrame}>
      <div className="flex flex-col gap-[18px] p-5">
        <p className="text-meta text-muted-foreground flex justify-between gap-3">
          <span>Recent form</span>
          <span>No results yet</span>
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
          title={GAMES_HISTORY_EMPTY_TITLE}
          line={GAMES_HISTORY_EMPTY_COPY}
        />
      </div>
      <dl className="border-rule divide-rule flex divide-x border-t">
        {GAMES_HISTORY_PREVIEW_FIGURES.map((label) => (
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
