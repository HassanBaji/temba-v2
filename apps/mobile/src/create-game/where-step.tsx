import {
  createVenueCopy,
  venueCardMeta,
  venueMatchesQuery,
  visibleCreateCourts,
} from "@repo/domain/create-game-flow";
import {
  playersInPairsLine,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
  TOURNAMENT_TEAM_STEP,
} from "@repo/domain/tournament-sizing";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { Section } from "../primitives/section";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { ChipRow, FieldError, Stepper } from "./chips";
import type { StepProps, WhereData } from "./step-props";

export function groupLabel(group: {
  name: string | null;
  communityName: string | null;
}) {
  return group.name ?? group.communityName ?? "Untitled Group";
}

export function WhereStep({
  state,
  errors,
  dispatch,
  groups,
  picker,
}: StepProps & WhereData) {
  const { draft } = state;
  const tournament = state.type === "friendly_tournament";
  const [query, setQuery] = useState("");
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
  const emptyCatalog =
    pickerData !== null && !pickerData.locked && venues.length === 0;
  const venueCopy = !draft.groupId
    ? "Pick a Group first. Venue rules depend on the Group."
    : pickerData
      ? createVenueCopy(pickerData, { manyCourts: tournament })
      : tournament
        ? "Pick a Venue. Courts are optional."
        : "Pick a Venue. Court is optional.";

  return (
    <View style={{ gap: 24 }}>
      <Section title="Group">
        <ChipRow
          label="Group"
          chips={groups.map((group) => ({
            value: group.id,
            label: groupLabel(group),
          }))}
          isSelected={(id) => id === draft.groupId}
          onSelect={(groupId) => dispatch({ kind: "setGroup", groupId })}
        />
        <FieldError message={errors.groupId} />
      </Section>

      <Section title="Venue">
        <Text size="meta" tone="muted">
          {venueCopy}
        </Text>
        {draft.groupId && picker?.status === "loading" ? (
          <Skeleton height={56} />
        ) : null}
        {picker?.status === "error" ? (
          <Text size="meta" weight="medium" accessibilityRole="alert">
            {picker.message}
          </Text>
        ) : null}
        {emptyCatalog ? (
          <Text size="meta" weight="medium">
            No Venues are available yet.
          </Text>
        ) : null}
        {pickerData?.locked && selectedVenue ? (
          <Surface accessibilityState={{ selected: true, disabled: true }}>
            <Text weight="semibold">{selectedVenue.name}</Text>
            <Text size="meta" tone="muted">
              {venueCardMeta(selectedVenue.courts.length, selectedVenue.city)}
            </Text>
          </Surface>
        ) : null}
        {pickerData && !pickerData.locked && venues.length > 0 ? (
          <>
            {venues.length > 6 ? (
              <TextField
                label="Search Venues"
                value={query}
                onChangeText={setQuery}
                autoCapitalize="none"
              />
            ) : null}
            <View style={{ gap: 8 }}>
              {venues
                .filter((venue) => venueMatchesQuery(venue, query))
                .map((venue) => (
                  <Button
                    key={venue.id}
                    label={`${venue.name} · ${venueCardMeta(venue.courts.length, venue.city)}`}
                    variant={venue.id === draft.venueId ? "default" : "outline"}
                    selected={venue.id === draft.venueId}
                    onPress={() => {
                      setCourtsExpanded(false);
                      dispatch({ kind: "setVenue", venueId: venue.id });
                    }}
                  />
                ))}
            </View>
          </>
        ) : null}
        <FieldError message={errors.venueId} />
      </Section>

      <Section title={tournament ? "Courts" : "Court"}>
        <Text size="meta" tone="muted">
          Optional
        </Text>
        {selectedVenue && courts.length > 0 ? (
          <>
            <ChipRow
              label={tournament ? "Courts" : "Court"}
              chips={[
                ...(tournament ? [] : [{ value: "none", label: "No Court" }]),
                ...visibleCourts.map((court) => ({
                  value: court.id,
                  label: court.name,
                })),
              ]}
              isSelected={(id) =>
                tournament ? draft.courtIds.includes(id) : draft.courtId === id
              }
              onSelect={(courtId) =>
                dispatch(
                  tournament
                    ? { kind: "toggleCourt", courtId }
                    : { kind: "setCourt", courtId },
                )
              }
            />
            {!courtsExpanded && courts.length > visibleCourts.length ? (
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
        <FieldError message={errors.courtId ?? errors.courtIds} />
      </Section>

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
