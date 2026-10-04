import type { DbClient, DbTx } from "@repo/db";
import type { CommunityRoleEnum } from "@repo/db";

export type MembershipDb = DbClient | DbTx;

export type MembershipRole = `${CommunityRoleEnum}`;

export type AdmitArgs = {
  communityId: string;
  userId: string;
  role: MembershipRole;
};

export type AdmitResult =
  | {
      ok: true;
      id: string;
      communityId: string;
      userId: string;
      role: MembershipRole;
    }
  | { ok: false; reason: "not_found" | "already_member" };

export type LeaveArgs = {
  communityId: string;
  userId: string;
};

export type LeaveResult =
  | { ok: true; communityId: string; userId: string }
  | {
      ok: false;
      reason: "not_a_member" | "linked_team_seat" | "last_owner";
    };
