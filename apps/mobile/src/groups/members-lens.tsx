import { colors, radii, sizes, spacing } from "@repo/design-tokens";
import type {
  GroupMemberFilterChip,
  GroupMemberSort,
  GroupMemberSortOption,
} from "@repo/domain/group-members-table";
import { ArrowDownUp, Check, ChevronDown } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  View,
  type LayoutRectangle,
} from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { isLayoutRtl } from "../i18n/rtl";
import { hairline } from "../primitives/hairline-width";
import { Hairline } from "../primitives/hairline";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { tonePalette } from "../primitives/tone-palette";

const CHIP_HEIGHT = 40;
const CHIP_HIT_SLOP = {
  top: (sizes.touchTarget - CHIP_HEIGHT) / 2,
  bottom: (sizes.touchTarget - CHIP_HEIGHT) / 2,
};
const CHIP_ICON = 15;
const SCROLL_MARGIN = spacing.surface;
const SCROLL_LEAD = 60;
const RADIO = 24;

function SortChip({ label, onPress }: { label: string; onPress: () => void }) {
  const m = useMessages();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={m.group.members.lens.sort.chip(label)}
      hitSlop={CHIP_HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => ({
        height: CHIP_HEIGHT,
        paddingLeft: 12,
        paddingRight: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: colors.ink,
        backgroundColor: pressed ? colors.wash : colors.paper,
      })}
    >
      <ArrowDownUp size={CHIP_ICON} color={colors.ink} />
      <Text numberOfLines={1}>{label}</Text>
      <ChevronDown size={CHIP_ICON} color={colors.muted} />
    </Pressable>
  );
}

function FilterChip({
  chip,
  onPress,
  onLayout,
}: {
  chip: GroupMemberFilterChip;
  onPress: () => void;
  onLayout: (frame: LayoutRectangle) => void;
}) {
  const tone = chip.selected ? "ink" : "paper";
  const palette = tonePalette(tone);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={chip.accessibilityLabel}
        accessibilityState={{ checked: chip.selected }}
        hitSlop={CHIP_HIT_SLOP}
        onPress={onPress}
        onLayout={(event) => onLayout(event.nativeEvent.layout)}
        style={({ pressed }) => ({
          height: CHIP_HEIGHT,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          borderRadius: radii.md,
          borderWidth: hairline,
          borderColor: chip.selected ? colors.ink : colors.rule,
          backgroundColor:
            pressed && !chip.selected ? palette.wash : palette.background,
        })}
      >
        <Text weight={chip.selected ? "semibold" : "regular"} numberOfLines={1}>
          {chip.label}
        </Text>
        <Text size="eyebrow" mono tone="muted">
          {chip.count}
        </Text>
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

/**
 * The chip row under search (design "Group members" 4a): the sort chip opens
 * the sort sheet, the filters are single-select with live counts. The row
 * bleeds to the screen edges and keeps the picked filter in view.
 */
export function MemberLensRow({
  sortLabel,
  filters,
  onOpenSort,
  onPickFilter,
}: {
  sortLabel: string;
  filters: GroupMemberFilterChip[];
  onOpenSort: () => void;
  onPickFilter: (chip: GroupMemberFilterChip) => void;
}) {
  const m = useMessages();
  const scroll = useRef<ScrollView>(null);
  const offset = useRef(0);
  const [viewport, setViewport] = useState(0);
  const [frames, setFrames] = useState<Record<string, LayoutRectangle>>({});
  const selected = filters.find((chip) => chip.selected);
  const selectedFrame = selected ? frames[selected.id] : undefined;

  useEffect(() => {
    if (!selectedFrame || viewport === 0 || isLayoutRtl()) {
      return;
    }
    const start = selectedFrame.x;
    const end = start + selectedFrame.width;
    const visibleStart = offset.current + SCROLL_MARGIN;
    const visibleEnd = offset.current + viewport - SCROLL_MARGIN;
    if (start < visibleStart || end > visibleEnd) {
      scroll.current?.scrollTo({
        x: Math.max(0, start - SCROLL_MARGIN - SCROLL_LEAD),
        animated: true,
      });
    }
  }, [selectedFrame, viewport]);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={(event) => {
        offset.current = event.nativeEvent.contentOffset.x;
      }}
      onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
      style={{ marginHorizontal: -spacing.surface }}
      contentContainerStyle={{
        paddingHorizontal: spacing.surface,
        gap: 8,
        alignItems: "center",
      }}
    >
      <SortChip label={sortLabel} onPress={onOpenSort} />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        style={{
          alignSelf: "stretch",
          width: hairline,
          marginVertical: 8,
          marginHorizontal: 2,
          backgroundColor: colors.rule,
        }}
      />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={m.group.members.lens.filters.label}
        style={{ flexDirection: "row", gap: 8 }}
      >
        {filters.map((chip) => (
          <FilterChip
            key={chip.id}
            chip={chip}
            onPress={() => onPickFilter(chip)}
            onLayout={(frame) =>
              setFrames((current) =>
                current[chip.id]?.x === frame.x &&
                current[chip.id]?.width === frame.width
                  ? current
                  : { ...current, [chip.id]: frame },
              )
            }
          />
        ))}
      </View>
    </ScrollView>
  );
}

function SortOption({
  option,
  onPress,
}: {
  option: GroupMemberSortOption;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: option.selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 60,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: pressed ? colors.wash : colors.paper,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold">{option.label}</Text>
        <Text size="meta" tone="muted">
          {option.hint}
        </Text>
      </View>
      {option.selected ? (
        <View
          style={{
            width: RADIO,
            height: RADIO,
            borderRadius: RADIO / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.ink,
          }}
        >
          <Check size={14} color={colors.paper} />
        </View>
      ) : (
        <View
          style={{
            width: RADIO,
            height: RADIO,
            borderRadius: RADIO / 2,
            borderWidth: hairline,
            borderColor: colors.rule,
          }}
        />
      )}
    </Pressable>
  );
}

/** Design "Group members" 4b. Picking a sort closes the sheet. */
export function MemberSortSheet({
  visible,
  options,
  onClose,
  onPick,
}: {
  visible: boolean;
  options: GroupMemberSortOption[];
  onClose: () => void;
  onPick: (sort: GroupMemberSort) => void;
}) {
  const m = useMessages().group.members.lens.sort;
  return (
    <Sheet visible={visible} onClose={onClose} title={m.title} closeButton>
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        <View accessibilityRole="radiogroup" accessibilityLabel={m.title}>
          {options.map((option, index) => (
            <View key={option.id}>
              {index > 0 ? <Hairline /> : null}
              <SortOption option={option} onPress={() => onPick(option.id)} />
            </View>
          ))}
        </View>
      </Surface>
      <Text size="eyebrow" tone="muted">
        {m.footnote}
      </Text>
    </Sheet>
  );
}
