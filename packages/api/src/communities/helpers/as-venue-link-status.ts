import { type VenueLinkStatus } from "#src/communities/utils";

export function asVenueLinkStatus(status: string): VenueLinkStatus {
  return status as VenueLinkStatus;
}
