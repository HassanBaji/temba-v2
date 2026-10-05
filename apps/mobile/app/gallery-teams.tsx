import { createInvitesFixtures } from "@repo/domain/invites-fixtures";
import { teamLinkCommunityPicker } from "@repo/domain/team-link-community-picker";
import {
  TEAM_LOOKUP_NOTE,
  teamDissolveConfirm,
  teamHomeView,
  teamUnlinkConfirm,
} from "@repo/domain/teams";
import { createTeamsFixtures } from "@repo/domain/teams-fixtures";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import type { Slot } from "../src/home/home-model";
import { InviteSheetView } from "../src/invites/invite-sheet-view";
import {
  toggleSelection,
  type LookupResultRow,
} from "../src/invites/invites-model";
import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";
import { CreateTeamView } from "../src/teams/create-team-view";
import {
  TeamHomeView,
  type TeamHomeViewProps,
} from "../src/teams/team-home-view";
import { TeamsView } from "../src/teams/teams-view";

const LIST_STATES = [
  { key: "mixed", label: "Teams and invite" },
  { key: "teamsOnly", label: "Teams" },
  { key: "invitesOnly", label: "Only an invite" },
  { key: "empty", label: "Empty" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
] as const;

const CREATE_STATES = [
  { key: "idle", label: "Idle" },
  { key: "pending", label: "Creating" },
  { key: "nameError", label: "Name error" },
  { key: "refused", label: "Refused" },
] as const;

const HOME_STATES = [
  { key: "complete", label: "Complete" },
  { key: "record", label: "With record" },
  { key: "incomplete", label: "Invite partner" },
  { key: "waiting", label: "Waiting" },
  { key: "linked", label: "Linked" },
  { key: "pendingLink", label: "Link requested" },
] as const;

const OVERLAY_STATES = [
  { key: "none", label: "None" },
  { key: "linkReady", label: "Link: pick" },
  { key: "linkLoading", label: "Link: loading" },
  { key: "linkError", label: "Link: error" },
  { key: "linkEmpty", label: "Link: none" },
  { key: "linkRefused", label: "Link: refused" },
  { key: "dissolve", label: "Dissolve" },
  { key: "unlink", label: "Unlink" },
  { key: "invite", label: "Invite" },
] as const;

type ListState = (typeof LIST_STATES)[number]["key"];
type CreateState = (typeof CREATE_STATES)[number]["key"];
type HomeState = (typeof HOME_STATES)[number]["key"];
type OverlayState = (typeof OVERLAY_STATES)[number]["key"];

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

const noop = () => undefined;

export default function GalleryTeams() {
  const fixtures = useMemo(() => createTeamsFixtures(), []);
  const invites = useMemo(() => createInvitesFixtures(), []);
  const [listState, setListState] = useState<ListState>("mixed");
  const [createState, setCreateState] = useState<CreateState>("idle");
  const [homeState, setHomeState] = useState<HomeState>("complete");
  const [overlay, setOverlay] = useState<OverlayState>("none");
  const [name, setName] = useState("");
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null,
  );
  const [selected, setSelected] = useState<LookupResultRow[]>([]);

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const teamRows =
    listState === "mixed" || listState === "teamsOnly"
      ? fixtures.list.mixed
      : fixtures.list.empty;
  const inviteRows =
    listState === "mixed" || listState === "invitesOnly"
      ? fixtures.pendingInvites
      : [];
  const teams: Slot<typeof teamRows> =
    listState === "loading"
      ? { status: "loading" }
      : listState === "error"
        ? { status: "error", message: "Network request failed" }
        : { status: "ready", value: teamRows };

  const view = teamHomeView(fixtures.home[homeState]);
  const linkPicker =
    overlay === "linkLoading"
      ? teamLinkCommunityPicker({
          isLoading: true,
          isError: false,
          data: undefined as typeof fixtures.communities | undefined,
        })
      : overlay === "linkError"
        ? teamLinkCommunityPicker({
            isLoading: false,
            isError: true,
            data: undefined as typeof fixtures.communities | undefined,
          })
        : teamLinkCommunityPicker({
            isLoading: false,
            isError: false,
            data: overlay === "linkEmpty" ? [] : fixtures.communities,
          });
  const confirm =
    overlay === "dissolve"
      ? { ...teamDissolveConfirm(view.title), onConfirm: noop }
      : overlay === "unlink"
        ? { ...teamUnlinkConfirm(view.title), onConfirm: noop }
        : null;

  const homeProps: TeamHomeViewProps = {
    view,
    linkOpen: overlay.startsWith("link"),
    linkPicker,
    linkPickerMessage: "Network request failed",
    selectedCommunityId,
    linkError:
      overlay === "linkRefused"
        ? "Only a Team member can request a Community link"
        : null,
    linkPending: false,
    confirm,
    confirmPending: false,
    actionError: null,
    onInvite: () => setOverlay("invite"),
    onOpenLink: () => setOverlay("linkReady"),
    onCloseLink: () => setOverlay("none"),
    onSelectCommunity: setSelectedCommunityId,
    onSubmitLink: noop,
    onRetryCommunities: noop,
    onUnlink: () => setOverlay("unlink"),
    onDissolve: () => setOverlay("dissolve"),
    onCloseConfirm: () => setOverlay("none"),
  };

  return (
    <Screen>
      <Text size="h2" weight="semibold">
        Teams list states
      </Text>
      <Picker states={LIST_STATES} value={listState} onChange={setListState} />
      <TeamsView
        teams={teams}
        invites={{ status: "ready", value: inviteRows }}
        acceptingId={null}
        onOpen={noop}
        onCreate={noop}
        onAccept={noop}
        onRetry={noop}
      />

      <Text size="h2" weight="semibold">
        Create Team states
      </Text>
      <Picker
        states={CREATE_STATES}
        value={createState}
        onChange={setCreateState}
      />
      <CreateTeamView
        name={name}
        onNameChange={setName}
        nameError={
          createState === "nameError"
            ? "Name must be at most 255 characters"
            : null
        }
        formError={createState === "refused" ? "Failed to create Team" : null}
        pending={createState === "pending"}
        onSubmit={noop}
        onCancel={noop}
      />

      <Text size="h2" weight="semibold">
        Team home states
      </Text>
      <Picker states={HOME_STATES} value={homeState} onChange={setHomeState} />
      <Picker states={OVERLAY_STATES} value={overlay} onChange={setOverlay} />
      <TeamHomeView {...homeProps} />
      <InviteSheetView
        visible={overlay === "invite"}
        onClose={() => setOverlay("none")}
        lookup={{
          note: TEAM_LOOKUP_NOTE,
          query: "",
          onQueryChange: noop,
          results: { status: "ready", value: invites.send.results },
          selected,
          onToggle: (row) =>
            setSelected((current) => toggleSelection(current, row, "single")),
          sendPending: false,
          onSend: noop,
          refused: null,
          formError: null,
          pendingInvites: { status: "ready", value: invites.send.pending },
          revokePendingId: null,
          onRevoke: noop,
        }}
        link={{
          currentUrl: invites.send.linkUrl,
          pending: false,
          onShare: noop,
          onCopy: noop,
        }}
      />
    </Screen>
  );
}
