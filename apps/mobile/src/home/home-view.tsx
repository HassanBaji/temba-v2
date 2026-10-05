import { View } from "react-native";

import { AllTimeCard } from "./all-time-card";
import { ComingUp } from "./coming-up";
import { HomeHeader } from "./home-header";
import type { HomeModel } from "./home-model";
import type { HomeNavTarget } from "./home-target";
import { LevelCard } from "./level-card";
import { NextGame, NoGames } from "./next-game";
import { RecentFormCard } from "./recent-form-card";
import { Block } from "./slot-block";
import { StandingCard } from "./standing-card";

const SECTION_GAP = 26;

export function HomeView({
  model,
  onNavigate,
  onRetry,
}: {
  model: HomeModel;
  onNavigate: (target: HomeNavTarget) => void;
  onRetry: () => void;
}) {
  const { home } = model;
  const content = home.status === "ready" ? home.value : null;

  return (
    <View style={{ gap: SECTION_GAP }}>
      <HomeHeader
        name={model.name}
        imageUri={model.imageUri}
        pendingInviteCount={content?.pendingInviteCount ?? 0}
        bookedGameCount={content?.bookedGameCount ?? 0}
        ready={content != null}
        failed={home.status === "error"}
      />
      <Block slot={home} title="Home" skeletonHeight={224} onRetry={onRetry}>
        {(value) => (
          <>
            {value.nextGame ? (
              <NextGame game={value.nextGame} onNavigate={onNavigate} />
            ) : (
              <NoGames action={value.noGamesAction} onNavigate={onNavigate} />
            )}
            <ComingUp games={value.comingUp} onNavigate={onNavigate} />
          </>
        )}
      </Block>
      <Block
        slot={model.level}
        title="Level"
        skeletonHeight={200}
        onRetry={onRetry}
      >
        {(input) => (input ? <LevelCard input={input} /> : null)}
      </Block>
      <Block
        slot={model.recentForm}
        title="Recent form"
        skeletonHeight={160}
        onRetry={onRetry}
      >
        {(form) => <RecentFormCard form={form} />}
      </Block>
      {content ? (
        <>
          <AllTimeCard {...content.allTime} />
          <StandingCard rows={content.standing} onNavigate={onNavigate} />
        </>
      ) : null}
    </View>
  );
}
