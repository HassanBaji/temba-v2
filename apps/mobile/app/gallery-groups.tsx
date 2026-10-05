import {
  groupDeleteConfirm,
  groupRemoveImageConfirm,
} from "@repo/domain/group-admin";
import type { GroupCreateType } from "@repo/domain/group-create";
import type { GroupJoinRequestData } from "@repo/domain/group-data";
import { createGroupFixtures } from "@repo/domain/group-fixtures";
import type { GroupHomeTab } from "@repo/domain/group-home-tab";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import type { ConfirmRequest } from "../src/game-details/confirm-sheet";
import type { Slot } from "../src/home/home-model";
import { GroupCreateView } from "../src/groups/group-create-view";
import {
  GroupHomeView,
  type GroupHomeViewProps,
} from "../src/groups/group-home-view";
import type { GroupsTab } from "../src/groups/groups-model";
import { GroupsView } from "../src/groups/groups-view";
import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";

const API_ORIGIN = "http://localhost:4000";
const SAMPLE_IMAGE_URI = `${API_ORIGIN}/api/media/group-images/group-bromma/image?v=1`;

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
  { key: "organizer", label: "Organizer" },
  { key: "archivedClub", label: "Archived Club" },
] as const;

const CREATE_STATES = [
  { key: "loose", label: "Loose" },
  { key: "club", label: "Club Group" },
  { key: "private", label: "Private" },
  { key: "image", label: "With image" },
  { key: "imageTooBig", label: "Image refused" },
  { key: "nameError", label: "Name error" },
  { key: "refused", label: "Refused" },
  { key: "pending", label: "Creating" },
] as const;

const ADMIN_STATES = [
  { key: "creator", label: "Creator" },
  { key: "requiresApproval", label: "Approval on" },
  { key: "noImage", label: "No image" },
  { key: "deletable", label: "Deletable" },
  { key: "club", label: "Club Group" },
  { key: "private", label: "Private" },
  { key: "member", label: "Plain member" },
] as const;

const REQUEST_STATES = [
  { key: "ready", label: "Requests" },
  { key: "empty", label: "None" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
  { key: "deciding", label: "Deciding" },
] as const;

const CONFIRM_STATES = [
  { key: "none", label: "No sheet" },
  { key: "delete", label: "Delete" },
  { key: "removeImage", label: "Remove image" },
] as const;

type CreateState = (typeof CREATE_STATES)[number]["key"];
type AdminState = (typeof ADMIN_STATES)[number]["key"];
type RequestState = (typeof REQUEST_STATES)[number]["key"];
type ConfirmState = (typeof CONFIRM_STATES)[number]["key"];
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
  const [createState, setCreateState] = useState<CreateState>("loose");
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<GroupCreateType>("public");
  const [createApproval, setCreateApproval] = useState(false);
  const [adminState, setAdminState] = useState<AdminState>("creator");
  const [requestState, setRequestState] = useState<RequestState>("ready");
  const [confirmState, setConfirmState] = useState<ConfirmState>("none");

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const noop = () => undefined;
  const listTab: GroupsTab = listState === "public" ? "public" : "mine";
  const empty = listState === "empty";

  const adminData = fixtures.administration[adminState];
  const requests: Slot<GroupJoinRequestData[]> =
    requestState === "loading"
      ? { status: "loading" }
      : requestState === "error"
        ? { status: "error", message: "Network request failed" }
        : {
            status: "ready",
            value: requestState === "empty" ? [] : fixtures.joinRequests,
          };
  const adminName = adminData.name ?? "Group";
  const adminConfirm: ConfirmRequest | null =
    confirmState === "delete"
      ? { ...groupDeleteConfirm(adminName), onConfirm: noop }
      : confirmState === "removeImage"
        ? { ...groupRemoveImageConfirm(adminName), onConfirm: noop }
        : null;
  const decidingId =
    requestState === "deciding" ? (fixtures.joinRequests[0]?.id ?? null) : null;
  const adminProps: GroupHomeViewProps["admin"] = {
    approver: {
      requests:
        requestState === "deciding"
          ? { status: "ready", value: fixtures.joinRequests }
          : requests,
      requiresApprovalPending: false,
      onRequiresApprovalChange: noop,
      approvePendingId: decidingId,
      rejectPendingId: null,
      onApprove: noop,
      onReject: noop,
      onRetry: noop,
    },
    imagePending: false,
    onChangeImage: noop,
    onRemoveImage: () => setConfirmState("removeImage"),
    onDelete: () => setConfirmState("delete"),
  };
  const createContext = createState === "club" ? "club" : "loose";
  const effectiveType: GroupCreateType =
    createState === "private" ? "private" : createType;

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
        hasCreateAccess
        onCreate={noop}
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
        onInvite={noop}
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
        admin={adminProps}
      />

      <Text size="h2" weight="semibold">
        Create Group states
      </Text>
      <Picker
        states={CREATE_STATES}
        value={createState}
        onChange={setCreateState}
      />
      <GroupCreateView
        context={createContext}
        name={createName}
        onNameChange={setCreateName}
        nameError={
          createState === "nameError"
            ? "Name must be at most 255 characters"
            : null
        }
        formError={
          createState === "refused"
            ? "Only a Community Owner or Admin can create a Club Group"
            : null
        }
        type={effectiveType}
        onTypeChange={setCreateType}
        requiresApproval={createApproval}
        onRequiresApprovalChange={setCreateApproval}
        imageUri={createState === "image" ? SAMPLE_IMAGE_URI : null}
        imageError={
          createState === "imageTooBig" ? "Image must be at most 2 MB" : null
        }
        onPickImage={noop}
        onClearImage={noop}
        pending={createState === "pending"}
        onSubmit={noop}
        onCancel={noop}
      />

      <Text size="h2" weight="semibold">
        Group administration states
      </Text>
      <Picker
        states={ADMIN_STATES}
        value={adminState}
        onChange={setAdminState}
      />
      <Picker
        states={REQUEST_STATES}
        value={requestState}
        onChange={setRequestState}
      />
      <GroupHomeView
        data={adminData}
        apiOrigin={API_ORIGIN}
        tab="members"
        onTabChange={noop}
        joinPending={false}
        onJoin={noop}
        onInvite={noop}
        onLeave={noop}
        confirm={adminConfirm}
        confirmPending={false}
        onCloseConfirm={() => setConfirmState("none")}
        memberQuery=""
        onMemberQueryChange={noop}
        games={{
          playedGames: [],
          pendingGameId: null,
          canLoadMore: false,
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
        admin={adminProps}
      />
      <Picker
        states={CONFIRM_STATES}
        value={confirmState}
        onChange={setConfirmState}
      />
    </Screen>
  );
}
