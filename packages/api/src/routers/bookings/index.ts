import { createTRPCRouter } from "#src/trpc";

import { byIdProcedure as byId } from "./byId";
import { cancelProcedure as cancel } from "./cancel";
import { confirmPaymentProcedure as confirmPayment } from "./confirmPayment";
import { createProcedure as create } from "./create";
import { listBookableVenuesProcedure as listBookableVenues } from "./listBookableVenues";
import { listMineProcedure as listMine } from "./listMine";
import { paymentStateProcedure as paymentState } from "./paymentState";
import { recordRefundProcedure as recordRefund } from "./recordRefund";
import { retryPaymentProcedure as retryPayment } from "./retryPayment";
import { settlePaymentProcedure as settlePayment } from "./settlePayment";
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
  paymentState,
  confirmPayment,
  retryPayment,
  settlePayment,
  recordRefund,
});
