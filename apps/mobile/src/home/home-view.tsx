import { spacing } from "@repo/design-tokens";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { AllTimeCard } from "./all-time-card";
import { Card } from "./card";
import { ComingUp } from "./coming-up";
import { HomeHeader } from "./home-header";
import type { HomeModel, Slot } from "./home-model";
import type { HomeNavTarget } from "./home-target";
import { LevelCard } from "./level-card";
import { NextGame, NoGames } from "./next-game";
import { RecentFormCard } from "./recent-form-card";
import { StandingCard } from "./standing-card";

const SECTION_GAP = 26;

function Failure({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <View
        style={{ padding: spacing.surface, gap: 8 }}
        accessibilityRole="alert"
      >
        <Text size="lead" weight="semibold">
          {title}
        </Text>
        <Text size="meta" tone="muted">
          {message}
        </Text>
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <Button label="Try again" variant="outline" onPress={onRetry} />
        </View>
      </View>
    </Card>
  );
}

function CardSkeleton({ height }: { height: number }) {
  return <Skeleton height={height} radius={16} />;
}

function Block<T>({
  slot,
  title,
  skeletonHeight,
  onRetry,
  children,
}: {
  slot: Slot<T>;
  title: string;
  skeletonHeight: number;
  onRetry: () => void;
  children: (value: T) => React.ReactNode;
}) {
  if (slot.status === "loading") {
    return <CardSkeleton height={skeletonHeight} />;
  }
  if (slot.status === "error") {
    return (
      <Failure
        title={`${title} could not be loaded`}
        message={slot.message}
        onRetry={onRetry}
      />
    );
  }
  return <>{children(slot.value)}</>;
}

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
