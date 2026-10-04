import { type JoinRequestStatus } from "#src/communities/utils";

export function asJoinStatus(status: string): JoinRequestStatus {
  return status as JoinRequestStatus;
}
