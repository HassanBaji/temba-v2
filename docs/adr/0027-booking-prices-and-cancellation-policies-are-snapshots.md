# Booking prices and Cancellation policies are snapshots

**Status:** accepted. The Cancellation policy and Booking price halves are below.

## Cancellation policy

A Venue holds one Cancellation policy as jsonb on `venues.cancellation_policy`: `{ tiers: [{ hoursBefore, refundPercent }], lateRefundPercent, customerCancelUntilMinutes }`. The shape is validated by `@repo/validators/cancellation-policy`: one to five tiers or none, hours strictly decreasing, percents non-increasing and within 0–100, and a Customer cancel limit of 0–1440 minutes. `venues.updateCancellationPolicy` replaces the whole value and applies to Bookings made from then on.

A Booking copies the policy when it is made. Editing the Venue policy later never changes an existing Booking's terms.

Refunds are computed by one pure function set in `@repo/domain/booking-refund`: `refundPercentAt` walks the tiers by hours left (a cancellation exactly at a tier's boundary belongs to that earlier, higher tier and falls through to `lateRefundPercent` after the last), `refundForCancellation` turns the percent into `refundDueFils` of what was paid and an informational `cancellationChargeFils` of the price, `customerMayCancelAt` applies the app cut-off, and `describeCancellationPolicy` and `nextRefundStep` write the Customer-facing text. The Venue never collects the cancellation charge through Temba; it is shown to managers only.

## Booking price

Money is whole fils, the unit of Price per player. A Venue's `venue_pricing_rules` hold an hourly rate for a set of weekdays and a time window, Venue-wide or for one Court, capped at `PRICE_PER_PLAYER_MAX_FILS`. `venues.setPricingRules` replaces the whole set in one transaction, checks every time lies on the Venue's slot grid and refuses overlaps per scope. Overlap is checked on a circular week, so a window running past midnight (up to 06:00 the next day) conflicts with the next weekday's rule. `venues.updateBookingSettings` refuses a new slot grid while a rule is off it.

The price comes from one pure function, `@repo/domain/booking-price`. `priceForInterval` prices the whole interval at the rule that covers its start time: the Court's rule if one covers it, otherwise the Venue-wide rule, and a start covered by neither makes the interval `uncovered`. The rest of the interval does not matter, so a Booking that runs into a dearer band, or past the end of every band, keeps the rate it started on. The hourly rate times the minutes, divided by 60, is rounded to the nearest fils. A window past midnight belongs to the weekday it opened on.

The computed price is written onto the Booking as `priceFils` when it is made. Editing rules later never reprices an existing Booking.

## Considered options

1. A single cutoff hour with all-or-nothing refund. Rejected: Venues commonly offer a partial refund in a middle window, and the single value would have to be migrated later.
2. A separate policy table with versions. Rejected: the snapshot on the Booking already gives the history that matters, and a Venue has exactly one current policy.
3. Reading the Venue's current policy at cancel time. Rejected: a Customer would accept one set of terms and be cancelled under another.
4. Repricing existing Bookings when a rule changes. Rejected: the Customer agreed to a price, and refunds are computed from it.
5. Charging each minute at the rule it falls in. Replaced by the start-time rule: Venues quote a Booking by when it starts, and a pro-rata price across two bands read as an error to managers and Customers.

## Consequences

The Drizzle column is typed with a structural copy of the policy type because `@repo/db` imports no other Workspace Package; `@repo/validators` stays the source of the schema. The policy is a plain jsonb value, so a future tier shape change needs a data migration of both the Venue column and Booking snapshots.
