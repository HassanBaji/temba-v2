import { CANCEL_MATCH_ACTION } from "@repo/domain/game-copy";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import type { TournamentDetails } from "@repo/domain/tournament-details";
import {
  MERGE_DISMISS_ACTION_LABEL,
  MERGE_DRAWER_TITLE,
  MERGE_OPEN_POSITION_SR,
  MERGE_PREVIEW_LABEL,
  MERGE_PRIMARY_ACTION_LABEL,
  MERGE_SAME_POSITION_COPY,
  MERGE_SWAP_LABEL,
  MERGE_TAKES_EFFECT_COPY,
  MERGE_TAKES_EFFECT_KNOCKOUT_COPY,
  mergeCompletesTheField,
  mergeDrawerLead,
  mergeOccupantSubline,
  mergeOpenPositionLabel,
  mergeSwapHint,
  halfTeamsFromSides,
  mergeTeamEyebrow,
  type HalfTeam,
} from "@repo/domain/tournament-half-teams";
import {
  knockoutCancelDescription,
  knockoutCancelPrompt,
  draftKnockoutFirstRound,
  hasDraftKnockoutDraw,
  type KnockoutMatchPlace,
} from "@repo/domain/tournament-knockout-view";
import {
  mergeSelection,
  tournamentRoundsPlan,
} from "@repo/domain/tournament-organizer";
import {
  DRAW_AGAIN_ACTION,
  DRAW_DRAWER_TITLE,
  DRAW_EMPTY_DRAFT_COPY,
  DRAW_KNOCKOUT_ACTION,
  DRAW_KNOCKOUT_EMPTY_DRAFT_COPY,
  DRAW_POOLS_ACTION,
  POST_KNOCKOUT_DRAW_ACTION,
  POST_KNOCKOUT_DRAW_FOOTER_COPY,
  POST_POOL_DRAW_ACTION,
  POST_POOL_DRAW_FOOTER_COPY,
  draftPoolMetaLine,
  draftPoolsFromGameTeams,
  drawDrawerLead,
  hasDraftPoolDraw,
  knockoutDrawDrawerLead,
} from "@repo/domain/tournament-pool-draw";
import {
  ONE_DAY_OVERRUN_MESSAGE,
  ROUND_MEETS_COPY,
  ROUNDS_LABEL,
  SUGGESTED_ROUNDS_TAG,
  formatRoundMatchesPerTeam,
  suggestedRoundsResetLabel,
} from "@repo/domain/tournament-sizing";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { FieldError, Stepper } from "../create-game/chips";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { KnockoutTree } from "./knockout-tree";
import type { TournamentSheet } from "./use-tournament-organizer";

const SCROLL_MAX_HEIGHT = 420;

type MergeInput = {
  firstGameTeamId: string;
  secondGameTeamId: string;
  firstPosition: "left" | "right";
  secondPosition: "left" | "right";
};

export type OrganizerSheetsProps = {
  game: TournamentDetails;
  knockoutOnly: boolean;
  sheet: TournamentSheet;
  onClose: () => void;
  roundCount: number | null;
  onRoundCountChange: (roundCount: number | null) => void;
  pending: {
    merge: boolean;
    draw: boolean;
    post: boolean;
    rounds: boolean;
    walkover: boolean;
  };
  errors: {
    merge: string | null;
    draw: string | null;
    rounds: string | null;
    walkover: string | null;
  };
  onMerge: (input: MergeInput) => void;
  onDraw: () => void;
  onPost: () => void;
  onSaveRounds: () => void;
  onWalkover: (matchId: string, advancingGameTeamId?: string) => void;
};

function ActionRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 8 }}>{children}</View>;
}

function HalfTeamPick({
  team,
  label,
  selected,
  onSelect,
}: {
  team: HalfTeam;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      label={`${label}: ${team.occupant.name}`}
      variant={selected ? "default" : "outline"}
      selected={selected}
      onPress={onSelect}
    />
  );
}

function HalfTeamSummary({ team }: { team: HalfTeam }) {
  const band = team.occupant.levelBand;
  return (
    <Surface style={{ gap: 2 }}>
      <Text size="eyebrow" tone="muted">
        {mergeTeamEyebrow(team.sideIndex)}
      </Text>
      <Text weight="medium">{team.occupant.name}</Text>
      <Text size="meta" tone="muted">
        {mergeOccupantSubline(
          team.takenPosition,
          band ? displayLabelFromStoredBand(band) : null,
        )}
      </Text>
      <Text
        size="meta"
        tone="muted"
        accessibilityLabel={`${mergeOpenPositionLabel(team.openPosition)}. ${MERGE_OPEN_POSITION_SR}`}
      >
        {mergeOpenPositionLabel(team.openPosition)}
      </Text>
    </Surface>
  );
}

