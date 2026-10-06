import { radii, sizes } from "@repo/design-tokens";
import { earliestCreateDay } from "@repo/domain/create-game-flow";
import { formatDayLabel } from "@repo/domain/game-window";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import {
  SurfaceToneContext,
  useTonePalette,
} from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { tonePalette } from "../primitives/tone-palette";
import { FieldError } from "./chips";
import {
  dateSheetStartMonth,
  monthGrid,
  visibleDayOptions,
  WEEKDAY_INITIALS,
  type MonthGrid,
  type MonthGridCell,
} from "./create-days";
import { StepSection } from "./step-section";

const CELL_GAP = 6;
const DISABLED_OPACITY = 0.4;

export function DayField({
  now,
  day,
  error,
  onSelect,
}: {
  now: Date;
  day: string;
  error?: string;
  onSelect: (day: string) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const earliestDay = earliestCreateDay(now);
  const [month, setMonth] = useState(() =>
    dateSheetStartMonth(day, earliestDay),
  );
  const { cells, laterLabel } = visibleDayOptions(now, day);

  return (
    <StepSection
      title="Day"
      link={{
        label: laterLabel ?? "Later date",
        icon: Calendar,
        selected: laterLabel !== null,
        accessibilityLabel: laterLabel
          ? `Later date, ${laterLabel}`
          : "Later date",
        onPress: () => {
          setMonth(dateSheetStartMonth(day, earliestDay));
          setSheetOpen(true);
        },
      }}
    >
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Day"
        style={{ flexDirection: "row", gap: CELL_GAP }}
      >
        {cells.map((cell) => (
          <View key={cell.value} style={{ flex: 1 }}>
            <DayCell
              weekday={cell.weekday}
              date={cell.date}
              accessibilityLabel={`${cell.weekday}, ${formatDayLabel(cell.value) ?? cell.value}`}
              selected={cell.value === day}
              onPress={() => onSelect(cell.value)}
            />
          </View>
        ))}
      </View>
      <FieldError message={error} />
      <DateSheet
        visible={sheetOpen}
        grid={monthGrid(month, earliestDay)}
        day={day}
        onMonthChange={setMonth}
        onClose={() => setSheetOpen(false)}
        onPick={(next) => {
          setSheetOpen(false);
          onSelect(next);
        }}
      />
    </StepSection>
  );
}

function DayCell({
  weekday,
  date,
  accessibilityLabel,
  selected,
  onPress,
}: {
  weekday: string;
  date: number;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}) {
  const tone = selected ? "ink" : "paper";
  const palette = tonePalette(tone);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: sizes.touchTarget,
          paddingVertical: 8,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          borderWidth: hairline,
          borderColor: selected ? palette.background : palette.rule,
          backgroundColor:
            selected || !pressed ? palette.background : palette.wash,
        })}
      >
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {weekday}
        </Text>
        <Text size="lead" width="expanded">
          {date}
        </Text>
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

function DateSheet({
  visible,
  grid,
  day,
  onMonthChange,
  onClose,
  onPick,
}: {
  visible: boolean;
  grid: MonthGrid;
  day: string;
  onMonthChange: (month: string) => void;
  onClose: () => void;
  onPick: (day: string) => void;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Pick a day">
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <MonthButton
          label="Previous month"
          icon="previous"
          target={grid.previous}
          onPress={onMonthChange}
        />
        <Text
          size="lead"
          width="expanded"
          accessibilityLiveRegion="polite"
          style={{ flexShrink: 1, textAlign: "center" }}
        >
          {grid.label}
        </Text>
        <MonthButton
          label="Next month"
          icon="next"
          target={grid.next}
          onPress={onMonthChange}
        />
      </View>
      <View style={{ gap: CELL_GAP }}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={{ flexDirection: "row", gap: CELL_GAP }}
        >
          {WEEKDAY_INITIALS.map((initial, index) => (
            <Text
              key={index}
              size="eyebrow"
              mono
              tone="muted"
              style={{ flex: 1, textAlign: "center" }}
            >
              {initial}
            </Text>
          ))}
        </View>
        {grid.weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={{ flexDirection: "row", gap: CELL_GAP }}>
            {week.map((cell, cellIndex) => (
              <View
                key={cell?.value ?? `blank-${cellIndex}`}
                style={{ flex: 1 }}
              >
                {cell ? (
                  <MonthDay
                    cell={cell}
                    selected={cell.value === day}
                    onPress={() => onPick(cell.value)}
                  />
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    </Sheet>
  );
}

function MonthButton({
  label,
  icon,
  target,
  onPress,
}: {
  label: string;
  icon: "previous" | "next";
  target: string | null;
  onPress: (month: string) => void;
}) {
  const palette = useTonePalette();
  const Icon = icon === "previous" ? ChevronLeft : ChevronRight;
  return (
    <Button
      label={label}
      variant="outline"
      size="icon"
      icon={<Icon size={sizes.iconAction} color={palette.foreground} />}
      disabled={target === null}
      onPress={target === null ? undefined : () => onPress(target)}
    />
  );
}

function MonthDay({
  cell,
  selected,
  onPress,
}: {
  cell: MonthGridCell;
  selected: boolean;
  onPress: () => void;
}) {
  const tone = selected ? "ink" : "paper";
  const palette = tonePalette(tone);
  return (
    <SurfaceToneContext.Provider value={tone}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={formatDayLabel(cell.value) ?? cell.value}
        accessibilityState={{ selected, disabled: cell.disabled }}
        disabled={cell.disabled}
        onPress={onPress}
        style={({ pressed }) => ({
          height: sizes.touchTarget,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          backgroundColor:
            selected || !pressed ? palette.background : palette.wash,
          opacity: cell.disabled ? DISABLED_OPACITY : 1,
        })}
      >
        <Text weight={selected ? "semibold" : "regular"}>{cell.date}</Text>
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}
