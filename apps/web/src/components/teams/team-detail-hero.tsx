"use client";

import { challengesTabQuery } from "@repo/domain/challenges-tab";
import { type TeamDetailView } from "@repo/domain/team-detail";
import { Loader2Icon, Share } from "lucide-react";
import Link from "next/link";

import { useMessages } from "~/components/locale-provider";
import { PLAYER_HERO_BLEED } from "~/components/players/player-profile-hero";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import { cn } from "~/lib/utils";

import { TeamTile } from "./team-detail-tile";

const HERO_BUTTON = "h-12 min-h-12 rounded-[12px] text-[14px]";

export const TEAMS_HREF = `/dashboard/challenges${challengesTabQuery("teams")}`;

function RecordSeats({ seats }: { seats: TeamDetailView["hero"]["seats"] }) {
  if (seats.kind === "roster") {
    return (
      <div className="w-[120px] shrink-0">
        <p className="text-eyebrow text-dim mb-1.5 text-end">{seats.label}</p>
        <div aria-hidden="true" className="grid grid-cols-10 gap-[3px]">
          {Array.from({ length: seats.total }, (_, index) => (
            <span
              key={index}
              className={cn(
                "h-[7px] rounded-[2px]",
                index < seats.filled ? "bg-on-focus" : "border-dimrule border",
              )}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 gap-1">
      <span className="sr-only">{seats.spoken}</span>
      {seats.tiles.map((tile) => (
        <TeamTile
          key={tile.key}
          text={tile.initials}
          tone="inverse"
          size="seat"
        />
      ))}
      {Array.from({ length: seats.openSeats }, (_, index) => (
        <TeamTile key={`open-${index}`} tone="hatched-on-ink" size="seat" />
      ))}
    </div>
  );
}

/** The Team image when it has one, its initials until it loads or if it fails. */
function TeamCrest({
  initials,
  imageUrl,
  pending,
}: {
  initials: string;
  imageUrl: string | null;
  pending: boolean;
}) {
  const m = useMessages();
  return (
    <div className="relative shrink-0" aria-busy={pending || undefined}>
      <TeamTile tone="inverse" size="crest" className="overflow-hidden">
        {imageUrl ? (
          <Avatar className="size-full rounded-[inherit]">
            <AvatarImage alt="" src={imageUrl} className="object-cover" />
            <AvatarFallback className="rounded-[inherit] bg-transparent text-[length:inherit] text-inherit">
              {initials}
            </AvatarFallback>
          </Avatar>
        ) : (
          initials
        )}
      </TeamTile>
      {pending ? (
        <span className="bg-focus/70 text-on-focus absolute inset-0 grid place-items-center rounded-[17px]">
          <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
        </span>
      ) : null}
      <span role="status" className="sr-only">
        {pending ? m.team.image.uploading : ""}
      </span>
    </div>
  );
}

/** 4a and 4b: the black hero with the crest, the record and its seats. */
export function TeamDetailHero({
  hero,
  postHref,
  onInvite,
  onShare,
  menu,
  imagePending = false,
}: {
  hero: TeamDetailView["hero"];
  postHref: string;
  onInvite: () => void;
  onShare: () => void;
  menu: React.ReactNode;
  imagePending?: boolean;
}) {
  return (
    <header
      className={cn(
        "surface-ink bg-focus text-on-focus md:surface-focus flex flex-col px-4 py-[22px] min-[430px]:px-5 md:p-[22px]",
        PLAYER_HERO_BLEED,
      )}
    >
      <div className="flex items-center justify-between">
        <BackButton
          variant="boxed"
          surface="ink"
          href={TEAMS_HREF}
          className="border-dimrule size-10 rounded-[10px] border bg-transparent"
        />
        {menu}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <TeamCrest
          initials={hero.initials}
          imageUrl={hero.imageUrl}
          pending={imagePending}
        />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-[28px] font-bold leading-[1.1] tracking-[-0.01em]">
            {hero.title}
          </h1>
          {hero.subtitle ? (
            <p className="text-meta text-dim mt-[5px]">{hero.subtitle}</p>
          ) : null}
        </div>
      </div>

      <section className="border-dimrule mt-5 flex items-center gap-[18px] rounded-[16px] border p-[18px]">
        <div className="min-w-0 flex-1">
          <span className="sr-only">{hero.record.spoken}</span>
          <div aria-hidden="true">
            <h2 className="text-eyebrow text-dim font-normal">
              {hero.record.label}
            </h2>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2.5">
              <span
                dir="ltr"
                className="text-[44px] font-bold leading-none tracking-[-0.03em] [font-variation-settings:'wdth'_118,'wght'_700]"
              >
                {hero.record.value}
              </span>
              <span className="text-meta text-dim">{hero.record.caption}</span>
            </p>
          </div>
        </div>
        <RecordSeats seats={hero.seats} />
      </section>

      {hero.primary || hero.share ? (
        <div className="mt-3.5 flex gap-2">
          {hero.primary?.kind === "post" ? (
            <Button
              asChild
              variant="inverse"
              className={cn(HERO_BUTTON, "flex-1 font-semibold")}
            >
              <Link href={postHref}>{hero.primary.label}</Link>
            </Button>
          ) : hero.primary?.kind === "invite" ? (
            <Button
              type="button"
              variant="inverse"
              className={cn(HERO_BUTTON, "flex-1 font-semibold")}
              onClick={onInvite}
            >
              {hero.primary.label}
            </Button>
          ) : null}
          {hero.share ? (
            <Button
              type="button"
              variant="outline-inverse"
              className={cn(
                HERO_BUTTON,
                "px-4 font-normal",
                hero.primary ? null : "flex-1",
              )}
              onClick={onShare}
            >
              <Share aria-hidden="true" className="size-[15px]" />
              {hero.share.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
