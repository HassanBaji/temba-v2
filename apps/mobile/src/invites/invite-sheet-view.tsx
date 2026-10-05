import { spacing } from "@repo/design-tokens";
import { View, ScrollView, Pressable } from "react-native";

import type { Slot } from "../home/home-model";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import {
  lookupResultView,
  revokeConfirmCopy,
  sendLookupLabel,
  type LookupResultRow,
} from "./invites-model";
import { useState } from "react";

const SHEET_MAX_HEIGHT = 520;

export type PendingLookupRow = {
  id: string;
  user: { id: string; name: string; email: string | null };
};

export type LookupSectionProps = {
  note: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  results: Slot<LookupResultRow[]>;
  selected: LookupResultRow[];
  onToggle: (row: LookupResultRow) => void;
  sendPending: boolean;
  onSend: () => void;
  refused: { name: string; message: string }[] | null;
  formError: string | null;
  pendingInvites: Slot<PendingLookupRow[]>;
  revokePendingId: string | null;
  onRevoke: (inviteId: string) => void;
};

export type LinkSectionProps = {
  currentUrl: string | null;
  pending: boolean;
  onShare: () => void;
  onCopy: () => void;
};

export type InviteSheetViewProps = {
  visible: boolean;
  onClose: () => void;
  lookup: LookupSectionProps | null;
  link: LinkSectionProps | null;
};

function SectionTitle({ children }: { children: string }) {
  return (
    <Text size="lead" weight="semibold" accessibilityRole="header">
      {children}
    </Text>
  );
}

function ResultRow({
  row,
  selected,
  onToggle,
}: {
  row: LookupResultRow;
  selected: boolean;
  onToggle: () => void;
}) {
  const view = lookupResultView(row, selected);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={view.accessibilityLabel}
      onPress={onToggle}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight={selected ? "semibold" : "regular"} numberOfLines={1}>
          {view.name}
        </Text>
        {view.meta ? (
          <Text size="meta" tone="muted" numberOfLines={1}>
            {view.meta}
          </Text>
        ) : null}
      </View>
      <Text size="meta" weight="semibold">
        {selected ? "Selected" : ""}
      </Text>
    </Pressable>
  );
}

function PendingRow({
  row,
  pending,
  onRevoke,
}: {
  row: PendingLookupRow;
  pending: boolean;
  onRevoke: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const copy = revokeConfirmCopy(row.user.name);
  return (
    <View style={{ paddingVertical: 8, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1}>{row.user.name}</Text>
          {row.user.email ? (
            <Text size="meta" tone="muted" numberOfLines={1}>
              {row.user.email}
            </Text>
          ) : null}
        </View>
        {confirming ? null : (
          <Button
            label="Revoke"
            accessibilityLabel={`Revoke invite for ${row.user.name}`}
            size="sm"
            variant="outline"
            pending={pending}
            onPress={() => setConfirming(true)}
          />
        )}
      </View>
      {confirming ? (
        <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
          <Text size="meta" weight="medium">
            {copy.title}
          </Text>
          <Text size="meta" tone="muted">
            {copy.description}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button
              label="Keep"
              size="sm"
              variant="outline"
              onPress={() => setConfirming(false)}
            />
            <Button
              label={copy.confirmLabel}
              size="sm"
              pending={pending}
              onPress={() => {
                setConfirming(false);
                onRevoke();
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Results({ lookup }: { lookup: LookupSectionProps }) {
  const { results } = lookup;
  if (results.status === "loading") {
    return <Skeleton height={48} radius={12} />;
  }
  if (results.status === "error") {
    return (
      <Text size="meta" weight="medium" accessibilityRole="alert">
        {results.message}
      </Text>
    );
  }
  if (results.value.length === 0) {
    return (
      <Text size="meta" tone="muted">
        No Users to invite match that search.
      </Text>
    );
  }
  return (
    <View>
      {results.value.map((row, index) => (
        <View key={row.id}>
          {index > 0 ? <Hairline /> : null}
          <ResultRow
            row={row}
            selected={lookup.selected.some((entry) => entry.id === row.id)}
            onToggle={() => lookup.onToggle(row)}
          />
        </View>
      ))}
    </View>
  );
}

function PendingList({ lookup }: { lookup: LookupSectionProps }) {
  const { pendingInvites } = lookup;
  if (pendingInvites.status !== "ready") {
    return null;
  }
  if (pendingInvites.value.length === 0) {
    return (
      <Text size="meta" tone="muted">
        No pending invites.
      </Text>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      <Text size="meta" tone="muted">
        Pending Lookup invites
      </Text>
      {pendingInvites.value.map((row, index) => (
        <View key={row.id}>
          {index > 0 ? <Hairline /> : null}
          <PendingRow
            row={row}
            pending={lookup.revokePendingId === row.id}
            onRevoke={() => lookup.onRevoke(row.id)}
          />
        </View>
      ))}
    </View>
  );
}

function LookupSection({ lookup }: { lookup: LookupSectionProps }) {
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>Lookup invite</SectionTitle>
      {lookup.note ? (
        <Text size="meta" tone="muted">
          {lookup.note}
        </Text>
      ) : null}
      {lookup.formError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {lookup.formError}
        </Text>
      ) : null}
      {lookup.refused && lookup.refused.length > 0 ? (
        <View style={{ gap: 4 }} accessibilityRole="alert">
          {lookup.refused.map((item) => (
            <Text
              key={`${item.name}-${item.message}`}
              size="meta"
              weight="medium"
            >
              {item.name}: {item.message}
            </Text>
          ))}
        </View>
      ) : null}
      <TextField
        label="Search Users"
        value={lookup.query}
        onChangeText={lookup.onQueryChange}
        placeholder="Name, email or phone"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!lookup.sendPending}
      />
      <Results lookup={lookup} />
      <View style={{ flexDirection: "row" }}>
        <Button
          label={sendLookupLabel(lookup.selected.length, lookup.sendPending)}
          pending={lookup.sendPending}
          disabled={lookup.selected.length === 0}
          onPress={lookup.onSend}
        />
      </View>
      <PendingList lookup={lookup} />
    </View>
  );
}

function LinkSection({ link }: { link: LinkSectionProps }) {
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>Invite link</SectionTitle>
      <Text size="meta" tone="muted">
        Each share mints a new link that works for 6 hours.
      </Text>
      {link.currentUrl ? (
        <Text size="meta" mono selectable numberOfLines={2}>
          {link.currentUrl}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label="Share link"
          pending={link.pending}
          onPress={link.onShare}
        />
        <Button
          label="Copy link"
          variant="outline"
          disabled={link.pending}
          onPress={link.onCopy}
        />
      </View>
    </View>
  );
}

export function InviteSheetView({
  visible,
  onClose,
  lookup,
  link,
}: InviteSheetViewProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Invite">
      <ScrollView
        style={{ maxHeight: SHEET_MAX_HEIGHT }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: spacing.section }}>
          {lookup ? <LookupSection lookup={lookup} /> : null}
          {link ? <LinkSection link={link} /> : null}
        </View>
      </ScrollView>
    </Sheet>
  );
}
