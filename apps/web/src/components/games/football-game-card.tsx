"use client";

import {
  formatDayMonth,
  formatGameCardDay,
} from "@repo/domain/format-game-start";
import { footballSection } from "@repo/domain/football-hub";
import {
  footballBibName,
  footballSlotCode,
  isFootballBib,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { sideSizeLabel } from "@repo/domain/game-shape";
import { formatHomeKickoff } from "@repo/domain/home-countdown";
import type {
  HubGameFootballSide,
  HubGameRow,
} from "@repo/domain/hub-game-row";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

import { BibChip, bibStyle } from "./football-bibs";
import { SeatBar } from "./football-pool-grid";
import {
  SUMMARY_CARD_ACTION_CLASS,
  SummaryCardBody,
  SummaryCardFooter,
  SummaryCardShell,
} from "./summary-card-shell";

function bibOf(side: HubGameFootballSide): FootballBib {
  if (isFootballBib(side.bib)) {
    return side.bib;
  }
  return side.sideIndex === 1 ? "black" : "white";
}

function SizeTag({ sideSize }: { sideSize: number | null }) {
  const locale = useLocale();
  return sideSize ? (
    <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
      {sideSizeLabel(sideSize, locale).toUpperCase()}
    </span>
  ) : null;
}

function Kickoff({ game }: { game: HubGameRow }) {
  const m = useMessages();
  const locale = useLocale();
  const kickoff = formatHomeKickoff(game.startTime, locale);
  const place = [game.venue?.name, game.courtName]
    .filter(Boolean)
    .join(m.tournament.listSeparator);
  return (
    <div className="flex items-start gap-4">
      <p className="flex items-baseline gap-1">
        <span className="font-expanded text-h2 tabular-nums leading-none">
          {kickoff.time}
        </span>
        <span className="text-muted-foreground text-meta">
          {kickoff.meridiem}
        </span>
      </p>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-semibold">
          {place.length > 0 ? place : (game.name ?? m.common.football)}
        </p>
        <p className="text-muted-foreground text-meta">
          {formatGameCardDay(game.startTime, locale)}
        </p>
      </div>
      <SizeTag sideSize={game.football?.sideSize ?? null} />
    </div>
  );
}

function SideLine({ side }: { side: HubGameFootballSide }) {
  const m = useMessages();
  const locale = useLocale();
  const bib = bibOf(side);
  return (
    <div className="flex items-center gap-2">
      <span className="text-meta flex w-20 shrink-0 items-center gap-1.5 font-semibold">
        <BibChip bib={bib} />
        <span className="truncate">
          {footballBibName(bib, side.sideIndex, locale)}
        </span>
      </span>
      <span
        aria-label={side.members
          .map((member) => member.name)
          .join(m.tournament.listSeparator)}
        className="flex min-w-0 flex-1 -space-x-1 overflow-hidden"
      >
        {side.members.map((member) => (
          <span
            key={member.userId}
            aria-hidden="true"
            className="ring-paper size-[22px] shrink-0 rounded-full border ring-2"
            style={bibStyle(bib)}
          />
        ))}
      </span>
      <span className="text-muted-foreground text-meta">
        {side.members.length}
      </span>
    </div>
  );
}

function ResultBody({ game }: { game: HubGameRow }) {
  const m = useMessages();
  const locale = useLocale();
  const football = game.football!;
  const sides = football.sides ?? [];
  const viewerSide = football.viewer.sideIndex;
  const side = (index: 1 | 2) => sides.find((row) => row.sideIndex === index);
  const name = (index: 1 | 2) => {
    const row = side(index);
    return row
      ? footballBibName(bibOf(row), index, locale)
      : index === 1
        ? m.football.lineup.bibs.black
        : m.football.lineup.bibs.white;
  };
  const chip = (index: 1 | 2) => {
    const row = side(index);
    return row ? (
      <BibChip bib={bibOf(row)} className="size-6 rounded-md" />
    ) : null;
  };
  return (
    <div className="space-y-3">
      <div className="text-muted-foreground text-meta flex justify-between">
        <span>
          {[
            formatDayMonth(game.startTime, locale, { weekday: "short" }),
            game.venue?.name,
          ]
            .filter(Boolean)
            .join(m.tournament.listSeparator)}
        </span>
        <SizeTag sideSize={football.sideSize} />
      </div>
      <div className="flex items-center gap-2.5">
        {chip(1)}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{name(1)}</p>
          {viewerSide === 1 ? (
            <p className="text-muted-foreground text-meta">
              {m.webTournament.footballCard.youPlayed}
            </p>
          ) : null}
        </div>
        <span className="font-expanded text-h1 tabular-nums">
          {football.score
            ? `${football.score.slot1} – ${football.score.slot2}`
            : "– –"}
        </span>
        <div className="min-w-0 flex-1 text-end">
          <p className="font-semibold">{name(2)}</p>
          {viewerSide === 2 ? (
            <p className="text-muted-foreground text-meta">
              {m.webTournament.footballCard.youPlayed}
            </p>
          ) : null}
        </div>
        {chip(2)}
      </div>
    </div>
  );
}

function OpenBody({ game }: { game: HubGameRow }) {
  const m = useMessages();
  const seats = game.playersAllowed ?? (game.football?.sideSize ?? 5) * 2;
  const taken = game.registeredUserCount;
  const open = Math.max(0, seats - taken);
  return (
    <div className="space-y-4">
      <Kickoff game={game} />
      <SeatBar seats={seats} filled={taken} />
      <div className="text-meta flex justify-between">
        <span>
          <span className="font-semibold tabular-nums">
            {m.webTournament.footballCard.countOfSeats(
              Math.min(taken, seats),
              seats,
            )}
          </span>{" "}
          <span className="text-muted-foreground">
            {open > 0
              ? m.webTournament.footballCard.inWithOpen(open)
              : m.webTournament.footballCard.in}
          </span>
        </span>
        <span className="text-muted-foreground">
          {m.webTournament.footballCard.teamsNotSet}
        </span>
      </div>
    </div>
  );
}

function TeamsBody({ game }: { game: HubGameRow }) {
  const m = useMessages();
  const locale = useLocale();
  const football = game.football!;
  const viewerSide = football.sides?.find(
    (side) => side.sideIndex === football.viewer.sideIndex,
  );
  const code = footballSlotCode(football.viewer.role, football.viewer.position);
  return (
    <div className="space-y-4">
      <Kickoff game={game} />
      <div className="space-y-1.5">
        {football.sides?.map((side) => (
          <SideLine key={side.sideIndex} side={side} />
        ))}
      </div>
      {viewerSide ? (
        <p className="text-meta">
          <span className="font-semibold">
            {m.webTournament.footballCard.youPlayIn(
              footballBibName(bibOf(viewerSide), viewerSide.sideIndex, locale),
            )}
          </span>
          {code ? (
            <span className="text-muted-foreground">
              {" "}
              {m.webTournament.footballCard.asCode(code)}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

export function FootballGameCard({
  game,
  pending,
  onJoinWaitlist,
  onConfirm,
}: {
  game: HubGameRow;
  pending: boolean;
  onJoinWaitlist: () => void;
  onConfirm: (matchId: string) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const football = game.football!;
  const section = footballSection(game, new Date());
  const href = `/dashboard/games/${game.id}`;
  const price = formatPricePerPlayerFils(game.pricePerPlayerFils, locale);
  const kickoff = formatHomeKickoff(game.startTime, locale);
  const label = m.webTournament.footballCard.linkLabel(
    game.venue?.name ?? m.common.football,
    formatGameCardDay(game.startTime, locale),
    kickoff.time,
    kickoff.meridiem,
  );

  let footer: React.ReactNode;
  if (section === "result") {
    const matchId = football.matchId;
    footer = (
      <SummaryCardFooter>
        <span className="text-muted-foreground text-meta truncate">
          {football.score
            ? football.enteredByName
              ? m.game.played.enteredBy(football.enteredByName)
              : m.webTournament.footballCard.scoreIn
            : m.webTournament.footballCard.scoreMissing}
        </span>
        {football.score && matchId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={`${SUMMARY_CARD_ACTION_CLASS} pointer-events-auto`}
            pending={pending}
            onClick={() => onConfirm(matchId)}
          >
            {m.common.confirm}
          </Button>
        ) : (
          <Button
            size="sm"
            className={`${SUMMARY_CARD_ACTION_CLASS} pointer-events-auto`}
            asChild
          >
            <Link href={`${href}/score`}>
              {m.webTournament.footballScore.enterScore}
            </Link>
          </Button>
        )}
      </SummaryCardFooter>
    );
  } else if (section === "teams") {
    footer = (
      <SummaryCardFooter>
        <span className="text-muted-foreground text-meta">
          {football.sideSize
            ? m.webTournament.footballCard.startCaptainsPick(football.sideSize)
            : m.webTournament.footballCard.captainsPickStarters}
        </span>
        <span className={`${SUMMARY_CARD_ACTION_CLASS} text-meta`}>
          {m.common.open}
        </span>
      </SummaryCardFooter>
    );
  } else {
    footer = (
      <SummaryCardFooter>
        <span className="text-muted-foreground text-meta">
          {price ? (
            <>
              <span className="text-ink font-semibold">{price}</span>
              {price === m.createGame.price.free
                ? ""
                : ` ${m.webTournament.footballCard.each}`}
            </>
          ) : (
            game.groupName
          )}
        </span>
        {game.canRegister ? (
          <Button
            size="sm"
            className={`${SUMMARY_CARD_ACTION_CLASS} pointer-events-auto`}
            asChild
          >
            <Link href={`${href}?intent=join`}>{m.game.cta.join}</Link>
          </Button>
        ) : game.canWaitlist ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={`${SUMMARY_CARD_ACTION_CLASS} pointer-events-auto`}
            pending={pending}
            onClick={onJoinWaitlist}
          >
            {m.game.cta.joinWaitlist}
          </Button>
        ) : game.isRegistered ? (
          <span className={`${SUMMARY_CARD_ACTION_CLASS} text-meta`}>
            {m.game.cta.youreIn}
          </span>
        ) : game.isWaitlisted ? (
          <span className={`${SUMMARY_CARD_ACTION_CLASS} text-meta`}>
            {m.game.partner.onTheWaitlist}
          </span>
        ) : null}
      </SummaryCardFooter>
    );
  }

  return (
    <li>
      <SummaryCardShell href={href} linkLabel={label}>
        <SummaryCardBody>
          {section === "result" ? (
            <ResultBody game={game} />
          ) : section === "teams" ? (
            <TeamsBody game={game} />
          ) : (
            <OpenBody game={game} />
          )}
        </SummaryCardBody>
        {footer}
      </SummaryCardShell>
    </li>
  );
}
