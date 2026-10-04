import { sizes, spacing } from "@repo/design-tokens";
import type {
  GroupMineRowData,
  GroupPublicRowData,
} from "@repo/domain/group-data";
import type { GroupJoinDoor } from "@repo/domain/group-join";
import { Pressable, View } from "react-native";

import type { Slot } from "../home/home-model";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { FormSlot } from "../primitives/form-slot";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  groupRowView,
  myGroupsEmptyCopy,
  publicGroupRowView,
  publicGroupsEmptyCopy,
  type GroupsTab,
  type PublicGroupRowView,
} from "./groups-model";

const NEXT_GAME_WIDTH = 52;
const MARK_WIDTH = 28;

export type GroupsViewProps = {
  tab: GroupsTab;
  onTabChange: (tab: GroupsTab) => void;
  mine: Slot<GroupMineRowData[]>;
  publicGroups: Slot<GroupPublicRowData[]>;
  apiOrigin: string;
  pendingGroupId: string | null;
  onOpen: (groupId: string) => void;
  onJoin: (groupId: string, door: GroupJoinDoor) => void;
  onRetry: () => void;
  hasCreateAccess: boolean;
  onCreate: () => void;
};

function TabButtons({
  tab,
  onTabChange,
}: Pick<GroupsViewProps, "tab" | "onTabChange">) {
  const tabs = [
    { key: "mine", label: "Mine" },
    { key: "public", label: "Public" },
  ] as const;
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {tabs.map((entry) => (
        <Button
          key={entry.key}
          label={entry.label}
          size="sm"
          variant={entry.key === tab ? "default" : "outline"}
          selected={entry.key === tab}
          onPress={() => onTabChange(entry.key)}
        />
      ))}
    </View>
  );
}

function Failure({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <Surface accessibilityRole="alert" style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {title}
      </Text>
      <Text size="meta" tone="muted">
        {message}
      </Text>
      <View style={{ flexDirection: "row", marginTop: 4 }}>
        <Button label="Try again" variant="outline" onPress={onRetry} />
      </View>
    </Surface>
  );
}

function Empty({
  title,
  description,
}: {
  title: string;
  description: string | null;
}) {
  return (
    <Surface style={{ gap: 4 }}>
      <Text size="lead" weight="semibold">
        {title}
      </Text>
      {description ? (
        <Text size="meta" tone="muted">
          {description}
        </Text>
      ) : null}
    </Surface>
  );
}

function ListSkeleton() {
  return (
    <View style={{ gap: 12 }} accessibilityLabel="Loading Groups">
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} height={76} radius={16} />
      ))}
    </View>
  );
}

function MyGroupRow({
  row,
  onOpen,
}: {
  row: ReturnType<typeof groupRowView>;
  onOpen: (groupId: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      onPress={() => onOpen(row.id)}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget + 20,
        gap: 10,
        padding: spacing.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={row.name} uri={row.imageUri} size="lg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="lead" weight="semibold" numberOfLines={1}>
            {row.name}
          </Text>
          <Text size="meta" tone="muted" numberOfLines={2}>
            {row.meta}
          </Text>
        </View>
        {row.nextGameWeekday ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ alignItems: "flex-end" }}
          >
            <Text size="title" width="expanded" weight="bold">
              {row.nextGameWeekday}
            </Text>
            <Text size="eyebrow" tone="muted" mono uppercase>
              Next Game
            </Text>
          </View>
        ) : (
          <View style={{ width: NEXT_GAME_WIDTH, height: sizes.touchTarget }}>
            <Hatch />
          </View>
        )}
      </View>
      {row.formMarks.length > 0 ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <View style={{ flexDirection: "row", gap: 4 }}>
            {row.formMarks.map((mark, index) => (
              <View key={index} style={{ width: MARK_WIDTH }}>
                <FormSlot variant={mark} compact />
              </View>
            ))}
          </View>
          <Text size="eyebrow" tone="muted" mono uppercase>
            your form here
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function PublicGroupRow({
  row,
  onOpen,
  onJoin,
  pending,
}: {
  row: PublicGroupRowView;
  pending: boolean;
  onOpen: (groupId: string) => void;
  onJoin: (groupId: string, door: GroupJoinDoor) => void;
}) {
  const door = row.door;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: spacing.surface,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[row.name, row.subtitle, row.meta]
          .filter(Boolean)
          .join(", ")}
        onPress={() => onOpen(row.id)}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          minHeight: sizes.touchTarget,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Avatar name={row.name} uri={row.imageUri} size="lg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="lead" weight="semibold" numberOfLines={1}>
            {row.name}
          </Text>
          {row.subtitle ? (
            <Text size="meta" numberOfLines={1}>
              {row.subtitle}
            </Text>
          ) : null}
          <Text size="meta" tone="muted" numberOfLines={2}>
            {row.meta}
          </Text>
        </View>
      </Pressable>
      <Button
        label={row.joinLabel}
        size="sm"
        variant={row.joinOutlined ? "outline" : "default"}
        pending={pending}
        disabled={row.joinDisabled}
        onPress={door ? () => onJoin(row.id, door) : undefined}
      />
    </View>
  );
}

function MineList(props: GroupsViewProps) {
  const { mine } = props;
  if (mine.status === "loading") {
    return <ListSkeleton />;
  }
  if (mine.status === "error") {
    return (
      <Failure
        title="Groups could not be loaded"
        message={mine.message}
        onRetry={props.onRetry}
      />
    );
  }
  if (mine.value.length === 0) {
    return <Empty {...myGroupsEmptyCopy()} />;
  }
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {mine.value.map((group, index) => (
        <View key={group.id}>
          {index > 0 ? <Hairline /> : null}
          <MyGroupRow
            row={groupRowView(group, props.apiOrigin)}
            onOpen={props.onOpen}
          />
        </View>
      ))}
    </Surface>
  );
}

function PublicList(props: GroupsViewProps) {
  const { publicGroups } = props;
  if (publicGroups.status === "loading") {
    return <ListSkeleton />;
  }
  if (publicGroups.status === "error") {
    return (
      <Failure
        title="Public Groups could not be loaded"
        message={publicGroups.message}
        onRetry={props.onRetry}
      />
    );
  }
  if (publicGroups.value.length === 0) {
    return <Empty {...publicGroupsEmptyCopy()} />;
  }
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      {publicGroups.value.map((group, index) => (
        <View key={group.id}>
          {index > 0 ? <Hairline /> : null}
          <PublicGroupRow
            row={publicGroupRowView(
              group,
              props.pendingGroupId,
              props.apiOrigin,
            )}
            pending={props.pendingGroupId === group.id}
            onOpen={props.onOpen}
            onJoin={props.onJoin}
          />
        </View>
      ))}
    </Surface>
  );
}

export function GroupsView(props: GroupsViewProps) {
  return (
    <View style={{ gap: spacing.compact }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="h1" weight="bold" accessibilityRole="header">
          Groups
        </Text>
        {props.hasCreateAccess ? (
          <Button
            label="Create Group"
            size="sm"
            variant="outline"
            onPress={props.onCreate}
          />
        ) : null}
      </View>
      <TabButtons tab={props.tab} onTabChange={props.onTabChange} />
      {props.tab === "mine" ? (
        <MineList {...props} />
      ) : (
        <PublicList {...props} />
      )}
    </View>
  );
}
