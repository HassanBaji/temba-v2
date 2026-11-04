import { radii, spacing } from "@repo/design-tokens";
import { visibleCreateCourts } from "@repo/domain/create-game-flow";
import { courtFace } from "@repo/domain/court-sport-copy";
import {
  playersInPairsLine,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
  TOURNAMENT_TEAM_STEP,
} from "@repo/domain/tournament-sizing";
import { useState } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";
import { ChipGrid, FieldError, StepperRow } from "./chips";
import { GroupField } from "./group-field";
import type { StepProps, WhereData } from "./step-props";
import { HelperNote, StepSection } from "./step-section";
import { VenueField } from "./venue-field";

const COURT_COLUMNS = 3;
const TOURNAMENT_COURT_COLUMNS = 3;
const COURT_CELL_HEIGHT = 44;

export function WhereStep({
  state,
  errors,
  dispatch,
  groups,
  picker,
  initialVenueSheetQuery,
}: StepProps & WhereData & { initialVenueSheetQuery?: string }) {
  const { draft } = state;
  const tournament = state.type === "friendly_tournament";
  const locale = useLocale();
  const m = useMessages();
  const copy = m.mobileCreateGame;
  const pitch = courtFace(state.sport) === "pitch";
  const courtTitle = pitch ? copy.court.pitchTitle : copy.court.courtTitle;
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
        onSelect={(groupId) =>
          dispatch({
            kind: "setGroup",
            groupId,
            sport: groups.find((group) => group.id === groupId)?.sport,
          })
        }
      />

      <VenueField
        groupId={draft.groupId}
        picker={picker}
        venueId={draft.venueId}
        manyCourts={tournament}
        sport={state.sport}
        error={errors.venueId}
        initialSheetQuery={initialVenueSheetQuery}
        onSelect={(venueId) => {
          setCourtsExpanded(false);
          dispatch({ kind: "setVenue", venueId });
        }}
      />

      {tournament ? (
        <StepSection
          title={copy.court.inUse}
          note={copy.court.setsSchedule}
          locked={!selectedVenue}
        >
          {!selectedVenue ? (
            <CourtPlaceholders columns={TOURNAMENT_COURT_COLUMNS} />
          ) : courts.length === 0 ? (
            <Text size="meta" tone="muted">
              {copy.court.venueHasNoCourts}
            </Text>
          ) : (
            <ChipGrid
              label={copy.court.inUse}
              multiple
              columns={TOURNAMENT_COURT_COLUMNS}
              chips={visibleCourts.map((court) => ({
                value: court.id,
                label: court.name,
              }))}
              isSelected={(id) => draft.courtIds.includes(id)}
              onSelect={(courtId) => dispatch({ kind: "toggleCourt", courtId })}
              escape={
                moreCourts
                  ? {
                      label: m.common.more,
                      accessibilityLabel: copy.court.allCourts(courts.length),
                      onPress: () => setCourtsExpanded(true),
                    }
                  : undefined
              }
            />
          )}
          <FieldError message={errors.courtIds} />
        </StepSection>
      ) : (
        <StepSection
          title={courtTitle}
          note={m.common.optional}
          locked={!selectedVenue}
        >
          {!selectedVenue ? (
            <CourtPlaceholders columns={COURT_COLUMNS} />
          ) : courts.length === 0 ? (
            <Text size="meta" tone="muted">
              {pitch
                ? copy.court.venueHasNoPitches
                : copy.court.venueHasNoCourts}
            </Text>
          ) : (
            <>
              <ChipGrid
                label={courtTitle}
                columns={COURT_COLUMNS}
                chips={[
                  {
                    value: "none",
                    label: m.common.none,
                    accessibilityLabel: pitch
                      ? copy.court.noPitch
                      : copy.court.noCourt,
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
                        label: m.common.more,
                        accessibilityLabel: pitch
                          ? copy.court.allPitches(courts.length)
                          : copy.court.allCourts(courts.length),
                        onPress: () => setCourtsExpanded(true),
                      }
                    : undefined
                }
              />
              <Text size="meta" tone="muted">
                {pitch
                  ? copy.court.settlePitchAtVenue
                  : copy.court.settleCourtAtVenue}
              </Text>
            </>
          )}
          <FieldError message={errors.courtId} />
        </StepSection>
      )}

      {tournament ? (
        <StepSection title={copy.teams.title} note={copy.teams.note}>
          <StepperRow
            label={copy.teams.title}
            value={draft.teamCount}
            unit={copy.teams.unit}
            min={TOURNAMENT_TEAM_MIN}
            max={TOURNAMENT_TEAM_MAX}
            step={TOURNAMENT_TEAM_STEP}
            onChange={(teamCount) =>
              dispatch({ kind: "setTeamCount", teamCount })
            }
            decreaseLabel={copy.teams.fewer}
            increaseLabel={copy.teams.more}
          />
          <HelperNote>{playersInPairsLine(draft.teamCount, locale)}</HelperNote>
          <FieldError message={errors.teamCount} />
        </StepSection>
      ) : null}
    </View>
  );
}

function CourtPlaceholders({ columns }: { columns: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ flexDirection: "row", gap: 8 }}
    >
      {Array.from({ length: columns }, (_, index) => (
        <View key={index} style={{ flex: 1, height: COURT_CELL_HEIGHT }}>
          <Hatch radius={radii.md} />
        </View>
      ))}
    </View>
  );
}
