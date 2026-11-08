import type { DbClient, DbTx } from "@repo/db";
import { and, inArray } from "drizzle-orm";

import { ratings, teamMembers, type GroupSportEnum } from "@repo/db";
import { youRatingViewAfterIdle } from "@repo/domain/idle";
import { teamLevel, type TeamLevel } from "@repo/domain/team-level";

type DbOrTx = DbClient | DbTx;

type TeamForLevel = {
  id: string;
  sport: GroupSportEnum | "padel" | "football";
};

/**
 * Team Level per Team: the mean displayed Level of its rated Roster members
 * for the Team's sport, or null when none is rated.
 */
export async function loadTeamLevels(
  database: DbOrTx,
  teams: readonly TeamForLevel[],
  now: Date = new Date(),
): Promise<Map<string, TeamLevel | null>> {
  const levels = new Map<string, TeamLevel | null>();
  if (teams.length === 0) {
    return levels;
  }
  const members = await database.query.teamMembers.findMany({
    where: inArray(
      teamMembers.teamId,
      teams.map((team) => team.id),
    ),
    columns: { teamId: true, userId: true },
  });
  const userIds = [...new Set(members.map((member) => member.userId))];
  const sports = [...new Set(teams.map((team) => team.sport))];
  const ratingRows =
    userIds.length === 0
      ? []
      : await database.query.ratings.findMany({
          where: and(
            inArray(ratings.userId, userIds),
            inArray(ratings.sport, sports),
          ),
        });
  const levelOf = new Map(
    ratingRows.map((row) => [
      `${row.userId}:${row.sport}`,
      youRatingViewAfterIdle(row, now).level,
    ]),
  );
  for (const team of teams) {
    levels.set(
      team.id,
      teamLevel(
        members
          .filter((member) => member.teamId === team.id)
          .map(
            (member) => levelOf.get(`${member.userId}:${team.sport}`) ?? null,
          ),
      ),
    );
  }
  return levels;
}

export function teamLevelInRange(
  level: TeamLevel | null,
  range: { levelMinTenths: number | null; levelMaxTenths: number | null },
) {
  if (range.levelMinTenths == null && range.levelMaxTenths == null) {
    return true;
  }
  if (!level) {
    return false;
  }
  return (
    (range.levelMinTenths == null || level.tenths >= range.levelMinTenths) &&
    (range.levelMaxTenths == null || level.tenths <= range.levelMaxTenths)
  );
}
