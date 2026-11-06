import { radii, sizes } from "@repo/design-tokens";
import type { GroupJoinRequestData } from "@repo/domain/group-data";
import {
  groupJoinPolicyLine,
  groupJoinRequestMeta,
  groupJoinRequestsBannerText,
  groupJoinRequestsHeading,
  groupJoinRequestsSummary,
} from "@repo/domain/group-admin";
import { levelCellView } from "@repo/domain/group-home-chrome";
import { ArrowDown, Check, ChevronRight, Inbox } from "lucide-react-native";
import { forwardRef } from "react";
import { Pressable, View } from "react-native";

import { mirrorInRtl } from "../i18n/rtl";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { Notice } from "./notice";

export function JoinRequestsBanner({
  count,
  onReview,
}: {
  count: number;
  onReview: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  if (count === 0) {
    return null;
  }
  return (
    <Surface
      tone="ink"
      padded={false}
      radius="card"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingStart: 16,
        paddingEnd: 8,
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.onFocus,
        }}
      />
      <Text size="meta" weight="semibold" style={{ flex: 1 }}>
        {groupJoinRequestsBannerText(count, locale)}
      </Text>
      <Button
        label={m.group.admin.reviewLabel}
        accessibilityLabel={m.mobileGroup.requests.review}
        size="sm"
        variant="outline-inverse"
        icon={<ArrowDown size={sizes.iconRow - 2} color={colors.onFocus} />}
        iconPlacement="trailing"
        onPress={onReview}
      />
    </Surface>
  );
}

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

function RequestRow({
  request,
  communityName,
  apiOrigin,
  showLevel,
  approving,
  rejecting,
  onApprove,
  onReject,
  onOpenProfile,
}: {
  request: GroupJoinRequestData;
  communityName: string | null;
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
  const meta = groupJoinRequestMeta(request, communityName, locale);
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

export type JoinRequestsCardProps = {
  requests: Slot<GroupJoinRequestData[]>;
  requiresApproval: boolean;
  approvedToday: number;
  communityName: string | null;
  apiOrigin: string;
  showLevel: boolean;
  approvePendingId: string | null;
  rejectPendingId: string | null;
  onApprove: (request: GroupJoinRequestData) => void;
  onAskReject: (request: GroupJoinRequestData) => void;
  onOpenProfile?: (userId: string) => void;
  onChangePolicy: () => void;
  onRetry: () => void;
};

/** Sits under the members table; the banner above it jumps here. */
export const JoinRequestsCard = forwardRef<View, JoinRequestsCardProps>(
  function JoinRequestsCard(props, ref) {
    const { requests } = props;
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
          onRetry={props.onRetry}
        />
      );
    }

    if (requests.value.length === 0) {
      const summary = groupJoinRequestsSummary({
        requiresApproval: props.requiresApproval,
        approvedToday: props.approvedToday,
        locale,
      });
      return (
        <View
          ref={ref}
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
          <ChangePolicyLink onPress={props.onChangePolicy} />
        </View>
      );
    }

    return (
      <View
        ref={ref}
        style={{
          borderRadius: radii.card,
          borderWidth: hairline,
          borderColor: colors.ink,
          overflow: "hidden",
        }}
      >
        <SurfaceToneContext.Provider value="ink">
          <View
            accessibilityRole="header"
            style={{
              height: 40,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 16,
              backgroundColor: colors.focus,
            }}
          >
            <Inbox size={sizes.iconRow - 1} color={colors.onFocus} />
            <Text size="meta" weight="semibold">
              {groupJoinRequestsHeading(requests.value.length, locale)}
            </Text>
          </View>
        </SurfaceToneContext.Provider>
        {requests.value.map((request, index) => (
          <View key={request.id}>
            {index > 0 ? <Hairline /> : null}
            <RequestRow
              request={request}
              communityName={props.communityName}
              apiOrigin={props.apiOrigin}
              showLevel={props.showLevel}
              approving={props.approvePendingId === request.id}
              rejecting={props.rejectPendingId === request.id}
              onApprove={() => props.onApprove(request)}
              onReject={() => props.onAskReject(request)}
              onOpenProfile={
                props.onOpenProfile
                  ? () => props.onOpenProfile?.(request.user.id)
                  : undefined
              }
            />
          </View>
        ))}
        <Hairline />
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
            {groupJoinPolicyLine(props.requiresApproval, locale)}
          </Text>
          <ChangePolicyLink onPress={props.onChangePolicy} />
        </View>
      </View>
    );
  },
);
