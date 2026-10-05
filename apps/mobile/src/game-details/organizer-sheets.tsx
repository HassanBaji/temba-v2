import {
  gameLevelRangeSaveInput,
  gameWindowSaveInput,
} from "@repo/domain/game-edit-save";
import {
  formatDayLabel,
  formatTimeSlotLabel,
  gameEditWindowChoices,
  splitGameWindow,
} from "@repo/domain/game-window";
import { isLevelBoundDisabled } from "@repo/domain/create-game-flow";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  tenthsToLevelBandSelectValue,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import {
  filsToMajorInput,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { ChipGrid, FieldError } from "../create-game/chips";
import type { Slot } from "../home/home-model";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

const SCROLL_MAX_HEIGHT = 420;

export type EditSection = "menu" | "window" | "price" | "level" | "court";

export type CourtChoice = { id: string; name: string; venueName: string };

export type OrganizerSheetsProps = {
  section: EditSection | null;
  onSection: (section: EditSection | null) => void;
  game: {
    windowStart: Date | null;
    windowEnd: Date | null;
    pricePerPlayerFils: number | null;
    levelMinTenths: number | null;
    levelMaxTenths: number | null;
  };
  courtId: string | null;
  courts: Slot<CourtChoice[]>;
  now: Date;
  pending: { window: boolean; price: boolean; level: boolean; court: boolean };
  errors: {
    window: string | null;
    price: string | null;
    level: string | null;
    court: string | null;
  };
  onSaveWindow: (
    input: NonNullable<ReturnType<typeof gameWindowSaveInput>>,
  ) => void;
  onSavePrice: (fils: number | null) => void;
  onSaveLevel: (input: {
    levelMinTenths: number | null;
    levelMaxTenths: number | null;
  }) => void;
  onChooseCourt: (courtId: string | null) => void;
};

function SaveRow({
  pending,
  onSave,
  onBack,
}: {
  pending: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Button label="Back" variant="outline" onPress={onBack} />
      <Button label="Save" pending={pending} onPress={onSave} />
    </View>
  );
}

function WindowForm({
  game,
  now,
  pending,
  error,
  onSave,
  onBack,
}: {
  game: OrganizerSheetsProps["game"];
  now: Date;
  pending: boolean;
  error: string | null;
  onSave: OrganizerSheetsProps["onSaveWindow"];
  onBack: () => void;
}) {
  const [draft, setDraft] = useState(() =>
    splitGameWindow(game.windowStart, game.windowEnd),
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const choices = gameEditWindowChoices(draft, now);

  function save() {
    const input = gameWindowSaveInput(
      draft.day,
      draft.startTime,
      draft.finishTime,
    );
    if (!input) {
      setLocalError("Pick a day, a start time and a finish time");
      return;
    }
    setLocalError(null);
    onSave(input);
  }

  return (
    <>
      <ScrollView style={{ maxHeight: SCROLL_MAX_HEIGHT }}>
        <View style={{ gap: 12 }}>
          <Text weight="medium">Day</Text>
          <ChipGrid
            label="Day"
            columns={3}
            chips={choices.days.map((day) => ({
              value: day,
              label: formatDayLabel(day) ?? day,
            }))}
            isSelected={(day) => day === draft.day}
            onSelect={(day) => setDraft({ ...draft, day })}
          />
          <Text weight="medium">Start time</Text>
          <ChipGrid
            label="Start time"
            columns={4}
            chips={choices.startSlots.map((slot) => ({
              value: slot,
              label: formatTimeSlotLabel(slot),
            }))}
            isSelected={(slot) => slot === draft.startTime}
            onSelect={(startTime) => setDraft({ ...draft, startTime })}
          />
          <Text weight="medium">Finish time</Text>
          <ChipGrid
            label="Finish time"
            columns={4}
            chips={choices.finishSlots.map((slot) => ({
              value: slot,
              label: formatTimeSlotLabel(slot),
            }))}
            isSelected={(slot) => slot === draft.finishTime}
            onSelect={(finishTime) => setDraft({ ...draft, finishTime })}
          />
        </View>
      </ScrollView>
      <FieldError message={localError ?? error ?? undefined} />
      <SaveRow pending={pending} onSave={save} onBack={onBack} />
    </>
  );
}

function PriceForm({
  fils,
  pending,
  error,
  onSave,
  onBack,
}: {
  fils: number | null;
  pending: boolean;
  error: string | null;
  onSave: (fils: number | null) => void;
  onBack: () => void;
}) {
  const [text, setText] = useState(() => filsToMajorInput(fils));
  const [localError, setLocalError] = useState<string | null>(null);

  function save() {
    const parsed = parseOptionalPricePerPlayerFils(text);
    if (!parsed.ok) {
      setLocalError(parsed.message);
      return;
    }
    setLocalError(null);
    onSave(parsed.fils);
  }

  return (
    <>
      <TextField
        label="Price in BD"
        value={text}
        keyboardType="decimal-pad"
        onChangeText={(next) => {
          setText(next);
          setLocalError(null);
        }}
        error={localError ?? error ?? undefined}
      />
      <Text size="meta" tone="muted">
        Leave blank to remove the price. Zero means free.
      </Text>
      <SaveRow pending={pending} onSave={save} onBack={onBack} />
    </>
  );
}

function LevelForm({
  minTenths,
  maxTenths,
  pending,
  error,
  onSave,
  onBack,
}: {
  minTenths: number | null;
  maxTenths: number | null;
  pending: boolean;
  error: string | null;
  onSave: OrganizerSheetsProps["onSaveLevel"];
  onBack: () => void;
}) {
  const [min, setMin] = useState<LevelBandSelectValue>(() =>
    tenthsToLevelBandSelectValue(minTenths),
  );
  const [max, setMax] = useState<LevelBandSelectValue>(() =>
    tenthsToLevelBandSelectValue(maxTenths),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const bands = (bound: "min" | "max") => [
    { value: LEVEL_BAND_SELECT_NONE, label: "Any", disabled: false },
    ...ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => ({
      value: band,
      label: band,
      disabled: isLevelBoundDisabled(bound, band, bound === "min" ? max : min),
    })),
  ];

  function save() {
    const result = gameLevelRangeSaveInput(min, max);
    if (!result.ok) {
      setLocalError(result.message);
      return;
    }
    setLocalError(null);
    onSave(result.input);
  }

  return (
    <>
      <Text weight="medium">Minimum Level</Text>
      <ChipGrid
        label="Minimum Level"
        chips={bands("min")}
        isSelected={(value) => value === min}
        onSelect={(value) => setMin(value)}
      />
      <Text weight="medium">Maximum Level</Text>
      <ChipGrid
        label="Maximum Level"
        chips={bands("max")}
        isSelected={(value) => value === max}
        onSelect={(value) => setMax(value)}
      />
      <FieldError message={localError ?? error ?? undefined} />
      <SaveRow pending={pending} onSave={save} onBack={onBack} />
    </>
  );
}

const NO_COURT = "none";

function CourtForm({
  courtId,
  courts,
  pending,
  error,
  onChoose,
  onBack,
}: {
  courtId: string | null;
  courts: Slot<CourtChoice[]>;
  pending: boolean;
  error: string | null;
  onChoose: (courtId: string | null) => void;
  onBack: () => void;
}) {
  if (courts.status === "loading") {
    return <Text tone="muted">Loading Courts…</Text>;
  }
  if (courts.status === "error") {
    return <FieldError message={courts.message} />;
  }
  return (
    <>
      <ScrollView style={{ maxHeight: SCROLL_MAX_HEIGHT }}>
        <ChipGrid
          label="Court"
          chips={[
            { value: NO_COURT, label: "No Court", disabled: pending },
            ...courts.value.map((court) => ({
              value: court.id,
              label: `${court.venueName}: ${court.name}`,
              disabled: pending,
            })),
          ]}
          isSelected={(value) => value === (courtId ?? NO_COURT)}
          onSelect={(value) => onChoose(value === NO_COURT ? null : value)}
        />
      </ScrollView>
      <FieldError message={error ?? undefined} />
      <View style={{ flexDirection: "row" }}>
        <Button label="Done" variant="outline" onPress={onBack} />
      </View>
    </>
  );
}

export function OrganizerSheets(props: OrganizerSheetsProps) {
  const { section, onSection, game } = props;
  const close = () => onSection(null);
  const back = () => onSection("menu");

  return (
    <>
      <Sheet visible={section === "menu"} onClose={close} title="Edit Game">
        <Button
          label="Window"
          variant="outline"
          onPress={() => onSection("window")}
        />
        <Button
          label="Price per player"
          variant="outline"
          onPress={() => onSection("price")}
        />
        <Button
          label="Level range"
          variant="outline"
          onPress={() => onSection("level")}
        />
      </Sheet>
      <Sheet visible={section === "window"} onClose={back} title="Window">
        {section === "window" ? (
          <WindowForm
            game={game}
            now={props.now}
            pending={props.pending.window}
            error={props.errors.window}
            onSave={props.onSaveWindow}
            onBack={back}
          />
        ) : null}
      </Sheet>
      <Sheet
        visible={section === "price"}
        onClose={back}
        title="Price per player"
      >
        {section === "price" ? (
          <PriceForm
            fils={game.pricePerPlayerFils}
            pending={props.pending.price}
            error={props.errors.price}
            onSave={props.onSavePrice}
            onBack={back}
          />
        ) : null}
      </Sheet>
      <Sheet visible={section === "level"} onClose={back} title="Level range">
        {section === "level" ? (
          <LevelForm
            minTenths={game.levelMinTenths}
            maxTenths={game.levelMaxTenths}
            pending={props.pending.level}
            error={props.errors.level}
            onSave={props.onSaveLevel}
            onBack={back}
          />
        ) : null}
      </Sheet>
      <Sheet visible={section === "court"} onClose={close} title="Court">
        {section === "court" ? (
          <CourtForm
            courtId={props.courtId}
            courts={props.courts}
            pending={props.pending.court}
            error={props.errors.court}
            onChoose={props.onChooseCourt}
            onBack={close}
          />
        ) : null}
      </Sheet>
    </>
  );
}