function MergeSheet({
  game,
  knockoutOnly,
  pending,
  error,
  onMerge,
  onClose,
}: Pick<OrganizerSheetsProps, "game" | "knockoutOnly" | "onClose"> & {
  pending: boolean;
  error: string | null;
  onMerge: OrganizerSheetsProps["onMerge"];
}) {
  const halfTeams = halfTeamsFromSides(game.sides);
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [swapped, setSwapped] = useState(false);
  const { first, second, assignment, invalidPair, canMerge } = mergeSelection({
    halfTeams,
    firstId,
    secondId,
    swapped,
  });

  const lead =
    first && second
      ? mergeDrawerLead({
          firstName: first.occupant.name,
          secondName: second.occupant.name,
          completesField: mergeCompletesTheField(halfTeams),
          teamCount: game.teamsAllowed,
        })
      : MERGE_DRAWER_TITLE;

  function merge() {
    if (!first || !second || !assignment || !canMerge) {
      return;
    }
    onMerge({
      firstGameTeamId: first.gameTeamId,
      secondGameTeamId: second.gameTeamId,
      firstPosition: assignment.firstPosition,
      secondPosition: assignment.secondPosition,
    });
  }

  return (
    <>
      <ScrollView style={{ maxHeight: SCROLL_MAX_HEIGHT }}>
        <View style={{ gap: 12 }}>
          <Text size="meta" tone="muted">
            {lead}
          </Text>
          {halfTeams.length > 2 ? (
            <View style={{ gap: 8 }}>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="First Half team"
                style={{ gap: 8 }}
              >
                {halfTeams.map((team) => (
                  <HalfTeamPick
                    key={team.gameTeamId}
                    team={team}
                    label="First"
                    selected={team.gameTeamId === first?.gameTeamId}
                    onSelect={() => {
                      setFirstId(team.gameTeamId);
                      setSwapped(false);
                      if (team.gameTeamId === second?.gameTeamId) {
                        setSecondId("");
                      }
                    }}
                  />
                ))}
              </View>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Second Half team"
                style={{ gap: 8 }}
              >
                {halfTeams
                  .filter((team) => team.gameTeamId !== first?.gameTeamId)
                  .map((team) => (
                    <HalfTeamPick
                      key={team.gameTeamId}
                      team={team}
                      label="Second"
                      selected={team.gameTeamId === second?.gameTeamId}
                      onSelect={() => {
                        setSecondId(team.gameTeamId);
                        setSwapped(false);
                      }}
                    />
                  ))}
              </View>
            </View>
          ) : null}
          {first && second ? (
            <View style={{ gap: 8 }}>
              <HalfTeamSummary team={first} />
              <HalfTeamSummary team={second} />
            </View>
          ) : null}
          {first && second && assignment ? (
            <View style={{ gap: 8 }}>
              <Text size="meta" tone="muted">
                {MERGE_PREVIEW_LABEL}
              </Text>
              <Text weight="medium">
                {assignment.firstPosition === "left"
                  ? `${first.occupant.name} and ${second.occupant.name}`
                  : `${second.occupant.name} and ${first.occupant.name}`}
              </Text>
              <Text size="meta" tone="muted">
                {mergeSwapHint(second.occupant.name, assignment.firstPosition)}
              </Text>
              <ActionRow>
                <Button
                  label={MERGE_SWAP_LABEL}
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onPress={() => setSwapped((value) => !value)}
                />
              </ActionRow>
            </View>
          ) : null}
          <FieldError
            message={
              invalidPair ? MERGE_SAME_POSITION_COPY : (error ?? undefined)
            }
          />
        </View>
      </ScrollView>
      <Button
        label={MERGE_PRIMARY_ACTION_LABEL}
        size="lg"
        pending={pending}
        disabled={!canMerge}
        onPress={merge}
      />
      <Button
        label={MERGE_DISMISS_ACTION_LABEL}
        variant="outline"
        disabled={pending}
        onPress={onClose}
      />
      <Text size="meta" tone="muted">
        {knockoutOnly
          ? MERGE_TAKES_EFFECT_KNOCKOUT_COPY
          : MERGE_TAKES_EFFECT_COPY}
      </Text>
    </>
  );
}

