import { useUser } from "@clerk/expo";
import type { Sport } from "@repo/domain/sport";
import { keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";

import { gamePath } from "../games/games-model";
import { Block } from "../home/slot-block";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { slotOf } from "../lib/slot-of";
import { cabinetRowModel } from "../marks/cabinet-model";
import { CabinetRow } from "../marks/cabinet-row";
import { playerMarksPath, playerPath } from "../player-profile/player-path";
import { Screen } from "../primitives/screen";
import { api } from "../trpc/react";
import { FootballTab } from "./football-tab";
import { LevelHero } from "./level-hero";
import { ProfileHeader } from "./profile-header";
import {
  displayBand,
  groupLevelRows,
  groupScale,
  headerLine,
  heroView,
  lastTenRecord,
  lastTenSlots,
  partnerRows,
  recentRows,
  sportChips,
  sportProfilePath,
  tilesView,
  type GroupLevel,
  type MyProfile,
} from "./profile-model";
import { Chip } from "./profile-parts";
import {
  LastTenStrip,
  LevelsByGroup,
  PartnersCard,
  RecentMatches,
  SECTION_GAP,
  StatTile,
} from "./profile-sections";
import { SetupSportCard } from "./setup-sport-card";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const PROFILE_TAB = ["profile"];

function PadelScope({
  profile,
  groups,
  onOpenGroup,
  onOpenPlayer,
  onOpenGame,
}: {
  profile: MyProfile;
  groups: GroupLevel[];
  onOpenGroup: (groupId: string) => void;
  onOpenPlayer: (userId: string) => void;
  onOpenGame: (gameId: string) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const group = profile.group
    ? (groups.find((row) => row.groupId === profile.group?.id) ?? null)
    : null;
  const hero = heroView(profile, group, locale);
  const general = profile.group ? null : profile.level;
  const tiles = tilesView(profile.stats, locale);

  return (
    <View style={{ gap: SECTION_GAP }}>
      <LevelHero view={hero} />
      {general && groups.length > 0 ? (
        <LevelsByGroup
          title={m.you.groups.title}
          meta={m.you.groups.vsGeneral(
            displayBand(general.levelBand),
            general.rating.toFixed(2),
          )}
          note={m.you.groups.note}
          scale={groupScale(general.rating, groups, locale)}
          rows={groupLevelRows(groups, locale)}
          onOpenGroup={onOpenGroup}
        />
      ) : null}
      <LastTenStrip
        title={
          profile.group
            ? m.you.form.lastTenIn(profile.group.name)
            : m.you.form.lastTen
        }
        record={lastTenRecord(profile.lastTen, locale)}
        slots={lastTenSlots(profile.lastTen, locale)}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile
          label={m.you.tiles.sets}
          value={tiles.sets.value}
          sub={tiles.sets.sub}
        />
        <StatTile
          label={m.you.tiles.longestStreak}
          value={tiles.streak.value}
          sub={tiles.streak.sub}
        />
      </View>
      <PartnersCard
        title={m.you.partners.title}
        meta={
          profile.group
            ? m.you.partners.inGroup(profile.group.name)
            : m.you.partners.mostPlayed
        }
        rows={partnerRows(profile.partners, "padel", locale)}
        empty={m.you.partners.empty}
        onOpen={onOpenPlayer}
      />
      <RecentMatches
        title={m.you.recent.title}
        meta={profile.group ? profile.group.name : m.you.recent.allGroups}
        rows={recentRows(profile.recent, locale)}
        onOpenGame={onOpenGame}
      />
    </View>
  );
}

export function ProfileScreen() {
  const m = useMessages();
  const locale = useLocale();
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [chosenSport, setChosenSport] = useState<Sport | null>(null);
  const [chosenGroupId, setChosenGroupId] = useState<string | null>(null);

  const details = api.users.profileDetails.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const { setUp, addable } = sportChips(details.data?.sports ?? []);
  const sport =
    chosenSport && setUp.includes(chosenSport)
      ? chosenSport
      : (setUp[0] ?? null);

  const groupLevels = api.ratings.myGroupLevels.useQuery(
    { sport: sport ?? "padel" },
    { ...REFETCH_ON_FOREGROUND, enabled: sport !== null },
  );
  const groups = groupLevels.data ?? [];
  const groupId =
    sport === "padel" && groups.some((row) => row.groupId === chosenGroupId)
      ? (chosenGroupId ?? undefined)
      : undefined;

  const padel = api.users.myProfile.useQuery(
    { sport: "padel", groupId },
    {
      ...REFETCH_ON_FOREGROUND,
      enabled: sport === "padel",
      placeholderData: keepPreviousData,
    },
  );
  const football = api.users.footballProfile.useQuery(
    { userId: details.data?.id ?? "" },
    {
      ...REFETCH_ON_FOREGROUND,
      enabled: sport === "football" && !!details.data,
    },
  );
  const teammates = api.users.myProfile.useQuery(
    { sport: "football" },
    { ...REFETCH_ON_FOREGROUND, enabled: sport === "football" },
  );
  const cabinet = api.marks.cabinet.useQuery(
    { userId: details.data?.id ?? "" },
    { ...REFETCH_ON_FOREGROUND, enabled: sport !== null && !!details.data },
  );

  const refetchAll = useCallback(
    () =>
      Promise.all([
        details.refetch(),
        sport ? groupLevels.refetch() : null,
        sport === "padel" ? padel.refetch() : null,
        sport === "football" ? football.refetch() : null,
        sport === "football" ? teammates.refetch() : null,
        sport ? cabinet.refetch() : null,
        user?.reload(),
      ]),
    [details, sport, groupLevels, padel, football, teammates, cabinet, user],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  const open = (href: string) => router.push(href);
  const openPlayer = (userId: string) =>
    open(playerPath(PROFILE_TAB, userId, sport ?? undefined));
  const name =
    user?.fullName ?? details.data?.name ?? user?.firstName ?? m.common.you;
  const cabinetRow = sport
    ? cabinetRowModel(cabinet.data, sport, locale)
    : null;
  const openCabinet = () => {
    if (details.data && sport) {
      open(playerMarksPath(PROFILE_TAB, details.data.id, sport));
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <ProfileHeader
        name={name}
        imageUri={user?.hasImage ? user.imageUrl : null}
        line={details.data ? headerLine(details.data, locale) : null}
        onEdit={() => open("/profile/details")}
        onSettings={() => open("/profile/settings")}
      />
      <Block
        slot={slotOf(details)}
        title={m.common.profile}
        skeletonHeight={320}
        onRetry={() => void details.refetch()}
      >
        {() =>
          sport === null ? (
            <SetupSportCard
              onSetUp={(picked) => router.push(sportProfilePath(picked))}
            />
          ) : (
            <View style={{ gap: SECTION_GAP }}>
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {setUp.map((value) => (
                    <Chip
                      key={value}
                      label={m.common[value]}
                      selected={value === sport}
                      onPress={() => setChosenSport(value)}
                    />
                  ))}
                  {addable.map((value) => (
                    <Chip
                      key={value}
                      dashed
                      label={`+ ${m.common[value]}`}
                      accessibilityLabel={m.you.header.addSport(
                        m.common[value],
                      )}
                      onPress={() => router.push(sportProfilePath(value))}
                    />
                  ))}
                </View>
                {sport === "padel" && groups.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    <Chip
                      label={m.you.scope.general}
                      meta={
                        padel.data?.level && !padel.data.group
                          ? displayBand(padel.data.level.levelBand)
                          : undefined
                      }
                      selected={groupId === undefined}
                      onPress={() => setChosenGroupId(null)}
                    />
                    {groups.map((row) => (
                      <Chip
                        key={row.groupId}
                        label={row.name}
                        meta={displayBand(row.levelBand)}
                        accessibilityLabel={m.you.scope.chipSpoken(
                          row.name,
                          displayBand(row.levelBand),
                        )}
                        selected={groupId === row.groupId}
                        onPress={() => setChosenGroupId(row.groupId)}
                      />
                    ))}
                  </ScrollView>
                ) : null}
              </View>
              {cabinetRow ? (
                <CabinetRow row={cabinetRow} onOpen={openCabinet} />
              ) : null}
              {sport === "padel" ? (
                <Block
                  slot={slotOf(padel)}
                  title={m.common.padel}
                  skeletonHeight={360}
                  onRetry={() => void padel.refetch()}
                >
                  {(profile) => (
                    <PadelScope
                      profile={profile}
                      groups={groups}
                      onOpenGroup={setChosenGroupId}
                      onOpenPlayer={openPlayer}
                      onOpenGame={(gameId) => open(gamePath(gameId))}
                    />
                  )}
                </Block>
              ) : (
                <Block
                  slot={slotOf(football)}
                  title={m.common.football}
                  skeletonHeight={360}
                  onRetry={() => void football.refetch()}
                >
                  {(data) => (
                    <FootballTab
                      football={data}
                      teammates={teammates.data?.partners ?? []}
                      groups={groups}
                      onOpenPlayer={openPlayer}
                    />
                  )}
                </Block>
              )}
            </View>
          )
        }
      </Block>
    </Screen>
  );
}
