Status: decisions taken on payment, Booking Games, cancellation policy, Guests, non-members and the grid (section 8); awaiting the design import (section 7) and the payment provider choice (ADR-0028, ticket 16)

Tickets: not yet created in Linear. Section 9 lists them for the user to create in order.

Design source: a Claude Design project ("Booking flow.dc.html" plus "support.js", https://claude.ai/design/p/fea56e1b-5966-4cbb-981f-15fe74a0c7fc). It could not be fetched while this spec was written. When imported, place it at `.scratch/design/booking-flow/Booking flow.dc.html` and `.scratch/design/booking-flow/support.js` (the same shape as `.scratch/design/register-with-partner/`), then resolve section 7 and update the "Design source" line with the artboard ids.

Related specs and decisions that stay in force:

- `.scratch/venues/spec.md` and ADR-0007: Venue is the physical facility, Court is a named surface, Operator curates the catalog, Venue link is a Community's association.
- `.scratch/game-create-venue-court/spec.md`: every Game has one Venue chosen at create; a Friendly game's Match may point at one Court.
- `.scratch/game-price-per-player/spec.md` and the Fix track: money is stored in fils and shown in BD; `@repo/domain/price-per-player` has the parse and format helpers.
- `.scratch/mobile-and-api-server/spec.md`: Package boundaries, one product timezone (`Asia/Bahrain`), the locked mobile design system (section 4), Venue administration is web only.
- `.scratch/group-creator-ui-gate/spec.md`: Create Game stays hidden behind `groupCreator` everywhere except on a Booking (section 2.4 amends this for Booking Games only).
- ADR-0009 (Glicko-2) and ADR-0011 (Match result confirmation): unchanged for rated Games; section 2.5 adds the unrated exception.
- `.cursor/rules/api-one-endpoint-per-file.mdc`: one procedure per file, no service layers, shared modules only for rules used by two or more doors.

# Booking and facility management

## 1. Problem statement, actors, goals and non-goals

### Problem

A Venue exists in Temba only as a catalog entry: a name, a place and a list of Courts that Games point at. The people who run a Venue have no seat in the product. They cannot say when the Venue is open, what a Court costs, who has booked it, who has paid, or how full it is. Players can create a Game at a Venue, but nothing reserves the Court, so a Game at 19:00 on Court 2 is a wish, not a booking. Venue staff keep the real calendar somewhere else and the two never meet.

### Actors

| Actor | Who | Surface |
| --- | --- | --- |
| **Venue manager** (the "facility owner") | A User granted management of one or more Venues. Not a Community role and not an Operator. | Web App only (`apps/web`), a new Manage area. |
| **Operator** | Temba staff, unchanged. Curates Venues and Courts, and now grants and revokes Venue managers. Implicitly a Venue manager of every Venue. | Web App, the existing Venues area. |
| **Customer** | Any authenticated User seen from a Venue: someone who holds or has held a Booking there. A Customer need not belong to any Community or Group (decided, Q3). | Mobile App (`apps/mobile`). The same doors also work from the Web App but no web Customer screens are planned in this spec. |
| **Guest** | A person without a Temba account for whom a Venue manager records a Booking by name and phone (decided, Q5). | Only ever created from the Manage area. |

### Goals

1. A Venue manager runs their Venue from the web: Venue details, Courts, Opening hours, Closures, Pricing rules, Cancellation policy, Booking settings.
2. A Venue manager sees and controls every Booking at the Venue: calendar and list, create for a Customer or Guest, edit, cancel, mark no-show, settle and refund payments.
3. A Venue manager sees their Customers: list, profile, Booking history.
4. A Venue manager gets reports: occupancy, revenue (booked, collected, refunded), Bookings over time, Customer metrics, over a chosen date range.
5. A Customer on mobile browses Venues accepting bookings, sees Court availability by day, books a slot at a known price, pays (or is told to pay at the Venue until a provider lands), sees the cancellation policy before and after, cancels with the refund the policy gives, and creates a Game attached to a Booking.
6. No Court is ever double-booked.
7. Payment is modelled from day one (decided, Q1): a Payment ledger, a provider adapter boundary in `@repo/api`, and a manual "pay at Venue" adapter as the only implementation until the provider is chosen.

### Non-goals (this spec)

- Choosing the payment provider. ADR-0028 lists candidates and stays "pending"; ticket 16 is the integration placeholder.
- Membership pricing, passes, packages, credits, discounts, promo codes.
- Recurring Bookings (every Tuesday at 19:00).
- Coaching sessions and the leftover `coach` / `coaching_session` tables. They keep pointing at Venue (ADR-0007) and are untouched.
- Equipment rental, lighting surcharges, add-ons, VAT lines.
- Reminders and push notifications (Phase 7 owns push). In-app Notifications for booking events are in scope, section 2.8.
- Reserving a Court automatically when a Game is created through the existing create flow (Q6).
- Court-level opening hours. Hours are per Venue; per-Court unavailability is a Closure.
- A public, signed-out booking page on the web.
- Multi-sport pricing. Venues are padel in the shipped UI; the schema does not block football.
- Overnight Opening hours past 06:00, split-second precision, or a timezone other than the product timezone.
- Payouts to Venues, platform commission, invoices. The ledger records what was collected and refunded; who holds the money is the provider's and the business's concern.

## 2. Domain model

### 2.1 Entities

**Venue** (changed). Gains Booking settings and a Cancellation policy:

| Field | Meaning | Default |
| --- | --- | --- |
| `acceptingBookings` | The one switch that lists the Venue on the mobile Venues list and opens the Customer doors. | `false` |
| `slotMinutes` | The grid step for Booking start times: 30 or 60 (decided, Q8). | 30 |
| `durationOptionsMinutes` | The durations a Customer may book, each a multiple of `slotMinutes`, 30–240 (decided, Q8). | `[60, 90]` |
| `bookingHorizonDays` | How far ahead a Customer may book, 1–90. | 14 |
| `minLeadMinutes` | The earliest a Customer may book before a start, 0–1440. | 60 |
| `cancellationPolicy` | Section 2.3. Replaces the single cutoff. | one tier: full refund until 24 h, nothing after |
| `description`, `bookingNotes` | Short text shown on the mobile Venue page (description) and on the confirm step (notes such as "reception is on the first floor"). | null |

A Venue is **bookable** on a given day only if `acceptingBookings` is on, the Venue is not Soft-archived, it has at least one Court, Opening hours for that weekday, and a Pricing rule covering the slot. Everything else is derived from that.

**Court** (unchanged schema). A Court with an upcoming occupying Booking (2.2) cannot be deleted.

**Venue manager** (new). A row `(venueId, userId)` granted by an Operator. A User may manage many Venues. A Venue may have many managers. Managers cannot grant other managers in v1 (Q4).

**Opening hours** (new). Per Venue and weekday (0 = Sunday … 6 = Saturday, in the product timezone): `opensAtMinutes` and `closesAtMinutes` from midnight. Several windows per weekday are allowed (a split day) and must not overlap. `closesAtMinutes` may run to 1800 (06:00 the next day); such a window still belongs to the weekday it opened on. Both must be multiples of `slotMinutes`. No rows for a weekday means closed.

**Closure** (new). A dated block when Bookings cannot be made: `startsAt`, `endsAt` (instants), optional `courtId` (null = whole Venue), `reason` (free text, shown to Customers as "Unavailable" only). Existing Bookings inside a new Closure are not cancelled automatically; the Manage area lists them so the manager decides (section 5).

**Pricing rule** (new). Per Venue: optional `courtId` (null = every Court), `weekdays` (set of 0–6), `startMinutes`, `endMinutes` (same wall-clock convention as Opening hours), `hourlyRateFils`, `label` ("Peak", "Off-peak"). Rules on the same scope (Venue-wide, or the same Court) must not overlap in weekday × time. A Court rule beats a Venue-wide rule. A Booking's price is the sum over its interval of rate × covered minutes / 60, rounded to the nearest fils; if any minute of the interval has no rule, that slot is not bookable and the Manage calendar shows it as "no price". The simplest setup is one Venue-wide rule for all weekdays 00:00–24:00 (the "base rate").

**Cancellation policy** (new, per Venue, section 2.3). Tiers of "refund this percent when cancelled at least N hours before the start", a percent after the last tier, and how close to the start a Customer may still cancel at all. Snapshotted onto every Booking when it is made.

**Slot** (derived, never stored). One Court, one start on the grid, one duration, one price, bookable or not. Computed from Opening hours, Closures, Pricing rules, existing occupying Bookings, the Venue's settings and "now". The same pure function serves the Customer availability door, the manager calendar and the Booking create check.

**Booking** (new). The reservation of one Court for one interval.

| Field | Meaning |
| --- | --- |
| `venueId`, `courtId` | The Court must belong to the Venue. Immutable after create except through the manager edit door, which re-checks everything. |
| `userId` or `guestName` + `guestPhone` | Exactly one of: a Customer, or a Guest. |
| `startsAt`, `endsAt` | Instants. `endsAt - startsAt` is one of the Venue's duration options at create time. |
| `status` | `pending_payment`, `confirmed`, `cancelled`, `no_show`, `expired` (2.2). |
| `holdExpiresAt` | While `pending_payment`: the instant the reservation lapses if payment has not settled or been deferred. Null otherwise. |
| `source` | `app` (the Customer booked) or `venue` (a manager booked). |
| `priceFils` | Snapshot at create or at the last manager edit. Changing a Pricing rule later never reprices an existing Booking. |
| `cancellationPolicy` | Snapshot of the Venue's policy at create (jsonb). Policy edits never change an existing Booking's terms. |
| `paymentStatus` | Summary of the Payment ledger, kept in step in the same transaction: `pending`, `held`, `paid`, `failed`, `refunded`, `partially_refunded`, `waived` (2.4). |
| `refundDueFils`, `cancellationChargeFils` | Set on cancel from the policy and the amount paid (2.3). |
| `cancelledAt`, `cancelledByUserId`, `cancelledBy` (`customer` / `venue`), `cancelReason` | Cancellation audit. |
| `noShowAt` | When a manager marked it. |
| `gameId` | At most one Game, unique, on delete set null (section 2.5). |
| `managerNotes` | Free text visible to managers only. |
| `createdByUserId` | The User who created the row (the Customer, or the manager). |

**Payment** (new, section 2.4). One row per attempt to collect a Booking's price, and the refund against it. The ledger is the truth; `bookings.paymentStatus` is its summary.

**Customer** (derived, not a table). A User, as seen from one Venue: `User` joined to that Venue's Bookings. Customer metrics (first Booking, count, no-shows, paid and refunded totals, last visit) are computed. There is no Customer row to create or delete. A Guest is not a Customer row either; Guest Bookings are matched by phone when a manager searches.

**Booking Game** (section 2.5). A groupless, unrated Friendly game created from a Booking by its holder.

### 2.2 Booking states and transitions

```text
   Customer create ──► pending_payment ──(payment settled, held,     ──► confirmed
                            │             or deferred to the Venue)        │
                            │                                              │
                   hold lapses │ Customer cancels                 ┌─────────┼──────────────┐
                            ▼                            cancel by    cancel by         mark no-show
                        expired / cancelled              Customer     manager           (manager, after startsAt)
                                                         (policy)     (full refund)            │
   Manager create ──────────────────────────► confirmed      ▼            ▼                   ▼
                                                          cancelled    cancelled            no_show
```

- **Occupying** statuses, which block the Court: `confirmed`, and `pending_payment` while `holdExpiresAt > now`. `cancelled`, `no_show` and `expired` never block. A lapsed `pending_payment` row stops blocking the moment its hold passes; a sweep inside the reserve module marks it `expired` when it is next seen, so nothing needs a scheduler.
- `PAYMENT_HOLD_MINUTES = 10` is a product constant in `@repo/domain/booking-payment`, not a Venue setting.
- Manager-made Bookings skip `pending_payment`: they are `confirmed` with a Payment row the manager settles whenever the money arrives.
- "Upcoming", "In progress" and "Past" are derived from `status = confirmed` and the clock, like Finished Game. Nothing writes a `completed` status.
- `cancelled`, `no_show` and `expired` are terminal. A manager who marked no-show by mistake creates a new Booking; there is no undo (same stance as Level override).
- A Customer cancelling a `pending_payment` Booking gets `cancelled` with no refund arithmetic (nothing was taken).

### 2.3 Cancellation policy and refunds (decided, Q2)

Data shape, stored as jsonb on `venues.cancellation_policy` and snapshotted to `bookings.cancellation_policy`, validated by `@repo/validators/cancellation-policy` (shared by the manager door, the web form and the mobile display types):

```ts
type CancellationPolicy = {
  tiers: { hoursBefore: number; refundPercent: number }[]; // 1–5 tiers, hoursBefore strictly decreasing, refundPercent 0–100 non-increasing
  lateRefundPercent: number;      // 0–100, applies when fewer than the last tier's hours remain
  customerCancelUntilMinutes: number; // 0–1440; a Customer may not cancel in the app when fewer minutes than this remain before startsAt
};
```

- "Full refund until 24 h, none after" is `{ tiers: [{ 24, 100 }], lateRefundPercent: 0, customerCancelUntilMinutes: 0 }`. "100 % until 48 h, 50 % until 12 h, nothing after" is two tiers with `lateRefundPercent: 0`. "Always free" is `tiers: [], lateRefundPercent: 100`.
- The pure function lives in `@repo/domain/booking-refund.ts`:
  - `refundPercentAt(policy, startsAt, now)` → `number` (walks tiers by `startsAt - now` in hours; falls through to `lateRefundPercent`).
  - `refundForCancellation({ policy, startsAt, now, priceFils, paidFils })` → `{ percent, refundDueFils, cancellationChargeFils, tierIndex | null }`. `refundDueFils = round(paidFils × percent / 100)`. `cancellationChargeFils = priceFils − round(priceFils × percent / 100)`: what the Venue keeps or is owed; it is informational when nothing was paid.
  - `customerMayCancelAt(policy, startsAt, now)` → `boolean` from `customerCancelUntilMinutes`.
  - `describeCancellationPolicy(policy)` → ordered lines for Customers, and `nextRefundStep(policy, startsAt, now)` → the deadline and percent the mobile details screen shows ("Full refund until Tue 18:00, then 50 %").
- **Customer cancel**: allowed while `customerMayCancelAt`; refund per policy; `refundDueFils` and `cancellationChargeFils` are written on the Booking; the Payment ledger moves per 2.4.
- **Venue cancel**: always a full refund of whatever was paid, regardless of policy (`percent = 100`). A Venue that cancels does not keep money.
- **No-show**: no refund; `paymentStatus` is untouched (a paid no-show stays paid; an unpaid one stays pending and the Customer profile shows it as owed).
- **Manager edit** of time or Court keeps the Booking's policy snapshot and price unless the manager types a new price; the refund arithmetic uses the current `priceFils`.
- The manager edits the policy on the settings page with a tier editor; the Customer sees it as text on the Venue screen, on the confirm step, and on Booking details with the live next step.

### 2.4 Payment model and the provider boundary (decided, Q1)

**Payment** table (`booking_payments`), one row per attempt:

| Field | Meaning |
| --- | --- |
| `bookingId` | FK, cascade. A Booking may have several rows (a failed attempt, then a successful one). At most one row is `held` or `paid` at a time. |
| `provider` | `manual` or the provider id once chosen (enum, additive). |
| `method` | `cash`, `card`, `online`, `transfer`, null until known. |
| `status` | `pending` (expected, not settled: manual "pay at Venue", or a provider intent awaiting the client step), `held` (provider authorised, not captured), `paid`, `failed`, `refunded`, `partially_refunded`, `waived`. |
| `amountFils` | What this attempt collects; equals the Booking price at the time. |
| `providerReference` | The intent / charge id, or the manager's note ("receipt 1042") for manual. |
| `failureReason` | From the provider. |
| `settledByUserId`, `settledAt` | Who settled it (a manager for manual; the system user id is null and `provider` tells) and when. |
| `refundedFils`, `refundReference`, `refundedByUserId`, `refundedAt` | Refund against this attempt. `partially_refunded` when `0 < refundedFils < amountFils`. |

`bookings.paymentStatus` = the status of the latest non-failed Payment row, or `pending` when there is none. The shared module `packages/api/src/bookings/payments.ts` is the only writer of both.

**Provider boundary** in `packages/api/src/payments/`:

```ts
// provider.ts
export type PaymentBegin =
  | { kind: "deferred" }                                   // manual: pay at the Venue; Booking confirms now
  | { kind: "client_action"; reference: string; clientSecret: string } // provider: the client completes the step
  | { kind: "held"; reference: string }                    // provider authorised server-side
  | { kind: "failed"; reason: string };

export interface PaymentProvider {
  id: "manual" | string;
  begin(args: { bookingId: string; amountFils: number; customer: { userId: string; email?: string } }): Promise<PaymentBegin>;
  confirm(args: { reference: string }): Promise<{ status: "paid" | "held" | "failed"; reason?: string }>;
  capture?(args: { reference: string }): Promise<void>;     // for providers that hold then capture
  refund(args: { reference: string; amountFils: number }): Promise<{ reference: string } | { failed: string }>;
  verifyWebhook?(raw: { headers: Headers; body: string }): Promise<{ reference: string; status: "paid" | "held" | "failed" | "refunded" } | null>;
}
```

- `manual.ts` implements `begin → { kind: "deferred" }`, `confirm` is never called for it, `refund` records nothing with the provider and returns `{ reference: "manual" }`; settling and refunding happen through the manager door.
- `index.ts` exports `paymentProvider()` chosen by `PAYMENT_PROVIDER` (default `manual`). `apps/api` does not know which provider runs; it mounts one webhook route in ticket 16 that calls `@repo/api`'s `handlePaymentWebhook`, which is a no-op for `manual`.
- `@repo/api` stays host-neutral: no provider SDK is imported in this spec; ticket 16 adds it behind the interface.

**Customer flow** (`bookings.create` then `bookings.confirmPayment`):

1. `create` reserves the Court as `pending_payment` with `holdExpiresAt = now + 10 min`, inserts a `pending` Payment row and calls `provider.begin`.
   - `deferred` (manual): Booking becomes `confirmed` in the same transaction, Payment stays `pending` (due at the Venue). The response says `payment: { kind: "deferred" }` and the mobile confirm step shows "Pay at the Venue".
   - `client_action`: the response carries `clientSecret`; the Booking stays `pending_payment`.
   - `held`: Booking `confirmed`, Payment `held`; capture is the provider's rule (ticket 16).
   - `failed`: the Booking is `cancelled` immediately and the Slot is free.
2. `confirmPayment({ bookingId })` (only after `client_action`): calls `provider.confirm`; `paid` or `held` → Booking `confirmed`; `failed` → Payment `failed`, Booking stays `pending_payment` until the hold lapses so the Customer may retry with `retryPayment`. A webhook may do the same transition first; both paths are idempotent on `providerReference`.
3. A Customer cancel on a `paid` or `held` Booking: compute the refund (2.3); for `manual`, write `refundDueFils` and leave the ledger for the manager to record; for a provider, call `provider.refund` for `refundDueFils` (or release the hold when `held`) and write the result.
4. A Venue cancel: full refund the same way.

**Manager view**: every Booking shows the ledger (attempts, status, method, reference, who settled, refunds). Actions: `settlePayment` (mark paid with method and reference; waive; mark failed for manual), `recordRefund` (manual: the manager returned money by hand; provider: triggers `provider.refund` for a typed amount up to what is refundable). Reports read collected from `settledAt` and refunds from `refundedAt`.

### 2.5 Booking Game: groupless and unrated (decided, Q7)

Anyone who holds a Booking may create a Game for it. The `groupCreator` gate and the organizable-Group requirement do not apply to a Booking Game.

**Groupless, not an auto-created Loose Group.** The invariant "a new Game must belong to a Group" exists because Standing, Group membership as the join gate, and Organizer resolution all hang off the Group. For a Booking Game none of those is wanted: there is no Standing (it is unrated), the join gate is the holder's invitation, and the Organizer is the holder. The code already handles `groupId = null` on every path checked: `isGameOrganizer` and `gameAdminUserIds` fall back to `createdBy`, `userPassesJoinGate` admits only the creator and invited Users on a private groupless Game, `canViewGame` admits seated and waitlisted Users, `listMyGames` lists private Games the viewer created or sits on, `load-group-standing` skips `groupId = null`, `weightForGame` treats it as loose, and the Game Invite doors (Lookup invite, Invite link, `/g/{code}`) do not touch a Group. An auto-created Loose Group would instead invent a social entity nobody asked for, show up on the Groups hub and Public Groups list rules, carry a Standing of one, and collide with the `groupCreator` gate that hides Loose Group creation. So: **a Booking Game is a groupless Game**, and the glossary sentence becomes "A new Game must belong to a Group, except a Booking Game, which has none." ADR-0029 records it.

**Unrated.** `games.rated boolean not null default true`; `bookings.createGame` writes `false`. The rule is one pure function, `@repo/domain/game-rating-eligibility.ts`:

```ts
export function gameRates(game: { rated: boolean; cancelledAt: Date | null }): boolean
```

Call sites that must check it:

- `packages/api/src/ratings/apply-rated-match.ts` (`applyRatedMatch`): return before loading slots when `!gameRates(liveGame)`. No rating events, no `ratings` row touch, no Level movement. This is the only writer of rating state, so it is the one guard that matters.
- `packages/api/src/standing/load-group-standing.ts`: already skips `groupId = null`; add `rated` to the Game columns and skip `!rated` too, so a future rated-but-groupless or unrated-Group Game cannot leak in.
- `packages/api/src/routers/games/byId.ts`: `ratingImpact` is `null` and the payload gains `rated: false`; the Rating impact block is replaced by an "Unrated" line on web and mobile.
- `packages/api/src/routers/games/completeMatch.ts`, `confirmMatchResult.ts`: unchanged; they call `applyRatedMatch`, which now returns early. Match result confirmation (ADR-0011) still applies: it is about the score being right, not about rating.
- `packages/api/src/notifications/notify-game-finished.ts`: unchanged; `gameAdminUserIds` gives the holder.
- `packages/api/src/stats/completed-matches.ts` and `@repo/domain/{completed-matches,win-rate,win-streak,player-profile-matches}`: a completed Match on an unrated Game still counts as played, won, lost or drawn in Last 10, All time stats, Win streak and win rate. "Unranked" means no Level and no Standing, not that the Match did not happen. Last 10 rows carry `rated: false` so the card can mark it.
- Americano, Friendly tournament, Set bounds, Walkover: unaffected; `rated` defaults true for every existing and newly created Game outside `bookings.createGame`.

**The Game itself.** Friendly game, individual registration, `isPublic = false`, `groupId = null`, `venueId`, the Match's `courtId`, `windowStart` and `windowEnd` from the Booking, `playersAllowed = 4`, `pricePerPlayerFils` optional (display only, as today), Game Level range optional. The holder is the Organizer (`createdBy`) and may cancel, kick, edit the window within the Booking (section 4.2), add Sets and complete the Match. Players join through the existing Invite doors: the holder sends Lookup invites or shares the Invite link (`/g/{code}`). The holder is **not** auto-seated, consistent with the existing create flow; the mobile screen lands on Game details where the holder takes a Position like anyone else (7.8 may change this).

**Links and cascades.** A Booking points at one Game; a Game is pointed at by at most one Booking (`bookings.game_id` unique). Cancelling a Booking that has a live Game cancels the Game too, in the same transaction, through the existing Game cancel rule, so seated Users hear about it through the existing Game notification path. Cancelling the Game keeps the Booking: the Court stays reserved for the holder. A manager edit that moves the Booking's time or Court while a live Game exists is refused with a message to cancel the Game first. Guest Bookings and `pending_payment` Bookings cannot have a Game. Only a Friendly game fits one Court slot; Americano and Friendly tournament are not created from a Booking.

### 2.6 Invariants

1. **No double booking.** For one Court, no two occupying Bookings (2.2) overlap in time. Enforced inside the create and edit transactions: take `pg_advisory_xact_lock(hashtext(courtId))`, expire lapsed holds, then run the overlap query, then insert. Additionally, if the PGlite harness loads `btree_gist`, add an exclusion constraint `EXCLUDE USING gist (court_id WITH =, tsrange(starts_at, ends_at) WITH &&) WHERE (status IN ('confirmed', 'pending_payment'))` in the same migration as the table as defence in depth (a lapsed hold then needs the sweep before a new insert; the reserve module does that first). If PGlite cannot load it, skip the constraint and record that in ADR-0026.
2. **Start on the grid.** `startsAt` falls on the Venue's `slotMinutes` grid measured from the opening-day's midnight in the product timezone, and the interval lies inside one Opening hours window.
3. **Not in a Closure.** No minute of the interval overlaps a Closure for the whole Venue or for that Court.
4. **Priced.** Every minute of the interval is covered by a Pricing rule, or the caller is a manager who typed a price (the manager create and edit doors accept an explicit `priceFils` override; the Customer door never does).
5. **Customer limits.** A Customer books only when the Venue is bookable, `startsAt >= now + minLeadMinutes`, and `startsAt < startOfProductDay(now) + bookingHorizonDays` days. Managers ignore lead and horizon but not the past: a manager cannot create a Booking whose `endsAt` is in the past.
6. **Customer cancel window.** A Customer cancels only while `customerMayCancelAt(policy, startsAt, now)`. A manager cancels any `confirmed` or `pending_payment` Booking before `endsAt`. After `endsAt` the only move is no-show, and only from `confirmed`.
7. **Exactly one holder.** `userId` xor (`guestName` and `guestPhone`).
8. **Court belongs to Venue.** Checked on create and edit.
9. **Soft-archive.** A Soft-archived Venue is not bookable, refuses manager create and edit, still allows cancel, no-show, settle and refund, and still shows in the Manage area as history.
10. **Snapshots.** Changing Pricing rules, Opening hours, Closures or the Cancellation policy never changes an existing Booking's `priceFils`, `startsAt`, `endsAt` or `cancellationPolicy`.
11. **Ledger consistency.** `bookings.paymentStatus` equals the derived summary of its Payment rows after every transaction that touches either; one shared writer enforces it.
12. **A Booking Game never rates.** `games.rated = false` on every Game created by `bookings.createGame`; `applyRatedMatch` is a no-op for it.

### 2.7 New and amended CONTEXT.md terms (proposed)

**Venue manager**: A User granted management of one Venue by an Operator: Venue details, Courts, Opening hours, Closures, Pricing rules, Cancellation policy, Bookings, Payments, Customers and reports for that Venue, from the Web App. A User may manage many Venues. Not a Community role, not an Operator; an Operator may do everything a Venue manager may.
_Avoid_: facility owner, venue admin, Owner (that is a Community role), Admin, Operator, staff

**Customer**: A User as seen from one Venue: someone who holds or has held a Booking there. Derived from User and Bookings, never a separate record. Needs no Community or Group membership.
_Avoid_: client, member (that is a Community role), player (when you mean this view), account

**Guest**: A person without a Temba account recorded on a Booking by name and phone by a Venue manager. A Guest Booking has no Customer and never a Game.
_Avoid_: walk-in (as the name of the entity), offline customer, anonymous User

**Booking**: One Court reserved for one interval by one Customer or Guest, at a price and under a Cancellation policy fixed when it was made. Pending payment for at most ten minutes when a Customer makes it, confirmed once payment settles, is held or is deferred to the Venue; may become cancelled, no-show or expired. Distinct from a Game: a Game is the event, a Booking is the Court.
_Avoid_: reservation, slot (that is the offer, not the reservation), Game, session, order

**Slot**: One Court, one start on the Venue's grid, one duration and one price, offered to a Customer. Derived from Opening hours, Closures, Pricing rules and occupying Bookings; never stored.
_Avoid_: Booking (that is the reservation), Position, Match slot, time slot (as an entity), window (that is a Game's registration window)

**Opening hours**: The windows in which a Venue offers Slots, per weekday in the product timezone. A weekday may have several windows; none means closed. A window may run past midnight to 06:00 and still belongs to the day it opened.
_Avoid_: schedule, timetable, availability (that is the derived set of Slots), business hours

**Closure**: A dated block, for the whole Venue or one Court, when no Slot is offered. Shown to Customers as unavailable without the reason.
_Avoid_: maintenance (that is a reason), holiday, block-out, Soft-archive (that hides the Venue)

**Pricing rule**: An hourly rate in fils for a set of weekdays and a time range, for every Court or one Court. A Court rule beats a Venue-wide rule. Rules on one scope never overlap. The price of a Booking is fixed from the rules at the moment it is made.
_Avoid_: tariff, rate card, price list, Price per player (that is a Game field), fee

**Cancellation policy**: A Venue's tiers of refund percent by hours before the start, the percent after the last tier, and how close to the start a Customer may still cancel in the app. Snapshotted onto each Booking when it is made. A Venue that cancels refunds in full whatever the policy says.
_Avoid_: cancellation cutoff (one tier is a special case, not the term), refund window, grace period, terms

**Payment**: One attempt to collect a Booking's price through a payment provider or by hand at the Venue, with its refund. Pending, held, paid, failed, refunded, partially refunded or waived. The Booking's payment status summarises its Payments.
_Avoid_: transaction, charge (that is one kind of Payment movement), invoice, Price per player, payment status (that is the Booking's summary, not the row)

**Payment provider**: The outside service that takes a Customer's money for a Booking, behind one adapter in the API Package. "Manual" is the adapter that collects nothing and lets a Venue manager settle by hand. The real provider is not chosen yet (ADR-0028).
_Avoid_: gateway, PSP, naming a vendor before ADR-0028 is decided, Clerk (that is identity)

**No-show**: A confirmed Booking the Customer or Guest did not turn up for, marked by a Venue manager after the start. Terminal. Counts against the Customer in reports, keeps whatever was paid, and is never a cancellation.
_Avoid_: missed, absent, cancelled (that is a different end state), forfeit (that is a Match term)

**Accepting bookings**: The Venue switch that lists it on the mobile Venues list and opens Customer Booking doors. Off by default. A Venue may be live in the catalog and not accepting bookings.
_Avoid_: bookable (that is the derived per-day state), published, enabled, open (that is Opening hours)

**Booking Game**: A groupless, unrated Friendly game created from a Booking by its holder, who is its Organizer. Its Venue, Court and window are the Booking's. Players join through Invite doors. Cancelling the Booking cancels the Game; cancelling the Game keeps the Booking.
_Avoid_: booked Game, court Game, reservation Game, Game booking, private Game (that is any Game with `isPublic` off)

**Unrated Game**: A Game whose completed Matches never produce rating events, move a Level or feed a Standing, while still counting as played, won, lost or drawn in Last 10, All time stats and Win streak. Today only a Booking Game. Match result confirmation still applies.
_Avoid_: unranked (the user-facing word is "Unrated"), casual, friendly (that is a Game format), practice

**Game** (amended sentence): "A new Game must belong to a Group, except a Booking Game, which has none; other groupless Games are legacy rows."

**Rated Match** (amended): "A completed, non-cancelled Match on a Game that rates, which produced rating events for the Users on its two Game teams. A Match on an Unrated Game is never a Rated Match."

**Manage area**: The Web App pages under `/dashboard/manage` where a Venue manager runs their Venues. Distinct from the Operator Venues area and from Community administration.
_Avoid_: dashboard (when you mean this area), admin panel, facility portal, venue admin

### 2.8 ADRs to write

- **ADR-0024 Booking is a Venue ledger, not a Game property.** A Booking reserves a Court independently of Games; a Game may attach to one Booking; the cascade runs Booking → Game only. Considered: putting reservation fields on Game (rejected: Guests, Venue-made Bookings and Bookings without a Game have no Game to hold them).
- **ADR-0025 Venue manager is a per-Venue table role.** Not Clerk `publicMetadata`, because it is per Venue, many-to-many and granted by Operators in the product, not in the Clerk dashboard. Operator stays metadata.
- **ADR-0026 No double booking is enforced in the create transaction.** Advisory lock plus overlap query inside the transaction, with lapsed holds expired first; an exclusion constraint when the test harness supports `btree_gist`. Slots are derived and never stored, so there is no slot row to lock.
- **ADR-0027 Booking prices and Cancellation policies are snapshots.** Fils, same unit as Price per player; rules and policies change, Bookings do not. Refunds are computed from the snapshot by one pure function.
- **ADR-0028 Payment provider: pending, provider to be chosen.** Records the adapter boundary (2.4), the manual adapter as the only implementation, the two-step Customer flow with a ten-minute hold, and the candidates with what each needs: **Tap Payments** (Bahrain-native, BENEFIT and cards, hosted and SDK flows, webhooks), **BENEFIT Pay** direct (local debit only, no cards, no holds), **Stripe** (cards and Apple Pay, no BENEFIT, Bahrain availability must be confirmed for the business entity), **Checkout.com** (cards, regional presence). Decision criteria: BENEFIT support, authorise-then-capture, refunds API, Expo-compatible client step, webhook signing. Status stays "pending" until ticket 16 is specced.
- **ADR-0029 A Booking Game is groupless and unrated.** Why groupless beats an auto-created Loose Group (2.5), the `rated` flag, and the single guard in `applyRatedMatch`.

### 2.9 Notifications

Extend the existing fan-out Notifications (ADR-0022) with five types, additive to the `notification_type` enum, and a nullable `booking_id` column on `notifications` (on delete cascade):

| Type | Recipient | Audience |
| --- | --- | --- |
| `booking_created` | Venue managers of that Venue, excluding the actor; sent when the Booking becomes `confirmed`, not at `pending_payment` | admin |
| `booking_cancelled_by_customer` | Venue managers | admin |
| `booking_cancelled_by_venue` | The Customer | player |
| `booking_changed_by_venue` | The Customer (time, Court or price changed by a manager) | player |
| `booking_refund_recorded` | The Customer (a manager recorded a manual refund, or a provider refund settled) | player |

No-show, settle and hold expiry do not notify. Copy goes next to the other notification copy in `@repo/domain/notification-copy`. Reminders before a Booking are Phase 7 (push) and out of scope.

## 3. Data: tables, columns and migrations

All timestamps follow the existing `timestamp` (without time zone) column pattern; the product timezone is applied in code with `@repo/domain/product-timezone`. Ids are `uuid` default random. Every table gets `created_at` and `updated_at` like its neighbours. New schema files go under `packages/db/src/schema/` and are exported from `packages/db/src/schema/index.ts`.

### Migration A (ticket 1): Venue managers and Booking settings

- `venue_managers`: `id`, `venue_id` (FK venues, cascade), `user_id` (FK user, cascade), `granted_by_user_id` (FK user, set null), timestamps. Unique `(venue_id, user_id)`. Index on `user_id`.
- `venues` adds: `accepting_bookings boolean not null default false`, `slot_minutes integer not null default 30`, `duration_options_minutes integer[] not null default '{60,90}'`, `booking_horizon_days integer not null default 14`, `min_lead_minutes integer not null default 60`, `description varchar(1000)`, `booking_notes varchar(1000)`. Checks: `slot_minutes in (30, 60)`, ranges from 2.1.

### Migration B (ticket 3): Opening hours, Closures and Cancellation policy

- `venue_opening_hours`: `id`, `venue_id` (cascade), `weekday smallint` (0–6 check), `opens_at_minutes integer`, `closes_at_minutes integer` (check `0 <= opens < closes <= 1800`), timestamps. Index `(venue_id, weekday)`. Non-overlap per weekday is enforced in the door (small sets, read-modify-write inside a transaction with the Venue row locked `FOR UPDATE`).
- `venue_closures`: `id`, `venue_id` (cascade), `court_id` (FK courts, cascade, nullable), `starts_at`, `ends_at` (check `starts_at < ends_at`), `reason varchar(255)`, `created_by_user_id`, timestamps. Index `(venue_id, starts_at)`.
- `venues` adds `cancellation_policy jsonb not null default '{"tiers":[{"hoursBefore":24,"refundPercent":100}],"lateRefundPercent":0,"customerCancelUntilMinutes":0}'`. Shape validated in the door; Drizzle column typed with `$type<CancellationPolicy>()` from `@repo/validators`.

### Migration C (ticket 4): Pricing rules

- `venue_pricing_rules`: `id`, `venue_id` (cascade), `court_id` (nullable, cascade), `weekdays smallint[]` (non-empty, each 0–6), `start_minutes`, `end_minutes` (check `0 <= start < end <= 1800`), `hourly_rate_fils integer` (check `0 <= rate <= 1_000_000_000`, same cap as Price per player), `label varchar(60)`, timestamps. Index `(venue_id)`. Non-overlap per scope enforced in the door as for Opening hours.

### Migration D (ticket 5): Bookings

- Enums: `booking_status` (`pending_payment`, `confirmed`, `cancelled`, `no_show`, `expired`), `booking_source` (`app`, `venue`), `booking_payment_status` (`pending`, `held`, `paid`, `failed`, `refunded`, `partially_refunded`, `waived`), `booking_cancelled_by` (`customer`, `venue`).
- `bookings`: `id`, `venue_id` (FK venues, restrict), `court_id` (FK courts, restrict — a Court with Bookings is not deletable; the door refuses it first with a message), `user_id` (FK user, set null, nullable), `guest_name varchar(255)`, `guest_phone varchar(32)`, `starts_at`, `ends_at` (check `starts_at < ends_at`), `status` default `confirmed`, `hold_expires_at`, `source`, `price_fils integer not null`, `cancellation_policy jsonb not null`, `payment_status` default `pending`, `refund_due_fils integer`, `cancellation_charge_fils integer`, `cancelled_at`, `cancelled_by_user_id` (set null), `cancelled_by`, `cancel_reason varchar(500)`, `no_show_at`, `game_id` (FK games, set null, unique), `manager_notes varchar(1000)`, `created_by_user_id` (FK user, set null), timestamps.
- Checks: `(user_id is not null) <> (guest_name is not null and guest_phone is not null)`; `game_id is null or user_id is not null`; `(status = 'pending_payment') = (hold_expires_at is not null)`.
- Indexes: `(court_id, starts_at)`, `(venue_id, starts_at)`, `(user_id, starts_at)` partial `where user_id is not null`, `(venue_id, status)`, `(status, hold_expires_at)` partial `where status = 'pending_payment'`.
- Optional in the same migration file, see invariant 1: `create extension if not exists btree_gist` and the exclusion constraint. Decide in ticket 5 by running the PGlite harness.

### Migration E (ticket 6): Payments

- Enums: `payment_provider` (`manual`; the chosen provider is added by ticket 16 with `alter type … add value`), `payment_method` (`cash`, `card`, `online`, `transfer`), `payment_status` (same values as `booking_payment_status` minus nothing: `pending`, `held`, `paid`, `failed`, `refunded`, `partially_refunded`, `waived`).
- `booking_payments`: `id`, `booking_id` (FK bookings, cascade), `provider`, `method` nullable, `status` default `pending`, `amount_fils integer not null`, `provider_reference varchar(255)`, `failure_reason varchar(500)`, `settled_by_user_id` (FK user, set null), `settled_at`, `refunded_fils integer not null default 0`, `refund_reference varchar(255)`, `refunded_by_user_id` (set null), `refunded_at`, timestamps. Index `(booking_id)`, unique partial `(provider, provider_reference) where provider_reference is not null`. Check `0 <= refunded_fils <= amount_fils`.

### Migration F (ticket 13): Notifications

- `alter type notification_type add value` × 5, and `notifications.booking_id uuid references bookings(id) on delete cascade`.

### Migration G (ticket 14): Unrated Games

- `games.rated boolean not null default true`. Every existing row is rated. Partial index `(id) where rated = false` is unnecessary; `rated` is read with the Game row.

Seeds: `pnpm --filter @repo/api db:seed` (`packages/api/scripts/seed.ts`) gains one Venue accepting bookings with three Courts, Opening hours Sun–Sat 08:00–24:00, a base Pricing rule and a peak rule, a two-tier Cancellation policy, one Venue manager (the first seeded User), a handful of Bookings across the current week with mixed payment states, and one Booking Game (tickets 3–6 and 15 extend the seed as the tables arrive).

## 4. API

Rules for all doors: one procedure per file, input validated with Zod inline unless two doors share the schema (then `@repo/validators`), the Temba User resolved with `resolveAppUser`, PGlite tests beside each file through the exported db-taking function. `apps/api` changes only to mount the payment webhook route (ticket 16); routers are mounted through `root.ts`.

New shared modules (each used by two or more doors):

- `packages/api/src/venues/helpers/require-venue-manager.ts`: `requireVenueManager(db, { venueId, userId, publicMetadata })` passes for an Operator or a row in `venue_managers`, else `FORBIDDEN` "Only Venue managers can manage this Venue". Also `listManagedVenueIds(db, userId)`.
- `packages/api/src/bookings/availability.ts`: loads a Venue's day (Opening hours for the weekday, Closures, Pricing rules, occupying Bookings) and calls the pure `@repo/domain/booking-slots` function. Used by `bookings.venueAvailability`, `bookings.create`, `bookings.createForVenue`, `bookings.update`, `bookings.listForVenue`.
- `packages/api/src/bookings/reserve.ts`: the no-double-booking transaction (advisory lock, expire lapsed holds, overlap check, insert or update). Used by create, createForVenue and update.
- `packages/api/src/bookings/cancel.ts`: the cancel rule shared by the Customer and manager cancel doors: refund arithmetic from the policy snapshot, the Payment ledger move, the Booking Game cascade.
- `packages/api/src/bookings/payments.ts`: the only writer of `booking_payments` and `bookings.payment_status`: `beginPayment`, `settlePayment`, `failPayment`, `recordRefund`, `summarisePaymentStatus`. Used by create, confirmPayment, retryPayment, cancel, settlePayment, recordRefund and the webhook handler.
- `packages/api/src/payments/{provider,manual,index,handle-webhook}.ts`: the provider boundary (2.4).
- `packages/domain/src/booking-slots.ts` (pure slot computation), `booking-price.ts` (pure price from rules), `booking-refund.ts` (2.3), `booking-payment.ts` (`PAYMENT_HOLD_MINUTES`, `summarisePaymentStatus` as a pure fold over Payment rows, payment status labels), `booking-copy.ts` (Booking status labels and Customer-facing copy), `game-rating-eligibility.ts` (2.5).
- `packages/validators/src/cancellation-policy.ts`: the Zod schema and `CancellationPolicy` type, used by the manager door, the web form, the Drizzle column type and the mobile display model.

### 4.1 `venues` router (additive)

| File | Auth | Input → Output | Rule |
| --- | --- | --- | --- |
| `listManaged.ts` | protected | → `{ id, name, city, country, logoImageUrl, acceptingBookings, archivedAt, courtCount, upcomingBookingCount, unsettledCount }[]` | Venues the caller manages; every live and archived Venue for an Operator. Empty array for everyone else. Web only. |
| `managedById.ts` | protected + Venue manager | `{ venueId }` → Venue with Booking settings, Cancellation policy, Courts, Opening hours, Closures (next 90 days), Pricing rules, manager list | The Manage area's one read for settings pages. Web only. |
| `addManager.ts` | operator | `{ venueId, userId }` → row | Operator grants. Refuse duplicate with `CONFLICT`. |
| `removeManager.ts` | operator | `{ venueId, userId }` → `{ ok }` | Operator revokes. Idempotent. |
| `searchManagerUsers.ts` | operator | `{ query }` → `{ id, name, username, image }[]` | Reuses `packages/api/src/invites/search-lookup-users.ts` with no membership filter. |
| `updateBookingSettings.ts` | Venue manager | `{ venueId, acceptingBookings?, slotMinutes?, durationOptionsMinutes?, bookingHorizonDays?, minLeadMinutes?, description?, bookingNotes? }` → Venue | Validates ranges; refuses turning `acceptingBookings` on when the Venue is Soft-archived or has no Court; durations must be multiples of `slotMinutes`; changing `slotMinutes` is refused while any Opening hours or Pricing rule is not on the new grid. |
| `updateCancellationPolicy.ts` | Venue manager | `{ venueId, policy: CancellationPolicy }` → Venue | Schema from `@repo/validators`; tiers strictly decreasing in hours and non-increasing in percent; applies to Bookings made from now on only. |
| `updateDetails.ts` | Venue manager | `{ venueId, phone?, website? }` → Venue | Manager edits contact fields. Name, city, country and lat/lng stay on the Operator `update` door (they form the catalog identity, Q13). |
| `setOpeningHours.ts` | Venue manager | `{ venueId, weekday, windows: { opensAtMinutes, closesAtMinutes }[] }` → windows | Replaces that weekday's windows in one transaction. Refuses overlaps, off-grid minutes and `closes > 1800`. Empty array closes the day. |
| `addClosure.ts` | Venue manager | `{ venueId, courtId?, startsAt, endsAt, reason? }` → closure + `affectedBookingIds` | Court must belong to Venue; returns occupying Bookings inside the block so the UI can offer to cancel them (it never cancels on its own). |
| `removeClosure.ts` | Venue manager | `{ closureId }` → `{ ok }` | |
| `setPricingRules.ts` | Venue manager | `{ venueId, rules: { id?, courtId?, weekdays, startMinutes, endMinutes, hourlyRateFils, label? }[] }` → rules | Replaces the Venue's rule set in one transaction; refuses overlaps per scope and off-grid minutes. Whole-set replace keeps the overlap check simple and matches a single settings form. |
| `addCourt.ts`, `renameCourt.ts`, `deleteCourt.ts` (existing) | widened: operator **or** Venue manager | unchanged inputs | Same behaviour; `deleteCourt` now refuses when the Court has an occupying Booking with `endsAt > now` ("Cancel its Bookings first"). Procedure paths unchanged. |
| `uploadLogo.ts`, `clearLogo.ts` (existing) | widened: operator or Venue manager | unchanged | |

### 4.2 `bookings` router (new, `packages/api/src/routers/bookings/`)

Customer doors (mobile calls these; web may):

| File | Auth | Input → Output | Rule |
| --- | --- | --- | --- |
| `listBookableVenues.ts` | protected | `{ city? }` → `{ id, name, city, country, logoImageUrl, courtCount, fromHourlyRateFils, todayOpen: { opensAtMinutes, closesAtMinutes }[] }[]` | Live Venues with `acceptingBookings`, at least one Court and at least one Pricing rule. Sorted by name. `fromHourlyRateFils` is the lowest rule rate. |
| `venueForBooking.ts` | protected | `{ venueId }` → Venue public fields, description, bookingNotes, Courts, Opening hours by weekday, duration options, `cancellationPolicy` plus its described lines, horizon, `payment: { mode: "at_venue" \| "online" }` | Refuses (`NOT_FOUND`) when not bookable at all (archived or not accepting). `payment.mode` comes from the provider id so the mobile confirm step can render the right copy. |
| `venueAvailability.ts` | protected | `{ venueId, day: "YYYY-MM-DD" }` → `{ day, courts: { id, name, slots: { startsAt, durations: { minutes, priceFils }[] }[] }[] }` | Day within `[today, today + horizon)`. Slots already past `now + minLead` are omitted. Only bookable Slots are returned; a Closure or an occupying Booking leaves a gap. |
| `create.ts` | protected | `{ venueId, courtId, startsAt, durationMinutes }` → `{ booking, payment: PaymentBegin }` | Invariants 1–5, 7, 8, 9. Price computed server-side and snapshotted with the policy. Reserves as `pending_payment` with a ten-minute hold, begins the Payment (2.4); `deferred` confirms in the same transaction. `source = app`. Notifies managers on confirm. |
| `confirmPayment.ts` | protected (holder) | `{ bookingId }` → Booking | Only `pending_payment` with a `client_action` Payment; calls `provider.confirm`; `paid`/`held` → `confirmed`; `failed` → Payment `failed`, Booking stays `pending_payment` until the hold lapses. Idempotent. |
| `retryPayment.ts` | protected (holder) | `{ bookingId }` → `{ payment: PaymentBegin }` | Only `pending_payment` with the hold still live and the latest Payment `failed`; begins a new Payment row. The manual adapter never reaches this door (it never fails). |
| `listMine.ts` | protected | `{ scope: "upcoming" \| "past", cursor? }` → paginated Bookings with Venue and Court names, `paymentStatus`, `gameId` | Upcoming: `confirmed` or live `pending_payment` with `endsAt > now`, soonest first. Past: everything else, newest first. |
| `byId.ts` | protected | `{ bookingId }` → Booking with Venue, Court, policy lines, `cancel: { allowed, until, refundPercentNow, refundDueFilsNow, nextStep }`, `paymentStatus`, `canCreateGame` (2.5), Game summary when linked | Holder, a manager of that Venue, or an Operator. The `cancel` block is computed by `booking-refund` at request time so the screen shows the live consequence. |
| `cancel.ts` | protected (holder) | `{ bookingId }` → Booking with `refundDueFils` | Invariant 6. `cancelledBy = customer`. Refund per policy snapshot (2.3). Cascades the Booking Game. Notifies managers. |
| `createGame.ts` | protected (holder) | `{ bookingId, name?, pricePerPlayerFils?, levelMinTenths?, levelMaxTenths? }` → `{ gameId, matchId }` | Booking is `confirmed`, upcoming, has a `userId` equal to the caller, no `gameId` yet. Calls `createFriendlyGame` with `groupId = null`, Venue, Court and window from the Booking, `isPublic = false`, `rated = false`. `assertGameCreateVenueAndCourt` still runs with `groupId` undefined, so a Venue Soft-archived after the Booking was made refuses the Game (the Booking itself stays). Sets `bookings.game_id` in the same transaction. No `groupCreator` check. |

Manager doors (web only):

| File | Auth | Input → Output | Rule |
| --- | --- | --- | --- |
| `listForVenue.ts` | Venue manager | `{ venueId, from: "YYYY-MM-DD", to: "YYYY-MM-DD", courtId?, status?[], paymentStatus?[] }` → Bookings with holder (User name/image or Guest name/phone), Court, price, `paymentStatus`, `gameId`, plus the day grid (Opening hours windows and Closures) for the range | Range ≤ 31 days. Serves both the calendar and the list. Live `pending_payment` rows appear as "Pending payment" blocks. |
| `createForVenue.ts` | Venue manager | `{ venueId, courtId, startsAt, durationMinutes, holder: { userId } \| { guestName, guestPhone }, priceFils?, payment?: { status: "paid" \| "waived", method?, reference? }, managerNotes? }` → Booking | Invariants 1–4, 7–9; ignores lead and horizon; `endsAt` must be in the future; `priceFils` override allowed; `source = venue`; `confirmed` at once with a `manual` Payment row (`pending`, or settled when `payment` is given). Durations may be any multiple of `slotMinutes` up to 240. |
| `searchCustomers.ts` | Venue manager | `{ venueId, query }` → `{ userId?, name, phone?, image?, bookingCount }[]` | Users by name/username/phone (through `packages/api/src/invites/search-lookup-users.ts`), plus Guests from this Venue's Bookings by name/phone. Powers the holder picker. |
| `update.ts` | Venue manager | `{ bookingId, courtId?, startsAt?, durationMinutes?, priceFils?, managerNotes? }` → Booking | Only `confirmed`. Re-runs reserve for a moved interval or Court; refused while a live Booking Game exists; reprices from rules unless `priceFils` is given; a price change on a paid Booking is refused ("Refund and rebook instead") so the ledger never disagrees with the price. Notifies the Customer (`booking_changed_by_venue`) when time, Court or price changed. |
| `cancelForVenue.ts` | Venue manager | `{ bookingId, reason? }` → Booking with `refundDueFils` | Any `confirmed` or `pending_payment` Booking before `endsAt`. `cancelledBy = venue`, full refund of what was paid (2.3). Cascades the Booking Game. Notifies the Customer. |
| `markNoShow.ts` | Venue manager | `{ bookingId }` → Booking | Only `confirmed` and `startsAt <= now`. Terminal. Ledger untouched. |
| `settlePayment.ts` | Venue manager | `{ bookingId, outcome: "paid" \| "waived" \| "failed", method?, reference? }` → Booking with ledger | On the latest `pending` or `held` `manual` Payment (or inserts one when none exists for a legacy row). `paid` requires a method; sets `settledByUserId` and `settledAt`. Provider-backed Payments cannot be settled by hand except `waived` on a `failed` one. |
| `recordRefund.ts` | Venue manager | `{ bookingId, amountFils, reference? }` → Booking with ledger | `0 < amount <= amountFils − refundedFils` of the `paid` or `partially_refunded` Payment. Manual: records the hand-made refund. Provider: calls `provider.refund` then records the result; a provider failure leaves the ledger untouched and surfaces the reason. Notifies the Customer (`booking_refund_recorded`). |
| `listCustomers.ts` | Venue manager | `{ venueId, query?, sort: "lastVisit" \| "bookings" \| "noShows" \| "name" \| "owed", cursor? }` → `{ userId, name, image, phone, firstBookingAt, lastBookingAt, bookingCount, cancelledCount, noShowCount, paidFils, refundedFils, owedFils }[]` | Aggregated over this Venue's Bookings only. `owedFils` is the price of confirmed or no-show Bookings whose payment is still `pending`. Guests are listed by phone with `userId: null`. |
| `customerById.ts` | Venue manager | `{ venueId, userId } \| { venueId, guestPhone }` → profile aggregate + Booking history with payment summaries (paginated) | A manager sees a User's Bookings at *their* Venue only, never at other Venues. |

### 4.3 `venueReports` router (new, web only)

All take `{ venueId, from, to }` (product-day keys, range ≤ 366 days, `to` inclusive) and `groupBy: "day" | "week" | "month"` where noted. Aggregation happens in SQL with `date_trunc(..., starts_at at time zone 'Asia/Bahrain')`; the timezone literal comes from `PRODUCT_TIMEZONE`.

| File | Output | Definition |
| --- | --- | --- |
| `occupancy.ts` | per bucket and per Court: `openMinutes`, `bookedMinutes`, `rate`; plus a weekday × hour heat grid for the range | `openMinutes` from Opening hours minus Closures; `bookedMinutes` from confirmed and no-show Bookings (a no-show still occupied the Court). Rate = booked / open. |
| `revenue.ts` | per bucket: `bookedFils` (confirmed + no-show by start day), `collectedFils` (Payments `paid` by `settledAt` day), `refundedFils` (by `refundedAt` day), `waivedFils`, `outstandingFils` (pending on confirmed or no-show Bookings), `cancellationChargesFils`; totals; split by `source`, by Court and by `method` | Cancelled Bookings count nothing in `bookedFils`; their collected and refunded movements still appear where they happened. |
| `bookingsOverTime.ts` | per bucket: `created`, `confirmed` (upcoming or played), `cancelledByCustomer`, `cancelledByVenue`, `noShow`, `expired`, `app`, `venue`; rates; average lead time in hours; average duration | Counted by start day except `created` and `expired`, which are by `createdAt`. |
| `customers.ts` | `newCustomers`, `returningCustomers`, `activeCustomers` per bucket; top 10 by Bookings and by `paidFils`; no-show rate and owed total per Customer for the top list; Guest share | New = first Booking at this Venue inside the bucket. |

### 4.4 Summary of auth

- `protectedProcedure`: Customer doors.
- `operatorProcedure`: manager grant/revoke and existing catalog doors.
- Manager doors use `protectedProcedure` and call `requireVenueManager` after reading `venueId` (from input or from the Booking row). There is no middleware because the Venue is in the input.
- The payment webhook (ticket 16) is not a tRPC door: `apps/api` mounts `POST /webhooks/payments/:provider` and hands the raw body to `handlePaymentWebhook`, which verifies the signature through the adapter and runs the same ledger transitions as `confirmPayment`.
- The Web App hides the Manage area unless `venues.listManaged` returns rows; the Operator Venues area stays keyed on Clerk metadata as today.

## 5. Web dashboard: the Manage area

Routes under `apps/web/src/app/dashboard/manage/`. Titles go into `dashboard-paths.ts`. The sidebar gains "Manage" when `venues.listManaged` is non-empty (Operators see it too). Existing components (`DashboardShell`, `Section`, `RowList`, `EmptyState`, `ErrorState`, skeletons, sonner, shadcn forms) are reused; no new design system on web.

| Route | Page | Data |
| --- | --- | --- |
| `/dashboard/manage` | Managed Venues list. One row per Venue with city, Court count, upcoming Bookings, unsettled count, "Accepting bookings" badge. One Venue → redirect to it. | `venues.listManaged` |
| `/dashboard/manage/[venueId]` | Overview: today's Bookings by Court, next 7 days occupancy, outstanding payments, pending Closure conflicts, quick links. | `bookings.listForVenue` (today..+7), `venueReports.occupancy` (7 days) |
| `/dashboard/manage/[venueId]/bookings` | Calendar (day view: Courts as columns, grid rows at `slotMinutes`; week view: one row per Court) and a list tab with filters (date range, Court, status, payment status, source). Blocks carry a payment badge (pending, paid, held, refunded, waived). Click a free cell → create; click a Booking → details sheet with edit, cancel (showing the refund the policy gives), no-show, settle, refund, open Game. | `bookings.listForVenue` |
| `/dashboard/manage/[venueId]/bookings/new` | Create for a Customer or Guest: holder search, Court, date, start, duration, price (prefilled from rules, editable), payment (pending at Venue, paid now with method and reference, waived), notes. | `bookings.searchCustomers`, `bookings.listForVenue` grid, `bookings.createForVenue` |
| `/dashboard/manage/[venueId]/bookings/[bookingId]` | Booking page (also the sheet's full view): holder, Court, time, price, policy snapshot, source, **Payment** section (ledger rows: provider, method, status, amount, reference, settled by and when, refunds; actions settle, waive, mark failed, record refund with the refundable maximum shown), audit trail (created, confirmed, changed, cancelled with refund due and charge, no-show), linked Game. | `bookings.byId`, mutations above |
| `/dashboard/manage/[venueId]/customers` | Customers table: name, phone, Bookings, no-shows, owed, paid, last visit; search and sort. | `bookings.listCustomers` |
| `/dashboard/manage/[venueId]/customers/[userId]` and `.../guests/[phone]` | Customer profile: aggregates, Booking history with payment summaries, "New Booking for this Customer" link. | `bookings.customerById` |
| `/dashboard/manage/[venueId]/settings` | Tabs: Details (phone, website, logo, description, booking notes), Courts (add, rename, delete), Opening hours (7 weekday editors with multiple windows), Closures (list, add with Court/whole Venue, conflicts prompt), Pricing (rule table, base rate shortcut), **Cancellation policy** (tier editor: rows of hours and percent, late percent, Customer cancel limit, live preview of the Customer-facing lines, presets "Full refund until 24 h", "Tiered 48/12", "Always free"), Booking settings (accepting, slot, durations, horizon, lead). | `venues.managedById` and the `venues.*` doors in 4.1 |
| `/dashboard/manage/[venueId]/reports` | Date range and bucket controls, four sections: Occupancy (per Court bars, weekday × hour heat grid), Revenue (booked vs collected vs refunded over time, outstanding, by Court, by source, by method), Bookings (counts stacked by outcome including expired, cancellation and no-show rates, lead time), Customers (new vs returning, top Customers with owed). Charts with the `dataviz` skill's rules; black and white with hatch for "not yet" matches the brand. | `venueReports.*` |

The Operator Venue page (`/dashboard/venues/[id]`) gains a "Venue managers" section: list, add by User search, remove.

Web Customer screens (browse, book) are not planned; `bookings.byId` is linked from Game details on web when a Game has a Booking ("Booked Court 2, 19:00–20:30") and Game details shows "Unrated" for a Booking Game.

## 6. Mobile: screens and navigation

The locked design system applies (CLAUDE.md "Design system rules for mobile", spec section 4). New code lives in `apps/mobile/src/booking/` with routes under `apps/mobile/app/(app)/book/`. Models are pure functions with Vitest beside them (`booking-model.ts`, `slot-grid.ts`, `confirm-model.ts`), like `home-model.ts` and `create-model.ts`.

| Screen | Route | Content | Doors |
| --- | --- | --- | --- |
| Book entry | A row on Home ("Book a court") and on the Games hub; whether Book is a fifth tab is design-dependent (7.1). | | |
| Venues | `book/index` | List of Venues accepting bookings: logo monogram, name, city, "from BD x/h", today's hours. Empty state when none. | `bookings.listBookableVenues` |
| Venue | `book/[venueId]` | Name, city, description, Opening hours by weekday, Courts count, booking notes, the Cancellation policy lines ("Full refund until 24 h before. 50 % until 12 h. No refund after."). Day strip for the horizon (today first). Below it the availability grid for the chosen day. | `bookings.venueForBooking`, `bookings.venueAvailability` |
| Availability grid | part of `book/[venueId]` | Courts as sections, Slots as a time list; `Hatch` for not offered, outline for free, solid ink for the selected start. Choosing a start reveals the duration chips with prices. | `@repo/domain/booking-slots` for grid shape from the server payload |
| Confirm | `book/[venueId]/confirm` (params: courtId, startsAt, durationMinutes) | Summary: Venue, Court, day and time, duration, price in BD, booking notes, the policy lines with the concrete deadlines for this start ("Free cancellation until Tue 18:00, 50 % until Wed 06:00"), and the **payment line**: with the manual adapter, "Pay BD x at the Venue" and the button "Book Court 2"; with a provider, the button "Pay BD x" and the client step (7.9). One `Surface tone="ink"` with the button. Errors: slot taken (go back and refresh), outside horizon, payment failed (stay, offer retry while the hold is live, show the hold countdown). | `bookings.create`, `bookings.confirmPayment`, `bookings.retryPayment` |
| Booking created | toast + replace to Booking details | | |
| My bookings | `profile/bookings` (Upcoming / Past tabs); the next upcoming Booking also appears on Home's Coming up list as a row distinct from a Game card. A `pending_payment` Booking shows "Finish payment" with the hold countdown. | | `bookings.listMine` |
| Booking details | `book/bookings/[bookingId]` | Status, Venue, Court, time, price, payment status (pending at Venue / paid / held / refunded with amount), the policy with the live next step from `byId.cancel` ("Cancel now: full refund of BD x", later "50 % refund", later "No refund"), cancel (enabled while allowed, confirm sheet states the refund), "Call the Venue" with the phone when not allowed, Create a game (for the holder of a confirmed upcoming Booking with no Game) or the linked Game card with "Unrated". | `bookings.byId`, `bookings.cancel` |
| Create a game from Booking | `book/bookings/[bookingId]/game` reusing `src/create-game` with the Where and When steps locked and shown as read-only summaries and **no Group step**; remaining steps: details (name, Price per player, Level range) and review with an "Unrated" line; then Game details where the holder joins and shares the Invite link. | | `bookings.createGame` |
| Game details | existing screen gains a "Booked" line (Court and time) when `booking` is present on the Game payload (`games.byId` adds the optional `booking` field, additive) and an "Unrated" mark in place of the Rating impact block when `rated` is false. | | `games.byId` |

Design system notes: at most two mount animations per screen (the Confirm screen may use `MountFill` on the price surface, nothing else); no hex; all text through `Text`; tabular figures matter on the time grid and the hold countdown; 44 pt targets on slot cells; hatch is decoration with "Unavailable" in the accessible label.

## 7. Design-dependent

Resolve each item against the imported `.dc.html` once it is in `.scratch/design/booking-flow/`. Until then, implement with the defaults in the right column; tickets marked "design-blocked" in section 9 wait for this section.

| # | Screen or flow | Confirm against the design | Default if the design is silent |
| --- | --- | --- | --- |
| 7.1 | Mobile navigation | Is Book a fifth tab, a Home row, or both? Tab icon and title. Does Book replace or sit beside Communities when that tab is hidden? | Home row "Book a court" plus a Games hub row; no new tab. |
| 7.2 | Venues list | Row contents (logo, distance, price-from, hours, Court count), ordering, city filter, empty state copy. | Name, city, from-price, today's hours; sorted by name; no distance. |
| 7.3 | Venue screen | Section order (hours, description, Courts, policy, notes), whether the day strip and grid live on this screen or a separate one, how many days the strip shows. | One screen; strip shows the horizon. |
| 7.4 | Availability grid | Time list vs matrix (time × Court), duration picking before or after choosing a start, how price appears on a Slot, hatch for unavailable vs hidden, selected state. | Court sections with a time list; start first, then duration chips with prices. |
| 7.5 | Confirm step | Field order, whether booking notes and the policy lines appear here, label of the confirm button, where the payment line sits, success state (toast vs full screen). | As in section 6, button "Book Court 2" (manual) or "Pay BD x" (provider), toast then details. |
| 7.6 | Booking details | What the hero shows (time vs status), where cancel sits, how the refund consequence is worded, how a linked Game and "Unrated" are shown, how payment status reads. | Section 6 defaults. |
| 7.7 | My bookings | Where it lives (Profile, Home, Games hub tab), tab labels, row content, whether past Bookings show payment, how a pending-payment row looks. | Profile route plus Home Coming up row. |
| 7.8 | Create a game from a Booking | Entry label, whether Where/When appear as locked steps or a single summary, whether the holder is auto-seated on creation, whether the Invite link share is offered on the success state. | Locked steps shown as summaries; holder not auto-seated; share offered on Game details as today. |
| 7.9 | Payment step | **Payment is in scope.** Does the design show a hold or pay step between confirm and confirmed, a price breakdown, a saved-card picker, a hold countdown, a failure and retry state, and the "pay at Venue" variant? Which of these exist decides ticket 16's client step. | Manual variant only: one price line and "Pay at the Venue"; the provider step is a placeholder screen behind `payment.mode`. |
| 7.10 | Labels and copy | Product words on screen for Booking, Slot, Court, cancellation, refund, no-show, "Accepting bookings", "Unrated". Glossary terms are the code names; the design decides the user-facing labels. | Glossary names as labels. |
| 7.11 | Web dashboard | Does the design cover the Manage area at all (calendar, settings, policy editor, payment ledger, reports)? If so, confirm calendar shape (day columns per Court), the settings tab list, the ledger layout and the four report views. | The web tickets use the existing dashboard patterns and are not blocked. |
| 7.12 | Empty and error states | Copy and illustration rules for no Venues, closed day, fully booked day, slot taken while confirming, outside horizon, payment failed, hold expired. | Short copy, no illustration, matching `EmptyState` tone. |
| 7.13 | Guest and manager-made Bookings | Nothing on mobile should show a Guest; confirm the design has no customer-side view of Venue-made Bookings beyond their own. | Not shown. |
| 7.14 | Cancellation policy display | How tiers read on the Venue screen, the confirm step and details (sentence lines vs a small table), and how the cancel confirm sheet words the refund. | Sentence lines from `describeCancellationPolicy`; the sheet says "You'll be refunded BD x (50 %)". |

## 8. Decisions and remaining open questions

| # | Question | Status |
| --- | --- | --- |
| Q1 | **Payments.** | **Decided: in scope from now; provider not chosen.** Payment ledger, adapter boundary and a manual "pay at Venue" adapter ship in ticket 6; the two-step flow with a ten-minute hold is the Customer flow from day one; ADR-0028 lists candidates and stays pending; ticket 16 is the provider integration placeholder. |
| Q2 | **Cancellation policy.** | **Decided: per-Venue, manager-edited.** Tiers of refund percent by hours before start, a late percent, and a Customer cancel limit (2.3). One pure function computes the refund; Customers see the policy on the Venue screen, the confirm step and Booking details. Venue-initiated cancellation refunds in full. |
| Q3 | **Non-members.** | **Decided: any authenticated User may book.** No member pricing. |
| Q4 | **Multi-venue owners and who grants managers.** Operators grant managers; may a manager add co-managers? | Open. Default: table role, many-to-many; only Operators grant in v1. |
| Q5 | **Guest Bookings.** | **Decided: yes**, managers record Bookings by name and phone. |
| Q6 | **Game create reserving a Court.** | Open. Default: no in v1; the existing Game create stays untouched. |
| Q7 | **Who may create a Booking Game.** | **Decided: anyone with a Booking; the Game is private and unranked.** Implemented as a groupless, unrated Friendly game (2.5, ADR-0029). The `groupCreator` gate stays everywhere else. |
| Q8 | **Slot grid and durations.** | **Decided: 30-minute grid, 60 and 90 minute options** as defaults, editable per Venue. |
| Q9 | **Booking caps.** Limit upcoming Bookings per Customer per Venue? | Open. Default: no cap in v1. |
| Q10 | **Report exports.** CSV? | Open. Default: not in v1. |
| Q11 | **Court delete with history.** | Open. Default: refuse only with upcoming occupying Bookings; FK `restrict` prevents hard delete of a Court with any Booking; a later "retire Court" flag if needed. |
| Q12 | **Where My bookings lives on mobile** and whether Book is a tab. | Open; the design decides (7.1, 7.7). Defaults in section 6. |
| Q13 | **Manager editing of Venue identity** (name, city, country). | Open. Default: Operator only. |
| Q14 | **Provider.** Tap Payments, BENEFIT Pay, Stripe or Checkout.com (ADR-0028 criteria). Authorise-then-capture (hold) or immediate charge? | Open. Default until chosen: immediate charge semantics in the interface (`held` is supported but the manual adapter never produces it). |
| Q15 | **Who pays the refund delta on a late Customer cancellation when nothing was collected online** (manual adapter)? | Open. Default: `cancellationChargeFils` is informational; the Venue may record it as owed on the Customer profile but Temba does not chase it. |

## 9. Tickets

Vertical slices in implementation order. Each is sized for one implementer in one context. "Design" says whether the ticket waits for section 7. Create them in Linear in this order so `blocks` relations can be set; link this spec at the top of each. Ticket titles follow the existing numbering style ("N. Title").

| # | Title | Blocked by | Design |
| --- | --- | --- | --- |
| 1 | Venue manager role and the Manage area shell | — | not blocked |
| 2 | Venue managers edit Venue details and Courts | 1 | not blocked |
| 3 | Opening hours, Closures, Booking settings and the Cancellation policy | 1 | not blocked |
| 4 | Pricing rules and the pure Booking price | 3 | not blocked |
| 5 | Bookings table, Slot availability and the Customer Booking doors | 4 | not blocked |
| 6 | Payment ledger, the provider boundary and the manual adapter | 5 | not blocked |
| 7 | Manage area Bookings calendar and list | 6 | not blocked (7.11 may refine) |
| 8 | Manager creates, edits, cancels and marks no-show | 7 | not blocked |
| 9 | Customers list and Customer profile | 8 | not blocked |
| 10 | Venue reports | 8 | not blocked |
| 11 | Mobile: browse Venues and see availability | 5 | design-blocked (7.1–7.4, 7.10, 7.12, 7.14) |
| 12 | Mobile: confirm a Booking with the payment step, My bookings and Booking details | 6, 11 | design-blocked (7.5–7.7, 7.9, 7.14) |
| 13 | Booking notifications | 8 | not blocked |
| 14 | Unrated Games | — (independent of 1–13) | not blocked |
| 15 | Booking Game: create a groupless unrated Game from a Booking | 5, 12, 14 | API not blocked; mobile step design-blocked (7.8) |
| 16 | Payment provider integration placeholder | 6, 12, ADR-0028 decision | design-blocked (7.9) and provider-blocked |

### Ticket 1. Venue manager role and the Manage area shell

**What to build.** Migration A (`venue_managers`, Venue Booking settings columns with defaults). `requireVenueManager` and `listManagedVenueIds` in `packages/api/src/venues/helpers/`. Doors `venues.listManaged`, `venues.managedById` (settings fields, Courts, managers; Opening hours, Closures, policy and Pricing rules arrive as empty or default values until tickets 3–4), `venues.addManager`, `venues.removeManager`, `venues.searchManagerUsers`. Web: "Venue managers" section on the Operator Venue page; sidebar "Manage" entry when the caller manages a Venue; `/dashboard/manage` list; `/dashboard/manage/[venueId]` overview placeholder with the Venue header and tabs scaffold (Bookings, Customers, Settings, Reports link to empty states). ADR-0025. CONTEXT.md: Venue manager, Manage area.

**Files.** `packages/db/src/schema/venue-managers.ts`, `venues.ts`, `schema/index.ts`, new migration; `packages/api/src/venues/helpers/require-venue-manager.ts` (+ test); `packages/api/src/routers/venues/{listManaged,managedById,addManager,removeManager,searchManagerUsers}.ts` (+ tests), `index.ts`; `apps/web/src/components/app-sidebar.tsx`, `apps/web/src/lib/dashboard-paths.ts`, `apps/web/src/app/dashboard/venues/[id]/page.tsx`, `apps/web/src/app/dashboard/manage/**`; `docs/adr/0025-*.md`; `CONTEXT.md`.

**Acceptance.**
- An Operator adds and removes a manager on a Venue; adding twice is `CONFLICT`; a non-Operator calling `addManager` is `FORBIDDEN`.
- `listManaged` returns only managed Venues for a manager, every Venue for an Operator, `[]` otherwise; the sidebar entry follows that result.
- `requireVenueManager` passes for Operator metadata or a manager row and refuses everyone else (PGlite test).
- `/dashboard/manage` lists managed Venues and opens the overview; a User with no managed Venue sees the empty-state gate (OperatorGate shape), not a 403.
- `pnpm exec turbo run typecheck lint test` passes; migration applies on PGlite.

### Ticket 2. Venue managers edit Venue details and Courts

**What to build.** Widen `addCourt`, `renameCourt`, `deleteCourt`, `uploadLogo`, `clearLogo` from `operatorProcedure` to Operator-or-manager (same paths, same inputs). New `venues.updateDetails` (phone, website). Settings page Details and Courts tabs in the Manage area, reusing the Operator Venue page's Court components where sensible. `deleteCourt`'s Booking guard is a one-line addition in ticket 5 (the table does not exist yet); note it in the ticket.

**Files.** `packages/api/src/routers/venues/{addCourt,renameCourt,deleteCourt,uploadLogo,clearLogo,updateDetails}.ts` (+ tests for the manager door), `apps/web/src/app/dashboard/manage/[venueId]/settings/**`.

**Acceptance.**
- A manager adds, renames and deletes a Court on their Venue and is refused on a Venue they do not manage; Operator behaviour is unchanged.
- A manager edits phone and website; name, city and country are refused on `updateDetails` (not in the input) and still editable by Operators on `venues.update`.
- Logo upload and clear work for a manager through the existing storage module.

### Ticket 3. Opening hours, Closures, Booking settings and the Cancellation policy

**What to build.** Migration B. `@repo/validators/cancellation-policy` (schema and type). `@repo/domain/booking-refund.ts` (2.3, pure, exhaustive tests). Doors `venues.setOpeningHours`, `venues.addClosure`, `venues.removeClosure`, `venues.updateBookingSettings`, `venues.updateCancellationPolicy`. `managedById` returns hours, Closures and the policy. Settings tabs: Opening hours (seven weekday editors, multiple windows, "copy to all days"), Closures (list with upcoming first, add whole-Venue or per-Court; the conflicts prompt lists `affectedBookingIds` and, until ticket 8 ships cancel, only shows them), Cancellation policy (tier editor with presets and the live Customer-facing preview from `describeCancellationPolicy`), Booking settings (accepting switch, slot, durations, horizon, lead, description, notes). Seed: a Venue with hours, policy and settings. CONTEXT.md: Opening hours, Closure, Accepting bookings, Cancellation policy. ADR-0027 (the policy half; the price half lands in ticket 4, same file).

**Files.** `packages/db/src/schema/{venue-opening-hours,venue-closures,venues}.ts`, migration; `packages/validators/src/cancellation-policy.ts` (+ test); `packages/domain/src/booking-refund.ts` (+ test); `packages/api/src/routers/venues/{setOpeningHours,addClosure,removeClosure,updateBookingSettings,updateCancellationPolicy}.ts` (+ tests); `apps/web/.../settings/**`; `packages/api/scripts/seed.ts`; `docs/adr/0027-*.md`; `CONTEXT.md`.

**Acceptance.**
- Overlapping windows, off-grid minutes, `closes <= opens`, `closes > 1800` are refused with messages; an empty array closes the weekday.
- A Closure with a Court on another Venue is refused; `addClosure` returns the ids of occupying Bookings inside it (empty until ticket 5, test added there).
- Turning `acceptingBookings` on with no Court or on a Soft-archived Venue is refused; changing `slotMinutes` while hours are off the new grid is refused; durations outside 30–240 or not multiples of `slotMinutes` are refused.
- Policy: tiers must be strictly decreasing in hours and non-increasing in percent, 1–5 tiers or none, percents 0–100, `customerCancelUntilMinutes` 0–1440; the three presets round-trip.
- `booking-refund` unit tables: single tier full/none; two tiers at exactly the boundary hour (boundary belongs to the earlier, higher tier); `lateRefundPercent` after the last tier; `tiers: []` with late 100 (always free); `paidFils` 0 gives `refundDueFils` 0 and a non-zero `cancellationChargeFils`; rounding to fils; `customerMayCancelAt` at exactly the limit; `describeCancellationPolicy` lines for each preset; `nextRefundStep` returns the next deadline and percent or null when nothing changes anymore.

### Ticket 4. Pricing rules and the pure Booking price

**What to build.** Migration C. `@repo/domain/booking-price.ts`: `priceForInterval(rules, { courtId, startsAt, endsAt })` → `{ fils } | { uncovered: true }`, with the Court-beats-Venue rule and overnight windows, plus `formatBookingPriceFils` next to the Price per player formatter. Door `venues.setPricingRules` (whole-set replace, overlap check per scope). Settings Pricing tab: rule table, "base rate" shortcut that writes one all-week all-day rule, per-Court override rows. Seed: base and peak rules. CONTEXT.md: Pricing rule. ADR-0027 price half.

**Files.** `packages/db/src/schema/venue-pricing-rules.ts`, migration; `packages/domain/src/booking-price.ts` (+ test); `packages/api/src/routers/venues/setPricingRules.ts` (+ test); `apps/web/.../settings/pricing/**`; `docs/adr/0027-*.md`; `CONTEXT.md`.

**Acceptance.**
- Unit tests: a 90-minute interval spanning an off-peak → peak boundary is priced pro-rata and rounded to fils; a Court rule overrides a Venue rule for that Court only; an interval with an uncovered minute returns `uncovered`; a window crossing midnight prices on the opening weekday.
- Overlapping rules on the same scope are refused; the same weekday × time on different Courts is allowed.
- Rates above `PRICE_PER_PLAYER_MAX_FILS` or negative are refused.

### Ticket 5. Bookings table, Slot availability and the Customer Booking doors

**What to build.** Migration D (decide the exclusion constraint by running the PGlite harness; record the outcome in ADR-0026). `@repo/domain/booking-slots.ts`: pure `slotsForDay(input)` producing per-Court starts and priced durations from hours, Closures, rules, occupying Bookings, settings and `now`. `@repo/domain/booking-copy.ts`. Shared `packages/api/src/bookings/{availability,reserve,cancel}.ts` (reserve expires lapsed holds; cancel writes `refundDueFils` and `cancellationChargeFils` from `booking-refund` and, in this ticket, has no ledger to move). Doors `bookings.listBookableVenues`, `venueForBooking`, `venueAvailability`, `create` (in this ticket: reserves and confirms in one step with `paymentStatus = pending`; ticket 6 reshapes it into the two-step flow), `listMine`, `byId` (with the `cancel` block), `cancel`. `deleteCourt` Booking guard. `addClosure` conflicts test. Seed Bookings. CONTEXT.md: Booking, Slot, Customer, No-show. ADR-0024, ADR-0026. No UI in this ticket; it is verifiable through tests and a server-side caller.

**Files.** `packages/db/src/schema/bookings.ts` (+ enums), migration; `packages/domain/src/{booking-slots,booking-copy}.ts` (+ tests); `packages/api/src/bookings/*.ts` (+ tests); `packages/api/src/routers/bookings/{index,listBookableVenues,venueForBooking,venueAvailability,create,listMine,byId,cancel}.ts` (+ tests); `packages/api/src/root.ts`; `packages/api/src/routers/venues/deleteCourt.ts`; `docs/adr/0024-*.md`, `0026-*.md`; `CONTEXT.md`.

**Acceptance.**
- Two concurrent `create` calls for the same Court and overlapping interval: exactly one succeeds, the other is `CONFLICT` "That slot was just taken" (test with two transactions on PGlite, or sequential plus the lock path asserted).
- `create` refuses: Venue not accepting, archived, no Court, start off-grid, outside Opening hours, inside a Closure, uncovered price, before `now + minLead`, beyond horizon, Court on another Venue, overlapping an occupying Booking. Cancelled, no-show, expired and lapsed `pending_payment` rows do not block, and a lapsed row is marked `expired` by the reserve pass.
- The policy snapshot on the Booking equals the Venue's policy at create; editing the Venue policy afterwards does not change it.
- `venueAvailability` omits past Slots, Closed Courts, taken Slots, and durations that would run past closing or into a Booking; prices equal `priceForInterval`.
- `cancel` succeeds while `customerMayCancelAt` and is refused afterwards with the Venue phone hint; it is refused for a non-holder; the row records `cancelledBy = customer`, `refundDueFils` and `cancellationChargeFils` per the snapshot.
- `byId.cancel` reports `allowed`, `until`, `refundPercentNow`, `refundDueFilsNow` and `nextStep` consistent with `booking-refund` at the request time.
- `listMine` splits upcoming and past and paginates; `byId` is visible to the holder and a manager and refused to others.
- `deleteCourt` refuses while an upcoming occupying Booking exists.

### Ticket 6. Payment ledger, the provider boundary and the manual adapter

**What to build.** Migration E. `@repo/domain/booking-payment.ts` (`PAYMENT_HOLD_MINUTES`, pure `summarisePaymentStatus(rows)`, labels). `packages/api/src/payments/{provider,manual,index,handle-webhook}.ts` (2.4; `handle-webhook` is a no-op for `manual` and the entry point ticket 16 fills). `packages/api/src/bookings/payments.ts` (the one writer). Reshape `bookings.create` into the two-step flow: `pending_payment` with a hold, `beginPayment`, `deferred` confirms in-transaction; add `bookings.confirmPayment` and `bookings.retryPayment`. `cancel` module moves the ledger: manual leaves `refundDueFils` for the manager; provider path calls `provider.refund` (exercised with a fake provider in tests). Manager doors `bookings.settlePayment` and `bookings.recordRefund` (the Booking page UI for the ledger lands in ticket 7 with the page; this ticket ships the doors and a minimal ledger section on the Operator-visible Booking read used by tests). `games.byId` is untouched. ADR-0028 (pending). CONTEXT.md: Payment, Payment provider, Booking (amended), the `paymentStatus` sentence in No-show.

**Files.** `packages/db/src/schema/booking-payments.ts` (+ enums), migration; `packages/domain/src/booking-payment.ts` (+ test); `packages/api/src/payments/*.ts` (+ tests with a fake provider implementing the interface); `packages/api/src/bookings/{payments,reserve,cancel}.ts` (+ tests); `packages/api/src/routers/bookings/{create,confirmPayment,retryPayment,settlePayment,recordRefund}.ts` (+ tests); `packages/api/scripts/seed.ts`; `docs/adr/0028-*.md`; `CONTEXT.md`.

**Acceptance.**
- With `PAYMENT_PROVIDER` unset: `create` returns a `confirmed` Booking, one `manual` Payment `pending`, `payment.kind = "deferred"`; `confirmPayment` and `retryPayment` are refused (`BAD_REQUEST`).
- With the fake provider returning `client_action`: `create` leaves `pending_payment` with `holdExpiresAt = now + 10 min` and the Slot occupied; `confirmPayment` with the fake returning `paid` confirms; returning `failed` marks the Payment failed and keeps the hold; `retryPayment` opens a second row; a lapsed hold makes the Slot free and the next reserve pass marks the Booking `expired`; `create` with the fake returning `failed` cancels the Booking at once.
- `settlePayment`: `paid` needs a method, sets `settledBy` and `settledAt`, flips `bookings.paymentStatus`; `waived` and `failed` transitions; a provider-backed `paid` row cannot be settled by hand.
- `recordRefund`: refuses amounts above the refundable remainder; `partially_refunded` then `refunded` at the full amount; manual records without a provider call; the fake provider's `refund` is called with the right amount and a failure leaves the ledger untouched.
- Customer cancel on a `paid` manual Booking sets `refundDueFils` per the policy and leaves the ledger `paid` until the manager records the refund; Venue cancel sets `refundDueFils = paidFils`.
- `summarisePaymentStatus` unit table covers every status mix including a failed attempt followed by a paid one.
- Invariant 11 holds after every door (a test re-derives the summary from rows and compares).

### Ticket 7. Manage area Bookings calendar and list

**What to build.** Door `bookings.listForVenue` (range ≤ 31 days, grid payload, payment status filter). Web `/dashboard/manage/[venueId]/bookings`: day view (Courts as columns, rows on the grid, Closures hatched, Bookings as blocks with holder and payment badge, pending-payment blocks distinct), week view (one row per Court), list tab with filters, Booking page and sheet (read-only in this ticket except the Payment section, which ships with settle, waive, mark failed and record refund since the doors exist). Overview page fills "Today" and "Outstanding payments".

**Files.** `packages/api/src/routers/bookings/listForVenue.ts` (+ test); `apps/web/src/app/dashboard/manage/[venueId]/bookings/**`, `apps/web/src/components/manage/**` (calendar grid, booking block, booking sheet, payment ledger section).

**Acceptance.**
- A manager sees their Venue's Bookings for a day and a week; a 40-day range is refused; another Venue's manager is refused.
- Grid rows match `slotMinutes`; Closures render hatched; Bookings outside Opening hours (manager-made) still render; live `pending_payment` rows render as pending and lapsed ones do not render.
- Filters by Court, status, payment status and source narrow the list; the list is sorted by start.
- The Payment section shows every ledger row and the refundable maximum; settle and refund update the badge without a reload.

### Ticket 8. Manager creates, edits, cancels and marks no-show

**What to build.** Doors `bookings.createForVenue`, `searchCustomers`, `update`, `cancelForVenue`, `markNoShow`. Web: create page (holder picker with Users and Guests, Court, date, start, duration, price prefilled and editable, payment choice: pending at Venue / paid now with method and reference / waived, notes), "click a free cell" shortcut from the calendar, Booking sheet actions (edit time/Court/price/notes, cancel with reason and the refund the Venue will owe, mark no-show after start), the Closure conflicts prompt now offers "Cancel these Bookings". CONTEXT.md: Guest.

**Files.** `packages/api/src/routers/bookings/{createForVenue,searchCustomers,update,cancelForVenue,markNoShow}.ts` (+ tests); `apps/web/.../bookings/new/page.tsx`, `.../bookings/[bookingId]/page.tsx`, sheet components; `CONTEXT.md`.

**Acceptance.**
- A manager books for a User and for a Guest (name and phone required together); overlapping is `CONFLICT`; lead and horizon are ignored; a past `endsAt` is refused; a typed price overrides the rules and is stored; the Booking is `confirmed` with a `manual` Payment in the chosen state.
- `update` moving a Booking onto a taken interval is refused; moving a Booking with a live Game is refused with "Cancel the Game first"; repricing happens unless a price is given; a price change on a paid Booking is refused.
- `cancelForVenue` works after the Customer limit and before `endsAt`, also on `pending_payment`, and sets `refundDueFils = paidFils`; `markNoShow` only after start and only from `confirmed` and leaves the ledger untouched.
- A Soft-archived Venue refuses create and update and allows cancel and no-show.

### Ticket 9. Customers list and Customer profile

**What to build.** Doors `bookings.listCustomers`, `bookings.customerById`. Web Customers table with search and sort (including owed); Customer profile with aggregates (paid, refunded, owed), Booking history with payment summaries and a "New Booking" link that prefills the holder.

**Files.** `packages/api/src/routers/bookings/{listCustomers,customerById}.ts` (+ tests); `apps/web/.../customers/**`.

**Acceptance.**
- Aggregates count only this Venue's Bookings; a User with Bookings at two Venues shows different numbers to each manager.
- `owedFils` sums pending payments on confirmed or no-show Bookings and excludes cancelled and expired ones.
- Guests appear by phone with `userId: null` and open a Guest profile.
- Sorting by last visit, Bookings, no-shows, owed and name works; search matches name, username and phone.

### Ticket 10. Venue reports

**What to build.** `venueReports` router with `occupancy`, `revenue`, `bookingsOverTime`, `customers`. Web Reports page: range and bucket controls (presets: this week, last 30 days, this month, last month, custom), four sections with charts (follow the `dataviz` skill; brand palette is ink, paper, rule, hatch). Overview page fills the 7-day occupancy.

**Files.** `packages/api/src/routers/venueReports/{index,occupancy,revenue,bookingsOverTime,customers}.ts` (+ tests), `packages/api/src/root.ts`; `apps/web/.../reports/**`, chart components.

**Acceptance.**
- Occupancy: open minutes come from hours minus Closures; booked minutes include no-shows and exclude cancelled, expired and lapsed pending; a day with no hours has rate null, not 0.
- Revenue: booked by start day; collected by `settledAt` day; refunded by `refundedAt` day; a Booking paid the day after it was played lands in the right buckets; a cancelled Booking contributes nothing to booked but its refund appears; `outstandingFils` matches the Customers page total; the split by method sums to collected.
- Bookings over time: counts by outcome including expired, cancellation and no-show rates, average lead and duration; `created` and `expired` bucket by `createdAt`.
- Customers: new vs returning per bucket, top 10, Guest share, owed per Customer. Buckets respect `Asia/Bahrain` across a UTC day boundary (test at 23:30 Bahrain).
- Ranges over 366 days are refused.

### Ticket 11. Mobile: browse Venues and see availability (design-blocked)

**What to build.** `apps/mobile/src/booking/`: Venues list screen, Venue screen with policy lines, day strip and availability grid, slot selection and duration chips. Entry points per 7.1. Pure `slot-grid.ts` and `booking-model.ts` with tests. Uses `@repo/domain/booking-slots` types, `booking-refund` (`describeCancellationPolicy`) and `booking-copy`.

**Files.** `apps/mobile/app/(app)/book/{_layout,index,[venueId]/index}.tsx`, `apps/mobile/src/booking/**`, `apps/mobile/src/home/**` (entry row), `apps/mobile/src/navigation/tab-list.ts` if 7.1 says tab.

**Acceptance.**
- Venues accepting bookings are listed; a Venue turned off disappears on refetch; empty state matches 7.12.
- The Venue screen shows the policy lines exactly as `describeCancellationPolicy` returns them.
- Choosing a day fetches that day's availability; a past Slot never renders as free; hatch marks unavailable with an accessible label; selecting a start shows priced durations; a Slot taken between fetch and selection is handled on the next screen.
- No hex literals, all text through `Text`, one ink surface, at most two mount animations (lint and the ink registry test pass).

### Ticket 12. Mobile: confirm a Booking with the payment step, My bookings and Booking details (design-blocked)

**What to build.** Confirm screen with the policy deadlines for this start and the payment line keyed on `payment.mode`; `bookings.create` with the `deferred` path landing on details, the `client_action` path rendering a placeholder "Complete payment" screen that calls `confirmPayment` (the real provider UI is ticket 16), hold countdown, failure and `retryPayment`, `CONFLICT` recovery (toast, go back, refetch). Booking details with payment status, the live `cancel` block (refund now and next step), cancel confirm sheet stating the refund, the post-limit call-the-Venue state. My bookings (upcoming/past, pending-payment row with "Finish payment") and the Home Coming up row. Pure `confirm-model.ts` (button label, payment line, hold countdown, refund sentence) with tests.

**Files.** `apps/mobile/app/(app)/book/[venueId]/confirm.tsx`, `book/[venueId]/payment.tsx` (placeholder), `book/bookings/[bookingId].tsx`, `profile/bookings.tsx` (or per 7.7), `apps/mobile/src/booking/**`, `apps/mobile/src/home/coming-up.tsx`.

**Acceptance.**
- With the manual adapter a Customer books, sees "Pay BD x at the Venue", the toast, and lands on details; the price shown equals the server's `priceFils`.
- With the fake provider in a dev build the placeholder payment screen confirms, shows failure with retry while the hold is live, and shows "Hold expired" after it.
- Cancel is enabled while allowed and the sheet states the refund amount and percent from `byId.cancel`; afterwards the button is replaced by the Venue phone action; a server refusal shows the message.
- My bookings splits upcoming and past and paginates; a pending-payment row offers "Finish payment"; Home shows the next Booking as its own row, never as a Game card.

### Ticket 13. Booking notifications

**What to build.** Migration F. `notify` calls in `bookings.create` (on confirm, including the `deferred` and `confirmPayment` paths), `cancel`, `cancelForVenue`, `update` (changed fields only), `recordRefund`. Copy in `@repo/domain/notification-copy`. Web Notifications page and mobile Notifications rows render the five types with a link to the Booking (web: Manage area Booking page for managers, nothing else yet for Customers on web; mobile: Booking details).

**Files.** `packages/db/src/schema/notifications.ts`, migration; `packages/api/src/notifications/notify-booking-*.ts` (+ tests); the five doors; `packages/domain/src/notification-copy.ts` (+ test); web and mobile notification rows.

**Acceptance.**
- Managers receive `booking_created` only once the Booking is `confirmed` and never for a `pending_payment` that expires; they receive `booking_cancelled_by_customer`; the actor is excluded; the Customer receives the Venue-side types; Guest Bookings notify managers only.
- An `update` that changes only notes sends nothing; a `recordRefund` sends `booking_refund_recorded` to the Customer with the amount in the copy.
- Dedupe keys prevent a double row on retry (`confirmPayment` and a webhook racing produce one `booking_created`).

### Ticket 14. Unrated Games

**What to build.** Migration G (`games.rated`). `@repo/domain/game-rating-eligibility.ts` (`gameRates`). Guard in `applyRatedMatch`; `rated` column read and checked in `load-group-standing`; `games.byId` returns `rated` and `ratingImpact: null` when unrated; Last 10 rows carry `rated`; web and mobile Game details show "Unrated" in place of the Rating impact block; Last 10 cards and Match history mark an unrated Match. No door sets `rated = false` yet (ticket 15 does); a test fixture inserts one. CONTEXT.md: Unrated Game, Rated Match (amended). ADR-0029 (the unrated half; the groupless half is ticket 15, same file).

**Files.** `packages/db/src/schema/games.ts`, migration; `packages/domain/src/game-rating-eligibility.ts` (+ test); `packages/api/src/ratings/apply-rated-match.ts` (+ test), `packages/api/src/standing/load-group-standing.ts` (+ test), `packages/api/src/routers/games/byId.ts`, `packages/api/src/stats/completed-matches.ts`, `packages/domain/src/{completed-matches,match-history-card,game-rating-impact}.ts` (+ tests); `apps/web/src/app/dashboard/games/[id]/**`, `apps/mobile/src/game-details/rating-impact-card.tsx`, `apps/mobile/src/player-profile/**`; `docs/adr/0029-*.md`; `CONTEXT.md`.

**Acceptance.**
- Completing and confirming a Match on a Game with `rated = false` writes no rating events and leaves every seated User's `ratings` row untouched (PGlite test through `completeMatch` and `confirmMatchResult`); on a `rated = true` Game behaviour is unchanged (existing tests stay green).
- A `rated = false` Game on a Group contributes nothing to that Group's Standing; an unrated completed Match still appears in Last 10, counts in All time played/won/lost and in Win streak, and the row is marked unrated.
- `games.byId` returns `rated: false` and `ratingImpact: null`; web and mobile render "Unrated" and no Rating impact block.
- Every existing Game row is `rated = true` after the migration.

### Ticket 15. Booking Game: create a groupless unrated Game from a Booking

**What to build.** Door `bookings.createGame` (no Group, `rated = false`, `isPublic = false`, Venue, Court and window locked) calling `createFriendlyGame`, setting `bookings.game_id`; `games.byId` gains an optional `booking` summary (additive); the Booking cancel cascade in `packages/api/src/bookings/cancel.ts` (shipped in ticket 5 with a no-Game test; this ticket adds the Game test). Confirm that `createFriendlyGame` accepts `groupId: null` and the `rated` flag (small additive change to `CreateFriendlyGameInput`; `games.create` keeps passing `rated: true`). Mobile: "Create a game" on Booking details for the holder of a confirmed upcoming Booking with no Game, reusing `src/create-game` with Where and When locked and no Group step (design 7.8); review shows "Unrated"; linked Game card on Booking details; "Booked" line on Game details. Web Game details gets the same "Booked" line. CONTEXT.md: Booking Game, Game (amended). ADR-0029 groupless half. Seed: one Booking Game.

**Files.** `packages/api/src/routers/bookings/createGame.ts` (+ test), `packages/api/src/games/{create-friendly,utils}.ts`, `packages/api/src/routers/games/byId.ts`, `packages/api/src/bookings/cancel.ts` (+ test); `apps/mobile/app/(app)/book/bookings/[bookingId]/game.tsx`, `apps/mobile/src/create-game/**` (locked-step mode, Group step skipped), `apps/mobile/src/game-details/**`; `apps/web/src/app/dashboard/games/[id]/**`; `packages/api/scripts/seed.ts`; `docs/adr/0029-*.md`; `CONTEXT.md`.

**Acceptance.**
- Any holder (no `groupCreator` metadata, member of no Group) creates a Friendly game whose `groupId` is null, `rated` is false, `isPublic` is false, and whose Venue, Match Court and window equal the Booking's; a second call is refused ("This Booking already has a Game"); a non-holder, a Guest Booking, a `pending_payment`, cancelled or past Booking are refused.
- The holder is the Organizer: they can cancel, kick, add Sets and complete the Match; another User cannot. Invited Users join through Lookup invite and Invite link; an uninvited User cannot join (`userPassesJoinGate`).
- Cancelling the Booking (either door) cancels a live Booking Game in the same transaction and seated Users get the existing Game cancel notification; cancelling the Game leaves the Booking confirmed.
- Game details on web and mobile show the Booked line and "Unrated" when linked; the Booking details show the Game card.

### Ticket 16. Payment provider integration placeholder (design-blocked, provider-blocked)

**What to build.** Once ADR-0028 names the provider and 7.9 is resolved: the provider adapter in `packages/api/src/payments/<provider>.ts` behind the interface from ticket 6 (`begin`, `confirm`, `capture` if the provider holds, `refund`, `verifyWebhook`), `PAYMENT_PROVIDER` and the provider's secrets in `apps/api/.env.example` and the Railway environment, `alter type payment_provider add value`, the `POST /webhooks/payments/:provider` route in `apps/api` (raw body, signature verified by the adapter, then `handlePaymentWebhook`), the mobile payment screen replacing the ticket 12 placeholder with the provider's Expo client step (7.9), and ADR-0028 moved from pending to decided. Until then this ticket is a placeholder: do not start it, and do not add a provider SDK anywhere.

**Files.** `packages/api/src/payments/<provider>.ts` (+ tests against recorded fixtures), `packages/api/src/payments/index.ts`, migration; `apps/api/src/**` (one route), `apps/api/.env.example`; `apps/mobile/app/(app)/book/[venueId]/payment.tsx`, `apps/mobile/src/booking/**`; `docs/adr/0028-*.md`.

**Acceptance.**
- With `PAYMENT_PROVIDER=<provider>` a Customer completes the client step and the Booking confirms through `confirmPayment` or the webhook, whichever arrives first, exactly once.
- A failed or abandoned payment leaves the hold to lapse and the Slot frees.
- Customer and Venue cancellations refund the computed amount through the provider and the ledger records the reference; a provider refund failure surfaces to the manager and leaves the ledger untouched.
- The manual adapter still works when `PAYMENT_PROVIDER` is unset, so a Venue may keep "pay at Venue" (per-Venue choice of mode is a follow-up, not this ticket).

## Testing decisions

- Pure rules (`booking-slots`, `booking-price`, `booking-refund`, `booking-payment`, `game-rating-eligibility`) get exhaustive Vitest tables beside them in `@repo/domain`; these are the seams most likely to hide off-by-one errors (grid, midnight, horizon, tier boundaries, rounding, status folds).
- Every door is tested through its exported db-taking function on PGlite, including the manager/holder/Operator permission matrix once per door, not a copied matrix per test file. Prior art: `packages/api/src/routers/games/*.test.ts`.
- The payment boundary is tested with one fake provider implementing `PaymentProvider` in `packages/api/src/payments/fake.test-support.ts`, scripted per test (`client_action`, `held`, `failed`, refund failure). No network, no SDK.
- The double-booking test is the one concurrency test in the Workspace; keep it deterministic (open two transactions in the harness, or assert the advisory lock is taken and the overlap query runs inside the transaction). A second case covers a lapsed hold being expired by the competing reserve.
- Invariant 11 (ledger summary) is asserted by a helper that re-derives `paymentStatus` from rows after every payment test.
- Unrated Games are tested through the existing `completeMatch` and `confirmMatchResult` doors with a `rated = false` fixture, asserting no rating events, plus the Standing loader with a mixed Group.
- Reports are tested with a seeded week of Bookings and payments and exact expected numbers, including the Bahrain midnight case and a refund recorded on a later day.
- Mobile models (`slot-grid`, `booking-model`, `confirm-model`) are pure and tested; no component snapshots. Manual check per screen in the ticket.
- Web calendar: a pure `calendar-layout.ts` (block placement on the grid) is tested; the page is checked by hand.

## Risks

| Risk | Mitigation |
| --- | --- |
| The provider, once chosen, does not fit the `PaymentProvider` interface (for example redirect-only flows, or no refunds API) | The interface is small and the manual adapter is the only caller-visible behaviour until ticket 16; ticket 16 may extend the interface additively. `begin` already allows `client_action`, `held` and `deferred`. |
| The design (7.9) shows a payment UI that assumes a provider the ADR does not pick | The mobile placeholder screen is keyed on `payment.mode`; only ticket 16 changes. |
| Holds that never confirm pile up as `pending_payment` rows | They stop blocking at `holdExpiresAt` and are marked `expired` by the next reserve pass on that Court; `listMine` and the calendar hide lapsed rows; no scheduler needed. |
| Ledger and `bookings.paymentStatus` drift | One writer module, invariant 11 asserted in tests, both updated in one transaction. |
| Refund arithmetic disagreements with Venues | The policy is snapshotted on the Booking and shown to the Customer before they confirm; `refundDueFils` is written at cancel time and visible to both sides. |
| PGlite cannot load `btree_gist` | The advisory-lock path is the primary guard; the constraint is defence in depth and optional. |
| Overnight windows (to 06:00) complicate day keys | One convention everywhere: a window belongs to the weekday it opens on; `booking-slots` and the reports both use `productDayKey(startsAt - windowOffset)` from `@repo/domain/product-timezone`. Tests cover 01:00 Bookings. |
| Widening Court doors to managers | Same inputs and paths; only the auth helper changes; Operator tests stay green. |
| `rated` guard missed by a future rating writer | `applyRatedMatch` is the only writer today; the ADR names the guard, and `load-group-standing` double-checks. A grep-style test asserts no other module imports `ratingEvents` for insert. |
| Groupless Booking Games surfacing where a Group is assumed | Every path listed in 2.5 was read and handles `groupId = null`; ticket 15's acceptance covers Organizer, join gate, notifications and lists. The Games hub "My Games" already includes private created Games. |
| Customer and Guest matched by phone | Phone is normalised with `@repo/domain/phone-number` before storing `guest_phone`. |
