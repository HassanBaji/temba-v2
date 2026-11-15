"use client";

import { useEffect } from "react";

import { ErrorState } from "~/components/common/error-state";
import { HomeDeclareLevel } from "~/components/home/home-level-block";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Skeleton } from "~/components/ui/skeleton";
import { api, type RouterOutputs } from "~/trpc/react";

import { InYourGroupsCard } from "./in-your-groups-card";
import { LastTenStrip } from "./last-ten-strip";
import {
  HeroCard,
  HeroStatsRow,
  HeroTopLine,
  LevelHero,
  LevelHeroSkeleton,
} from "./level-hero";
import { PartnersCard, ProfileTiles, RecentMatchesCard } from "./profile-cards";
import { RatingsLink } from "./ratings-page";
import {
  formRecord,
  lastTenSlots,
  partnerRows,
  profileTiles,
  recentRows,
} from "./you-form-model";
import {
  curveCaption,
  heroStats,
  heroView,
  type MyProfile,
} from "./you-hero-model";

type GroupStanding = RouterOutputs["groups"]["myStandings"][number];

function NoLevelHero({ profile }: { profile: MyProfile }) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <HeroCard>
      <HeroTopLine label={m.you.hero.generalLevel} status={null} />
      <div className="flex flex-col gap-1.5">
        <p className="font-expanded text-h2">{m.you.hero.noLevel}</p>
        <p className="text-dim text-meta">{m.you.hero.noLevelNote}</p>
      </div>
      <HeroStatsRow stats={heroStats(profile.stats, locale)} />
    </HeroCard>
  );
}

function PadelBody({
  profile,
  standings,
  canSelfDeclare,
}: {
  profile: MyProfile;
  standings: readonly GroupStanding[];
  canSelfDeclare: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const level = profile.level;

  let hero;
  if (level) {
    const caption = curveCaption(level.history, locale);
    hero = (
      <LevelHero
        view={heroView(
          { level, ratedMatchCount: profile.ratedMatchCount },
          locale,
        )}
        stats={heroStats(profile.stats, locale)}
        curve={{
          levels: level.history.map((point) => point.level),
          ...caption,
        }}
      />
    );
  } else if (canSelfDeclare) {
    hero = <HomeDeclareLevel surface="profile" sport="padel" />;
  } else {
    hero = <NoLevelHero profile={profile} />;
  }

  return (
    <div className="grid gap-[26px] lg:grid-cols-2 lg:items-start">
      <div className="flex min-w-0 flex-col gap-[26px]">
        {hero}
        <RatingsLink sport="padel" />
        <LastTenStrip
          title={m.you.form.lastTen}
          record={formRecord(profile.lastTen, locale)}
          slots={lastTenSlots(profile.lastTen, locale)}
        />
        <ProfileTiles tiles={profileTiles(profile.stats, locale)} />
      </div>
      <div className="flex min-w-0 flex-col gap-[26px]">
        <InYourGroupsCard rows={standings} />
        <PartnersCard
          title={m.you.partners.title}
          meta={m.you.partners.mostPlayed}
          rows={partnerRows(profile.partners, locale)}
        />
        <RecentMatchesCard
          meta={m.you.recent.allGroups}
          rows={recentRows(profile.recent, locale)}
        />
      </div>
    </div>
  );
}

function PadelTabSkeleton() {
  return (
    <div className="grid gap-[26px] lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-[26px]">
        <LevelHeroSkeleton />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="flex flex-col gap-[26px]">
        <Skeleton className="rounded-card h-48 w-full" />
        <Skeleton className="rounded-card h-40 w-full" />
      </div>
    </div>
  );
}

/** The padel profile: the Temba Level, form, and where you stand in each Group. */
export function PadelTab() {
  const m = useMessages();
  const standings = api.groups.myStandings.useQuery({ sport: "padel" });
  const general = api.users.myProfile.useQuery({ sport: "padel" });
  const me = api.ratings.me.useQuery({ sport: "padel" });
  const declared = me.data?.rating != null;
  const refetchGeneral = general.refetch;
  const generalHasLevel = general.data?.level != null;

  useEffect(() => {
    if (declared && general.isSuccess && !generalHasLevel) {
      void refetchGeneral();
    }
  }, [declared, general.isSuccess, generalHasLevel, refetchGeneral]);

  const standingRows = standings.data ?? (standings.isError ? [] : null);

  if (general.error) {
    return (
      <ErrorState
        variant="inline"
        className="rounded-card px-5"
        title={m.webAuth.you.level.failed}
        error={general.error}
        onRetry={() => {
          void general.refetch();
        }}
      />
    );
  }

  return general.data && standingRows ? (
    <PadelBody
      profile={general.data}
      standings={standingRows}
      canSelfDeclare={me.data?.canSelfDeclare ?? false}
    />
  ) : (
    <PadelTabSkeleton />
  );
}
