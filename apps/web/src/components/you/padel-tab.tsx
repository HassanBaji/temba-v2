"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { HomeDeclareLevel } from "~/components/home/home-level-block";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

import { GroupLevelsCard } from "./group-levels-card";
import { LastTenStrip } from "./last-ten-strip";
import {
  HeroCard,
  HeroStatsRow,
  HeroTopLine,
  LevelHero,
  LevelHeroSkeleton,
} from "./level-hero";
import { PartnersCard, ProfileTiles, RecentMatchesCard } from "./profile-cards";
import { ScopeChips, type ScopeChip } from "./you-chips";
import {
  formRecord,
  lastTenSlots,
  partnerRows,
  profileTiles,
  recentRows,
} from "./you-form-model";
import { displayBand } from "./you-format";
import {
  curveCaption,
  heroStats,
  heroView,
  type GroupLevelRow,
  type MyProfile,
} from "./you-hero-model";

const GENERAL = "general";

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
      <HeroStatsRow
        stats={heroStats({ stats: profile.stats, group: null }, locale)}
      />
    </HeroCard>
  );
}

function ScopeBody({
  profile,
  group,
  groups,
  canSelfDeclare,
}: {
  profile: MyProfile;
  group: GroupLevelRow | null;
  groups: readonly GroupLevelRow[];
  canSelfDeclare: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const level = profile.level;
  const groupName = group?.name ?? null;

  let hero;
  if (level) {
    const caption = curveCaption({ history: level.history, groupName }, locale);
    hero = (
      <LevelHero
        view={heroView(
          { level, ratedMatchCount: profile.ratedMatchCount, group },
          locale,
        )}
        stats={heroStats({ stats: profile.stats, group }, locale)}
        curve={{
          levels: level.history.map((point) => point.level),
          ...caption,
        }}
      />
    );
  } else if (canSelfDeclare && !group) {
    hero = <HomeDeclareLevel surface="profile" sport="padel" />;
  } else {
    hero = <NoLevelHero profile={profile} />;
  }

  return (
    <div className="grid gap-[26px] lg:grid-cols-2 lg:items-start">
      <div className="flex min-w-0 flex-col gap-[26px]">
        {hero}
        <LastTenStrip
          title={
            groupName ? m.you.form.lastTenIn(groupName) : m.you.form.lastTen
          }
          record={formRecord(profile.lastTen, locale)}
          slots={lastTenSlots(profile.lastTen, locale)}
        />
        <ProfileTiles tiles={profileTiles(profile.stats, locale)} />
      </div>
      <div className="flex min-w-0 flex-col gap-[26px]">
        {group ? null : <GroupLevelsCard general={level} rows={groups} />}
        <PartnersCard
          title={m.you.partners.title}
          meta={
            groupName
              ? m.you.partners.inGroup(groupName)
              : m.you.partners.mostPlayed
          }
          rows={partnerRows(profile.partners, locale)}
        />
        <RecentMatchesCard
          meta={
            groupName
              ? m.you.partners.inGroup(groupName)
              : m.you.recent.allGroups
          }
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

/** The padel profile: scope chips, then everything read in the chosen scope. */
export function PadelTab() {
  const m = useMessages();
  const [scope, setScope] = useState(GENERAL);
  const groups = api.ratings.myGroupLevels.useQuery({ sport: "padel" });
  const general = api.users.myProfile.useQuery({ sport: "padel" });
  const group =
    scope === GENERAL
      ? null
      : (groups.data?.find((row) => row.groupId === scope) ?? null);
  const scoped = api.users.myProfile.useQuery(
    { sport: "padel", groupId: group?.groupId },
    { enabled: group !== null, placeholderData: keepPreviousData },
  );
  const me = api.ratings.me.useQuery({ sport: "padel" });
  const declared = me.data?.rating != null;
  const refetchGeneral = general.refetch;
  const generalHasLevel = general.data?.level != null;

  useEffect(() => {
    if (declared && general.isSuccess && !generalHasLevel) {
      void refetchGeneral();
    }
  }, [declared, general.isSuccess, generalHasLevel, refetchGeneral]);

  const active = group ? scoped : general;
  const groupRows = groups.data ?? (groups.isError ? [] : null);

  if (active.error) {
    return (
      <ErrorState
        variant="inline"
        className="rounded-card px-5"
        title={m.webAuth.you.level.failed}
        error={active.error}
        onRetry={() => {
          void active.refetch();
        }}
      />
    );
  }

  const chips: ScopeChip[] = [
    {
      key: GENERAL,
      name: m.you.scope.general,
      band: general.data?.level
        ? displayBand(general.data.level.levelBand)
        : m.webYou.noData,
    },
    ...(groups.data ?? []).map((row) => ({
      key: row.groupId,
      name: row.name,
      band: displayBand(row.levelBand),
    })),
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      {chips.length > 1 ? (
        <ScopeChips chips={chips} value={scope} onSelect={setScope} />
      ) : null}
      {active.data && groupRows ? (
        <ScopeBody
          profile={active.data}
          group={group}
          groups={groupRows}
          canSelfDeclare={me.data?.canSelfDeclare ?? false}
        />
      ) : (
        <PadelTabSkeleton />
      )}
    </div>
  );
}
