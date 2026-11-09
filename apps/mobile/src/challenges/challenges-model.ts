import type {
  ChallengeBoardFilterKey,
  ChallengeBoardFilters,
  ChallengeCardInput,
} from "@repo/domain/challenge-card";
import { challengesTabQuery } from "@repo/domain/challenges-tab";

import type { RouterOutputs } from "../trpc/react";

export const CHALLENGES_PATH = "/challenges";
export const NEW_CHALLENGE_PATH = "/challenges/new";
export const MINE_PATH = `/challenges${challengesTabQuery("mine")}`;

export function challengePath(challengeId: string) {
  return `/challenges/${challengeId}`;
}

/** The detail with the Accept sheet already up. */
export function challengeAcceptPath(challengeId: string) {
  return `${challengePath(challengeId)}?accept=1`;
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
