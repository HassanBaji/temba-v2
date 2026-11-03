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

import { useLocale, useMessages } from "../i18n/locale-provider";
import { ChipGrid, FieldError, StepperRow } from "./chips";
import type { StepProps } from "./step-props";
import { HelperNote, StepSection } from "./step-section";

const PRESET_COLUMNS = FOOTBALL_SIDE_SIZE_PRESETS.length;
const SMALLEST_SIDE_SIZE = Math.min(...FOOTBALL_SIDE_SIZES);
const LARGEST_SIDE_SIZE = Math.max(...FOOTBALL_SIDE_SIZES);

export function FootballSizeFields({ state, errors, dispatch }: StepProps) {
  const { sideSize, playersAllowed } = state.draft;
  const bounds = footballPlayersAllowedBounds(sideSize);
  const locale = useLocale();
  const copy = useMessages().mobileCreateGame.football;

  return (
    <View style={{ gap: 24 }}>
      <StepSection title={copy.sideSize}>
        <ChipGrid
          label={copy.sideSize}
          columns={PRESET_COLUMNS}
          chips={FOOTBALL_SIDE_SIZE_PRESETS.map((size) => ({
            value: String(size),
            label: sideSizeLabel(size, locale),
          }))}
          isSelected={(value) => Number(value) === sideSize}
          onSelect={(value) =>
            dispatch({ kind: "setSideSize", sideSize: Number(value) })
          }
        />
        <StepperRow
          label={copy.sideSize}
          value={sideSize}
          unit={copy.aSideUnit}
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
          decreaseLabel={copy.smallerSide}
          increaseLabel={copy.largerSide}
        />
        <FieldError message={errors.sideSize} />
      </StepSection>
      <StepSection title={copy.playersAllowed}>
        <StepperRow
          label={copy.playersAllowed}
          value={playersAllowed}
          unit={copy.playersUnit}
          min={bounds.min}
          max={FOOTBALL_PLAYERS_ALLOWED_MAX}
          step={1}
          onChange={(next) =>
            dispatch({ kind: "setPlayersAllowed", playersAllowed: next })
          }
          decreaseLabel={copy.fewerPlayers}
          increaseLabel={copy.morePlayers}
        />
        <HelperNote>{copy.playersNote}</HelperNote>
        <FieldError message={errors.playersAllowed} />
      </StepSection>
    </View>
  );
}
