import { createTRPCRouter } from "#src/trpc";

import { byIdProcedure as byId } from "./byId";
import { cancelProcedure as cancel } from "./cancel";
import { cancelForVenueProcedure as cancelForVenue } from "./cancelForVenue";
import { confirmPaymentProcedure as confirmPayment } from "./confirmPayment";
import { createProcedure as create } from "./create";
import { createForVenueProcedure as createForVenue } from "./createForVenue";
import { listBookableVenuesProcedure as listBookableVenues } from "./listBookableVenues";
import { listForVenueProcedure as listForVenue } from "./listForVenue";
import { listMineProcedure as listMine } from "./listMine";
import { markNoShowProcedure as markNoShow } from "./markNoShow";
import { paymentStateProcedure as paymentState } from "./paymentState";
import { recordRefundProcedure as recordRefund } from "./recordRefund";
import { retryPaymentProcedure as retryPayment } from "./retryPayment";
import { searchCustomersProcedure as searchCustomers } from "./searchCustomers";
import { settlePaymentProcedure as settlePayment } from "./settlePayment";
import { updateProcedure as update } from "./update";
import { venueAvailabilityProcedure as venueAvailability } from "./venueAvailability";
import { venueForBookingProcedure as venueForBooking } from "./venueForBooking";

export const bookingsRouter = createTRPCRouter({
  listBookableVenues,
  venueForBooking,
  venueAvailability,
  create,
  listMine,
  listForVenue,
  byId,
  createForVenue,
  searchCustomers,
  update,
  cancelForVenue,
  markNoShow,
  cancel,
  paymentState,
  confirmPayment,
  retryPayment,
  settlePayment,
  recordRefund,
});
