# The Customer picks how to pay each Booking, and a Venue may refuse pay at the Venue

**Status:** accepted.

ADR-0028 chose the Payment provider once for the whole API: with `PAYMENT_PROVIDER=tap` every Booking went to one Tap hosted page (`src_all`), and the checkout could not offer paying at the Venue. Venues want both, and some want online only.

## Decision

- **A Customer picks one method at checkout.** `bookings.venueForBooking` returns `payment.methods`, the default first: the online methods, then `at_venue` when the Venue allows it. `bookings.create` takes an optional `paymentMethod` and refuses one that is not offered. `mode` stays for clients that predate the list.
- **Each online method is its own Tap hosted page.** `card` → `src_card`, `benefit` → `src_bh.benefit`, `benefitpay` → `src_benefitpay`, `apple_pay` → `src_apple_pay`. The method is stored on the Payment when it opens, so the `payment.create-charge` Job and a retry use it; `bookings.retryPayment` may switch to another offered method.
- **The API lists the merchant's methods.** Tap switches methods on per merchant account and has no call to list them, so `TAP_PAYMENT_METHODS` names them, defaulting to card, BENEFIT and BenefitPay. Apple Pay is opt-in because Tap needs the domain verified first; the mobile App hides it off iOS.
- **Pay at the Venue is the manual adapter, per Booking.** Choosing it opens a `manual` Payment and confirms the Booking at once, whatever `PAYMENT_PROVIDER` says. `venues.pay_at_venue_allowed` (default true) lets a Venue manager refuse it from the Venue console. Without an online provider it is the only way to book, so the setting applies only once online payment is on.

## Consequences

- A Booking's Payments can mix providers: a manual Payment never reaches Tap, because `confirmPayment` and `retryPayment` already key on the Payment's own provider.
- `payment_method` gains `benefitpay` and `apple_pay`. A captured charge records the method Tap reports, read from the charge's source.
- Android wallets (Google Pay, Samsung Pay) are left out until the Android App ships.
