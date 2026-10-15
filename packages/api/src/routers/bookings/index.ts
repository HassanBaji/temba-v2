import { createTRPCRouter } from "#src/trpc";

import { byIdProcedure as byId } from "./byId";
import { cancelProcedure as cancel } from "./cancel";
import { createProcedure as create } from "./create";
import { listBookableVenuesProcedure as listBookableVenues } from "./listBookableVenues";
import { listMineProcedure as listMine } from "./listMine";
import { venueAvailabilityProcedure as venueAvailability } from "./venueAvailability";
import { venueForBookingProcedure as venueForBooking } from "./venueForBooking";

export const bookingsRouter = createTRPCRouter({
  listBookableVenues,
  venueForBooking,
  venueAvailability,
  create,
  listMine,
  byId,
  cancel,
});
