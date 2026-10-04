import { createInvitesFixtures } from "@repo/domain/invites-fixtures";
import {
  groupLookupNote,
  mergeInviteInbox,
  type InviteLinkPreview,
} from "@repo/domain/invites";
import { Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";

import type { Slot } from "../src/home/home-model";
import { InviteLinkView } from "../src/invites/invite-link-view";
import { InviteSheetView } from "../src/invites/invite-sheet-view";
import {
  toggleSelection,
  type LookupResultRow,
} from "../src/invites/invites-model";
import { InvitesView } from "../src/invites/invites-view";
import { Button } from "../src/primitives/button";
import { Screen } from "../src/primitives/screen";
import { Text } from "../src/primitives/text";

const INBOX_STATES = [
  { key: "mixed", label: "All four hosts" },
  { key: "seatPick", label: "Game seat pick" },
  { key: "waitlistOnly", label: "Waitlist only" },
  { key: "frozen", label: "Not open" },
  { key: "empty", label: "Empty" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
] as const;

const LINK_STATES = [
  { key: "community", label: "Community" },
  { key: "group", label: "Group" },
  { key: "team", label: "Team" },
  { key: "game", label: "Game" },
  { key: "gameSeatPick", label: "Seat pick" },
  { key: "gameWaitlist", label: "Waitlist" },
  { key: "gamePartner", label: "Partner" },
  { key: "gameLevelRange", label: "Level range" },
  { key: "gameLevelRangePending", label: "Request sent" },
  { key: "expired", label: "Expired" },
  { key: "unavailable", label: "Unavailable" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
] as const;

const SHEET_STATES = [
  { key: "group", label: "Group" },
  { key: "groupLoose", label: "Loose Group" },
  { key: "game", label: "Game" },
  { key: "linkOnly", label: "Link only" },
  { key: "lookupOnly", label: "Lookup only" },
] as const;

type InboxState = (typeof INBOX_STATES)[number]["key"];
type LinkState = (typeof LINK_STATES)[number]["key"];
type SheetState = (typeof SHEET_STATES)[number]["key"];

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

export default function GalleryInvites() {
  const fixtures = useMemo(() => createInvitesFixtures(), []);
  const [inboxState, setInboxState] = useState<InboxState>("mixed");
  const [linkState, setLinkState] = useState<LinkState>("community");
  const [sheetState, setSheetState] = useState<SheetState>("group");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<LookupResultRow[]>([]);
  const [linkText, setLinkText] = useState("");

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const inbox: Slot<ReturnType<typeof mergeInviteInbox>> =
    inboxState === "loading"
      ? { status: "loading" }
      : inboxState === "error"
        ? { status: "error", message: "Network request failed" }
        : {
            status: "ready",
            value: mergeInviteInbox(fixtures.inbox[inboxState]),
          };

  const preview: Slot<InviteLinkPreview> =
    linkState === "loading"
      ? { status: "loading" }
      : linkState === "error"
        ? { status: "error", message: "Network request failed" }
        : { status: "ready", value: fixtures.links[linkState]! };

  const lookup =
    sheetState === "linkOnly"
      ? null
      : {
          note:
            sheetState === "game" || sheetState === "lookupOnly"
              ? null
              : groupLookupNote(sheetState === "groupLoose"),
          query: "",
          onQueryChange: noop,
          results: {
            status: "ready" as const,
            value: fixtures.send.results,
          },
          selected,
          onToggle: (row: LookupResultRow) =>
            setSelected((current) => toggleSelection(current, row, "multiple")),
          sendPending: false,
          onSend: noop,
          refused: sheetState === "game" ? fixtures.send.refused : null,
          formError: null,
          pendingInvites: {
            status: "ready" as const,
            value: fixtures.send.pending,
          },
          revokePendingId: null,
          onRevoke: noop,
        };

  return (
    <Screen>
      <Text size="h2" weight="semibold">
        Inbox states
      </Text>
      <Picker
        states={INBOX_STATES}
        value={inboxState}
        onChange={setInboxState}
      />
      <InvitesView
        inbox={inbox}
        pendingKey={null}
        onAccept={noop}
        onPickSeat={noop}
        onRetry={noop}
        linkText={linkText}
        linkError={null}
        onLinkTextChange={setLinkText}
        onPasteLink={noop}
        onOpenLink={noop}
      />

      <Text size="h2" weight="semibold">
        Invite link states
      </Text>
      <Picker states={LINK_STATES} value={linkState} onChange={setLinkState} />
      <InviteLinkView
        kind={
          linkState === "community"
            ? "community"
            : linkState === "group"
              ? "group"
              : linkState === "team"
                ? "team"
                : "game"
        }
        preview={preview}
        acceptPending={false}
        requestPending={false}
        waitingForPartner={false}
        onAccept={noop}
        onRequestLevel={noop}
        onPickPartner={noop}
        onGoHome={noop}
        onRetry={noop}
      />

      <Text size="h2" weight="semibold">
        Invite sheet states
      </Text>
      <Picker
        states={SHEET_STATES}
        value={sheetState}
        onChange={setSheetState}
      />
      <View style={{ flexDirection: "row" }}>
        <Button label="Open sheet" onPress={() => setSheetOpen(true)} />
      </View>
      <InviteSheetView
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        lookup={lookup}
        link={
          sheetState === "lookupOnly"
            ? null
            : {
                currentUrl: fixtures.send.linkUrl,
                pending: false,
                onShare: noop,
                onCopy: noop,
              }
        }
      />
    </Screen>
  );
}
