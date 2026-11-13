"use client";

import { useState, type ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  cabinetRowModel,
  type CabinetRowModel,
} from "~/components/marks/cabinet-model";
import { CabinetRow } from "~/components/marks/cabinet-row";
import { Skeleton } from "~/components/ui/skeleton";
import { TierSection } from "~/components/you/ratings-page";
import { YouSection } from "~/components/you/you-section";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  playerProfileRefused,
  profileSport,
} from "@repo/domain/player-profile";
import {
  sportSwitchView,
  type ProfileTierView,
} from "@repo/domain/player-profile-page";
import type { Sport } from "@repo/domain/sport";
import { playerMarksPath } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { CalibrateLevelAction } from "./calibrate-level-sheet";
import { PlayerBackButton } from "./player-header";
import {
  footballProfileModel,
  padelProfileModel,
  sharedTierView,
  type PlayerProfileModel,
} from "./player-profile-model";
import { PLAYER_HERO_BLEED, PlayerProfileHero } from "./player-profile-hero";
import {
  EarlyDaysCard,
  FormMarks,
  MatchList,
  PartnersList,
  PositionCard,
  StatsGrid,
  StreakTiles,
  WithViewerCard,
} from "./player-profile-sections";

export function PlayerProfileRefused() {
  const locale = useLocale();
  const refused = playerProfileRefused(locale);
  return (
    <div className="space-y-5">
      <PlayerBackButton surface="paper" />
      <section className="border-rule rounded-card border p-5">
        <h1 className="text-lead font-semibold">{refused.title}</h1>
        <p className="text-meta text-muted-foreground mt-1.5">
          {refused.description}
        </p>
      </section>
    </div>
  );
}

function PlayerProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid gap-[26px] lg:grid-cols-2 lg:items-start"
    >
      <Skeleton className={cn("h-[420px] w-auto", PLAYER_HERO_BLEED)} />
      <Skeleton className="rounded-card h-[240px] w-full" />
    </div>
  );
}

export function PlayerProfile({
  userId,
  requestedSport,
}: {
  userId: string;
  requestedSport?: unknown;
}) {
  const m = useMessages();
  const locale = useLocale();
  const [chosen, setChosen] = useState<Sport | null>(null);
  const padel = api.users.playerProfile.useQuery({ userId });
  const sports = padel.data?.sports;
  const sport = chosen ?? profileSport(requestedSport, sports);
  // Loaded for the switch's game count too, not only once football is picked.
  const football = api.users.footballProfile.useQuery(
    { userId },
    {
      enabled: sport === "football" || (sports?.includes("football") ?? false),
    },
  );
  const profile = sport === "football" ? football : padel;
  const cabinet = api.marks.cabinet.useQuery({ userId });

  if (isNotFoundError(profile.error)) {
    return <PlayerProfileRefused />;
  }

  if (profile.isLoading || (sport == null && padel.isLoading)) {
    return <PlayerProfileSkeleton />;
  }

  const model =
    sport === "football" && football.data
      ? footballProfileModel(football.data, locale)
      : sport === "padel" && padel.data
        ? padelProfileModel(padel.data, locale)
        : null;

  if (!model) {
    return (
      <ErrorState
        title={m.webUi.player.profileLoadError}
        error={profile.error}
        onRetry={() => {
          void profile.refetch();
        }}
      />
    );
  }

  const played = (entry: Sport) =>
    (entry === "football" ? football.data : padel.data)?.overall.played ?? null;
  const shown = model.sport === "football" ? football.data : padel.data;

  return (
    <PlayerProfileView
      model={model}
      calibrate={
        padel.data?.viewerMayCalibrate && shown ? (
          <CalibrateLevelAction
            userId={userId}
            name={shown.player.name}
            sport={model.sport}
            rating={shown.rating}
          />
        ) : null
      }
      cabinet={cabinetRowModel(cabinet.data, model.sport, locale)}
      tier={sharedTierView(model.sport, padel.data, locale)}
      cabinetHref={playerMarksPath(userId, model.sport)}
      switchOptions={sportSwitchView(
        model.sports.map((entry) => ({ sport: entry, played: played(entry) })),
        model.sport,
        locale,
      )}
      onSelectSport={setChosen}
    />
  );
}

/**
 * The hero, the marks cabinet, the Group tier in shared tier Groups, early
 * days or streaks and position on the start column; Overall, you and them, partners and the games on the end
 * column. One column below lg.
 */
function PlayerProfileView({
  model,
  calibrate,
  cabinet,
  tier,
  cabinetHref,
  switchOptions,
  onSelectSport,
}: {
  model: PlayerProfileModel;
  calibrate: ReactNode;
  cabinet: CabinetRowModel | null;
  tier: ProfileTierView | null;
  cabinetHref: string;
  switchOptions: ReturnType<typeof sportSwitchView>;
  onSelectSport: (sport: Sport) => void;
}) {
  const m = useMessages();
  const page = m.profile.playerPage;
  return (
    <div className="grid gap-[26px] lg:grid-cols-2 lg:items-start">
      <div className="flex min-w-0 flex-col gap-3.5">
        <PlayerProfileHero
          name={model.name}
          image={model.image}
          subtitle={model.subtitle}
          switchOptions={switchOptions}
          onSelectSport={onSelectSport}
          level={model.level}
        />
        {calibrate}
        {cabinet ? <CabinetRow row={cabinet} href={cabinetHref} /> : null}
        {tier ? <TierSection tier={tier} /> : null}
        {model.early ? (
          <EarlyDaysCard view={model.early} form={model.form} />
        ) : null}
        {model.streaks ? (
          <StreakTiles
            view={model.streaks}
            labels={{ current: page.currentStreak, best: page.bestStreak }}
          />
        ) : null}
        <PositionCard view={model.position} />
      </div>
      <div className="flex min-w-0 flex-col gap-[26px]">
        <div className="flex flex-col gap-3.5">
          <StatsGrid
            title={m.profile.player.overall}
            meta={m.profile.player.allTime}
            tiles={model.stats}
          />
          {model.withViewer ? (
            <WithViewerCard
              view={model.withViewer}
              playerName={model.name}
              playerImage={model.image}
            />
          ) : null}
        </div>
        {model.partners ? (
          <PartnersList
            title={model.partners.title}
            meta={model.partners.meta}
            rows={model.partners.rows}
            sport={model.sport}
          />
        ) : null}
        {model.rows.length > 0 ? (
          <YouSection title={model.form.title} meta={model.form.record}>
            {model.early ? null : <FormMarks form={model.form} />}
            <MatchList rows={model.rows} seeAll={model.seeAll} />
          </YouSection>
        ) : null}
      </div>
    </div>
  );
}
