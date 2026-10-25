import {
  FOOTBALL_SIDE_SIZE_PRESETS,
  footballSideSizeStep,
} from "@repo/domain/create-game-flow";
import {
  FOOTBALL_PLAYERS_ALLOWED_MAX,
  FOOTBALL_SIDE_SIZES,
  footballPlayersAllowedBounds,
  sideSizeLabel,
} from "@repo/domain/game-shape";
import { View } from "react-native";

import { ChipGrid, FieldError, StepperRow } from "./chips";
import type { StepProps } from "./step-props";
import { HelperNote, StepSection } from "./step-section";

const PRESET_COLUMNS = FOOTBALL_SIDE_SIZE_PRESETS.length;
const SMALLEST_SIDE_SIZE = Math.min(...FOOTBALL_SIDE_SIZES);
const LARGEST_SIDE_SIZE = Math.max(...FOOTBALL_SIDE_SIZES);

export function FootballSizeFields({ state, errors, dispatch }: StepProps) {
  const { sideSize, playersAllowed } = state.draft;
  const bounds = footballPlayersAllowedBounds(sideSize);

  return (
    <View style={{ gap: 24 }}>
      <StepSection title="Side size">
        <ChipGrid
          label="Side size"
          columns={PRESET_COLUMNS}
          chips={FOOTBALL_SIDE_SIZE_PRESETS.map((size) => ({
            value: String(size),
            label: sideSizeLabel(size),
          }))}
          isSelected={(value) => Number(value) === sideSize}
          onSelect={(value) =>
            dispatch({ kind: "setSideSize", sideSize: Number(value) })
          }
        />
        <StepperRow
          label="Side size"
          value={sideSize}
          unit="a side"
          min={SMALLEST_SIDE_SIZE}
          max={LARGEST_SIDE_SIZE}
          step={1}
          onChange={(next) =>
            dispatch({
              kind: "setSideSize",
              sideSize: footballSideSizeStep(
                sideSize,
                next > sideSize ? 1 : -1,
              ),
            })
          }
          decreaseLabel="Smaller side"
          increaseLabel="Larger side"
        />
        <FieldError message={errors.sideSize} />
      </StepSection>
      <StepSection title="Players allowed">
        <StepperRow
          label="Players allowed"
          value={playersAllowed}
          unit="players"
          min={bounds.min}
          max={FOOTBALL_PLAYERS_ALLOWED_MAX}
          step={1}
          onChange={(next) =>
            dispatch({ kind: "setPlayersAllowed", playersAllowed: next })
          }
          decreaseLabel="Fewer players"
          increaseLabel="More players"
        />
        <HelperNote>
          At least two full sides. Anyone past that is a substitute.
        </HelperNote>
        <FieldError message={errors.playersAllowed} />
      </StepSection>
    </View>
  );
}
