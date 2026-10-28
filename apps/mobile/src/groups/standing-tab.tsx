import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import type { GroupHomeData } from "@repo/domain/group-data";
import {
  groupStandingEmptyFooter,
  groupStandingOpenSeats,
} from "@repo/domain/group-empty-states";
import { groupShowsLevel } from "@repo/domain/group-home-chrome";
import { groupStandingState } from "@repo/domain/group-join";
import { useRouter, type Href } from "expo-router";
import { Plus, UserPlus } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { hairline as hairlineWidth } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import {
  LEVEL_PROVISIONAL_NOTE,
  STANDING_NOT_MEMBER_COPY,
  standingNoResultsCopy,
  standingRowView,
  standingStats,
  type StandingRowView,
} from "./group-home-model";
import { LevelCell } from "./level-cell";
import { Notice } from "./notice";

const POSITION_WIDTH = 28;
const RECORD_WIDTH = 48;
const LEVEL_WIDTH = 56;
const SEAT_SIZE = 32;

function HeaderCell({ label, width }: { label: string; width?: number }) {
  return (
    <Text
      size="eyebrow"
      tone="muted"
      mono
      uppercase
      style={{ width, flex: width ? undefined : 1 }}
    >
      {label}
    </Text>
  );
}

function RowBody({
  row,
  linked,
  showLevel,
  leading,
}: {
  row: StandingRowView;
  linked: boolean;
  showLevel: boolean;
  leading?: React.ReactNode;
}) {
  return (
    <View
      accessible={!linked}
      accessibilityLabel={linked ? undefined : row.accessibilityLabel}
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: spacing.surface,
        paddingVertical: 12,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: POSITION_WIDTH }}
      >
        <Text size="lead" width="expanded" weight="bold">
          {row.position}
        </Text>
      </View>
      {leading}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flex: 1, minWidth: 0, gap: 2 }}
      >
        <Text weight={row.isViewer ? "semibold" : "regular"} numberOfLines={1}>
          {row.name}
        </Text>
        {row.unclaimed ? <NotOnTembaMark /> : null}
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: RECORD_WIDTH, alignItems: "flex-end" }}
      >
        <Text width="expanded">{row.record}</Text>
      </View>
      {showLevel ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ width: LEVEL_WIDTH, alignItems: "flex-end" }}
        >
          <LevelCell view={row.level} />
        </View>
      ) : null}
    </View>
  );
}

function StandingRow({
  row,
  showLevel,
  onOpen,
  avatar,
}: {
  row: StandingRowView;
  showLevel: boolean;
  onOpen?: (userId: string) => void;
  avatar?: { name: string; uri: string | null };
}) {
  const leading = avatar ? (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Avatar name={avatar.name} uri={avatar.uri} radius={radii.sm} />
    </View>
  ) : undefined;
  const body = row.isViewer ? (
    <Surface tone="ink" padded={false} radius="md">
      <RowBody
        row={row}
        linked={onOpen != null}
        showLevel={showLevel}
        leading={leading}
      />
    </Surface>
  ) : (
    <RowBody
      row={row}
      linked={onOpen != null}
      showLevel={showLevel}
      leading={leading}
    />
  );

  if (!onOpen) {
    return body;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      accessibilityHint="Opens their Player profile"
      onPress={() => onOpen(row.key)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}

function StandingTable({
  rows,
  showLevel,
  onOpenMember,
}: {
  rows: StandingRowView[];
  showLevel: boolean;
  onOpenMember?: (userId: string) => void;
}) {
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: spacing.surface,
          paddingVertical: 12,
        }}
      >
        <HeaderCell label="#" width={POSITION_WIDTH} />
        <HeaderCell label="Player" />
        <HeaderCell label="W-L" width={RECORD_WIDTH} />
        {showLevel ? <HeaderCell label="Level" width={LEVEL_WIDTH} /> : null}
      </View>
      {rows.map((row) => (
        <View key={row.key}>
          <Hairline />
          <StandingRow row={row} showLevel={showLevel} onOpen={onOpenMember} />
        </View>
      ))}
      {showLevel ? (
        <>
          <Hairline />
          <View style={{ padding: spacing.surface }}>
            <Text size="eyebrow" tone="muted" mono uppercase>
              {LEVEL_PROVISIONAL_NOTE}
            </Text>
          </View>
        </>
      ) : null}
    </Surface>
  );
}

function OpenSeatRow({
  position,
  onInvite,
}: {
  position: number;
  onInvite?: () => void;
}) {
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingLeft: spacing.surface,
        paddingRight: onInvite ? 10 : spacing.surface,
        paddingVertical: 10,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: POSITION_WIDTH }}
      >
        <Text size="lead" width="expanded" weight="bold" tone="muted">
          {position}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View style={{ width: SEAT_SIZE, height: SEAT_SIZE }}>
          <Hatch radius={radii.sm} />
        </View>
        <Text tone="muted">Open seat</Text>
      </View>
      {onInvite ? (
        <Button
          label="Invite"
          accessibilityLabel="Invite players"
          size="sm"
          variant="outline"
          icon={<Plus size={sizes.iconAction} color={colors.ink} />}
          onPress={onInvite}
        />
      ) : null}
    </View>
  );
}

