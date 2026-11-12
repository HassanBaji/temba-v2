import { radii, sizes } from "@repo/design-tokens";
import type { AddPlayerFootballPosition } from "@repo/domain/add-player-by-phone";
import { addPlayerFootballRoleChoices } from "@repo/domain/add-player-by-phone";
import {
  groupMemberPositionChoices,
  type AddPlayerMode,
  type GroupMemberFootballPick,
  type GroupMemberRowView,
} from "@repo/domain/add-player-from-group";
import type { FootballRole } from "@repo/domain/football-lineup";
import { Check, Phone, UserRound, UsersRound } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { SearchField } from "../primitives/search-field";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { tonePalette } from "../primitives/tone-palette";
import { useColors } from "../theme/theme-provider";

const SEGMENT_INSET = 4;
const SEGMENT_HEIGHT = 38;
const MARK_SIZE = 24;
const AVATAR_COLUMN = 52;
const COMPACT_HEIGHT = 40;

const MODE_ICONS = {
  group: UsersRound,
  phone: Phone,
  guest: UserRound,
} as const;

/** How the Add player sheet adds: from the Group, by phone, or as a guest. */
export type AddPlayerSheetMode = AddPlayerMode | "guest";

export function AddPlayerModeSwitch({
  mode,
  modes,
  onChange,
}: {
  mode: AddPlayerSheetMode;
  modes: readonly AddPlayerSheetMode[];
  onChange: (mode: AddPlayerSheetMode) => void;
}) {
  const colors = useColors();
  const m = useMessages();
  const labels = {
    group: m.group.addPlayer.fromGroup.tab,
    phone: m.group.addPlayer.fromGroup.phoneTab,
    guest: m.group.addPlayer.guest.tab,
  };
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={m.group.addPlayer.fromGroup.modes}
      style={{
        flexDirection: "row",
        gap: SEGMENT_INSET,
        padding: SEGMENT_INSET,
        borderRadius: radii.lg,
        backgroundColor: colors.wash,
      }}
    >
      {modes.map((entry) => {
        const selected = entry === mode;
        const Icon = MODE_ICONS[entry];
        const foreground = selected ? colors.ink : colors.muted;
        return (
          <Pressable
            key={entry}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(entry)}
            hitSlop={(sizes.touchTarget - SEGMENT_HEIGHT) / 2}
            style={{
              flex: 1,
              height: SEGMENT_HEIGHT,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              borderRadius: radii.md,
              backgroundColor: selected ? colors.paper : "transparent",
            }}
          >
            <Icon size={14} color={foreground} />
            <Text size="meta" weight="semibold" style={{ color: foreground }}>
              {labels[entry]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CompactChoices<T extends string>({
  label,
  choices,
  value,
  onSelect,
  disabled,
}: {
  label: string;
  choices: { value: T; name: string; detail?: string }[];
  value: T;
  onSelect: (value: T) => void;
  disabled: boolean;
}) {
  const colors = useColors();
  const m = useMessages();
  return (
    <View style={{ gap: 6 }}>
      <Text size="eyebrow" tone="muted">
        {label}
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{ flexDirection: "row", gap: choices.length > 2 ? 4 : 6 }}
      >
        {choices.map((choice) => {
          const selected = choice.value === value;
          const tone = selected ? "ink" : "paper";
          const palette = tonePalette(tone, colors);
          return (
            <SurfaceToneContext.Provider key={choice.value} value={tone}>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel={
                  choice.detail
                    ? m.mobileHome.join.nameWithDetail(
                        choice.name,
                        choice.detail,
                      )
                    : choice.name
                }
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                onPress={() => onSelect(choice.value)}
                hitSlop={(sizes.touchTarget - COMPACT_HEIGHT) / 2}
                style={({ pressed }) => ({
                  flex: 1,
                  minWidth: 0,
                  height: COMPACT_HEIGHT,
                  paddingHorizontal: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  borderRadius: radii.md,
                  borderWidth: hairline,
                  borderColor: selected ? colors.ink : palette.rule,
                  backgroundColor: selected
                    ? colors.control
                    : pressed
                      ? palette.wash
                      : palette.background,
                })}
              >
                <Text
                  size={choices.length > 2 ? "eyebrow" : "meta"}
                  weight="semibold"
                  numberOfLines={1}
                >
                  {choice.name}
                </Text>
                {choice.detail ? (
                  <Text size="eyebrow" tone="muted" numberOfLines={1}>
                    {choice.detail}
                  </Text>
                ) : null}
              </Pressable>
            </SurfaceToneContext.Provider>
          );
        })}
      </View>
    </View>
  );
}

function PickMark({ selected }: { selected: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: MARK_SIZE,
        height: MARK_SIZE,
        borderRadius: MARK_SIZE / 2,
        borderWidth: 1.5,
        borderColor: selected ? colors.ink : colors.inputBorder,
        backgroundColor: selected ? colors.ink : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {selected ? <Check size={14} color={colors.paper} /> : null}
    </View>
  );
}

function MemberRow({
  row,
  unclaimed,
  image,
  football,
  onToggle,
  onFootballChange,
  disabled,
}: {
  row: GroupMemberRowView;
  unclaimed: boolean;
  image: string | null;
  football: GroupMemberFootballPick | null;
  onToggle: () => void;
  onFootballChange: (pick: GroupMemberFootballPick) => void;
  disabled: boolean;
}) {
  const colors = useColors();
  const m = useMessages();
  const locale = useLocale();
  const unavailable = row.status != null || row.blocked;
  return (
    <View style={{ borderBottomWidth: hairline, borderColor: colors.rule }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={m.mobileHome.join.parts(
          [row.name, row.meta, row.status].filter((part): part is string =>
            Boolean(part),
          ),
        )}
        accessibilityState={{
          checked: row.selected,
          disabled: unavailable || disabled,
        }}
        disabled={unavailable || disabled}
        onPress={onToggle}
        style={({ pressed }) => ({
          minHeight: 62,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 11,
          opacity: unavailable ? 0.45 : pressed ? 0.6 : 1,
        })}
      >
        <Avatar name={row.name} uri={image} size="lg" radius={radii.md} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text weight="semibold" numberOfLines={1}>
            {row.name}
          </Text>
          {unclaimed ? <NotOnTembaMark /> : null}
          {row.meta ? (
            <Text size="eyebrow" tone="muted" numberOfLines={1}>
              {row.meta}
            </Text>
          ) : null}
        </View>
        {row.status ? (
          <Text size="eyebrow" tone="muted">
            {row.status}
          </Text>
        ) : (
          <PickMark selected={row.selected} />
        )}
      </Pressable>
      {row.selected && football ? (
        <View
          style={{
            paddingBottom: 14,
            paddingStart: AVATAR_COLUMN,
            gap: 10,
          }}
        >
          <CompactChoices<FootballRole>
            label={m.mobileGameDetails.addPlayer.playsAs}
            choices={addPlayerFootballRoleChoices(locale)}
            value={football.role}
            onSelect={(role) => onFootballChange({ ...football, role })}
            disabled={disabled}
          />
          {football.role === "outfield" ? (
            <CompactChoices<AddPlayerFootballPosition>
              label={m.mobileGameDetails.addPlayer.preferredPosition}
              choices={groupMemberPositionChoices(locale)}
              value={football.position}
              onSelect={(position) =>
                onFootballChange({ ...football, position })
              }
              disabled={disabled}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function GroupMemberList({
  query,
  onQueryChange,
  groupLine,
  spotsLine,
  full,
  rows,
  detailsById,
  footballById,
  emptyLine,
  loading,
  error,
  onToggle,
  onFootballChange,
  disabled,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  groupLine: string | null;
  spotsLine: string | null;
  full: boolean;
  rows: GroupMemberRowView[];
  detailsById: ReadonlyMap<
    string,
    { unclaimed: boolean; image: string | null }
  >;
  /** Present on a football Game, keyed by picked member. */
  footballById: Readonly<Record<string, GroupMemberFootballPick>> | null;
  emptyLine: string | null;
  loading: boolean;
  error: string | undefined;
  onToggle: (userId: string) => void;
  onFootballChange: (userId: string, pick: GroupMemberFootballPick) => void;
  disabled: boolean;
}) {
  const m = useMessages();
  return (
    <View style={{ gap: 12 }}>
      <SearchField
        tone="wash"
        value={query}
        onChangeText={onQueryChange}
        placeholder={m.group.addPlayer.fromGroup.search}
        accessibilityLabel={m.group.addPlayer.fromGroup.search}
      />
      {groupLine ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="meta" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
            {groupLine}
          </Text>
          {spotsLine ? (
            <Text
              size="eyebrow"
              tone={full ? "default" : "muted"}
              accessibilityLiveRegion="polite"
            >
              {spotsLine}
            </Text>
          ) : null}
        </View>
      ) : null}
      {loading ? (
        <Text size="meta" tone="muted">
          {m.group.addPlayer.fromGroup.loading}
        </Text>
      ) : error ? (
        <Text size="meta" tone="muted">
          {error}
        </Text>
      ) : (
        <View>
          {rows.map((row) => {
            const details = detailsById.get(row.userId);
            return (
              <MemberRow
                key={row.userId}
                row={row}
                unclaimed={details?.unclaimed ?? false}
                image={details?.image ?? null}
                football={footballById?.[row.userId] ?? null}
                onToggle={() => onToggle(row.userId)}
                onFootballChange={(pick) => onFootballChange(row.userId, pick)}
                disabled={disabled}
              />
            );
          })}
          {emptyLine ? (
            <Text
              size="meta"
              tone="muted"
              style={{ paddingVertical: 22, textAlign: "center" }}
            >
              {emptyLine}
              {"\n"}
              {m.group.addPlayer.fromGroup.tryPhone}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
