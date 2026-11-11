"use client";

import {
  Activity,
  CalendarCheck,
  Clock,
  CreditCard,
  ListOrdered,
  MapPin,
  Navigation,
  PenLine,
  Plus,
  Shirt,
  Shuffle,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { Hatch } from "~/components/ui/hatch";
import { Surface } from "~/components/ui/surface";
import { bibColors } from "@repo/design-tokens";
import {
  gameCardView,
  type CardAction,
  type CardActionIcon,
  type CardPerson,
  type CardSeat,
  type CardStepIcon,
  type CardTarget,
  type CardWho,
} from "@repo/domain/home-up-next-card";
import { initials } from "@repo/domain/initials";
import { useNow } from "~/hooks/use-now";
import { cn } from "~/lib/utils";

import { directionsHref, gameHref } from "./home-model";
import type { UpNextItem } from "./up-next-model";

const FOCUS_RING =
  "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]";

const STEP_ICONS: Record<CardStepIcon, LucideIcon> = {
  invite: UserPlus,
  shirt: Shirt,
  teams: Users,
  clock: Clock,
  live: Activity,
  score: PenLine,
  rounds: ListOrdered,
  pay: CreditCard,
  court: CalendarCheck,
};

const ACTION_ICONS: Record<CardActionIcon, LucideIcon> = {
  invite: UserPlus,
  directions: Navigation,
  teams: Shuffle,
  score: PenLine,
};

function Rule() {
  return <hr aria-hidden="true" className="border-dimrule my-3.5 border-t" />;
}

function PersonChip({
  person,
  large = false,
}: {
  person: CardPerson;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-eyebrow flex shrink-0 items-center justify-center rounded-sm font-semibold",
        large ? "size-[30px]" : "size-7",
        person.isViewer
          ? "bg-ink text-paper"
          : "border-dimrule bg-raised text-on-focus border",
      )}
    >
      {initials(person.name)}
    </span>
  );
}

function SeatRow({ seat }: { seat: CardSeat }) {
  const m = useMessages();
  const name = seat.filled
    ? seat.isViewer
      ? m.common.you
      : seat.name
    : m.home.upNextCard.open;
  return (
    <li className="flex min-w-0 items-center gap-2">
      {seat.filled ? (
        <PersonChip person={seat} />
      ) : (
        <span className="relative flex size-7 shrink-0 items-center justify-center">
          <Hatch tone="ink" radius="sm" className="absolute inset-0" />
          <Plus
            aria-hidden="true"
            className="text-dim relative size-3.5"
          />
        </span>
      )}
      <span className="min-w-0">
        <span
          className={cn(
            "text-meta block truncate",
            seat.filled ? "font-semibold" : "text-dim",
          )}
        >
          {name}
        </span>
        <span className="text-eyebrow text-dim block truncate">
          {seat.sideLabel}
        </span>
      </span>
    </li>
  );
}

function WhoHeader({
  header,
  scope,
}: {
  header: string;
  scope: string | null;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <p className="text-meta truncate font-semibold">{header}</p>
      {scope ? (
        <p className="text-meta text-dim min-w-0 truncate">
          {scope}
        </p>
      ) : null}
    </div>
  );
}

function BibSwatch({ bib }: { bib: string }) {
  const fill =
    bib in bibColors ? bibColors[bib as keyof typeof bibColors].fill : null;
  return (
    <span
      aria-hidden="true"
      className="border-input bg-raised size-3 shrink-0 rounded-[3px] border"
      style={fill ? { backgroundColor: fill } : undefined}
    />
  );
}

