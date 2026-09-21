"use client";

import Link from "next/link";
import { ChevronLeftIcon, ShareIcon } from "lucide-react";

import { UserAvatar } from "~/components/common/user-avatar";
import {
  INVITE_ACTION_LABEL,
  LEFT_SEAT_LABEL,
  OPEN_POSITION_SR_LABEL,
  RIGHT_SEAT_LABEL,
  YOUR_TEAM_LABEL,
} from "~/lib/tournament-home";
import { cn } from "~/lib/utils";

const ACTION_BOX_DARK =
  "bg-raised text-paper focus-visible:ring-ring/50 inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] outline-none focus-visible:ring-[3px]";

export type TournamentHeroSeat = {
  userId: string;
  name: string;
  image: string | null;
} | null;

function TournamentHeroSeatBlock({
  occupant,
  position,
  isViewer,
}: {
  occupant: TournamentHeroSeat;
  position: "left" | "right";
  isViewer: boolean;
}) {
  const positionLabel =
    position === "left" ? LEFT_SEAT_LABEL : RIGHT_SEAT_LABEL;

  if (!occupant) {
    return (
      <div className="bg-raised relative flex h-16 min-h-16 min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-[10px] px-3">
        <span
          aria-hidden="true"
          className="hatch hatch-on-ink absolute inset-0 rounded-[10px]"
        />
        <span className="sr-only">{OPEN_POSITION_SR_LABEL}</span>
      </div>
    );
  }

  const displayName = isViewer ? "You" : occupant.name;

  return (
    <div className="bg-raised flex h-16 min-h-16 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-3">
      <UserAvatar
        name={occupant.name}
        image={occupant.image}
        className="bg-dimrule text-paper size-[34px] shrink-0 rounded-[8px]"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm">{displayName}</span>
        <span className="text-dim text-[11px] leading-none">
          {positionLabel}
        </span>
      </span>
    </div>
  );
}

export function TournamentHero({
  name,
  eyebrow,
  startLine,
  sizeLine,
  statusLine,
  viewerUserId,
  left,
  right,
  showYourTeam,
  backHref,
  onShare,
  sharePending,
  onInvite,
}: {
  name: string;
  eyebrow: string;
  startLine: string | null;
  sizeLine: string | null;
  statusLine: string;
  viewerUserId: string;
  left: TournamentHeroSeat;
  right: TournamentHeroSeat;
  showYourTeam: boolean;
  backHref: string;
  onShare?: () => void;
  sharePending?: boolean;
  onInvite?: () => void;
}) {
  return (
    <article className="bg-ink text-paper rounded-xl p-[22px]">
      <div className="flex items-center justify-between">
        <Link href={backHref} aria-label="Back" className={ACTION_BOX_DARK}>
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </Link>
        {onShare ? (
          <button
            type="button"
            aria-label="Share"
            disabled={sharePending}
            onClick={onShare}
            className={cn(ACTION_BOX_DARK, "disabled:opacity-50")}
          >
            <ShareIcon aria-hidden="true" className="size-[18px]" />
          </button>
        ) : (
          <span className="size-11 shrink-0" aria-hidden="true" />
        )}
      </div>

      <p className="text-dim mt-7 text-[13px]">{eyebrow}</p>
      <h1 className="font-expanded mt-2.5 text-[38px] leading-none tracking-[-0.03em]">
        {name}
      </h1>
      {startLine ? (
        <p className="mt-2.5 text-[16px] leading-snug">{startLine}</p>
      ) : null}
      {sizeLine ? (
        <p className="text-dim mt-1 text-[13px]">{sizeLine}</p>
      ) : null}

      <div className="bg-dimrule my-[22px] h-px" />

      {showYourTeam ? (
        <>
          <p className="text-dim text-[13px]">{YOUR_TEAM_LABEL}</p>
          <div className="mt-3 flex gap-2">
            <TournamentHeroSeatBlock
              occupant={left}
              position="left"
              isViewer={left?.userId === viewerUserId}
            />
            <TournamentHeroSeatBlock
              occupant={right}
              position="right"
              isViewer={right?.userId === viewerUserId}
            />
          </div>
        </>
      ) : null}

      <p
        className={cn(
          "text-dim text-[13px] leading-normal",
          showYourTeam ? "mt-3.5" : "mt-0",
        )}
      >
        {statusLine}
      </p>

      {onInvite ? (
        <button
          type="button"
          onClick={onInvite}
          className="border-dimrule focus-visible:ring-ring/50 mt-[18px] flex h-[50px] min-h-[50px] w-full items-center justify-center rounded-xl border text-[15px] outline-none focus-visible:ring-[3px]"
        >
          {INVITE_ACTION_LABEL}
        </button>
      ) : null}
    </article>
  );
}