function DrawSheet({
  game,
  knockoutOnly,
  drawPending,
  postPending,
  error,
  onDraw,
  onPost,
}: Pick<OrganizerSheetsProps, "game" | "knockoutOnly" | "onDraw" | "onPost"> & {
  drawPending: boolean;
  postPending: boolean;
  error: string | null;
}) {
  const busy = drawPending || postPending;
  const hasDraft = knockoutOnly
    ? hasDraftKnockoutDraw(game.gameTeams)
    : hasDraftPoolDraw(game.gameTeams);
  const completeTeams = game.sides.filter(
    (side) => side.left && side.right,
  ).length;
  const firstRound =
    knockoutOnly && hasDraft
      ? draftKnockoutFirstRound({
          gameTeams: game.gameTeams,
          viewerUserId: game.viewerUserId,
        })
      : null;
  const pools =
    !knockoutOnly && hasDraft
      ? draftPoolsFromGameTeams({
          gameTeams: game.gameTeams,
          storedRoundCount: game.roundCount,
          windowStart: game.windowStart,
          windowEnd: game.windowEnd,
          matchMinutes: game.matchMinutes,
          courtNames: game.recordedCourts.map((court) => court.name),
        })
      : [];
  const empty = knockoutOnly
    ? DRAW_KNOCKOUT_EMPTY_DRAFT_COPY
    : DRAW_EMPTY_DRAFT_COPY;

  return (
    <>
      <ScrollView style={{ maxHeight: SCROLL_MAX_HEIGHT }}>
        <View style={{ gap: 16 }}>
          <Text size="meta" tone="muted">
            {knockoutOnly
              ? knockoutDrawDrawerLead(completeTeams)
              : drawDrawerLead(game.teamsAllowed)}
          </Text>
          {firstRound ? <KnockoutTree rounds={[firstRound]} /> : null}
          {pools.map((pool) => {
            const meta = draftPoolMetaLine(pool);
            return (
              <View key={pool.poolIndex} style={{ gap: 6 }}>
                <Text weight="semibold" accessibilityRole="header">
                  {pool.label}
                </Text>
                {meta ? (
                  <Text size="meta" tone="muted">
                    {meta}
                  </Text>
                ) : null}
                {pool.teams.map((team) => (
                  <Text key={team.id}>{team.name}</Text>
                ))}
              </View>
            );
          })}
          {hasDraft ? null : <Text tone="muted">{empty}</Text>}
          <FieldError message={error ?? undefined} />
        </View>
      </ScrollView>
      {hasDraft ? (
        <>
          <Button
            label={
              knockoutOnly ? POST_KNOCKOUT_DRAW_ACTION : POST_POOL_DRAW_ACTION
            }
            size="lg"
            pending={postPending}
            disabled={busy}
            onPress={onPost}
          />
          <Button
            label={DRAW_AGAIN_ACTION}
            variant="outline"
            pending={drawPending}
            disabled={busy}
            onPress={onDraw}
          />
          <Text size="meta" tone="muted">
            {knockoutOnly
              ? POST_KNOCKOUT_DRAW_FOOTER_COPY
              : POST_POOL_DRAW_FOOTER_COPY}
          </Text>
        </>
      ) : (
        <Button
          label={knockoutOnly ? DRAW_KNOCKOUT_ACTION : DRAW_POOLS_ACTION}
          size="lg"
          pending={drawPending}
          disabled={busy}
          onPress={onDraw}
        />
      )}
    </>
  );
}

