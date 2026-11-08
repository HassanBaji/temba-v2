import type {
  ChallengeBoardFilterKey,
  ChallengeBoardFilters,
  ChallengeCardInput,
} from "@repo/domain/challenge-card";
import {
  rematchChallengeDraft,
  type ChallengeDraft,
  type ChallengeDraftTeam,
} from "@repo/domain/challenge-form";
import { challengesTabQuery } from "@repo/domain/challenges-tab";

import type { RouterOutputs } from "../trpc/react";

export const CHALLENGES_PATH = "/challenges";
export const NEW_CHALLENGE_PATH = "/challenges/new";
export const MINE_PATH = `/challenges${challengesTabQuery("mine")}`;

export function challengePath(challengeId: string) {
  return `/challenges/${challengeId}`;
}

/** Rematch: the post form for this Team, pre-filled from the Team it played. */
export function rematchPath(teamId: string, opponentTeamId: string) {
  return `${NEW_CHALLENGE_PATH}?${new URLSearchParams({ team: teamId, rematch: opponentTeamId }).toString()}`;
}

export type OpenChallenge =
  RouterOutputs["challenges"]["listOpen"]["challenges"][number];

export type MineChallenge =
  RouterOutputs["challenges"]["listMine"]["posted"][number];

export type MineItem = RouterOutputs["challenges"]["listMine"]["items"][number];

export type ChallengeDetail = RouterOutputs["challenges"]["byId"];

export type PostOptions = RouterOutputs["challenges"]["listPostOptions"];

export type PostableTeam = PostOptions["teams"][number];

/** A listed Challenge, or the detail's open state, as the card reads it. */
export function challengeCardInput(
  challenge: Pick<
    OpenChallenge,
    | "id"
    | "sport"
    | "sideSize"
    | "levelMinTenths"
    | "levelMaxTenths"
    | "days"
    | "timings"
    | "exactSlots"
    | "venues"
    | "note"
    | "proposalCount"
    | "expiresAt"
    | "team"
    | "viewer"
    | "nudgedTeam"
    | "viewerTeamIsNudged"
  >,
): ChallengeCardInput {
  return {
    id: challenge.id,
    sport: challenge.sport,
    sideSize: challenge.sideSize,
    levelMinTenths: challenge.levelMinTenths,
    levelMaxTenths: challenge.levelMaxTenths,
    days: challenge.days,
    timings: challenge.timings,
    exactSlots: challenge.exactSlots,
    venues: challenge.venues,
    note: challenge.note,
    proposalCount: challenge.proposalCount,
    expiresAt: challenge.expiresAt,
    team: challenge.team,
    viewer: { ineligibleReason: challenge.viewer.ineligibleReason },
    nudgedTeam: challenge.nudgedTeam,
    viewerTeamIsNudged: challenge.viewerTeamIsNudged,
  };
}

/** The review card: the Team's own Challenge, as other Teams will see it. */
export function previewCardInput(
  team: PostableTeam,
  draft: {
    sideSize: number | null;
    levelMinTenths: number | null;
    levelMaxTenths: number | null;
    days: string[];
    timings: string[];
    exactSlots: Date[];
    venues: { name: string }[];
    note: string | null;
  },
  expiresAt: Date,
): ChallengeCardInput {
  return {
    id: "preview",
    sport: team.sport,
    ...draft,
    proposalCount: 0,
    expiresAt,
    team: {
      displayName: team.displayName,
      rosterCount: team.rosterCount,
      teamLevel: team.teamLevel,
      members: team.members,
    },
    viewer: { ineligibleReason: null },
  };
}

export function draftTeam(team: PostableTeam): ChallengeDraftTeam {
  return {
    id: team.id,
    displayName: team.displayName,
    sport: team.sport,
    rosterCount: team.rosterCount,
  };
}

/**
 * The post form a Rematch opens on, or null when that Team cannot post now
 * or has not played the other one.
 */
export function rematchDraft(
  options: PostOptions,
  teamId: string,
  opponentTeamId: string,
): ChallengeDraft | null {
  const team = options.teams.find((candidate) => candidate.id === teamId);
  const opponent = team?.playedTeams.find(
    (candidate) => candidate.id === opponentTeamId,
  );
  if (!team || !opponent) {
    return null;
  }
  return rematchChallengeDraft(
    draftTeam(team),
    opponent,
    options.venues[team.sport].map((venue) => venue.id),
  );
}

/** Picking the selected value again clears the filter. */
export function setBoardFilter(
  filters: ChallengeBoardFilters,
  key: ChallengeBoardFilterKey,
  value: string | null,
): ChallengeBoardFilters {
  return {
    ...filters,
    [key]: filters[key] === value ? null : value,
  };
}

/** Add a value to a multi-pick, or take it out when it is already there. */
export function toggleValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}
