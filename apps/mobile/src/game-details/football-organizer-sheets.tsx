import { useState } from "react";
import { View } from "react-native";

import { StepperRow } from "../create-game/chips";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import {
  NameForm,
  PriceForm,
  SaveRow,
  WindowForm,
  type OrganizerSheetsProps,
} from "./organizer-sheets";
import { FieldError } from "../create-game/chips";

export type FootballEditSection = "menu" | "name" | "window" | "price" | "cap";

export type FootballOrganizerSheetsProps = {
  section: FootballEditSection | null;
  onSection: (section: FootballEditSection | null) => void;
  game: {
    name: string | null;
    hasCustomName?: boolean;
    windowStart: Date | null;
    windowEnd: Date | null;
    pricePerPlayerFils: number | null;
    playersAllowed: number | null;
  };
  capBounds: { min: number; max: number } | null;
  now: Date;
  pending: { name: boolean; window: boolean; price: boolean; cap: boolean };
  errors: {
    name: string | null;
    window: string | null;
    price: string | null;
    cap: string | null;
  };
  onSaveName: (customName: string | null) => void;
  onSaveWindow: OrganizerSheetsProps["onSaveWindow"];
  onSavePrice: (fils: number | null) => void;
  onSaveCap: (playersAllowed: number) => void;
};

function CapForm({
  playersAllowed,
  bounds,
  pending,
  error,
  onSave,
  onBack,
}: {
  playersAllowed: number | null;
  bounds: { min: number; max: number };
  pending: boolean;
  error: string | null;
  onSave: (playersAllowed: number) => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState(() =>
    Math.min(Math.max(playersAllowed ?? bounds.min, bounds.min), bounds.max),
  );
  return (
    <>
      <StepperRow
        label="Players allowed"
        value={value}
        unit="players"
        min={bounds.min}
        max={bounds.max}
        step={1}
        onChange={setValue}
        decreaseLabel="Fewer players"
        increaseLabel="More players"
      />
      <Text size="meta" tone="muted">
        At least two full sides, and never below who has already joined.
      </Text>
      <FieldError message={error ?? undefined} />
      <SaveRow pending={pending} onSave={() => onSave(value)} onBack={onBack} />
    </>
  );
}

export function FootballOrganizerSheets(props: FootballOrganizerSheetsProps) {
  const { section, onSection, game } = props;
  const close = () => onSection(null);
  const back = () => onSection("menu");

  return (
    <>
      <Sheet visible={section === "menu"} onClose={close} title="Edit Game">
        <View style={{ gap: 8 }}>
          <Button
            label="Name"
            variant="outline"
            onPress={() => onSection("name")}
          />
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
            label="Players allowed"
            variant="outline"
            onPress={() => onSection("cap")}
          />
        </View>
      </Sheet>
      <Sheet visible={section === "name"} onClose={back} title="Name">
        {section === "name" ? (
          <NameForm
            game={game}
            pending={props.pending.name}
            error={props.errors.name}
            onSave={props.onSaveName}
            onBack={back}
          />
        ) : null}
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
      <Sheet visible={section === "cap"} onClose={back} title="Players allowed">
        {section === "cap" && props.capBounds ? (
          <CapForm
            playersAllowed={game.playersAllowed}
            bounds={props.capBounds}
            pending={props.pending.cap}
            error={props.errors.cap}
            onSave={props.onSaveCap}
            onBack={back}
          />
        ) : null}
      </Sheet>
    </>
  );
}
