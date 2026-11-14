"use client";

import { useEffect } from "react";

import { ErrorState } from "~/components/common/error-state";
import { HomeDeclareLevel } from "~/components/home/home-level-block";
import { useLocale, useMessages } from "~/components/locale-provider";
import { api } from "~/trpc/react";
import {
  footballHeroLevelView,
  footballRoleView,
} from "@repo/domain/player-profile-football";

import { LastTenStrip } from "./last-ten-strip";
import {
  HeroCard,
  HeroRing,
  HeroStatsRow,
  HeroTopLine,
  LevelHeroSkeleton,
} from "./level-hero";
import { PartnersCard } from "./profile-cards";
import { RatingsLink } from "./ratings-page";
import {
  footballHeroStats,
  goalBars,
  recordShares,
  type FootballProfile,
} from "./you-football-model";
import { formRecord, lastTenSlots, partnerRows } from "./you-form-model";
import type { MyProfile } from "./you-hero-model";
import { YouCard } from "./you-section";

function GoalsLastTen({ profile }: { profile: FootballProfile }) {
  const m = useMessages();
  const bars = goalBars(profile.lastMatches);
  const total = profile.lastMatches
    .slice(0, bars.length)
    .reduce((sum, match) => sum + match.goals, 0);

  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <div className="text-dim flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.04em]">
        <span>{m.you.football.goalsLastTen}</span>
        <span>{m.webYou.football.goalsTotal(total)}</span>
      </div>
      <div className="grid h-[84px] grid-cols-10 items-end gap-1.5">
        {bars.map((bar) => (
          <div key={bar.key} className="flex h-full flex-col justify-end gap-1">
            <span
              className={
                bar.goals
                  ? "bg-on-focus rounded-[3px]"
                  : "bg-dimrule rounded-[3px]"
              }
              style={{
                height: bar.goals
                  ? `${Math.max(8, bar.height * 0.62)}px`
                  : "3px",
              }}
            />
            <span className="text-dim text-center font-mono text-[9px] leading-3">
              {bar.goals ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FootballHero({ profile }: { profile: FootballProfile }) {
  const m = useMessages();
  const locale = useLocale();
  const rating = profile.rating;
  if (!rating) {
    return null;
  }
  const level = footballHeroLevelView(rating, locale);
  const role = footballRoleView(profile.role, locale);

  return (
    <HeroCard>
      <HeroTopLine
        label={m.you.football.level}
        status={level.placement ? m.you.football.selfPlaced : null}
      />
      <div className="flex items-center gap-5">
        <span className="sr-only">{level.spoken}</span>
        <HeroRing percent={level.ringPercent}>
          <span
            aria-hidden="true"
            className="font-expanded text-[28px] tabular-nums leading-none"
          >
            {level.ovr}
          </span>
          <span
            aria-hidden="true"
            className="text-dim mt-1 text-[10px] leading-tight"
          >
            {level.ovrLabel}
          </span>
        </HeroRing>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {level.placement ? (
            <p aria-hidden="true" className="text-dim text-meta">
              {level.placement}
            </p>
          ) : null}
          <p className="text-meta font-semibold">{role.label}</p>
          <p className="text-dim text-eyebrow leading-[1.5]">
            {m.you.football.adjustNote}
          </p>
        </div>
      </div>
      <GoalsLastTen profile={profile} />
      <HeroStatsRow stats={footballHeroStats(profile.overall, locale)} />
    </HeroCard>
  );
}

function AllTimeRecord({ profile }: { profile: FootballProfile }) {
  const m = useMessages();
  const overall = profile.overall;
  const shares = recordShares(overall);

  return (
    <YouCard className="flex flex-col gap-3 px-5 py-4">
      <div className="text-meta text-muted-foreground flex justify-between gap-3">
        <span>{m.you.football.allTimeRecord}</span>
        <span>{m.you.football.matchesCount(overall.played)}</span>
      </div>
      <div
        aria-hidden="true"
        className="bg-wash flex h-2 overflow-hidden rounded-full"
      >
        <span className="bg-ink h-full" style={{ width: `${shares.won}%` }} />
        <span className="hatch h-full" style={{ width: `${shares.drawn}%` }} />
      </div>
      <div className="text-meta text-muted-foreground flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span>
          <span className="text-ink font-semibold tabular-nums">
            {overall.won}
          </span>{" "}
          {m.you.football.won}
        </span>
        <span>
          <span className="text-ink font-semibold tabular-nums">
            {overall.drawn}
          </span>{" "}
          {m.you.football.drawn}
        </span>
        <span>
          <span className="text-ink font-semibold tabular-nums">
            {overall.lost}
          </span>{" "}
          {m.you.football.lost}
        </span>
        {profile.streaks.best > 0 ? (
          <span className="ms-auto">
            {m.you.football.bestRun(profile.streaks.best)}
          </span>
        ) : null}
      </div>
    </YouCard>
  );
}

/** The football profile: Level, goals, Last 10, record, Teammates. */
export function FootballTab({ userId }: { userId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const profile = api.users.footballProfile.useQuery({ userId });
  const mine = api.users.myProfile.useQuery({ sport: "football" });
  const me = api.ratings.me.useQuery({ sport: "football" });
  const declared = me.data?.rating != null;
  const hasRating = profile.data?.rating != null;

  useEffect(() => {
    if (declared && !hasRating) {
      void utils.users.footballProfile.invalidate();
      void utils.users.myProfile.invalidate();
    }
  }, [declared, hasRating, utils]);

  if (profile.error) {
    return (
      <ErrorState
        variant="inline"
        className="rounded-card px-5"
        title={m.webAuth.you.level.failed}
        error={profile.error}
        onRetry={() => {
          void profile.refetch();
        }}
      />
    );
  }

  if (!profile.data) {
    return <LevelHeroSkeleton />;
  }

  const data = profile.data;
  const teammates: MyProfile["partners"] = mine.data?.partners ?? [];
  const lastTen = data.lastMatches;

  return (
    <div className="grid gap-[26px] lg:grid-cols-2 lg:items-start">
      <div className="flex min-w-0 flex-col gap-[26px]">
        {data.rating ? (
          <FootballHero profile={data} />
        ) : me.data?.canSelfDeclare ? (
          <HomeDeclareLevel surface="profile" sport="football" />
        ) : null}
        <RatingsLink sport="football" />
        <LastTenStrip
          title={m.you.form.lastTen}
          record={formRecord(lastTen, locale)}
          slots={lastTenSlots(lastTen, locale)}
        />
        <AllTimeRecord profile={data} />
      </div>
      <div className="flex min-w-0 flex-col gap-[26px]">
        <PartnersCard
          title={m.you.partners.teammates}
          meta={m.you.partners.mostPlayed}
          rows={partnerRows(teammates, locale)}
        />
      </div>
    </div>
  );
}