function RoundsSheet({
  game,
  roundCount,
  pending,
  error,
  onChange,
  onSave,
}: {
  game: TournamentDetails;
  roundCount: number | null;
  pending: boolean;
  error: string | null;
  onChange: (roundCount: number | null) => void;
  onSave: () => void;
}) {
  const plan = tournamentRoundsPlan(game, roundCount);
  if (!plan) {
    return <Text tone="muted">The Rounds can no longer be changed.</Text>;
  }
  const { range } = plan;
  return (
    <>
      <Stepper
        label={ROUNDS_LABEL}
        value={plan.roundCount}
        unit={plan.roundCount === 1 ? "Round" : "Rounds"}
        min={range.min}
        max={range.max}
        step={1}
        onChange={(next) => onChange(next === range.suggested ? null : next)}
        decreaseLabel="Fewer Rounds"
        increaseLabel="More Rounds"
        hint={`${formatRoundMatchesPerTeam(plan.rounds)}. ${ROUND_MEETS_COPY[plan.rounds.meets]}`}
        error={error ?? undefined}
      />
      {plan.roundCount === range.suggested ? (
        <Text size="meta" tone="muted">
          {SUGGESTED_ROUNDS_TAG}
        </Text>
      ) : (
        <ActionRow>
          <Button
            label={suggestedRoundsResetLabel(range.suggested)}
            variant="outline"
            size="sm"
            onPress={() => onChange(null)}
          />
        </ActionRow>
      )}
      {plan.overruns ? (
        <Text size="meta" tone="muted">
          {ONE_DAY_OVERRUN_MESSAGE}
        </Text>
      ) : null}
      <Button
        label="Save Rounds"
        size="lg"
        pending={pending}
        onPress={onSave}
      />
    </>
  );
}

function WalkoverSheet({
  place,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  place: KnockoutMatchPlace;
  pending: boolean;
  error: string | null;
  onConfirm: (matchId: string, advancingGameTeamId?: string) => void;
  onClose: () => void;
}) {
  const [advancing, setAdvancing] = useState<string | null>(null);
  const prompt = knockoutCancelPrompt(place);
  const needsChoice = prompt.kind === "choose";

  return (
    <>
      <Text size="meta" tone="muted">
        {knockoutCancelDescription(prompt)}
      </Text>
      {prompt.kind === "choose" ? (
        <View style={{ gap: 8 }}>
          <Text weight="medium">Goes through</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Goes through"
            style={{ gap: 8 }}
          >
            {prompt.teams.map((team) => (
              <Button
                key={team.gameTeamId}
                label={team.name}
                variant={advancing === team.gameTeamId ? "default" : "outline"}
                selected={advancing === team.gameTeamId}
                disabled={pending}
                onPress={() => setAdvancing(team.gameTeamId)}
              />
            ))}
          </View>
        </View>
      ) : null}
      <FieldError message={error ?? undefined} />
      <ActionRow>
        <Button label="Keep" variant="outline" onPress={onClose} />
        <Button
          label={CANCEL_MATCH_ACTION}
          pending={pending}
          disabled={needsChoice && advancing == null}
          onPress={() =>
            place.matchId &&
            onConfirm(
              place.matchId,
              needsChoice ? (advancing ?? undefined) : undefined,
            )
          }
        />
      </ActionRow>
    </>
  );
}

export function OrganizerSheets(props: OrganizerSheetsProps) {
  const { sheet, onClose, game, knockoutOnly, pending, errors } = props;
  const place =
    typeof sheet === "object" && sheet != null ? sheet.walkover : null;
  return (
    <>
      <Sheet
        visible={sheet === "merge"}
        onClose={onClose}
        title={MERGE_DRAWER_TITLE}
      >
        {sheet === "merge" ? (
          <MergeSheet
            game={game}
            knockoutOnly={knockoutOnly}
            pending={pending.merge}
            error={errors.merge}
            onMerge={props.onMerge}
            onClose={onClose}
          />
        ) : null}
      </Sheet>
      <Sheet
        visible={sheet === "draw"}
        onClose={onClose}
        title={DRAW_DRAWER_TITLE}
      >
        {sheet === "draw" ? (
          <DrawSheet
            game={game}
            knockoutOnly={knockoutOnly}
            drawPending={pending.draw}
            postPending={pending.post}
            error={errors.draw}
            onDraw={props.onDraw}
            onPost={props.onPost}
          />
        ) : null}
      </Sheet>
      <Sheet visible={sheet === "rounds"} onClose={onClose} title="Rounds">
        {sheet === "rounds" ? (
          <RoundsSheet
            game={game}
            roundCount={props.roundCount}
            pending={pending.rounds}
            error={errors.rounds}
            onChange={props.onRoundCountChange}
            onSave={props.onSaveRounds}
          />
        ) : null}
      </Sheet>
      <Sheet
        visible={place != null}
        onClose={onClose}
        title={place ? `Cancel ${place.code}?` : undefined}
      >
        {place ? (
          <WalkoverSheet
            place={place}
            pending={pending.walkover}
            error={errors.walkover}
            onConfirm={props.onWalkover}
            onClose={onClose}
          />
        ) : null}
      </Sheet>
    </>
  );
}
