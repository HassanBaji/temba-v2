import { TRPCError } from "@trpc/server";

import type {
  AdmitResult,
  LeaveResult,
} from "~/server/community-membership/utils";

export function throwAdmitFailure(
  result: AdmitResult,
  alreadyMemberMessage = "You are already a Member of this Community",
) {
  if (result.ok) {
    return;
  }
  if (result.reason === "already_member") {
    throw new TRPCError({
      code: "CONFLICT",
      message: alreadyMemberMessage,
    });
  }
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Community not found",
  });
}

export function throwLeaveFailure(result: LeaveResult) {
  if (result.ok) {
    return;
  }
  if (result.reason === "linked_team_seat") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Leave Community is refused while you sit on a Team linked to this Community. Unlink or dissolve the Team first.",
    });
  }
  if (result.reason === "last_owner") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The last Owner cannot leave until another Owner is promoted",
    });
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "You are not a member of this Community",
  });
}
