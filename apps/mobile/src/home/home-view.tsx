import type { Sport } from "@repo/domain/sport";
import { View } from "react-native";

import { useNow } from "../games/use-now";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { HomeHeader } from "./home-header";
import type { HomeModel } from "./home-model";
import type { HomeNavTarget } from "./home-target";
import { LatestRow } from "./latest-row";
import { LevelCard } from "./level-card";
import { ProfileChecklistCard } from "./profile-checklist-card";
import { RecentFormCard } from "./recent-form-card";
import { Block } from "./slot-block";
import { SportSwitch } from "./sport-switch";
import { StandingCard } from "./standing-card";
import { StatsCard } from "./stats-card";
import { TrendCard } from "./trend-card";
import { UpNextCard } from "./up-next-card";
import { UpNextEmpty, UpNextHeading, UpNextList } from "./up-next";
import { upNextWeekLabel } from "./up-next-model";

const HEADING_GAP = 12;
const ROWS_GAP = 10;

export function HomeView({
  model,
  onNavigate,
  onSport,
  onOpenLatest,
  onRetry,
  onSkipChecklist,
  onShowChecklist,
}: {
  model: HomeModel;
  onNavigate: (target: HomeNavTarget) => void;
  onSport: (sport: Sport) => void;
  onOpenLatest: () => void;
  onRetry: () => void;
  onSkipChecklist: () => void;
  onShowChecklist: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const { upNext } = model;

  return (
    <>
      <HomeHeader
        name={model.name}
        dateLine={model.dateLine}
        imageUri={model.imageUri}
        pendingInviteCount={model.pendingInviteCount}
        unreadNotificationCount={model.unreadNotificationCount}
        onNotifications={() => onNavigate({ kind: "notifications" })}
      />
      {model.checklist ? (
        <ProfileChecklistCard
          list={model.checklist.list}
          skipped={model.checklist.skipped}
          onNavigate={onNavigate}
          onSkip={onSkipChecklist}
          onShow={onShowChecklist}
        />
      ) : null}
      <View style={{ gap: HEADING_GAP }}>
        <UpNextHeading
          label={
            upNext.status === "ready"
              ? upNextWeekLabel(upNext.value, now, locale)
              : ""
          }
        />
        <Block
          slot={upNext}
          title={m.mobileHome.upNext.title}
          skeletonHeight={420}
          onRetry={onRetry}
        >
          {([next, ...rest]) =>
            next ? (
              <View style={{ gap: ROWS_GAP }}>
                <UpNextCard item={next} onNavigate={onNavigate} />
                <UpNextList items={rest} onNavigate={onNavigate} />
              </View>
            ) : (
              <UpNextEmpty
                openGames={model.openGames}
                createAction={model.noGamesAction}
                onNavigate={onNavigate}
              />
            )
          }
        </Block>
      </View>
      {model.latest ? (
        <LatestRow latest={model.latest} onPress={onOpenLatest} />
      ) : null}
      {model.sports.length > 1 ? (
        <SportSwitch
          sports={model.sports}
          value={model.sport}
          bands={model.bands}
          onSelect={onSport}
        />
      ) : null}
      <Block
        slot={model.level}
        title={m.home.levelSection.title[model.sport]}
        skeletonHeight={220}
        onRetry={onRetry}
      >
        {(level) => <LevelCard level={level} sport={model.sport} />}
      </Block>
      {model.level.status === "ready" && model.level.value.kind === "rated" ? (
        <TrendCard input={model.level.value.input} />
      ) : null}
      <Block
        slot={model.recentForm}
        title={m.home.lastTen.title}
        skeletonHeight={160}
        onRetry={onRetry}
      >
        {(form) =>
          form.playedCount > 0 ? <RecentFormCard form={form} /> : null
        }
      </Block>
      <Block
        slot={model.stats}
        title={m.home.stats.title}
        skeletonHeight={140}
        onRetry={onRetry}
      >
        {(stats) => (stats ? <StatsCard stats={stats} /> : null)}
      </Block>
      {model.standing.status === "ready" ? (
        <StandingCard rows={model.standing.value} onNavigate={onNavigate} />
      ) : null}
    </>
  );
}
