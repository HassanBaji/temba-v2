import {
  communityArchiveConfirm,
  communityLeaveConfirm,
  communityUnlinkVenueConfirm,
} from "@repo/domain/community";
import type { CommunityVisibility } from "@repo/domain/community-chrome";
import type { CommunityHomeTab } from "@repo/domain/community-home-tab";
import {
  createCommunityFixtures,
  type CommunityHomeFixtureKey,
} from "@repo/domain/community-fixtures";
import { roleChangeConfirmCopy } from "@repo/domain/community-role-change";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import { CommunitiesView } from "../src/communities/communities-view";
import { CommunityCreateView } from "../src/communities/community-create-view";
import {
  CommunityHomeView,
  type CommunityHomeViewProps,
} from "../src/communities/community-home-view";
import type { ConfirmRequest } from "../src/game-details/confirm-sheet";
import type { Slot } from "../src/home/home-model";
import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";

const API_ORIGIN = "http://localhost:4000";

const LIST_STATES = [
  { key: "mine", label: "My Communities" },
  { key: "empty", label: "Empty" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
] as const;

const HOME_STATES: { key: CommunityHomeFixtureKey; label: string }[] = [
  { key: "owner", label: "Owner" },
  { key: "admin", label: "Admin" },
  { key: "member", label: "Member" },
  { key: "lastOwner", label: "Last Owner" },
  { key: "linkedTeam", label: "Linked Team" },
  { key: "noVenue", label: "No Venue" },
  { key: "venueRequestPending", label: "Venue requested" },
  { key: "venueRequestRejected", label: "Venue rejected" },
  { key: "publicVisitor", label: "Public visitor" },
  { key: "requestPending", label: "Request pending" },
  { key: "requestRejected", label: "Request rejected" },
  { key: "privateVisitor", label: "Private visitor" },
  { key: "archivedMember", label: "Archived Member" },
  { key: "archivedOwner", label: "Archived Owner" },
  { key: "archivedVisitor", label: "Archived visitor" },
  { key: "empty", label: "No Groups or Teams" },
];

const TABS = [
  { key: "groups", label: "Groups" },
  { key: "teams", label: "Teams" },
  { key: "members", label: "Members" },
  { key: "requests", label: "Requests" },
] as const;

const LOAD_STATES = [
  { key: "ready", label: "Ready" },
  { key: "empty", label: "None" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
  { key: "deciding", label: "Deciding" },
] as const;

const OVERLAY_STATES = [
  { key: "none", label: "None" },
  { key: "venues", label: "Venue catalog" },
  { key: "venuesEmpty", label: "Catalog: none" },
  { key: "venuesLoading", label: "Catalog: loading" },
  { key: "venuesError", label: "Catalog: error" },
  { key: "venuesRequesting", label: "Requesting" },
  { key: "leave", label: "Leave" },
  { key: "archive", label: "Soft-archive" },
  { key: "unlink", label: "Unlink Venue" },
  { key: "promote", label: "Make Owner" },
] as const;

const CREATE_STATES = [
  { key: "idle", label: "Public" },
  { key: "private", label: "Private" },
  { key: "pending", label: "Creating" },
  { key: "nameError", label: "Name error" },
  { key: "refused", label: "Refused" },
] as const;

type ListState = (typeof LIST_STATES)[number]["key"];
type LoadState = (typeof LOAD_STATES)[number]["key"];
type OverlayState = (typeof OVERLAY_STATES)[number]["key"];
type CreateState = (typeof CREATE_STATES)[number]["key"];

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

function slotFor<T>(state: LoadState, value: T[]): Slot<T[]> {
  if (state === "loading") {
    return { status: "loading" };
  }
  if (state === "error") {
    return { status: "error", message: "Network request failed" };
  }
  return { status: "ready", value: state === "empty" ? [] : value };
}

export default function GalleryCommunities() {
  const fixtures = useMemo(() => createCommunityFixtures(), []);
  const [listState, setListState] = useState<ListState>("mine");
  const [homeState, setHomeState] = useState<CommunityHomeFixtureKey>("owner");
  const [tab, setTab] = useState<CommunityHomeTab>("groups");
  const [loadState, setLoadState] = useState<LoadState>("ready");
  const [overlay, setOverlay] = useState<OverlayState>("none");
  const [memberQuery, setMemberQuery] = useState("");
  const [createState, setCreateState] = useState<CreateState>("idle");
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<CommunityVisibility>("public");

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const noop = () => undefined;
  const data = fixtures.home[homeState];
  const decidingId =
    loadState === "deciding" ? (fixtures.joinRequests[0]?.id ?? null) : null;
  const decidingTeamId =
    loadState === "deciding"
      ? (fixtures.teamLinkRequests[0]?.id ?? null)
      : null;
  const readyState: LoadState = loadState === "deciding" ? "ready" : loadState;

  const overlayConfirm: ConfirmRequest | null =
    overlay === "leave"
      ? { ...communityLeaveConfirm(data.name), onConfirm: noop }
      : overlay === "archive"
        ? { ...communityArchiveConfirm(data.name), onConfirm: noop }
        : overlay === "unlink"
          ? {
              ...communityUnlinkVenueConfirm(data.venue?.name ?? null),
              onConfirm: noop,
            }
          : overlay === "promote"
            ? {
                ...roleChangeConfirmCopy({
                  name: "Kim Holm",
                  isSelf: false,
                  from: "member",
                  to: "owner",
                }),
                onConfirm: noop,
              }
            : null;

  const venueState: LoadState =
    overlay === "venuesEmpty"
      ? "empty"
      : overlay === "venuesLoading"
        ? "loading"
        : overlay === "venuesError"
          ? "error"
          : "ready";

  const homeProps: CommunityHomeViewProps = {
    data,
    apiOrigin: API_ORIGIN,
    hasCreateAccess: true,
    tab,
    onTabChange: setTab,
    requestCount:
      fixtures.joinRequests.length + fixtures.teamLinkRequests.length,
    joinPending: false,
    actionError:
      overlay === "archive"
        ? "Only an Owner or Admin can Soft-archive a Community"
        : null,
    confirm: overlayConfirm,
    confirmPending: false,
    unarchivePending: false,
    onCloseConfirm: () => setOverlay("none"),
    onRequestJoin: noop,
    onInvite: noop,
    onCreateClubGroup: noop,
    onUnarchive: noop,
    onLeave: () => setOverlay("leave"),
    onArchive: () => setOverlay("archive"),
    onOpenGroup: noop,
    onOpenTeam: noop,
    onLinkVenue: () => setOverlay("venues"),
    onUnlinkVenue: () => setOverlay("unlink"),
    members: {
      members: slotFor(readyState, fixtures.members),
      query: memberQuery,
      onQueryChange: setMemberQuery,
      rolePending: false,
      onRoleChange: () => setOverlay("promote"),
      leaveNotices:
        homeState === "lastOwner"
          ? ["You are the last Owner. Promote someone else before leaving."]
          : [],
      onRetry: noop,
    },
    requests: {
      joinRequests: slotFor(readyState, fixtures.joinRequests),
      teamLinkRequests: slotFor(readyState, fixtures.teamLinkRequests),
      approveJoinPendingId: decidingId,
      rejectJoinPendingId: null,
      approveTeamPendingId: null,
      rejectTeamPendingId: decidingTeamId,
      onApproveJoin: noop,
      onRejectJoin: noop,
      onApproveTeam: noop,
      onRejectTeam: noop,
      onRetryJoin: noop,
      onRetryTeam: noop,
    },
    venueSheet: {
      visible: overlay.startsWith("venues"),
      onClose: () => setOverlay("none"),
      query: "",
      onQueryChange: noop,
      venues: slotFor(venueState, fixtures.liveVenues),
      pendingVenueId:
        overlay === "venuesRequesting"
          ? (fixtures.liveVenues[0]?.id ?? null)
          : null,
      onRequest: noop,
      onRetry: noop,
    },
  };

  return (
    <Screen>
      <Text size="h2" weight="semibold">
        Communities list states
      </Text>
      <Picker states={LIST_STATES} value={listState} onChange={setListState} />
      <CommunitiesView
        communities={
          listState === "loading"
            ? { status: "loading" }
            : listState === "error"
              ? { status: "error", message: "Network request failed" }
              : {
                  status: "ready",
                  value: listState === "empty" ? [] : fixtures.mine,
                }
        }
        apiOrigin={API_ORIGIN}
        onOpen={noop}
        onOpenGroup={noop}
        onCreate={noop}
        onRetry={noop}
      />

      <Text size="h2" weight="semibold">
        Community home states
      </Text>
      <Picker states={HOME_STATES} value={homeState} onChange={setHomeState} />
      <Picker states={TABS} value={tab} onChange={setTab} />
      <Picker states={LOAD_STATES} value={loadState} onChange={setLoadState} />
      <Picker states={OVERLAY_STATES} value={overlay} onChange={setOverlay} />
      <CommunityHomeView {...homeProps} />

      <Text size="h2" weight="semibold">
        Create Community states
      </Text>
      <Picker
        states={CREATE_STATES}
        value={createState}
        onChange={setCreateState}
      />
      <CommunityCreateView
        name={createName}
        onNameChange={setCreateName}
        nameError={
          createState === "nameError"
            ? "Name must be at most 255 characters"
            : null
        }
        formError={
          createState === "refused"
            ? "Creating is limited to Group creators"
            : null
        }
        type={createState === "private" ? "private" : createType}
        onTypeChange={setCreateType}
        pending={createState === "pending"}
        onSubmit={noop}
        onCancel={noop}
      />
    </Screen>
  );
}
