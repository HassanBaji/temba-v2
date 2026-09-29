"use client";

import { ShareIcon } from "lucide-react";

import { UserAvatar } from "~/components/common/user-avatar";
import { PageTitle } from "~/components/layout/page-title";
import { Button } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import {
  INVITE_ACTION_LABEL,
  LEFT_SEAT_LABEL,
  OPEN_POSITION_SR_LABEL,
  RIGHT_SEAT_LABEL,
  YOUR_TEAM_LABEL,
} from "~/lib/tournament-home";
import { cn } from "~/lib/utils";

const ACTION_BOX_DARK =
  "bg-raised text-paper focus-visible:ring-ring/50 inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]";

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
      <div className="bg-raised relative flex h-16 min-h-16 min-w-0 flex-1 items-center gap-2.5 overflow-hidden rounded-md px-3">
        <span
          aria-hidden="true"
          className="hatch hatch-on-ink absolute inset-0 rounded-md"
        />
        <span className="sr-only">{OPEN_POSITION_SR_LABEL}</span>
      </div>
    );
  }

  const displayName = isViewer ? "You" : occupant.name;

  return (
    <div className="bg-raised flex h-16 min-h-16 min-w-0 flex-1 items-center gap-2.5 rounded-md px-3">
      <UserAvatar
        name={occupant.name}
        image={occupant.image}
        className="bg-dimrule text-paper size-[34px] shrink-0 rounded-sm"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body truncate">{displayName}</span>
        <span className="text-dim text-[11px] leading-none">
          {positionLabel}
        </span>
      </span>
    </div>
  );
}

const PAD = "px-4 min-[430px]:px-5 md:px-6 xl:px-8";
const BLEED =
  "-mx-4 min-[430px]:-mx-5 md:-mx-6 xl:-mx-8 md:-mt-6 " + PAD + " p-[22px]";
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
    <article className={cn("surface-ink bg-ink text-paper", BLEED)}>
      <div className="flex items-center justify-between">
        <BackButton variant="boxed" surface="ink" href={backHref} />
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

      <p className="text-dim text-meta mt-7">{eyebrow}</p>
      <PageTitle variant="hero" className="mt-2.5">
        {name}
      </PageTitle>
      {startLine ? <p className="text-lead mt-2.5">{startLine}</p> : null}
      {sizeLine ? <p className="text-dim text-meta mt-1">{sizeLine}</p> : null}

      <div className="bg-dimrule my-[22px] h-px" />

      {showYourTeam ? (
        <>
          <p className="text-dim text-meta">{YOUR_TEAM_LABEL}</p>
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
          "text-dim text-meta leading-normal",
          showYourTeam ? "mt-3.5" : "mt-0",
        )}
      >
        {statusLine}
      </p>

      {onInvite ? (
        <Button
          type="button"
          variant="outline-inverse"
          size="lg"
          onClick={onInvite}
          className="mt-[18px] w-full"
        >
          {INVITE_ACTION_LABEL}
        </Button>
      ) : null}
    </article>
  );
}
