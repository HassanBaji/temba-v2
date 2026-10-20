import type { BookingPaymentMethod } from "@repo/domain/booking-payment";

import { onlinePaymentMethods } from "#src/payments/index";
import type { PaymentProvider } from "#src/payments/provider";

/**
 * How a Customer may pay this Venue, the default first. Online needs a real
 * Payment provider; without one, paying at the Venue is the only way to book,
 * so the Venue's choice to refuse it applies only once online payment exists.
 */
export function bookingPaymentMethods(args: {
  provider: PaymentProvider;
  payAtVenueAllowed: boolean;
}): [BookingPaymentMethod, ...BookingPaymentMethod[]] {
  if (args.provider.id === "manual") {
    return ["at_venue"];
  }
  const [first, ...rest] = onlinePaymentMethods();
  if (!first) {
    return ["at_venue"];
  }
  return args.payAtVenueAllowed
    ? [first, ...rest, "at_venue"]
    : [first, ...rest];
}
