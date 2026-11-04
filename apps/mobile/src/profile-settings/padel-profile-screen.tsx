import { colors, sizes, spacing } from "@repo/design-tokens";
import {
  isPreferredPosition,
  PREFERRED_POSITIONS,
  type PreferredPosition,
} from "@repo/domain/preferred-position";
import {
  MATCH_HISTORY_VISIBILITIES,
  type MatchHistoryVisibility,
} from "@repo/domain/profile-details";
import { Lock } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Block } from "../home/slot-block";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { slotOf } from "../lib/slot-of";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Screen } from "../primitives/screen";
import { ScreenHeader, useLeaveScreen } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { displayBand, groupLevelRows } from "../profile/profile-model";
import { api, type RouterOutputs } from "../trpc/react";
import { Segmented } from "./settings-rows";

type Details = RouterOutputs["users"]["profileDetails"];

function isVisibility(value: string | null): value is MatchHistoryVisibility {
  return MATCH_HISTORY_VISIBILITIES.includes(value as MatchHistoryVisibility);
}

function Heading({ title, note }: { title: string; note?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text weight="semibold" accessibilityRole="header">
        {title}
      </Text>
      {note ? (
        <Text size="eyebrow" tone="muted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

function LockedLevel({ setUp }: { setUp: boolean }) {
  const m = useMessages();
  const p = m.you.padel;
  const locale = useLocale();
  const profile = api.users.myProfile.useQuery(
    { sport: "padel" },
    { enabled: setUp },
  );
  const groups = api.ratings.myGroupLevels.useQuery(
    { sport: "padel" },
    { enabled: setUp },
  );
  const level = profile.data?.level ?? null;
  const rows = groupLevelRows(groups.data ?? [], locale);

  return (
    <Surface radius="card" style={{ gap: 14 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text size="meta" tone="muted">
          {p.level}
        </Text>
        <Lock size={sizes.iconRow} color={colors.muted} />
      </View>
      {level ? (
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text size="hero" width="expanded" weight="bold">
            {displayBand(level.levelBand)}
          </Text>
          <Text size="title" weight="bold" style={{ flex: 1 }}>
            {level.rating.toFixed(2)}
          </Text>
          <Text size="eyebrow" tone="muted">
            {p.general}
          </Text>
        </View>
      ) : (
        <Text size="h2" weight="bold">
          {m.you.hero.noLevel}
        </Text>
      )}
      <Text size="meta" tone="muted">
        {level
          ? level.provisional
            ? p.lockNoteProvisional
            : p.lockNote
          : p.lockNoteNone}
      </Text>
      {rows.length > 0 ? (
        <>
          <Hairline />
          <View style={{ gap: 8 }}>
            {rows.map((row) => (
              <View
                key={row.groupId}
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: 10,
                }}
              >
                <Text
                  size="eyebrow"
                  weight="semibold"
                  numberOfLines={1}
                  style={{ flex: 2 }}
                >
                  {row.name}
                </Text>
                <Text
                  size="eyebrow"
                  tone="muted"
                  numberOfLines={1}
                  style={{ flex: 3 }}
                >
                  {row.sub}
                </Text>
                <Text size="eyebrow" weight="semibold">
                  {`${row.band} ${row.level}`}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Surface>
  );
}

function PadelProfileForm({ details }: { details: Details }) {
  const m = useMessages();
  const p = m.you.padel;
  const toast = useToast();
  const utils = api.useUtils();
  const leave = useLeaveScreen("/profile/settings");
  const setUp = details.sports.includes("padel");

  const [side, setSide] = useState<PreferredPosition>(
    isPreferredPosition(details.preferredPosition)
      ? details.preferredPosition
      : "either",
  );
  const [visibility, setVisibility] = useState<MatchHistoryVisibility>(
    isVisibility(details.matchHistoryVisibility)
      ? details.matchHistoryVisibility
      : "group_members",
  );
  const [saving, setSaving] = useState(false);

  const refresh = () =>
    Promise.all([
      utils.users.profileDetails.invalidate(),
      utils.users.onboardingState.invalidate(),
      utils.users.home.invalidate(),
    ]);
  const fail = (error: { message: string }) => toast.show(error.message);

  const savePosition = api.users.setPreferredPosition.useMutation({
    onSuccess: refresh,
    onError: fail,
  });
  const saveVisibility = api.users.setMatchHistoryVisibility.useMutation({
    onSuccess: refresh,
    onError: fail,
  });
  const setSports = api.users.setSports.useMutation();

  async function changeSports(adding: boolean) {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      if (adding) {
        await savePosition.mutateAsync({ preferredPosition: side });
      }
      await setSports.mutateAsync({
        sports: adding
          ? [...details.sports, "padel"]
          : details.sports.filter((sport) => sport !== "padel"),
      });
      await refresh();
      toast.show(
        adding
          ? m.mobileYou.sportAdded(m.common.padel)
          : m.mobileYou.sportRemoved(m.common.padel),
      );
      leave();
    } catch (error) {
      fail(
        error instanceof Error
          ? error
          : { message: m.common.somethingWentWrong },
      );
      setSaving(false);
    }
  }

  return (
    <>
      <LockedLevel setUp={setUp} />
      <View style={{ gap: 10 }}>
        <Heading title={p.preferredSide} note={p.preferredSideNote} />
        <Segmented<PreferredPosition>
          label={p.preferredSide}
          options={PREFERRED_POSITIONS.map((value) => ({
            value,
            label: m.profile.preferredPosition[value],
            sub: p.sideSub[value],
          }))}
          value={side}
          disabled={saving}
          onSelect={(value) => {
            setSide(value);
            if (setUp && value !== side) {
              savePosition.mutate({ preferredPosition: value });
            }
          }}
        />
        <Text size="eyebrow" tone="muted">
          {p.sideNote[side]}
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <Heading title={p.matchHistory} note={p.visibilityNote[visibility]} />
        <Segmented<MatchHistoryVisibility>
          label={p.matchHistory}
          options={MATCH_HISTORY_VISIBILITIES.map((value) => ({
            value,
            label: p.visibility[value],
          }))}
          value={visibility}
          disabled={saving}
          onSelect={(value) => {
            if (value === visibility) {
              return;
            }
            setVisibility(value);
            saveVisibility.mutate({ visibility: value });
          }}
        />
      </View>
      <Hairline />
      {setUp ? (
        <View style={{ gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void changeSports(false)}
            style={{ minHeight: sizes.touchTarget, justifyContent: "center" }}
          >
            <Text weight="semibold" style={{ color: colors.danger }}>
              {saving ? `${p.remove}…` : p.remove}
            </Text>
          </Pressable>
          <Text size="eyebrow" tone="muted">
            {p.removeNote}
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.compact / 2 }}>
          <Button
            label={p.add}
            size="lg"
            pending={saving}
            onPress={() => void changeSports(true)}
          />
          <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
            {p.addNote}
          </Text>
        </View>
      )}
    </>
  );
}

export function PadelProfileScreen() {
  const m = useMessages();
  const details = api.users.profileDetails.useQuery();
  return (
    <Screen>
      <ScreenHeader
        nav="back"
        fallback="/profile/settings"
        title={m.you.padel.title}
      />
      <Block
        slot={slotOf(details)}
        title={m.you.padel.title}
        skeletonHeight={360}
        onRetry={() => void details.refetch()}
      >
        {(data) => <PadelProfileForm details={data} />}
      </Block>
    </Screen>
  );
}
