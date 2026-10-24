import { sportLabel } from "./sport";

export type HomeStandingRow = {
  groupId: string;
  groupName: string | null;
  sport: string | null;
  position: number;
  memberCount: number;
};

export type HomeStandingRowView = {
  groupId: string;
  groupName: string;
  sportLabel: string | null;
  rank: string;
  ofCount: string;
};

export function homeStandingRowView(row: HomeStandingRow): HomeStandingRowView {
  return {
    groupId: row.groupId,
    groupName: row.groupName ?? "Group",
    sportLabel: sportLabel(row.sport),
    rank: `#${row.position}`,
    ofCount: `of ${row.memberCount}`,
  };
}
