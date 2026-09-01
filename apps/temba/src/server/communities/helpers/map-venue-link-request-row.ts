import { asVenueLinkStatus } from "~/server/communities/helpers/as-venue-link-status";
import { type VenueLinkRequest } from "~/server/communities/utils";

export function mapVenueLinkRequestRow(row: {
  id: string;
  status: string;
  createdAt: Date;
  venue: { id: string; name: string; city: string; country: string };
}): VenueLinkRequest {
  return {
    id: row.id,
    status: asVenueLinkStatus(row.status),
    createdAt: row.createdAt,
    venue: {
      id: row.venue.id,
      name: row.venue.name,
      city: row.venue.city,
      country: row.venue.country,
    },
  };
}
