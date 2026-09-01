import type { CommunityRoleEnum } from "@repo/db";

import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";

type AppDb = typeof db;
type AppTx = Parameters<Parameters<AppDb["transaction"]>[0]>[0];

export type MembershipDb = AppDb | AppTx | TestDatabase;

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