/**
 * Design "Group empty states" 01: before the first result the Standing draws
 * every member at 0-0 and pads to four rows with open seats to invite into.
 */
function StandingPreview({
  data,
  apiOrigin,
  onOpenMember,
  onInvite,
}: {
  data: GroupHomeData;
  apiOrigin: string;
  onOpenMember?: (userId: string) => void;
  onInvite?: () => void;
}) {
  const leaderboard = data.standing.leaderboard;
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: spacing.surface,
          paddingVertical: 12,
        }}
      >
        <HeaderCell label="#" width={POSITION_WIDTH} />
        <HeaderCell label="Player" />
        <HeaderCell label="W-L" width={RECORD_WIDTH} />
      </View>
      {leaderboard.map((entry) => (
        <View key={entry.userId}>
          <Hairline />
          <StandingRow
            row={standingRowView(entry)}
            showLevel={false}
            onOpen={onOpenMember}
            avatar={{
              name: entry.name ?? "Member",
              uri: mediaUrl(entry.image, apiOrigin),
            }}
          />
        </View>
      ))}
      {groupStandingOpenSeats(leaderboard.length).map((position) => (
        <View key={position}>
          <Hairline />
          <OpenSeatRow position={position} onInvite={onInvite} />
        </View>
      ))}
      <Hairline />
      <View style={{ padding: spacing.surface }}>
        <Text size="meta" tone="muted">
          {groupStandingEmptyFooter(leaderboard.length)}
        </Text>
      </View>
    </Surface>
  );
}

function StatCell({
  value,
  label,
  divided,
  muted,
}: {
  value: number;
  label: string;
  divided: boolean;
  muted: boolean;
}) {
  const palette = useTonePalette();
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={{
        flex: 1,
        padding: spacing.surface,
        gap: 2,
        borderLeftWidth: divided ? hairlineWidth : 0,
        borderLeftColor: palette.rule,
      }}
    >
      <Text
        size="figure"
        width="expanded"
        weight="bold"
        tone={muted ? "muted" : "default"}
      >
        {value}
      </Text>
      <Text size="eyebrow" tone="muted" mono uppercase>
        {label}
      </Text>
    </View>
  );
}

function StatPair({
  data,
  muted = false,
}: {
  data: GroupHomeData;
  muted?: boolean;
}) {
  return (
    <Surface padded={false} style={{ flexDirection: "row" }}>
      {standingStats(data).map((stat, index) => (
        <StatCell
          key={stat.label}
          {...stat}
          divided={index > 0}
          muted={muted}
        />
      ))}
    </Surface>
  );
}

export function StandingTab({
  data,
  apiOrigin,
  onOpenMember,
  onInvite,
  createGameHref,
}: {
  data: GroupHomeData;
  apiOrigin: string;
  onOpenMember?: (userId: string) => void;
  onInvite?: () => void;
  createGameHref?: Href;
}) {
  const router = useRouter();
  const state = groupStandingState({
    isMember: data.membership != null,
    leaderboard: data.standing.leaderboard,
  });
  if (state.kind === "not-member") {
    return <Notice {...STANDING_NOT_MEMBER_COPY} />;
  }
  if (data.verified && state.showNoResultsNotice && state.showTable) {
    return (
      <View style={{ gap: spacing.compact }}>
        <StandingPreview
          data={data}
          apiOrigin={apiOrigin}
          onOpenMember={onOpenMember}
          onInvite={onInvite}
        />
        {onInvite || createGameHref ? (
          <View style={{ gap: 8 }}>
            {onInvite ? (
              <Button
                label="Invite players"
                size="lg"
                icon={<UserPlus size={sizes.iconAction} color={colors.paper} />}
                onPress={onInvite}
              />
            ) : null}
            {createGameHref ? (
              <Button
                label="Create the first Game"
                size="lg"
                variant={onInvite ? "outline" : "default"}
                onPress={() => router.push(createGameHref)}
              />
            ) : null}
          </View>
        ) : null}
        <StatPair data={data} muted />
      </View>
    );
  }
  return (
    <View style={{ gap: spacing.compact }}>
      {state.showNoResultsNotice ? (
        <Notice {...standingNoResultsCopy(data.verified)} />
      ) : null}
      {state.showTable ? (
        <>
          <StandingTable
            rows={data.standing.leaderboard.map(standingRowView)}
            showLevel={groupShowsLevel(data.sport)}
            onOpenMember={onOpenMember}
          />
          <StatPair data={data} />
        </>
      ) : null}
    </View>
  );
}
