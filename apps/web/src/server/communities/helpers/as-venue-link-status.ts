import { type VenueLinkStatus } from "~/server/communities/utils";

export function asVenueLinkStatus(status: string): VenueLinkStatus {
  return status as VenueLinkStatus;
}
