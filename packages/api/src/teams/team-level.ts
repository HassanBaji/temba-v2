import type { DbClient, DbTx } from "@repo/db";
import { and, inArray } from "drizzle-orm";

import { ratings, teamMembers, type GroupSportEnum } from "@repo/db";
import { levelFromMu } from "@repo/domain/level";
import { teamLevel, type TeamLevel } from "@repo/domain/team-level";

type DbOrTx = DbClient | DbTx;

type TeamForLevel = {
  id: string;
  sport: GroupSportEnum | "padel" | "football";
};

/**
 * Team Level per Team: the mean displayed Level of its rated Roster members
 * for the Team's sport, or null when none is rated. Idle inflation moves φ
 * only, so the Level is read from μ.
 */
export async function loadTeamLevels(
  database: DbOrTx,
  teams: readonly TeamForLevel[],
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
      levelFromMu(row.mu),
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
        team.sport === "football" ? "football" : "padel",
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
