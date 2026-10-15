Status: draft, awaiting answers to section 8 and the design import

Tickets: not yet created in Linear. Section 9 lists them for the user to create in order.

Design source: a Claude Design project ("Booking flow.dc.html" plus "support.js", https://claude.ai/design/p/fea56e1b-5966-4cbb-981f-15fe74a0c7fc). It could not be fetched while this spec was written. When imported, place it at `.scratch/design/booking-flow/Booking flow.dc.html` and `.scratch/design/booking-flow/support.js` (the same shape as `.scratch/design/register-with-partner/`), then resolve section 7 and update the "Design source" line with the artboard ids.

Related specs and decisions that stay in force:

- `.scratch/venues/spec.md` and ADR-0007: Venue is the physical facility, Court is a named surface, Operator curates the catalog, Venue link is a Community's association.
- `.scratch/game-create-venue-court/spec.md`: every Game has one Venue chosen at create; a Friendly game's Match may point at one Court.
- `.scratch/game-price-per-player/spec.md` and the Fix track: money is stored in fils and shown in BD; `@repo/domain/price-per-player` has the parse and format helpers.
- `.scratch/mobile-and-api-server/spec.md`: Package boundaries, one product timezone (`Asia/Bahrain`), the locked mobile design system (section 4), Venue administration is web only.
- `.scratch/group-creator-ui-gate/spec.md`: Create Game is hidden unless Clerk `publicMetadata.groupCreator === true`.
- `.cursor/rules/api-one-endpoint-per-file.mdc`: one procedure per file, no service layers, shared modules only for rules used by two or more doors.

# Booking and facility management

## 1. Problem statement, actors, goals and non-goals

### Problem

A Venue exists in Temba only as a catalog entry: a name, a place and a list of Courts that Games point at. The people who run a Venue have no seat in the product. They cannot say when the Venue is open, what a Court costs, who has booked it or how full it is. Players can create a Game at a Venue, but nothing reserves the Court, so a Game at 19:00 on Court 2 is a wish, not a booking. Venue staff keep the real calendar somewhere else and the two never meet.

### Actors

| Actor | Who | Surface |
| --- | --- | --- |
| **Venue manager** (the "facility owner") | A User granted management of one or more Venues. Not a Community role and not an Operator. | Web App only (`apps/web`), a new Manage area. |
| **Operator** | Temba staff, unchanged. Curates Venues and Courts, and now grants and revokes Venue managers. Implicitly a Venue manager of every Venue. | Web App, the existing Venues area. |
| **Customer** | Any authenticated User seen from a Venue: someone who holds or has held a Booking there. A Customer need not belong to any Community or Group. | Mobile App (`apps/mobile`). The same doors also work from the Web App but no web Customer screens are planned in this spec. |
| **Guest** | A person without a Temba account for whom a Venue manager records a Booking by name and phone. | Only ever created from the Manage area. |

### Goals

1. A Venue manager runs their Venue from the web: Venue details, Courts, Opening hours, Closures, Pricing rules, Booking settings.
2. A Venue manager sees and controls every Booking at the Venue: calendar and list, create for a Customer or Guest, edit, cancel, mark no-show, record payment.
3. A Venue manager sees their Customers: list, profile, Booking history.
4. A Venue manager gets reports: occupancy, revenue, Bookings over time, Customer metrics, over a chosen date range.
5. A Customer on mobile browses Venues accepting bookings, sees Court availability by day, books a slot at a known price, sees and cancels their Bookings, and creates a Game attached to a Booking.
6. No Court is ever double-booked.

### Non-goals (this spec)

- Online payment collection, card holds and refunds through a provider. Section 8 Q1 recommends a v1 without a provider; the data model leaves room for it.
- Membership pricing, passes, packages, credits, discounts, promo codes.
- Recurring Bookings (every Tuesday at 19:00).
- Coaching sessions and the leftover `coach` / `coaching_session` tables. They keep pointing at Venue (ADR-0007) and are untouched.
- Equipment rental, lighting surcharges, add-ons.
- Reminders and push notifications (Phase 7 owns push). In-app Notifications for booking events are in scope, section 2.7.
- Reserving a Court automatically when a Game is created through the existing create flow (Q6).
- Court-level opening hours. Hours are per Venue; per-Court unavailability is a Closure.
- A public, signed-out booking page on the web.
- Multi-sport pricing. Venues are padel in the shipped UI; the schema does not block football.
- Overnight Opening hours past 06:00, split-second precision, or a timezone other than the product timezone.

## 2. Domain model

### 2.1 Entities

**Venue** (changed). Gains Booking settings:

| Field | Meaning | Default |
| --- | --- | --- |
| `acceptingBookings` | The one switch that lists the Venue on the mobile Venues list and opens the Customer doors. | `false` |
| `slotMinutes` | The grid step for Booking start times: 30 or 60. | 30 |
| `durationOptionsMinutes` | The durations a Customer may book, each a multiple of `slotMinutes`, 30–240. | `[60, 90]` |
| `bookingHorizonDays` | How far ahead a Customer may book, 1–90. | 14 |
| `minLeadMinutes` | The earliest a Customer may book before a start, 0–1440. | 60 |
| `cancellationCutoffHours` | A Customer may cancel until this many hours before the start, 0–168. | 24 |
| `description`, `bookingNotes` | Short text shown on the mobile Venue page (description) and on the confirm step (notes such as "pay at reception"). | null |

A Venue is **bookable** on a given day only if `acceptingBookings` is on, the Venue is not Soft-archived, it has at least one Court, Opening hours for that weekday, and a Pricing rule covering the slot. Everything else is derived from that.

**Court** (unchanged schema). A Court with an upcoming confirmed Booking cannot be deleted.

**Venue manager** (new). A row `(venueId, userId)` granted by an Operator. A User may manage many Venues. A Venue may have many managers. Managers cannot grant other managers in v1 (Q4).

**Opening hours** (new). Per Venue and weekday (0 = Sunday … 6 = Saturday, in the product timezone): `opensAtMinutes` and `closesAtMinutes` from midnight. Several windows per weekday are allowed (a split day) and must not overlap. `closesAtMinutes` may run to 1800 (06:00 the next day); such a window still belongs to the weekday it opened on. Both must be multiples of `slotMinutes`. No rows for a weekday means closed.

**Closure** (new). A dated block when Bookings cannot be made: `startsAt`, `endsAt` (instants), optional `courtId` (null = whole Venue), `reason` (free text, shown to Customers as "Unavailable" only). Existing confirmed Bookings inside a new Closure are not cancelled automatically; the Manage area lists them so the manager decides (section 5).

**Pricing rule** (new). Per Venue: optional `courtId` (null = every Court), `weekdays` (set of 0–6), `startMinutes`, `endMinutes` (same wall-clock convention as Opening hours), `hourlyRateFils`, `label` ("Peak", "Off-peak"). Rules on the same scope (Venue-wide, or the same Court) must not overlap in weekday × time. A Court rule beats a Venue-wide rule. A Booking's price is the sum over its interval of rate × covered minutes / 60, rounded to the nearest fils; if any minute of the interval has no rule, that slot is not bookable and the Manage calendar shows it as "no price". The simplest setup is one Venue-wide rule for all weekdays 00:00–24:00 (the "base rate").

**Slot** (derived, never stored). One Court, one start on the grid, one duration, one price, bookable or not. Computed from Opening hours, Closures, Pricing rules, existing Bookings, the Venue's settings and "now". The same pure function serves the Customer availability door, the manager calendar and the Booking create check.

**Booking** (new). The reservation of one Court for one interval.

| Field | Meaning |
| --- | --- |
| `venueId`, `courtId` | The Court must belong to the Venue. Immutable after create except through the manager edit door, which re-checks everything. |
| `userId` or `guestName` + `guestPhone` | Exactly one of: a Customer, or a Guest. |
| `startsAt`, `endsAt` | Instants. `endsAt - startsAt` is one of the Venue's duration options at create time. |
| `status` | `confirmed`, `cancelled`, `no_show`. |
| `source` | `app` (the Customer booked) or `venue` (a manager booked). |
| `priceFils` | Snapshot at create or at the last manager edit. Changing a Pricing rule later never reprices an existing Booking. |
| `paymentStatus` | `unpaid`, `paid`, `waived`, `refunded`. Set by hand by a manager in v1. |
| `paymentMethod` | `cash`, `card`, `online`, null. `online` is reserved for a later payment slice. |
| `paidAt` | When `paymentStatus` became `paid`. |
| `cancelledAt`, `cancelledByUserId`, `cancelledBy` (`customer` / `venue`), `cancelReason` | Cancellation audit. |
| `noShowAt` | When a manager marked it. |
| `gameId` | At most one Game, unique, on delete set null (section 2.4). |
| `managerNotes` | Free text visible to managers only. |
| `createdByUserId` | The User who created the row (the Customer, or the manager). |

**Customer** (derived, not a table). A User, as seen from one Venue: `User` joined to that Venue's Bookings. Customer metrics (first Booking, count, no-shows, last visit) are computed. There is no Customer row to create or delete. A Guest is not a Customer row either; Guest Bookings are matched by phone when a manager searches.

**Booking Game** (derived name). A Game whose Booking points at it. See 2.4.

### 2.2 States and transitions

Booking:

```text
                 create (Customer: app, Manager: venue)
                               │
                               ▼
                          confirmed
         ┌────────────────────┼──────────────────────┐
  cancel by Customer   cancel by manager        mark no-show
  (before cutoff)      (any time before endsAt)  (manager, after startsAt)
         ▼                    ▼                      ▼
      cancelled            cancelled               no_show
```

- "Upcoming", "In progress" and "Past" are derived from `status = confirmed` and the clock, like Finished Game. Nothing writes a `completed` status.
- `cancelled` and `no_show` are terminal. A manager who marked no-show by mistake creates a new Booking; there is no undo (same stance as Level override).
- Payment status moves independently: `unpaid → paid` (record payment), `unpaid → waived`, `paid → refunded`. Only managers move it in v1. A cancelled Booking may still be `paid` (the manager decides whether to refund; the app only records it).

### 2.3 Invariants

1. **No double booking.** For one Court, no two Bookings with `status = confirmed` overlap in time. Enforced inside the create and edit transactions: take `pg_advisory_xact_lock(hashtext(courtId))`, then run the overlap query, then insert. Additionally, if the PGlite harness loads `btree_gist`, add an exclusion constraint `EXCLUDE USING gist (court_id WITH =, tsrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmed')` in the same migration as the table as defence in depth. If PGlite cannot load it, skip the constraint and record that in the ADR (section 2.6).
2. **Start on the grid.** `startsAt` falls on the Venue's `slotMinutes` grid measured from the opening-day's midnight in the product timezone, and the interval lies inside one Opening hours window.
3. **Not in a Closure.** No minute of the interval overlaps a Closure for the whole Venue or for that Court.
4. **Priced.** Every minute of the interval is covered by a Pricing rule, or the caller is a manager who typed a price (the manager create and edit doors accept an explicit `priceFils` override; the Customer door never does).
5. **Customer limits.** A Customer books only when the Venue is bookable, `startsAt >= now + minLeadMinutes`, and `startsAt < startOfProductDay(now) + bookingHorizonDays` days. Managers ignore lead and horizon but not the past: a manager cannot create a Booking whose `endsAt` is in the past.
6. **Cancellation cutoff.** A Customer cancels only while `now <= startsAt - cancellationCutoffHours`. A manager cancels any confirmed Booking before `endsAt`. After `endsAt` the only move is no-show, and only from `confirmed`.
7. **Exactly one holder.** `userId` xor (`guestName` and `guestPhone`).
8. **Court belongs to Venue.** Checked on create and edit.
9. **Soft-archive.** A Soft-archived Venue is not bookable, refuses manager create and edit, still allows cancel, no-show and payment recording, and still shows in the Manage area as history.
10. **Snapshot price.** Changing Pricing rules, Opening hours or Closures never changes an existing Booking's `priceFils`, `startsAt` or `endsAt`.

### 2.4 Booking and Game

- A Booking may point at one Game; a Game is pointed at by at most one Booking (`bookings.game_id` unique). The Game schema does not change.
- The Booking holder creates the Game from the Booking with a dedicated door (`bookings.createGame`). It calls the shared Friendly Game create module with the Venue, Court, `windowStart = startsAt` and `windowEnd = endsAt` locked, so the Game's Venue, its one Match's Court and its window equal the Booking's. Only a Friendly game (one Match, four players) fits one Court slot. Americano and Friendly tournament are not created from a Booking.
- The existing Game rules apply unchanged: the Game must belong to a Group on which the holder may create Games (`assertMayCreateGameOnGroup`), and the Create Game control is hidden unless the holder has `groupCreator` metadata. See Q7 for the recommended default and the alternative.
- Cancelling a Booking that has a live (not cancelled) Game cancels that Game too, in the same transaction, through the existing Game cancel rule, so seated Users hear about it through the existing Game notification path. Cancelling the Game does not cancel the Booking: the Court stays reserved for the holder until they or the Venue cancel it.
- A manager edit that moves the Booking's time or Court while a live Game exists is refused with a message to cancel first. (Moving a Game window and Match Court is an Organizer action with its own rules; this spec does not reach into it.)
- Guest Bookings cannot have a Game.

### 2.5 New CONTEXT.md terms (proposed)

**Venue manager**: A User granted management of one Venue by an Operator: Venue details, Courts, Opening hours, Closures, Pricing rules, Bookings, Customers and reports for that Venue, from the Web App. A User may manage many Venues. Not a Community role, not an Operator; an Operator may do everything a Venue manager may.
_Avoid_: facility owner, venue admin, Owner (that is a Community role), Admin, Operator, staff

**Customer**: A User as seen from one Venue: someone who holds or has held a Booking there. Derived from User and Bookings, never a separate record. Needs no Community or Group membership.
_Avoid_: client, member (that is a Community role), player (when you mean this view), account

**Guest**: A person without a Temba account recorded on a Booking by name and phone by a Venue manager. A Guest Booking has no Customer and never a Game.
_Avoid_: walk-in (as the name of the entity), offline customer, anonymous User

**Booking**: One Court reserved for one interval by one Customer or Guest, at a price fixed when it was made. Confirmed on create; may become cancelled or no-show. Distinct from a Game: a Game is the event, a Booking is the Court.
_Avoid_: reservation, slot (that is the offer, not the reservation), Game, session, order

**Slot**: One Court, one start on the Venue's grid, one duration and one price, offered to a Customer. Derived from Opening hours, Closures, Pricing rules and existing Bookings; never stored.
_Avoid_: Booking (that is the reservation), Position, Match slot, time slot (as an entity), window (that is a Game's registration window)

**Opening hours**: The windows in which a Venue offers Slots, per weekday in the product timezone. A weekday may have several windows; none means closed. A window may run past midnight to 06:00 and still belongs to the day it opened.
_Avoid_: schedule, timetable, availability (that is the derived set of Slots), business hours

**Closure**: A dated block, for the whole Venue or one Court, when no Slot is offered. Shown to Customers as unavailable without the reason.
_Avoid_: maintenance (that is a reason), holiday, block-out, Soft-archive (that hides the Venue)

**Pricing rule**: An hourly rate in fils for a set of weekdays and a time range, for every Court or one Court. A Court rule beats a Venue-wide rule. Rules on one scope never overlap. The price of a Booking is fixed from the rules at the moment it is made.
_Avoid_: tariff, rate card, price list, Price per player (that is a Game field), fee

**Cancellation cutoff**: The hours before a Booking's start until which the Customer may cancel it. After the cutoff only a Venue manager may cancel.
_Avoid_: cancellation policy (the text), refund window, grace period

**No-show**: A confirmed Booking the Customer or Guest did not turn up for, marked by a Venue manager after the start. Terminal. Counts against the Customer in reports and is never a cancellation.
_Avoid_: missed, absent, cancelled (that is a different end state), forfeit (that is a Match term)

**Payment status**: Whether a Booking's price was collected: unpaid, paid, waived or refunded. Recorded by a Venue manager; Temba collects nothing in v1.
_Avoid_: paid flag, transaction, invoice, Price per player

**Accepting bookings**: The Venue switch that lists it on the mobile Venues list and opens Customer Booking doors. Off by default. A Venue may be live in the catalog and not accepting bookings.
_Avoid_: bookable (that is the derived per-day state), published, enabled, open (that is Opening hours)

**Booking Game**: A Friendly game created from a Booking by its holder. Its Venue, Court and window are the Booking's. Cancelling the Booking cancels the Game; cancelling the Game keeps the Booking.
_Avoid_: booked Game, court Game, reservation Game, Game booking

**Manage area**: The Web App pages under `/dashboard/manage` where a Venue manager runs their Venues. Distinct from the Operator Venues area and from Community administration.
_Avoid_: dashboard (when you mean this area), admin panel, facility portal, venue admin

### 2.6 ADRs to write

- **ADR-0024 Booking is a Venue ledger, not a Game property.** A Booking reserves a Court independently of Games; a Game may attach to one Booking; the cascade runs Booking → Game only. Considered: putting reservation fields on Game (rejected: Guests, Venue-made Bookings and Bookings without a Game have no Game to hold them).
- **ADR-0025 Venue manager is a per-Venue table role.** Not Clerk `publicMetadata`, because it is per Venue, many-to-many and granted by Operators in the product, not in the Clerk dashboard. Operator stays metadata.
- **ADR-0026 No double booking is enforced in the create transaction.** Advisory lock plus overlap query inside the transaction; an exclusion constraint when the test harness supports `btree_gist`. Slots are derived and never stored, so there is no slot row to lock.
- **ADR-0027 Booking prices are snapshots in fils.** Same unit as Price per player; rules change, Bookings do not.

Payment provider choice is a later ADR, when Q1 lands on online payment.

### 2.7 Notifications

Extend the existing fan-out Notifications (ADR-0022) with four types, additive to the `notification_type` enum, and a nullable `booking_id` column on `notifications` (on delete cascade):

| Type | Recipient | Audience |
| --- | --- | --- |
| `booking_created` | Venue managers of that Venue, excluding the actor | admin |
| `booking_cancelled_by_customer` | Venue managers | admin |
| `booking_cancelled_by_venue` | The Customer | player |
| `booking_changed_by_venue` | The Customer (time, Court or price changed by a manager) | player |

No-show and payment recording do not notify. Copy goes next to the other notification copy in `@repo/domain/notification-copy`. Reminders before a Booking are Phase 7 (push) and out of scope.

## 3. Data: tables, columns and migrations

All timestamps follow the existing `timestamp` (without time zone) column pattern; the product timezone is applied in code with `@repo/domain/product-timezone`. Ids are `uuid` default random. Every table gets `created_at` and `updated_at` like its neighbours. New schema files go under `packages/db/src/schema/` and are exported from `packages/db/src/schema/index.ts`.

### Migration A (ticket 1): Venue managers and Booking settings

- `venue_managers`: `id`, `venue_id` (FK venues, cascade), `user_id` (FK user, cascade), `granted_by_user_id` (FK user, set null), timestamps. Unique `(venue_id, user_id)`. Index on `user_id`.
- `venues` adds: `accepting_bookings boolean not null default false`, `slot_minutes integer not null default 30`, `duration_options_minutes integer[] not null default '{60,90}'`, `booking_horizon_days integer not null default 14`, `min_lead_minutes integer not null default 60`, `cancellation_cutoff_hours integer not null default 24`, `description varchar(1000)`, `booking_notes varchar(1000)`. Checks: `slot_minutes in (30, 60)`, ranges from 2.1.

### Migration B (ticket 3): Opening hours and Closures

- `venue_opening_hours`: `id`, `venue_id` (cascade), `weekday smallint` (0–6 check), `opens_at_minutes integer`, `closes_at_minutes integer` (check `0 <= opens < closes <= 1800`), timestamps. Index `(venue_id, weekday)`. Non-overlap per weekday is enforced in the door (small sets, read-modify-write inside a transaction with the Venue row locked `FOR UPDATE`).
- `venue_closures`: `id`, `venue_id` (cascade), `court_id` (FK courts, cascade, nullable), `starts_at`, `ends_at` (check `starts_at < ends_at`), `reason varchar(255)`, `created_by_user_id`, timestamps. Index `(venue_id, starts_at)`.

### Migration C (ticket 4): Pricing rules

- `venue_pricing_rules`: `id`, `venue_id` (cascade), `court_id` (nullable, cascade), `weekdays smallint[]` (non-empty, each 0–6), `start_minutes`, `end_minutes` (check `0 <= start < end <= 1800`), `hourly_rate_fils integer` (check `0 <= rate <= 1_000_000_000`, same cap as Price per player), `label varchar(60)`, timestamps. Index `(venue_id)`. Non-overlap per scope enforced in the door as for Opening hours.

### Migration D (ticket 5): Bookings

- Enums: `booking_status` (`confirmed`, `cancelled`, `no_show`), `booking_source` (`app`, `venue`), `booking_payment_status` (`unpaid`, `paid`, `waived`, `refunded`), `booking_payment_method` (`cash`, `card`, `online`), `booking_cancelled_by` (`customer`, `venue`).
- `bookings`: `id`, `venue_id` (FK venues, restrict), `court_id` (FK courts, restrict — a Court with Bookings is not deletable; the door refuses it first with a message), `user_id` (FK user, set null, nullable), `guest_name varchar(255)`, `guest_phone varchar(32)`, `starts_at`, `ends_at` (check `starts_at < ends_at`), `status` default `confirmed`, `source`, `price_fils integer not null`, `payment_status` default `unpaid`, `payment_method` nullable, `paid_at`, `cancelled_at`, `cancelled_by_user_id` (set null), `cancelled_by`, `cancel_reason varchar(500)`, `no_show_at`, `game_id` (FK games, set null, unique), `manager_notes varchar(1000)`, `created_by_user_id` (FK user, set null), timestamps.
- Checks: `(user_id is not null) <> (guest_name is not null and guest_phone is not null)`; `game_id is null or user_id is not null`.
- Indexes: `(court_id, starts_at)`, `(venue_id, starts_at)`, `(user_id, starts_at)` partial `where user_id is not null`, `(venue_id, status)`.
- Optional in the same migration file, see invariant 1: `create extension if not exists btree_gist` and the exclusion constraint. Decide in ticket 5 by running the PGlite harness.

### Migration E (ticket 12): Notifications

- `alter type notification_type add value` × 4, and `notifications.booking_id uuid references bookings(id) on delete cascade`.

Seeds: `pnpm --filter @repo/api db:seed` gains one Venue accepting bookings with three Courts, Opening hours Sun–Sat 08:00–24:00, a base Pricing rule and a peak rule, one Venue manager (the first seeded User), and a handful of Bookings across the current week (tickets 3–5 extend the seed as the tables arrive).

## 4. API

Rules for all doors: one procedure per file, input validated with Zod inline unless two doors share the schema (then `@repo/validators`), the Temba User resolved with `resolveAppUser`, PGlite tests beside each file through the exported db-taking function. `apps/api` changes only if a new router must be mounted, and routers are mounted through `root.ts`, so it does not.

New shared modules (each used by two or more doors):

- `packages/api/src/venues/helpers/require-venue-manager.ts`: `requireVenueManager(db, { venueId, userId, publicMetadata })` passes for an Operator or a row in `venue_managers`, else `FORBIDDEN` "Only Venue managers can manage this Venue". Also `listManagedVenueIds(db, userId)`.
- `packages/api/src/bookings/availability.ts`: loads a Venue's day (Opening hours for the weekday, Closures, Pricing rules, confirmed Bookings) and calls the pure `@repo/domain/booking-slots` function. Used by `bookings.venueAvailability`, `bookings.create`, `bookings.createForVenue`, `bookings.update`, `bookings.listForVenue`.
- `packages/api/src/bookings/reserve.ts`: the no-double-booking transaction (advisory lock, overlap check, insert or update). Used by create, createForVenue and update.
- `packages/api/src/bookings/cancel.ts`: the cancel rule shared by the Customer and manager cancel doors, including the Booking Game cascade.
- `packages/domain/src/booking-slots.ts`: pure slot computation (client-usable for the mobile grid, server-authoritative). `packages/domain/src/booking-price.ts`: pure price from rules. `packages/domain/src/booking-cancel-window.ts`: pure cutoff check. `packages/domain/src/booking-copy.ts`: status labels and the Customer-facing cancellation copy.

### 4.1 `venues` router (additive)

| File | Auth | Input → Output | Rule |
| --- | --- | --- | --- |
| `listManaged.ts` | protected | → `{ id, name, city, country, logoImageUrl, acceptingBookings, archivedAt, courtCount, upcomingBookingCount }[]` | Venues the caller manages; every live and archived Venue for an Operator. Empty array for everyone else. Web only. |
| `managedById.ts` | protected + Venue manager | `{ venueId }` → Venue with Booking settings, Courts, Opening hours, Closures (next 90 days), Pricing rules, manager list | The Manage area's one read for settings pages. Web only. |
| `addManager.ts` | operator | `{ venueId, userId }` → row | Operator grants. Refuse duplicate with `CONFLICT`. |
| `removeManager.ts` | operator | `{ venueId, userId }` → `{ ok }` | Operator revokes. Idempotent. |
| `searchManagerUsers.ts` | operator | `{ query }` → `{ id, name, username, image }[]` | Reuses `packages/api/src/invites/search-lookup-users.ts` with no membership filter. |
| `updateBookingSettings.ts` | Venue manager | `{ venueId, acceptingBookings?, slotMinutes?, durationOptionsMinutes?, bookingHorizonDays?, minLeadMinutes?, cancellationCutoffHours?, description?, bookingNotes? }` → Venue | Validates ranges; refuses turning `acceptingBookings` on when the Venue is Soft-archived or has no Court; durations must be multiples of `slotMinutes`; changing `slotMinutes` is refused while any Opening hours or Pricing rule is not on the new grid. |
| `updateDetails.ts` | Venue manager | `{ venueId, phone?, website? }` → Venue | Manager edits contact fields. Name, city, country and lat/lng stay on the Operator `update` door (they form the catalog identity). |
| `setOpeningHours.ts` | Venue manager | `{ venueId, weekday, windows: { opensAtMinutes, closesAtMinutes }[] }` → windows | Replaces that weekday's windows in one transaction. Refuses overlaps, off-grid minutes and `closes > 1800`. Empty array closes the day. |
| `addClosure.ts` | Venue manager | `{ venueId, courtId?, startsAt, endsAt, reason? }` → closure + `affectedBookingIds` | Court must belong to Venue; returns confirmed Bookings inside the block so the UI can offer to cancel them (it never cancels on its own). |
| `removeClosure.ts` | Venue manager | `{ closureId }` → `{ ok }` | |
| `setPricingRules.ts` | Venue manager | `{ venueId, rules: { id?, courtId?, weekdays, startMinutes, endMinutes, hourlyRateFils, label? }[] }` → rules | Replaces the Venue's rule set in one transaction; refuses overlaps per scope and off-grid minutes. Whole-set replace keeps the overlap check simple and matches a single settings form. |
| `addCourt.ts`, `renameCourt.ts`, `deleteCourt.ts` (existing) | widened: operator **or** Venue manager | unchanged inputs | Same behaviour; `deleteCourt` now refuses when the Court has a confirmed Booking with `endsAt > now` ("Cancel its Bookings first"). Procedure paths unchanged. |
| `uploadLogo.ts`, `clearLogo.ts` (existing) | widened: operator or Venue manager | unchanged | |

### 4.2 `bookings` router (new, `packages/api/src/routers/bookings/`)

Customer doors (mobile calls these; web may):

| File | Auth | Input → Output | Rule |
| --- | --- | --- | --- |
| `listBookableVenues.ts` | protected | `{ city? }` → `{ id, name, city, country, logoImageUrl, courtCount, fromHourlyRateFils, todayOpen: { opensAtMinutes, closesAtMinutes }[] }[]` | Live Venues with `acceptingBookings`, at least one Court and at least one Pricing rule. Sorted by name. `fromHourlyRateFils` is the lowest rule rate. |
| `venueForBooking.ts` | protected | `{ venueId }` → Venue public fields, description, bookingNotes, Courts, Opening hours by weekday, duration options, cutoff hours, horizon | Refuses (`NOT_FOUND`) when not bookable at all (archived or not accepting). |
| `venueAvailability.ts` | protected | `{ venueId, day: "YYYY-MM-DD" }` → `{ day, courts: { id, name, slots: { startsAt, durations: { minutes, priceFils }[] }[] }[] }` | Day within `[today, today + horizon)`. Slots already past `now + minLead` are omitted. Only bookable Slots are returned; a Closure or an existing Booking leaves a gap. |
| `create.ts` | protected | `{ venueId, courtId, startsAt, durationMinutes }` → Booking | Invariants 1–5, 7, 8, 9. Price computed server-side and snapshotted. `source = app`. Notifies managers (`booking_created`). |
| `listMine.ts` | protected | `{ scope: "upcoming" \| "past", cursor? }` → paginated Bookings with Venue and Court names, `gameId` | Upcoming: confirmed with `endsAt > now`, soonest first. Past: everything else, newest first. |
| `byId.ts` | protected | `{ bookingId }` → Booking with Venue, Court, cancellation window (`canCancelUntil`), `canCreateGame` (section 2.4), Game summary when linked | Holder, a manager of that Venue, or an Operator. |
| `cancel.ts` | protected (holder) | `{ bookingId }` → Booking | Invariant 6 (cutoff). `cancelledBy = customer`. Cascades the Booking Game. Notifies managers. |
| `createGame.ts` | protected (holder) | `{ bookingId, groupId, name?, pricePerPlayerFils?, levelMinTenths?, levelMaxTenths?, isPublic? }` → `{ gameId, matchId }` | Booking is confirmed, upcoming, has a `userId` equal to the caller, no `gameId` yet. Calls `createFriendlyGame` with Venue, Court and window from the Booking (Venue Soft-archive and Club Group Venue-lock rules in `assertGameCreateVenueAndCourt` still run and may refuse: a Club Group linked to another Venue cannot host this Game). Sets `bookings.game_id` in the same transaction. |

Manager doors (web only):

| File | Auth | Input → Output | Rule |
| --- | --- | --- | --- |
| `listForVenue.ts` | Venue manager | `{ venueId, from: "YYYY-MM-DD", to: "YYYY-MM-DD", courtId?, status?[] }` → Bookings with holder (User name/image or Guest name/phone), Court, price, payment, `gameId`, plus the day grid (Opening hours windows and Closures) for the range | Range ≤ 31 days. Serves both the calendar and the list. |
| `createForVenue.ts` | Venue manager | `{ venueId, courtId, startsAt, durationMinutes, holder: { userId } \| { guestName, guestPhone }, priceFils?, paymentStatus?, paymentMethod?, managerNotes? }` → Booking | Invariants 1–4, 7–9; ignores lead and horizon; `endsAt` must be in the future; `priceFils` override allowed; `source = venue`. Durations may be any multiple of `slotMinutes` up to 240 (a manager may book a long block). |
| `searchCustomers.ts` | Venue manager | `{ venueId, query }` → `{ userId?, name, phone?, image?, bookingCount }[]` | Users by name/username/phone (through `packages/api/src/invites/search-lookup-users.ts`), plus Guests from this Venue's Bookings by name/phone. Powers the holder picker. |
| `update.ts` | Venue manager | `{ bookingId, courtId?, startsAt?, durationMinutes?, priceFils?, managerNotes? }` → Booking | Only `confirmed`. Re-runs reserve for a moved interval or Court; refused while a live Booking Game exists; reprices from rules unless `priceFils` is given. Notifies the Customer (`booking_changed_by_venue`) when time, Court or price changed. |
| `cancelForVenue.ts` | Venue manager | `{ bookingId, reason? }` → Booking | Any confirmed Booking before `endsAt`. `cancelledBy = venue`. Cascades the Booking Game. Notifies the Customer. |
| `markNoShow.ts` | Venue manager | `{ bookingId }` → Booking | Only `confirmed` and `startsAt <= now`. Terminal. |
| `recordPayment.ts` | Venue manager | `{ bookingId, paymentStatus: "paid" \| "waived" \| "refunded" \| "unpaid", paymentMethod? }` → Booking | `paid` requires a method and sets `paidAt`; `refunded` only from `paid`; `unpaid` clears `paidAt`. |
| `listCustomers.ts` | Venue manager | `{ venueId, query?, sort: "lastVisit" \| "bookings" \| "noShows" \| "name", cursor? }` → `{ userId, name, image, phone, firstBookingAt, lastBookingAt, bookingCount, cancelledCount, noShowCount, paidFils }[]` | Aggregated over this Venue's Bookings only. Guests are listed by phone with `userId: null`. |
| `customerById.ts` | Venue manager | `{ venueId, userId } \| { venueId, guestPhone }` → profile aggregate + Booking history (paginated) | A manager sees a User's Bookings at *their* Venue only, never at other Venues. |

### 4.3 `venueReports` router (new, web only)

All take `{ venueId, from, to }` (product-day keys, range ≤ 366 days, `to` inclusive) and `groupBy: "day" | "week" | "month"` where noted. Aggregation happens in SQL with `date_trunc(..., starts_at at time zone 'Asia/Bahrain')`; the timezone literal comes from `PRODUCT_TIMEZONE`.

| File | Output | Definition |
| --- | --- | --- |
| `occupancy.ts` | per bucket and per Court: `openMinutes`, `bookedMinutes`, `rate`; plus a weekday × hour heat grid for the range | `openMinutes` from Opening hours minus Closures; `bookedMinutes` from confirmed and no-show Bookings (a no-show still occupied the Court). Rate = booked / open. |
| `revenue.ts` | per bucket: `bookedFils` (confirmed + no-show by start day), `collectedFils` (paid by `paidAt` day), `waivedFils`, `refundedFils`; totals; split by `source` and by Court | Cancelled Bookings count nothing. |
| `bookingsOverTime.ts` | per bucket: `created`, `confirmed` (upcoming or played), `cancelledByCustomer`, `cancelledByVenue`, `noShow`, `app`, `venue`; rates; average lead time in hours; average duration | Counted by start day except `created`, which is by `createdAt`. |
| `customers.ts` | `newCustomers`, `returningCustomers`, `activeCustomers` per bucket; top 10 by Bookings and by `paidFils`; no-show rate per Customer for the top list; Guest share | New = first Booking at this Venue inside the bucket. |

### 4.4 Summary of auth

- `protectedProcedure`: Customer doors.
- `operatorProcedure`: manager grant/revoke and existing catalog doors.
- Manager doors use `protectedProcedure` and call `requireVenueManager` after reading `venueId` (from input or from the Booking row). There is no middleware because the Venue is in the input.
- The Web App hides the Manage area unless `venues.listManaged` returns rows; the Operator Venues area stays keyed on Clerk metadata as today.

## 5. Web dashboard: the Manage area

Routes under `apps/web/src/app/dashboard/manage/`. Titles go into `dashboard-paths.ts`. The sidebar gains "Manage" when `venues.listManaged` is non-empty (Operators see it too). Existing components (`DashboardShell`, `Section`, `RowList`, `EmptyState`, `ErrorState`, skeletons, sonner, shadcn forms) are reused; no new design system on web.

| Route | Page | Data |
| --- | --- | --- |
| `/dashboard/manage` | Managed Venues list. One row per Venue with city, Court count, upcoming Bookings, "Accepting bookings" badge. One Venue → redirect to it. | `venues.listManaged` |
| `/dashboard/manage/[venueId]` | Overview: today's Bookings by Court, next 7 days occupancy, unpaid upcoming, pending Closure conflicts, quick links. | `bookings.listForVenue` (today..+7), `venueReports.occupancy` (7 days) |
| `/dashboard/manage/[venueId]/bookings` | Calendar (day view: Courts as columns, grid rows at `slotMinutes`; week view: one row per Court) and a list tab with filters (date range, Court, status, payment, source). Click a free cell → create; click a Booking → details sheet with edit, cancel, no-show, record payment, open Game. | `bookings.listForVenue` |
| `/dashboard/manage/[venueId]/bookings/new` | Create for a Customer or Guest: holder search, Court, date, start, duration, price (prefilled from rules, editable), payment, notes. | `bookings.searchCustomers`, `bookings.venueAvailability` (manager variant via `listForVenue` grid), `bookings.createForVenue` |
| `/dashboard/manage/[venueId]/bookings/[bookingId]` | Booking page (also the sheet's full view): holder, Court, time, price, payment, source, audit trail (created, changed, cancelled, no-show), linked Game. | `bookings.byId`, mutations above |
| `/dashboard/manage/[venueId]/customers` | Customers table: name, phone, Bookings, no-shows, last visit, paid total; search and sort. | `bookings.listCustomers` |
| `/dashboard/manage/[venueId]/customers/[userId]` and `.../guests/[phone]` | Customer profile: aggregates, Booking history, "New Booking for this Customer" link. | `bookings.customerById` |
| `/dashboard/manage/[venueId]/settings` | Tabs: Details (phone, website, logo, description, booking notes), Courts (add, rename, delete), Opening hours (7 weekday editors with multiple windows), Closures (list, add with Court/whole Venue, conflicts prompt), Pricing (rule table, base rate shortcut), Booking settings (accepting, slot, durations, horizon, lead, cutoff). | `venues.managedById` and the `venues.*` doors in 4.1 |
| `/dashboard/manage/[venueId]/reports` | Date range and bucket controls, four sections: Occupancy (per Court bars, weekday × hour heat grid), Revenue (booked vs collected over time, by Court, by source), Bookings (counts stacked by outcome, cancellation and no-show rates, lead time), Customers (new vs returning, top Customers). Charts with the `dataviz` skill's rules; black and white with hatch for "not yet" matches the brand. | `venueReports.*` |

The Operator Venue page (`/dashboard/venues/[id]`) gains a "Venue managers" section: list, add by User search, remove.

Web Customer screens (browse, book) are not planned; `bookings.byId` is linked from Game details on web when a Game has a Booking ("Booked Court 2, 19:00–20:30").

## 6. Mobile: screens and navigation

The locked design system applies (CLAUDE.md "Design system rules for mobile", spec section 4). New code lives in `apps/mobile/src/booking/` with routes under `apps/mobile/app/(app)/book/`. Models are pure functions with Vitest beside them (`booking-model.ts`, `slot-grid.ts`), like `home-model.ts` and `create-model.ts`.

| Screen | Route | Content | Doors |
| --- | --- | --- | --- |
| Book entry | A row on Home ("Book a court") and on the Games hub; whether Book is a fifth tab is design-dependent (7.1). | | |
| Venues | `book/index` | List of Venues accepting bookings: logo monogram, name, city, "from BD x/h", today's hours. Empty state when none. | `bookings.listBookableVenues` |
| Venue | `book/[venueId]` | Name, city, description, Opening hours by weekday, Courts count, booking notes, cancellation cutoff line. Day strip for the horizon (today first). Below it the availability grid for the chosen day. | `bookings.venueForBooking`, `bookings.venueAvailability` |
| Availability grid | part of `book/[venueId]` | Courts as sections, Slots as a time list; `Hatch` for not offered, outline for free, solid ink for the selected start. Choosing a start reveals the duration chips with prices. | `@repo/domain/booking-slots` for grid shape from the server payload |
| Confirm | `book/[venueId]/confirm` (params: courtId, startsAt, durationMinutes) | Summary: Venue, Court, day and time, duration, price in BD, booking notes, cutoff copy ("Free cancellation until Tue 18:00"). One `Surface tone="ink"` with the confirm button. Errors: slot taken (go back and refresh), outside horizon. | `bookings.create` |
| Booking created | toast + replace to Booking details | | |
| My bookings | `profile/bookings` (Upcoming / Past tabs); the next upcoming Booking also appears on Home's Coming up list as a row distinct from a Game card | | `bookings.listMine` |
| Booking details | `book/bookings/[bookingId]` | Status, Venue, Court, time, price, payment status (as recorded by the Venue), cancel (enabled until cutoff with the deadline shown; after it, "Call the Venue" with the Venue phone), Create a game (gated as in 2.4) or the linked Game card. | `bookings.byId`, `bookings.cancel` |
| Create a game from Booking | `book/bookings/[bookingId]/game` reusing `src/create-game` with the Where and When steps locked and shown as read-only summaries; remaining steps Group, details, review. | | `bookings.createGame` |
| Game details | existing screen gains a "Booked" line (Court and time) when `bookingId` is present on the Game payload (`games.byId` adds the optional `booking` field, additive). | | `games.byId` |

Design system notes: at most two mount animations per screen (the Confirm screen may use `MountFill` on the price surface, nothing else); no hex; all type through `Text`; tabular figures matter on the time grid; 44 pt targets on slot cells; hatch is decoration with "Unavailable" in the accessible label.

## 7. Design-dependent

Resolve each item against the imported `.dc.html` once it is in `.scratch/design/booking-flow/`. Until then, implement with the defaults in the right column; tickets marked "design-blocked" in section 9 wait for this section.

| # | Screen or flow | Confirm against the design | Default if the design is silent |
| --- | --- | --- | --- |
| 7.1 | Mobile navigation | Is Book a fifth tab, a Home row, or both? Tab icon and title. Does Book replace or sit beside Communities when that tab is hidden? | Home row "Book a court" plus a Games hub row; no new tab. |
| 7.2 | Venues list | Row contents (logo, distance, price-from, hours, Court count), ordering, city filter, empty state copy. | Name, city, from-price, today's hours; sorted by name; no distance. |
| 7.3 | Venue screen | Section order (hours, description, Courts, notes), whether the day strip and grid live on this screen or a separate one, how many days the strip shows. | One screen; strip shows the horizon. |
| 7.4 | Availability grid | Time list vs matrix (time × Court), duration picking before or after choosing a start, how price appears on a Slot, hatch for unavailable vs hidden, selected state. | Court sections with a time list; start first, then duration chips with prices. |
| 7.5 | Confirm step | Field order, whether booking notes and the cutoff line appear here, label of the confirm button, whether a "pay at venue" line is present, success state (toast vs full screen). | As in section 6, confirm button "Book Court 2", toast then details. |
| 7.6 | Booking details | What the hero shows (time vs status), where cancel sits, copy for the post-cutoff state, how a linked Game is shown, whether payment status is visible to the Customer. | Section 6 defaults; payment status visible as a plain line. |
| 7.7 | My bookings | Where it lives (Profile, Home, Games hub tab), tab labels, row content, whether past Bookings show payment. | Profile route plus Home Coming up row. |
| 7.8 | Create a game from a Booking | Entry label, whether Where/When appear as locked steps or a single summary, whether Group choice precedes. | Locked steps shown as summaries, Group first. |
| 7.9 | Payment | Does the design show any payment step, hold, or price breakdown (VAT, service fee)? If it does, that reopens Q1 before ticket 10. | No payment step; one price line. |
| 7.10 | Labels and copy | Product words on screen for Booking, Slot, Court, cancellation, no-show, "Accepting bookings". Glossary terms are the code names; the design decides the user-facing labels. | Glossary names as labels. |
| 7.11 | Web dashboard | Does the design cover the Manage area at all (calendar, settings, reports)? If so, confirm calendar shape (day columns per Court), the settings tab list and the four report views. | The web tickets use the existing dashboard patterns and are not blocked. |
| 7.12 | Empty and error states | Copy and illustration rules for no Venues, closed day, fully booked day, slot taken while confirming, outside horizon. | Short copy, no illustration, matching `EmptyState` tone. |
| 7.13 | Guest and manager-made Bookings | Nothing on mobile should show a Guest; confirm the design has no customer-side view of Venue-made Bookings beyond their own. | Not shown. |

## 8. Open questions and recommended defaults

| # | Question | Recommended default so work can start |
| --- | --- | --- |
| Q1 | **Payments.** Is online payment in scope now? Which provider (Bahrain: Tap Payments, BENEFIT Pay; or Stripe)? Hold at booking or pay at Venue? | **Not now.** v1 books at a fixed price, payment is collected at the Venue and recorded by the manager (`paymentStatus`). The schema reserves `online` and a later slice adds a `held` status, `payment_intent` columns and a provider ADR. Nothing in v1 needs rework for that. |
| Q2 | **Cancellation policy.** One cutoff per Venue (hours), or tiers (free until 24 h, 50 % until 6 h)? Does a late cancellation cost anything in v1? | One cutoff per Venue, default 24 h. After the cutoff the Customer cannot cancel in the app and is told to call. No fees, since nothing is collected. |
| Q3 | **Non-members.** May any authenticated User book, or only Members of a Community linked to the Venue? Member pricing? | Any authenticated User. No member pricing in v1. Community link stays what it is today (a Game venue lock). |
| Q4 | **Multi-venue owners and who grants managers.** Operators grant managers; may a manager add co-managers? One owner with several Venues? | Table role, many-to-many, so several Venues per manager works on day one. Only Operators grant in v1. |
| Q5 | **Guest Bookings.** Should managers record Bookings for people without an account (name and phone)? | Yes. Facilities take phone bookings; without Guests the calendar is incomplete and reports lie. |
| Q6 | **Game create reserving a Court.** When an Organizer creates a Game at a Venue accepting bookings through the existing flow, should it also create a Booking? | No in v1. Keep the existing Game create untouched (it is the most-tested door). Revisit once Venues are actually accepting bookings. |
| Q7 | **Who may create a Booking Game.** Today Create Game is hidden behind `groupCreator` and a Game must belong to a Group the creator may organize. Most Customers will have neither. | Keep the gate in v1 (consistent with the product's deliberate limit). The mobile Booking details show Create a game only when the holder passes it. If the user wants every holder to create one, the options are: (a) a per-Booking private Game without a Group (reopens "a new Game must belong to a Group"), or (b) auto-creating a Loose Group for the holder. Both need a small follow-up spec; the `bookings.createGame` door is designed so either slots in. |
| Q8 | **Slot grid and durations.** 30-minute grid with 60 and 90 minute options as defaults? | Yes. Padel in Bahrain is sold in 60 and 90 minute blocks; the manager can change both per Venue. |
| Q9 | **Booking caps.** Limit upcoming Bookings per Customer per Venue (anti-hoarding)? | No cap in v1; managers can cancel. Add a per-Venue cap in the settings when abuse shows up. |
| Q10 | **Report exports.** CSV download of Bookings and reports? | Not in v1. The list view has filters; CSV is a small follow-up ticket when asked. |
| Q11 | **Court delete with history.** Should a Court with past Bookings be deletable? | Refuse only when upcoming confirmed Bookings exist; FK is `restrict` so a Court with any Booking cannot be hard-deleted. Recommend a later "retire Court" (archive) flag if managers need it. |
| Q12 | **Where My bookings lives on mobile** and whether Book is a tab. | Design decides (7.1, 7.7). Defaults in section 6. |
| Q13 | **Manager editing of Venue identity** (name, city, country). | Operator only; managers edit phone, website, logo, description. Identity is the catalog's unique key. |

## 9. Tickets

Vertical slices in implementation order. Each is sized for one implementer in one context. "Design" says whether the ticket waits for section 7. Create them in Linear in this order so `blocks` relations can be set; link this spec at the top of each. Ticket titles follow the existing numbering style ("N. Title").

| # | Title | Blocked by | Design |
| --- | --- | --- | --- |
| 1 | Venue manager role and the Manage area shell | — | not blocked |
| 2 | Venue managers edit Venue details and Courts | 1 | not blocked |
| 3 | Opening hours, Closures and Booking settings | 1 | not blocked |
| 4 | Pricing rules and the pure Booking price | 3 | not blocked |
| 5 | Bookings table, Slot availability and the Customer Booking doors | 4 | not blocked |
| 6 | Manage area Bookings calendar and list | 5 | not blocked (7.11 may refine) |
| 7 | Manager creates, edits, cancels, marks no-show and records payment | 6 | not blocked |
| 8 | Customers list and Customer profile | 7 | not blocked |
| 9 | Venue reports | 7 | not blocked |
| 10 | Mobile: browse Venues and see availability | 5 | design-blocked (7.1–7.4, 7.10, 7.12) |
| 11 | Mobile: confirm a Booking, My bookings and Booking details | 10 | design-blocked (7.5–7.7, 7.9) |
| 12 | Booking notifications | 7 | not blocked |
| 13 | Booking Game: create a Game from a Booking | 5, 11 | API not blocked; mobile step design-blocked (7.8) |

### Ticket 1. Venue manager role and the Manage area shell

**What to build.** Migration A (`venue_managers`, Venue Booking settings columns with defaults). `requireVenueManager` and `listManagedVenueIds` in `packages/api/src/venues/helpers/`. Doors `venues.listManaged`, `venues.managedById` (settings fields, Courts, managers; Opening hours, Closures and Pricing rules arrive as empty arrays until tickets 3–4), `venues.addManager`, `venues.removeManager`, `venues.searchManagerUsers`. Web: "Venue managers" section on the Operator Venue page; sidebar "Manage" entry when the caller manages a Venue; `/dashboard/manage` list; `/dashboard/manage/[venueId]` overview placeholder with the Venue header and tabs scaffold (Bookings, Customers, Settings, Reports link to empty states). ADR-0025. CONTEXT.md: Venue manager, Manage area.

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

### Ticket 3. Opening hours, Closures and Booking settings

**What to build.** Migration B. Doors `venues.setOpeningHours`, `venues.addClosure`, `venues.removeClosure`, `venues.updateBookingSettings`. `managedById` returns hours and Closures. Settings tabs: Opening hours (seven weekday editors, multiple windows, "copy to all days"), Closures (list with upcoming first, add whole-Venue or per-Court; the conflicts prompt lists `affectedBookingIds` and, until ticket 7 ships cancel, only shows them), Booking settings (accepting switch, slot, durations, horizon, lead, cutoff, description, notes). Seed: a Venue with hours and settings. CONTEXT.md: Opening hours, Closure, Accepting bookings, Cancellation cutoff.

**Files.** `packages/db/src/schema/{venue-opening-hours,venue-closures}.ts`, migration; `packages/api/src/routers/venues/{setOpeningHours,addClosure,removeClosure,updateBookingSettings}.ts` (+ tests); `packages/validators` only if the web form and the door share the window schema (likely: `openingHoursWindow`); `apps/web/.../settings/**`; `packages/api/scripts/seed.ts`; `CONTEXT.md`.

**Acceptance.**
- Overlapping windows, off-grid minutes, `closes <= opens`, `closes > 1800` are refused with messages; an empty array closes the weekday.
- A Closure with a Court on another Venue is refused; `addClosure` returns the ids of confirmed Bookings inside it (empty until ticket 5, test added there).
- Turning `acceptingBookings` on with no Court or on a Soft-archived Venue is refused; changing `slotMinutes` while hours are off the new grid is refused.
- Durations outside 30–240 or not multiples of `slotMinutes` are refused.

### Ticket 4. Pricing rules and the pure Booking price

**What to build.** Migration C. `@repo/domain/booking-price.ts`: `priceForInterval(rules, { courtId, startsAt, endsAt })` → `{ fils } | { uncovered: true }`, with the Court-beats-Venue rule and overnight windows, plus `formatBookingPriceFils` next to the Price per player formatter. Door `venues.setPricingRules` (whole-set replace, overlap check per scope). Settings Pricing tab: rule table, "base rate" shortcut that writes one all-week all-day rule, per-Court override rows. Seed: base and peak rules. CONTEXT.md: Pricing rule. ADR-0027.

**Files.** `packages/db/src/schema/venue-pricing-rules.ts`, migration; `packages/domain/src/booking-price.ts` (+ test); `packages/api/src/routers/venues/setPricingRules.ts` (+ test); `apps/web/.../settings/pricing/**`; `docs/adr/0027-*.md`; `CONTEXT.md`.

**Acceptance.**
- Unit tests: a 90-minute interval spanning an off-peak → peak boundary is priced pro-rata and rounded to fils; a Court rule overrides a Venue rule for that Court only; an interval with an uncovered minute returns `uncovered`; a window crossing midnight prices on the opening weekday.
- Overlapping rules on the same scope are refused; the same weekday × time on different Courts is allowed.
- Rates above `PRICE_PER_PLAYER_MAX_FILS` or negative are refused.

### Ticket 5. Bookings table, Slot availability and the Customer Booking doors

**What to build.** Migration D (decide the exclusion constraint by running the PGlite harness; record the outcome in ADR-0026). `@repo/domain/booking-slots.ts`: pure `slotsForDay(input)` producing per-Court starts and priced durations from hours, Closures, rules, existing Bookings, settings and `now`. `@repo/domain/booking-cancel-window.ts`. Shared `packages/api/src/bookings/{availability,reserve,cancel}.ts`. Doors `bookings.listBookableVenues`, `venueForBooking`, `venueAvailability`, `create`, `listMine`, `byId`, `cancel`. `deleteCourt` Booking guard. `addClosure` conflicts test. Seed Bookings. CONTEXT.md: Booking, Slot, Customer, No-show, Payment status. ADR-0024, ADR-0026. No UI in this ticket; it is verifiable through tests and a server-side caller.

**Files.** `packages/db/src/schema/bookings.ts` (+ enums), migration; `packages/domain/src/{booking-slots,booking-cancel-window,booking-copy}.ts` (+ tests); `packages/api/src/bookings/*.ts` (+ tests); `packages/api/src/routers/bookings/{index,listBookableVenues,venueForBooking,venueAvailability,create,listMine,byId,cancel}.ts` (+ tests); `packages/api/src/root.ts`; `packages/api/src/routers/venues/deleteCourt.ts`; `docs/adr/0024-*.md`, `0026-*.md`; `CONTEXT.md`.

**Acceptance.**
- Two concurrent `create` calls for the same Court and overlapping interval: exactly one succeeds, the other is `CONFLICT` "That slot was just taken" (test with two transactions on PGlite, or sequential plus the lock path asserted).
- `create` refuses: Venue not accepting, archived, no Court, start off-grid, outside Opening hours, inside a Closure, uncovered price, before `now + minLead`, beyond horizon, Court on another Venue, overlapping an existing confirmed Booking. Cancelled and no-show Bookings do not block.
- `venueAvailability` omits past Slots, Closed Courts, taken Slots, and durations that would run past closing or into a Booking; prices equal `priceForInterval`.
- `cancel` succeeds before the cutoff and is refused after it with the deadline in the message; it is refused for a non-holder; the row records `cancelledBy = customer`.
- `listMine` splits upcoming and past and paginates; `byId` is visible to the holder and a manager and refused to others.
- `deleteCourt` refuses while an upcoming confirmed Booking exists.

### Ticket 6. Manage area Bookings calendar and list

**What to build.** Door `bookings.listForVenue` (range ≤ 31 days, grid payload). Web `/dashboard/manage/[venueId]/bookings`: day view (Courts as columns, rows on the grid, Closures hatched, Bookings as blocks with holder and payment badge), week view (one row per Court), list tab with filters, Booking sheet (read-only in this ticket: holder, time, price, payment, source, notes, Game link). Overview page fills "Today" and "Unpaid upcoming".

**Files.** `packages/api/src/routers/bookings/listForVenue.ts` (+ test); `apps/web/src/app/dashboard/manage/[venueId]/bookings/**`, `apps/web/src/components/manage/**` (calendar grid, booking block, booking sheet).

**Acceptance.**
- A manager sees their Venue's Bookings for a day and a week; a 40-day range is refused; another Venue's manager is refused.
- Grid rows match `slotMinutes`; Closures render hatched; Bookings outside Opening hours (manager-made) still render.
- Filters by Court, status, payment and source narrow the list; the list is sorted by start.

### Ticket 7. Manager creates, edits, cancels, marks no-show and records payment

**What to build.** Doors `bookings.createForVenue`, `searchCustomers`, `update`, `cancelForVenue`, `markNoShow`, `recordPayment`. Web: create page (holder picker with Users and Guests, Court, date, start, duration, price prefilled and editable, payment, notes), "click a free cell" shortcut from the calendar, Booking sheet actions (edit time/Court/price/notes, cancel with reason, mark no-show after start, record payment), the Closure conflicts prompt now offers "Cancel these Bookings". CONTEXT.md: Guest.

**Files.** `packages/api/src/routers/bookings/{createForVenue,searchCustomers,update,cancelForVenue,markNoShow,recordPayment}.ts` (+ tests); `apps/web/.../bookings/new/page.tsx`, `.../bookings/[bookingId]/page.tsx`, sheet components; `CONTEXT.md`.

**Acceptance.**
- A manager books for a User and for a Guest (name and phone required together); overlapping is `CONFLICT`; lead and horizon are ignored; a past `endsAt` is refused; a typed price overrides the rules and is stored.
- `update` moving a Booking onto a taken interval is refused; moving a Booking with a live Game is refused with "Cancel the Game first"; repricing happens unless a price is given.
- `cancelForVenue` works after the Customer cutoff and before `endsAt`; `markNoShow` only after start and only from `confirmed`; `recordPayment` enforces the transitions in 4.2.
- A Soft-archived Venue refuses create and update and allows cancel, no-show and payment.

### Ticket 8. Customers list and Customer profile

**What to build.** Doors `bookings.listCustomers`, `bookings.customerById`. Web Customers table with search and sort; Customer profile with aggregates, Booking history and a "New Booking" link that prefills the holder.

**Files.** `packages/api/src/routers/bookings/{listCustomers,customerById}.ts` (+ tests); `apps/web/.../customers/**`.

**Acceptance.**
- Aggregates count only this Venue's Bookings; a User with Bookings at two Venues shows different numbers to each manager.
- Guests appear by phone with `userId: null` and open a Guest profile.
- Sorting by last visit, Bookings, no-shows and name works; search matches name, username and phone.

### Ticket 9. Venue reports

**What to build.** `venueReports` router with `occupancy`, `revenue`, `bookingsOverTime`, `customers`. Web Reports page: range and bucket controls (presets: this week, last 30 days, this month, last month, custom), four sections with charts (follow the `dataviz` skill; brand palette is ink, paper, rule, hatch). Overview page fills the 7-day occupancy.

**Files.** `packages/api/src/routers/venueReports/{index,occupancy,revenue,bookingsOverTime,customers}.ts` (+ tests), `packages/api/src/root.ts`; `apps/web/.../reports/**`, chart components.

**Acceptance.**
- Occupancy: open minutes come from hours minus Closures; booked minutes include no-shows and exclude cancelled; a day with no hours has rate null, not 0.
- Revenue: booked by start day, collected by `paidAt` day; a Booking paid the day after it was played lands in the right buckets; cancelled contributes nothing; refunded moves to `refundedFils`.
- Bookings over time: counts by outcome, cancellation and no-show rates, average lead and duration; `created` buckets by `createdAt`.
- Customers: new vs returning per bucket, top 10, Guest share. Buckets respect `Asia/Bahrain` across a UTC day boundary (test at 23:30 Bahrain).
- Ranges over 366 days are refused.

### Ticket 10. Mobile: browse Venues and see availability (design-blocked)

**What to build.** `apps/mobile/src/booking/`: Venues list screen, Venue screen with day strip and availability grid, slot selection and duration chips. Entry points per 7.1. Pure `slot-grid.ts` and `booking-model.ts` with tests. Uses `@repo/domain/booking-slots` types and `booking-copy`.

**Files.** `apps/mobile/app/(app)/book/{_layout,index,[venueId]/index}.tsx`, `apps/mobile/src/booking/**`, `apps/mobile/src/home/**` (entry row), `apps/mobile/src/navigation/tab-list.ts` if 7.1 says tab.

**Acceptance.**
- Venues accepting bookings are listed; a Venue turned off disappears on refetch; empty state matches 7.12.
- Choosing a day fetches that day's availability; a past Slot never renders as free; hatch marks unavailable with an accessible label; selecting a start shows priced durations; a Slot taken between fetch and selection is handled on the next screen.
- No hex literals, all text through `Text`, one ink surface, at most two mount animations (lint and the ink registry test pass).

### Ticket 11. Mobile: confirm a Booking, My bookings and Booking details (design-blocked)

**What to build.** Confirm screen, `bookings.create` with `CONFLICT` recovery (toast, go back, refetch), Booking details with cancel-until-cutoff and the post-cutoff call-the-Venue state, My bookings (upcoming/past) and the Home Coming up row.

**Files.** `apps/mobile/app/(app)/book/[venueId]/confirm.tsx`, `book/bookings/[bookingId].tsx`, `profile/bookings.tsx` (or per 7.7), `apps/mobile/src/booking/**`, `apps/mobile/src/home/coming-up.tsx`.

**Acceptance.**
- A Customer books, sees the toast and lands on details; the price shown equals the server's `priceFils`.
- Cancel is enabled until the cutoff with the deadline shown; afterwards the button is replaced by the Venue phone action; a server refusal shows the message.
- My bookings splits upcoming and past and paginates; Home shows the next Booking as its own row, never as a Game card.

### Ticket 12. Booking notifications

**What to build.** Migration E. `notify` calls in `bookings.create`, `cancel`, `cancelForVenue`, `update` (changed fields only). Copy in `@repo/domain/notification-copy`. Web Notifications page and mobile Notifications rows render the four types with a link to the Booking (web: Manage area Booking page for managers, nothing else yet for Customers on web; mobile: Booking details).

**Files.** `packages/db/src/schema/notifications.ts`, migration; `packages/api/src/notifications/notify-booking-*.ts` (+ tests); the four doors; `packages/domain/src/notification-copy.ts` (+ test); web and mobile notification rows.

**Acceptance.**
- Managers receive `booking_created` and `booking_cancelled_by_customer` excluding the actor; the Customer receives the Venue-side types; Guest Bookings notify managers only.
- An `update` that changes only notes sends nothing.
- Dedupe keys prevent a double row on retry.

### Ticket 13. Booking Game: create a Game from a Booking

**What to build.** Door `bookings.createGame` calling `createFriendlyGame` with locked Venue, Court and window, setting `bookings.game_id`; `games.byId` gains an optional `booking` summary (additive); the Booking cancel cascade in `packages/api/src/bookings/cancel.ts` (shipped in ticket 5 with a no-Game test; this ticket adds the Game test). Mobile: "Create a game" on Booking details gated as in 2.4, reusing `src/create-game` with Where and When locked (design 7.8); linked Game card on Booking details; "Booked" line on Game details. Web Game details gets the same "Booked" line. CONTEXT.md: Booking Game. ADR-0024 already covers the cascade.

**Files.** `packages/api/src/routers/bookings/createGame.ts` (+ test), `packages/api/src/routers/games/byId.ts`, `packages/api/src/bookings/cancel.ts` (+ test); `apps/mobile/app/(app)/book/bookings/[bookingId]/game.tsx`, `apps/mobile/src/create-game/**` (locked-step mode), `apps/mobile/src/game-details/**`; `apps/web/src/app/dashboard/games/[id]/**`; `CONTEXT.md`.

**Acceptance.**
- The holder creates a Friendly game whose Venue, Match Court and window equal the Booking's; a second call is refused ("This Booking already has a Game"); a non-holder, a Guest Booking, a cancelled or past Booking are refused; `assertMayCreateGameOnGroup` and `assertGameCreateVenueAndCourt` still refuse what they refuse today.
- Cancelling the Booking (either door) cancels a live Booking Game in the same transaction; cancelling the Game leaves the Booking confirmed.
- Game details on web and mobile show the Booked line when linked.

## Testing decisions

- Pure rules (`booking-slots`, `booking-price`, `booking-cancel-window`) get exhaustive Vitest tables beside them in `@repo/domain`; these are the seams most likely to hide off-by-one errors (grid, midnight, horizon, cutoff).
- Every door is tested through its exported db-taking function on PGlite, including the manager/holder/Operator permission matrix once per door, not a copied matrix per test file. Prior art: `packages/api/src/routers/games/*.test.ts`.
- The double-booking test is the one concurrency test in the Workspace; keep it deterministic (open two transactions in the harness, or assert the advisory lock is taken and the overlap query runs inside the transaction).
- Reports are tested with a seeded week of Bookings and exact expected numbers, including the Bahrain midnight case.
- Mobile models (`slot-grid`, `booking-model`) are pure and tested; no component snapshots. Manual check per screen in the ticket.
- Web calendar: a pure `calendar-layout.ts` (block placement on the grid) is tested; the page is checked by hand.

## Risks

| Risk | Mitigation |
| --- | --- |
| The design imports with a payment step (7.9) | Q1 default keeps the data model ready; only tickets 11 and a new payment ticket change. |
| PGlite cannot load `btree_gist` | The advisory-lock path is the primary guard; the constraint is defence in depth and optional. |
| Overnight windows (to 06:00) complicate day keys | One convention everywhere: a window belongs to the weekday it opens on; `booking-slots` and the reports both use `productDayKey(startsAt - windowOffset)` from `@repo/domain/product-timezone`. Tests cover 01:00 Bookings. |
| Widening Court doors to managers | Same inputs and paths; only the auth helper changes; Operator tests stay green. |
| Q7 leaves most Customers without a Booking Game | Stated openly; the door is independent of the gate so the follow-up is a UI and rule change, not a schema change. |
| Customer and Guest matched by phone | Phone is normalised with `@repo/domain/phone-number` before storing `guest_phone`. |
