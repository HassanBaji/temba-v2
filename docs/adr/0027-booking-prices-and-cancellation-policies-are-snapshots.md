# Booking prices and Cancellation policies are snapshots

**Status:** accepted. The Cancellation policy half is below. The Booking price half is added by the pricing ticket in this same file.

## Cancellation policy

A Venue holds one Cancellation policy as jsonb on `venues.cancellation_policy`: `{ tiers: [{ hoursBefore, refundPercent }], lateRefundPercent, customerCancelUntilMinutes }`. The shape is validated by `@repo/validators/cancellation-policy`: one to five tiers or none, hours strictly decreasing, percents non-increasing and within 0–100, and a Customer cancel limit of 0–1440 minutes. `venues.updateCancellationPolicy` replaces the whole value and applies to Bookings made from then on.

A Booking copies the policy when it is made. Editing the Venue policy later never changes an existing Booking's terms.

Refunds are computed by one pure function set in `@repo/domain/booking-refund`: `refundPercentAt` walks the tiers by hours left (a cancellation exactly at a tier's boundary belongs to that earlier, higher tier and falls through to `lateRefundPercent` after the last), `refundForCancellation` turns the percent into `refundDueFils` of what was paid and an informational `cancellationChargeFils` of the price, `customerMayCancelAt` applies the app cut-off, and `describeCancellationPolicy` and `nextRefundStep` write the Customer-facing text. The Venue never collects the cancellation charge through Temba; it is shown to managers only.

## Considered options

1. A single cutoff hour with all-or-nothing refund. Rejected: Venues commonly offer a partial refund in a middle window, and the single value would have to be migrated later.
2. A separate policy table with versions. Rejected: the snapshot on the Booking already gives the history that matters, and a Venue has exactly one current policy.
3. Reading the Venue's current policy at cancel time. Rejected: a Customer would accept one set of terms and be cancelled under another.

## Consequences

The Drizzle column is typed with a structural copy of the policy type because `@repo/db` imports no other Workspace Package; `@repo/validators` stays the source of the schema. The policy is a plain jsonb value, so a future tier shape change needs a data migration of both the Venue column and Booking snapshots.
