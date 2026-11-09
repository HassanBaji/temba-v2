import type { Sport } from "@repo/domain/sport";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { SportSegments } from "../lib/sport-segments";
import { HomeHeader } from "./home-header";
import type { HomeModel } from "./home-model";
import type { HomeNavTarget } from "./home-target";
import { LevelCard } from "./level-card";
import { ProfileChecklistCard } from "./profile-checklist-card";
import { RecentFormCard } from "./recent-form-card";
import { Block } from "./slot-block";
import { StandingCard } from "./standing-card";
import { UpNextEmpty, UpNextHeading, UpNextHero, UpNextList } from "./up-next";
import { upNextWeekLabel } from "./up-next-model";
import { useNow } from "../games/use-now";

const HEADING_GAP = 12;
const HERO_GAP = 8;
const SPORT_GAP = 12;

export function HomeView({
  model,
  onNavigate,
  onSport,
  onRetry,
  onSkipChecklist,
  onShowChecklist,
}: {
  model: HomeModel;
  onNavigate: (target: HomeNavTarget) => void;
  onSport: (sport: Sport) => void;
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
          skeletonHeight={224}
          onRetry={onRetry}
        >
          {([next, ...rest]) =>
            next ? (
              <View style={{ gap: HERO_GAP }}>
                <UpNextHero item={next} onNavigate={onNavigate} />
                <UpNextList items={rest} onNavigate={onNavigate} />
              </View>
            ) : (
              <UpNextEmpty
                venueCounts={model.venueCounts}
                createAction={model.noGamesAction}
                onNavigate={onNavigate}
              />
            )
          }
        </Block>
      </View>
      <View style={{ gap: SPORT_GAP }}>
        <SportSegments value={model.sport} onSelect={onSport} />
        <Block
          slot={model.level}
          title={m.common.level}
          skeletonHeight={200}
          onRetry={onRetry}
        >
          {(level) => <LevelCard level={level} sport={model.sport} />}
        </Block>
        <Block
          slot={model.recentForm}
          title={m.mobileHome.recentForm.title}
          skeletonHeight={160}
          onRetry={onRetry}
        >
          {(form) =>
            form.playedCount > 0 ? <RecentFormCard form={form} /> : null
          }
        </Block>
        {model.standing.status === "ready" ? (
          <StandingCard rows={model.standing.value} onNavigate={onNavigate} />
        ) : null}
      </View>
    </>
  );
}
