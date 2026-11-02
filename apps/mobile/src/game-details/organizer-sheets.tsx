import type { GameEditSections } from "@repo/domain/game-edit-form";
import { ScrollView, View } from "react-native";

import { ChipGrid, FieldError } from "../create-game/chips";
import type { Slot } from "../home/home-model";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { GameEditSheet, type GameEditContext } from "./game-edit-sheet";
import type { GameEditController } from "./use-game-edit";

const SCROLL_MAX_HEIGHT = 420;

export type EditSection = "edit" | "court";

export type CourtChoice = { id: string; name: string; venueName: string };

export type OrganizerSheetsProps = {
  section: EditSection | null;
  onSection: (section: EditSection | null) => void;
  edit: GameEditController;
  editSections: GameEditSections;
  editContext: GameEditContext;
  courtId: string | null;
  courts: Slot<CourtChoice[]>;
  courtPending: boolean;
  courtError: string | null;
  onChooseCourt: (courtId: string | null) => void;
};

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
  const { section, onSection } = props;
  const close = () => onSection(null);

  return (
    <>
      <GameEditSheet
        visible={section === "edit"}
        onClose={close}
        edit={props.edit}
        sections={props.editSections}
        context={props.editContext}
      />
      <Sheet visible={section === "court"} onClose={close} title="Court">
        {section === "court" ? (
          <CourtForm
            courtId={props.courtId}
            courts={props.courts}
            pending={props.courtPending}
            error={props.courtError}
            onChoose={props.onChooseCourt}
            onBack={close}
          />
        ) : null}
      </Sheet>
    </>
  );
}