function Who({ who }: { who: CardWho }) {
  const m = useMessages();
  if (who.kind === "line") {
    return <WhoHeader header={who.header} scope={who.scope} />;
  }

  if (who.kind === "sides") {
    return (
      <div>
        <WhoHeader header={who.header} scope={who.scope} />
        <div className="flex items-center gap-2">
          <ul className="flex min-w-0 flex-1 flex-col gap-2">
            {who.sides[0].map((seat) => (
              <SeatRow key={seat.key} seat={seat} />
            ))}
          </ul>
          <span className="text-eyebrow text-dim">
            {m.home.upNextCard.vs}
          </span>
          <ul className="flex min-w-0 flex-1 flex-col gap-2">
            {who.sides[1].map((seat) => (
              <SeatRow key={seat.key} seat={seat} />
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (who.kind === "pool") {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <WhoHeader header={who.header} scope={who.scope} />
          <div aria-hidden="true" className="flex h-2 gap-[3px]">
            {who.bar.map((seat, index) =>
              seat === "taken" ? (
                <span key={index} className="bg-ink flex-1 rounded-[2px]" />
              ) : (
                <Hatch key={index} tone="ink" className="flex-1 rounded-[2px]" />
              ),
            )}
          </div>
        </div>
        {who.positions.length > 0 ? (
          <p className="text-eyebrow text-dim flex flex-wrap gap-x-3 gap-y-1">
            {who.positions.map((count) => (
              <span key={count.label}>
                <span className="text-on-focus font-semibold">{count.value}</span>{" "}
                {count.label}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <WhoHeader header={who.header} scope={who.scope} />
      <div className="flex gap-3.5">
        {who.teams.map((team) => (
          <div key={team.key} className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-meta flex items-center gap-1.5 font-semibold">
              <BibSwatch bib={team.bib} />
              <span className="truncate">{team.label}</span>
            </p>
            <ul
              aria-label={m.home.upNextCard.teamSpoken(
                team.label,
                team.members.map((member) =>
                  member.isViewer ? m.common.you : member.name,
                ),
              )}
              className="flex flex-wrap gap-1.5"
            >
              {team.members.map((member) => (
                <li key={member.key}>
                  <PersonChip person={member} large />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function actionHref(target: CardTarget, item: UpNextItem): string {
  if (target.kind === "directions") {
    return item.game.venue
      ? directionsHref(item.game.venue)
      : gameHref({ kind: "game", gameId: item.game.id });
  }
  return gameHref(target);
}

function ActionLink({
  action,
  item,
  primary,
}: {
  action: CardAction;
  item: UpNextItem;
  primary: boolean;
}) {
  const Icon = action.icon ? ACTION_ICONS[action.icon] : null;
  const external = action.target.kind === "directions";
  return (
    <Link
      href={actionHref(action.target, item)}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "flex h-12 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 font-semibold transition-opacity hover:opacity-85",
        FOCUS_RING,
        primary
          ? "bg-ink text-paper flex-1"
          : "border-dimrule bg-raised text-on-focus min-w-24 border",
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
      {action.label}
    </Link>
  );
}

/** The Up next card: the lifted focus surface, with one solid button. */
export function UpNextCard({ item }: { item: UpNextItem }) {
  const locale = useLocale();
  const now = useNow();
  const view = gameCardView(item, now, locale);
  const StepIcon = STEP_ICONS[view.step.icon];

  return (
    <Surface as="article" tone="ink" radius="surface" className="p-[18px]">
      <Link
        href={gameHref({ kind: "game", gameId: item.game.id })}
        aria-label={view.spoken}
        className={cn("-m-1 block rounded-lg p-1", FOCUS_RING)}
      >
        <div className="flex items-center gap-1.5">
          <SportGlyph sport={view.sport} className="size-3.5 shrink-0" />
          <p className="text-meta min-w-0 flex-1 truncate">
            <span className="font-semibold">{view.sportName}</span>
            {view.title ? (
              <span className="text-dim">{`  ${view.title}`}</span>
            ) : null}
          </p>
          {view.countdown ? (
            <p className="text-meta shrink-0 font-semibold">{view.countdown}</p>
          ) : null}
        </div>
        <p className="text-meta text-dim mt-3">{view.dateLine}</p>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-expanded text-[52px] tabular-nums leading-none">
            {view.kickoff.time}
          </span>
          {view.kickoff.meridiem ? (
            <span className="font-expanded text-title leading-none">
              {view.kickoff.meridiem}
            </span>
          ) : null}
          {view.until ? (
            <span className="text-meta text-dim">
              {view.until}
            </span>
          ) : null}
        </p>
        {view.place ? (
          <p className="mt-1.5 flex min-w-0 items-center gap-1.5">
            <MapPin
              aria-hidden="true"
              className="text-dim size-[15px] shrink-0"
            />
            <span dir="auto" className="min-w-0 truncate">
              {view.place}
            </span>
          </p>
        ) : null}
        {view.who ? (
          <>
            <Rule />
            <Who who={view.who} />
          </>
        ) : null}
        <Rule />
        <div className="flex gap-3">
          <span className="border-dimrule bg-raised flex size-8 shrink-0 items-center justify-center rounded-sm border">
            <StepIcon aria-hidden="true" className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold">{view.step.title}</span>
            <span className="text-meta text-dim">
              {view.step.body}
            </span>
          </span>
        </div>
      </Link>
      <div className="mt-4 flex gap-2">
        {view.secondary ? (
          <ActionLink action={view.secondary} item={item} primary={false} />
        ) : null}
        <ActionLink action={view.primary} item={item} primary />
      </div>
    </Surface>
  );
}
