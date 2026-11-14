import { radii, sizes } from "@repo/design-tokens";
import type { GroupJoinRequestData } from "@repo/domain/group-data";
import {
  groupJoinPolicyLine,
  groupJoinRequestMeta,
  groupJoinRequestsSummary,
} from "@repo/domain/group-admin";
import { levelCellView } from "@repo/domain/group-home-chrome";
import { waitingCountLabel } from "@repo/domain/waiting-requests";
import { Check, ChevronRight, Inbox } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useNow } from "../games/use-now";
import type { Slot } from "../home/home-model";
import { SectionTitle } from "../home/section-title";
import { mirrorInRtl } from "../i18n/rtl";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useRequestAnswers } from "../requests/request-answers-provider";
import { RequestRowItem } from "../requests/request-card";
import {
  REQUESTS_HEADING_GAP,
  RequestsFootnote,
} from "../requests/request-sections";
import { useColors } from "../theme/theme-provider";
import { Notice } from "./notice";
import {
  groupRequestRows,
  type RequestRow,
  waitingRequestsOf,
} from "@repo/domain/request-answers";

function LevelChip({ level }: { level: GroupJoinRequestData["level"] }) {
  const m = useMessages();
  const colors = useColors();
  const view = levelCellView(level?.levelBand, level?.provisional ?? true);
  if (!view.label) {
    return null;
  }
  return (
    <View
      accessibilityLabel={
        view.kind === "provisional"
          ? m.mobileGroup.members.levelSpokenProvisional(view.label)
          : m.mobileGroup.members.levelSpoken(view.label)
      }
      style={{
        borderWidth: hairline,
        borderColor: colors.ink,
        borderRadius: radii.slot - 1,
        paddingHorizontal: 5,
        overflow: "hidden",
      }}
    >
      {view.kind === "provisional" ? (
        <Hatch bordered={false} radius={radii.slot - 1} />
      ) : null}
      <Text size="eyebrow" mono ltr>
        {view.label}
      </Text>
    </View>
  );
}

function ChangePolicyLink({ onPress }: { onPress: () => void }) {
  const m = useMessages();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.mobileGroup.requests.changeWhoCanJoin}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 30,
        justifyContent: "center",
        paddingHorizontal: 6,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text size="eyebrow" style={{ textDecorationLine: "underline" }}>
        {m.group.admin.changeLabel}
      </Text>
    </Pressable>
  );
}

function OwnRequestRow({
  request,
  apiOrigin,
  showLevel,
  approving,
  rejecting,
  onApprove,
  onReject,
  onOpenProfile,
}: {
  request: GroupJoinRequestData;
  apiOrigin: string;
  showLevel: boolean;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
  onOpenProfile?: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  const name = request.user.name ?? m.mobileGroup.unnamedUser;
  const meta = groupJoinRequestMeta(request, locale);
  const identity = (
    <>
      <Avatar name={name} uri={mediaUrl(request.user.image, apiOrigin)} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </Text>
          {showLevel ? <LevelChip level={request.level} /> : null}
        </View>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </>
  );
  return (
    <View style={{ gap: 12, padding: 16 }}>
      {onOpenProfile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={m.mobileGroup.requests.row(name, meta)}
          accessibilityHint={m.mobileGroup.opensPlayerProfile}
          onPress={onOpenProfile}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          {identity}
          <ChevronRight
            size={sizes.iconRow + 2}
            color={colors.dim}
            style={mirrorInRtl}
          />
        </Pressable>
      ) : (
        <View
          accessible
          accessibilityLabel={m.mobileGroup.requests.row(name, meta)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
        >
          {identity}
        </View>
      )}
      {request.note ? (
        <View
          style={{
            backgroundColor: colors.wash,
            borderRadius: radii.md,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Text size="meta">
            {m.mobileGroup.requests.quotedNote(request.note)}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={m.mobileGroup.requests.approve}
            accessibilityLabel={m.mobileGroup.requests.approveName(name)}
            icon={<Check size={sizes.iconRow} color={colors.onControl} />}
            pending={approving}
            disabled={rejecting}
            onPress={onApprove}
          />
        </View>
        <Button
          label={m.mobileGroup.requests.reject}
          accessibilityLabel={m.mobileGroup.requests.rejectName(name)}
          variant="outline"
          pending={rejecting}
          disabled={approving}
          onPress={onReject}
        />
      </View>
    </View>
  );
}

/**
 * A Group's join requests: the waiting list's rows for this Group, answered
 * through the shared answers, then any request only the Group's own list
 * carries, which keeps its own row.
 */
export function useGroupRequests(
  groupId: string,
  requests: Slot<GroupJoinRequestData[]>,
) {
  const answers = useRequestAnswers();
  const rows = groupRequestRows(answers.rows, groupId);
  const shown = new Set(rows.map((row) => row.request.id));
  const own =
    requests.status === "ready"
      ? requests.value.filter((request) => !shown.has(request.id))
      : [];
  return { rows, own, any: rows.length + own.length > 0 };
}

function PolicyFooter({
  requiresApproval,
  onChangePolicy,
}: {
  requiresApproval: boolean;
  onChangePolicy: () => void;
}) {
  const locale = useLocale();
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingStart: 16,
        paddingEnd: 10,
        paddingVertical: 6,
        backgroundColor: colors.surfaceRaised,
      }}
    >
      <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
        {groupJoinPolicyLine(requiresApproval, locale)}
      </Text>
      <ChangePolicyLink onPress={onChangePolicy} />
    </View>
  );
}

function BlockLink({ name, onPress }: { name: string; onPress: () => void }) {
  const m = useMessages();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.requests.blockName(name)}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        minHeight: 28,
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text size="eyebrow" tone="muted">
        {m.group.admin.reject.blockLabel}
      </Text>
    </Pressable>
  );
}

