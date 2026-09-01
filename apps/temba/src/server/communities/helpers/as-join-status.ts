import { type JoinRequestStatus } from "~/server/communities/utils";

export function asJoinStatus(status: string): JoinRequestStatus {
  return status as JoinRequestStatus;
}
