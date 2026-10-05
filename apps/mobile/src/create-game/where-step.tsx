import { radii, spacing } from "@repo/design-tokens";
import { visibleCreateCourts } from "@repo/domain/create-game-flow";
import {
  playersInPairsLine,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
  TOURNAMENT_TEAM_STEP,
} from "@repo/domain/tournament-sizing";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";
import { ChipGrid, FieldError, Stepper } from "./chips";
import { GroupField } from "./group-field";
import type { StepProps, WhereData } from "./step-props";
import { StepSection } from "./step-section";
import { VenueField } from "./venue-field";

const COURT_COLUMNS = 5;
const COURT_CELL_HEIGHT = 44;

export function WhereStep({
  state,
  errors,
  dispatch,
  groups,
  picker,
}: StepProps & WhereData) {
  const { draft } = state;
  const tournament = state.type === "friendly_tournament";
  const [courtsExpanded, setCourtsExpanded] = useState(false);
  const pickerData = picker?.status === "ready" ? picker.value : null;
  const venues = pickerData?.venues ?? [];
  const selectedVenue = venues.find((venue) => venue.id === draft.venueId);
  const courts = selectedVenue?.courts ?? [];
  const visibleCourts = courtsExpanded
    ? courts
    : visibleCreateCourts(
        courts,
        pickerData?.recentCourtIds ?? [],
        tournament
          ? draft.courtIds
          : draft.courtId === "none"
            ? []
            : [draft.courtId],
      );
  const moreCourts = !courtsExpanded && courts.length > visibleCourts.length;

  return (
    <View style={{ gap: spacing.section }}>
      <GroupField
        groups={groups}
        groupId={draft.groupId}
        error={errors.groupId}
        onSelect={(groupId) => dispatch({ kind: "setGroup", groupId })}
      />

      <VenueField
        groupId={draft.groupId}
        picker={picker}
        venueId={draft.venueId}
        manyCourts={tournament}
        error={errors.venueId}
        onSelect={(venueId) => {
          setCourtsExpanded(false);
          dispatch({ kind: "setVenue", venueId });
        }}
      />

      {tournament ? (
        <StepSection title="Courts" note="Optional">
          {selectedVenue && courts.length > 0 ? (
            <>
              <ChipGrid
                label="Courts"
                multiple
                chips={visibleCourts.map((court) => ({
                  value: court.id,
                  label: court.name,
                }))}
                isSelected={(id) => draft.courtIds.includes(id)}
                onSelect={(courtId) =>
                  dispatch({ kind: "toggleCourt", courtId })
                }
              />
              {moreCourts ? (
                <Button
                  label={`All ${courts.length} courts`}
                  variant="outline"
                  size="sm"
                  onPress={() => setCourtsExpanded(true)}
                />
              ) : null}
            </>
          ) : (
            <Text size="meta" tone="muted">
              {selectedVenue
                ? "This Venue has no Courts."
                : "Pick a Venue to choose Courts."}
            </Text>
          )}
          <FieldError message={errors.courtIds} />
        </StepSection>
      ) : (
        <StepSection title="Court" note="Optional" locked={!selectedVenue}>
          {!selectedVenue ? (
            <CourtPlaceholders />
          ) : courts.length === 0 ? (
            <Text size="meta" tone="muted">
              This Venue has no Courts.
            </Text>
          ) : (
            <>
              <ChipGrid
                label="Court"
                columns={COURT_COLUMNS}
                chips={[
                  {
                    value: "none",
                    label: "None",
                    accessibilityLabel: "No Court",
                  },
                  ...visibleCourts.map((court) => ({
                    value: court.id,
                    label: court.name,
                  })),
                ]}
                isSelected={(id) => draft.courtId === id}
                onSelect={(courtId) => dispatch({ kind: "setCourt", courtId })}
                escape={
                  moreCourts
                    ? {
                        label: "More",
                        accessibilityLabel: `All ${courts.length} Courts`,
                        onPress: () => setCourtsExpanded(true),
                      }
                    : undefined
                }
              />
              <Text size="meta" tone="muted">
                Leave on None to settle the Court at the Venue.
              </Text>
            </>
          )}
          <FieldError message={errors.courtId} />
        </StepSection>
      )}

      {tournament ? (
        <Stepper
          label="Game teams"
          value={draft.teamCount}
          unit="Game teams"
          min={TOURNAMENT_TEAM_MIN}
          max={TOURNAMENT_TEAM_MAX}
          step={TOURNAMENT_TEAM_STEP}
          onChange={(teamCount) =>
            dispatch({ kind: "setTeamCount", teamCount })
          }
          decreaseLabel="Fewer Game teams"
          increaseLabel="More Game teams"
          hint={playersInPairsLine(draft.teamCount)}
          error={errors.teamCount}
        />
      ) : null}
    </View>
  );
}

function CourtPlaceholders() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ flexDirection: "row", gap: 8 }}
    >
      {Array.from({ length: COURT_COLUMNS }, (_, index) => (
        <View key={index} style={{ flex: 1, height: COURT_CELL_HEIGHT }}>
          <Hatch radius={radii.md} />
        </View>
      ))}
    </View>
  );
}