export type GroupRequestsSectionProps = {
  rows: RequestRow[];
  own: GroupJoinRequestData[];
  requiresApproval: boolean;
  apiOrigin: string;
  showLevel: boolean;
  approvePendingId: string | null;
  rejectPendingId: string | null;
  onApprove: (request: GroupJoinRequestData) => void;
  onAskReject: (request: GroupJoinRequestData) => void;
  onAskBlock: (request: { id: string; name: string }) => void;
  onOpenProfile?: (userId: string) => void;
  onChangePolicy: () => void;
};

/** Design "Requests" 3b: requests to join sit above the members, on the same card as Home. */
export function GroupRequestsSection(props: GroupRequestsSectionProps) {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const { rows, own, onOpenProfile } = props;
  const waitingCount = waitingRequestsOf(rows).length + own.length;

  function blockLink(row: RequestRow) {
    const name = row.request.user.name ?? m.mobileGroup.unnamedUser;
    return (
      <BlockLink
        name={name}
        onPress={() => props.onAskBlock({ id: row.request.id, name })}
      />
    );
  }

  return (
    <View style={{ gap: REQUESTS_HEADING_GAP }}>
      <SectionTitle
        title={m.requests.title}
        meta={waitingCountLabel(waitingCount, locale)}
      />
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {rows.map((row, index) => (
          <View key={row.request.id}>
            {index > 0 ? <Hairline /> : null}
            <RequestRowItem
              row={row}
              now={now}
              open={
                onOpenProfile
                  ? {
                      onPress: () => onOpenProfile(row.request.user.id),
                      hint: m.mobileGroup.opensPlayerProfile,
                    }
                  : undefined
              }
              cardExtra={blockLink(row)}
            />
          </View>
        ))}
        {own.map((request, index) => (
          <View key={request.id}>
            {rows.length + index > 0 ? <Hairline /> : null}
            <OwnRequestRow
              request={request}
              apiOrigin={props.apiOrigin}
              showLevel={props.showLevel}
              approving={props.approvePendingId === request.id}
              rejecting={props.rejectPendingId === request.id}
              onApprove={() => props.onApprove(request)}
              onReject={() => props.onAskReject(request)}
              onOpenProfile={
                onOpenProfile ? () => onOpenProfile(request.user.id) : undefined
              }
            />
          </View>
        ))}
        <Hairline />
        <PolicyFooter
          requiresApproval={props.requiresApproval}
          onChangePolicy={props.onChangePolicy}
        />
      </Surface>
      <RequestsFootnote>{m.requests.groupNote}</RequestsFootnote>
    </View>
  );
}

/** Under the members table while nothing waits: loading, a failed load, or who can join. */
export function JoinRequestsCard({
  requests,
  requiresApproval,
  approvedToday,
  onChangePolicy,
  onRetry,
}: {
  requests: Slot<GroupJoinRequestData[]>;
  requiresApproval: boolean;
  approvedToday: number;
  onChangePolicy: () => void;
  onRetry: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  if (requests.status === "loading") {
    return <Skeleton height={72} radius={radii.card} />;
  }
  if (requests.status === "error") {
    return (
      <Notice
        alert
        title={m.group.admin.requestsErrorTitle}
        description={requests.message}
        onRetry={onRetry}
      />
    );
  }
  const summary = groupJoinRequestsSummary({
    requiresApproval,
    approvedToday,
    locale,
  });
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingStart: 18,
        paddingEnd: 10,
        paddingVertical: 12,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
        overflow: "hidden",
      }}
    >
      <Hatch bordered={false} radius={radii.card} />
      <Inbox size={sizes.iconRow} color={colors.muted} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" weight="semibold">
          {summary.title}
        </Text>
        <Text size="eyebrow" tone="muted">
          {summary.line}
        </Text>
      </View>
      <ChangePolicyLink onPress={onChangePolicy} />
    </View>
  );
}
