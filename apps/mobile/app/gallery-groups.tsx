import { createGroupFixtures } from "@repo/domain/group-fixtures";
import type { GroupHomeTab } from "@repo/domain/group-home-tab";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { GroupHomeView } from "../src/groups/group-home-view";
import type { GroupsTab } from "../src/groups/groups-model";
import { GroupsView } from "../src/groups/groups-view";
import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";

const API_ORIGIN = "http://localhost:4000";

const LIST_STATES = [
  { key: "mine", label: "My Groups" },
  { key: "public", label: "Public Groups" },
  { key: "empty", label: "Empty" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
] as const;

const HOME_STATES = [
  { key: "member", label: "Member" },
  { key: "noResults", label: "No results" },
  { key: "noGames", label: "No Games" },
  { key: "nonMemberJoin", label: "Join" },
  { key: "nonMemberRequest", label: "Request" },
  { key: "requested", label: "Requested" },
  { key: "clubRequest", label: "Club request" },
  { key: "archivedClub", label: "Archived Club" },
] as const;

type ListState = (typeof LIST_STATES)[number]["key"];
type HomeState = (typeof HOME_STATES)[number]["key"];

function Picker<K extends string>({
  states,
  value,
  onChange,
}: {
  states: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {states.map((entry) => (
        <Button
          key={entry.key}
          label={entry.label}
          size="sm"
          variant={entry.key === value ? "default" : "outline"}
          selected={entry.key === value}
          onPress={() => onChange(entry.key)}
        />
      ))}
    </View>
  );
}

export default function GalleryGroups() {
  const [listState, setListState] = useState<ListState>("mine");
  const [homeState, setHomeState] = useState<HomeState>("member");
  const [tab, setTab] = useState<GroupHomeTab>("standing");
  const [memberQuery, setMemberQuery] = useState("");
  const fixtures = useMemo(() => createGroupFixtures(), []);

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const noop = () => undefined;
  const listTab: GroupsTab = listState === "public" ? "public" : "mine";
  const empty = listState === "empty";

  return (
    <Screen>
      <Text size="h2" weight="semibold">
        Groups states
      </Text>
      <Picker states={LIST_STATES} value={listState} onChange={setListState} />
      <GroupsView
        tab={listTab}
        onTabChange={(next) => setListState(next)}
        mine={
          listState === "loading"
            ? { status: "loading" }
            : listState === "error"
              ? { status: "error", message: "Network request failed" }
              : { status: "ready", value: empty ? [] : fixtures.mine }
        }
        publicGroups={
          listState === "loading"
            ? { status: "loading" }
            : { status: "ready", value: fixtures.publicGroups }
        }
        apiOrigin={API_ORIGIN}
        pendingGroupId={null}
        onOpen={noop}
        onJoin={noop}
        onRetry={noop}
      />

      <Text size="h2" weight="semibold">
        Group home states
      </Text>
      <Picker states={HOME_STATES} value={homeState} onChange={setHomeState} />
      <GroupHomeView
        data={fixtures.home[homeState]}
        apiOrigin={API_ORIGIN}
        tab={tab}
        onTabChange={setTab}
        joinPending={false}
        onJoin={noop}
        onLeave={noop}
        confirm={null}
        confirmPending={false}
        onCloseConfirm={noop}
        memberQuery={memberQuery}
        onMemberQueryChange={setMemberQuery}
        games={{
          playedGames: fixtures.home[homeState].gameHistory,
          pendingGameId: null,
          canLoadMore: homeState === "member",
          loadingMore: false,
          loadMoreFailed: false,
          onPickSeat: noop,
          onLoadMore: noop,
        }}
        pickerGame={null}
        onClosePicker={noop}
        onPickSeat={noop}
        actions={{
          onOpen: noop,
          onJoinSeat: noop,
          onJoinWaitlist: noop,
          onRegister: noop,
        }}
      />
    </Screen>
  );
}
