import { isNotFoundError } from "@repo/domain/is-not-found-error";
import type { LevelOverrideReason } from "@repo/domain/level-slider";
import { profileSport } from "@repo/domain/player-profile";
import { sportLabel, type Sport } from "@repo/domain/sport";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { FieldError } from "../create-game/chips";
import { LevelPicker, LevelReasonFields } from "../groups/set-level-screen";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { invalidateRatingReads } from "../trpc/invalidate-rating-reads";
import { api } from "../trpc/react";
import {
  calibrateLevelLabel,
  calibrateLevelUnchanged,
  calibrateLevelView,
  type CalibrateRating,
} from "./calibrate-level-model";
import { playerPath } from "./player-path";

function CalibrateLevelForm({
  userId,
  name,
  sport,
  rating,
}: {
  userId: string;
  name: string;
  sport: Sport;
  rating: CalibrateRating;
}) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const segments = useSegments();
  const toast = useToast();
  const utils = api.useUtils();
  const copy = m.rating.verifier.calibrate;
  const setLevelCopy = m.mobileGroup.setLevel;
  const view = calibrateLevelView({ name, sport, rating }, locale);
  const [value, setValue] = useState(view.currentValue);
  const [reason, setReason] = useState<LevelOverrideReason | null>(null);
  const [note, setNote] = useState("");
  const unchanged = calibrateLevelUnchanged(view, value);
  const label = calibrateLevelLabel(view.face, value);

  const calibrate = api.ratings.setLevelAsVerifier.useMutation({
    onSuccess: async () => {
      toast.show(copy.saved(name, label));
      await invalidateRatingReads(utils);
      router.back();
    },
  });
  const error = calibrate.error
    ? splitTrpcFormError(calibrate.error).globalMessage
    : null;

  return (
    <Screen
      footer={
        <View style={{ flex: 1, gap: 10 }}>
          <Text>{view.note}</Text>
          <Button
            label={
              reason === null && !unchanged
                ? setLevelCopy.pickReason
                : setLevelCopy.confirm(label)
            }
            size="lg"
            disabled={unchanged || reason === null}
            pending={calibrate.isPending}
            onPress={() => {
              if (!reason) {
                return;
              }
              calibrate.mutate({
                userId,
                sport,
                ...(view.face === "ovr"
                  ? { ovr: value }
                  : { levelTenths: value }),
                reason,
                note: note.trim() || undefined,
              });
            }}
          />
        </View>
      }
    >
      <ScreenHeader
        nav="back"
        fallback={playerPath(segments, userId, sport)}
        title={copy.title(sportLabel(sport, locale) ?? "")}
      />
      <Text tone="muted">{copy.description}</Text>
      <LevelPicker
        face={view.face}
        value={value}
        onValue={setValue}
        currentValue={view.currentValue}
        wasLabel={view.wasLabel}
        disabled={calibrate.isPending}
      />
      <LevelReasonFields
        name={name}
        reason={reason}
        onReason={setReason}
        note={note}
        onNote={setNote}
        disabled={calibrate.isPending}
      />
      <FieldError message={error ?? undefined} />
    </Screen>
  );
}

/**
 * A Verifier's "Calibrate level" from a Player profile (ADR-0072), in the
 * sport the profile showed.
 */
export function CalibrateLevelScreen({
  userId,
  requestedSport,
}: {
  userId: string;
  requestedSport?: string;
}) {
  const m = useMessages();
  const segments = useSegments();
  const padel = api.users.playerProfile.useQuery({ userId });
  const sport = profileSport(requestedSport, padel.data?.sports);
  const football = api.users.footballProfile.useQuery(
    { userId },
    { enabled: sport === "football" },
  );
  const profile = sport === "football" ? football : padel;
  const header = (
    <ScreenHeader nav="back" fallback={playerPath(segments, userId)} />
  );

  if (isNotFoundError(padel.error) || isNotFoundError(profile.error)) {
    return (
      <Screen>
        {header}
        <Notice {...m.rating.verifier.calibrate.notAllowed} />
      </Screen>
    );
  }

  const failed = padel.error ?? profile.error;
  if (failed) {
    return (
      <Screen>
        {header}
        <Notice
          alert
          title={m.mobilePlayer.profile.loadError}
          description={failed.message}
          onRetry={() => void profile.refetch()}
        />
      </Screen>
    );
  }

  if (!padel.data || !profile.data || !sport) {
    return (
      <Screen>
        {header}
        <Skeleton height={160} radius={16} />
        <Skeleton height={120} radius={16} />
      </Screen>
    );
  }

  if (!padel.data.viewerMayCalibrate) {
    return (
      <Screen>
        {header}
        <Notice {...m.rating.verifier.calibrate.notAllowed} />
      </Screen>
    );
  }

  return (
    <CalibrateLevelForm
      userId={userId}
      name={profile.data.player.name}
      sport={sport}
      rating={profile.data.rating}
    />
  );
}

export function CalibrateLevelRoute() {
  const { userId, sport } = useLocalSearchParams<{
    userId: string;
    sport?: string;
  }>();
  return <CalibrateLevelScreen userId={userId} requestedSport={sport} />;
}
