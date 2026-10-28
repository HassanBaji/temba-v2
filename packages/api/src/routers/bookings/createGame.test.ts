import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookings, courts, games, groups, matches } from "@repo/db";

import {
  NOW,
  asDb,
  at,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { requireGame, userPassesJoinGate } from "#src/games/access";
import { bookingById } from "#src/routers/bookings/byId";
import { createBookingGame } from "#src/routers/bookings/createGame";
import { acceptLookupInvite } from "#src/routers/games/acceptLookupInvite";
import { gameById } from "#src/routers/games/byId";
import { cancelGame } from "#src/routers/games/cancel";
import { sendLookupInvite } from "#src/routers/games/sendLookupInvite";

describe("bookings.createGame", () => {
  it("creates a groupless, unrated, private Friendly game on the Booking's Court and interval", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, { courtId: f.court2 });

      const created = await createBookingGame(asDb(db), {
        bookingId: booking.id,
        userId: f.customer,
        pricePerPlayerFils: 2_500,
        levelMinTenths: 20,
        now: NOW,
      });

      const game = await db.query.games.findFirst({
        where: eq(games.id, created.gameId),
      });
      expect(game).toMatchObject({
        format: "friendly_game",
        groupId: null,
        rated: false,
        isPublic: false,
        venueId: f.venueId,
        windowStart: booking.startsAt,
        windowEnd: booking.endsAt,
        createdBy: f.customer,
        pricePerPlayerFils: 2_500,
        levelMinTenths: 20,
        levelMaxTenths: null,
      });
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, created.matchId),
      });
      expect(match).toMatchObject({
        gameId: created.gameId,
        courtId: f.court2,
        startTime: booking.startsAt,
        endTime: booking.endsAt,
      });
      const linked = await db.query.bookings.findFirst({
        where: eq(bookings.id, booking.id),
      });
      expect(linked?.gameId).toBe(created.gameId);
    });
  });

  it("shows the Booking on the Game's details as Unrated", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, { courtId: f.court2 });
      const { gameId } = await createBookingGame(asDb(db), {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });

      const details = await gameById(asDb(db), { gameId, userId: f.customer });
      expect(details).toMatchObject({
        rated: false,
        groupId: null,
        isOrganizer: true,
        ratingImpact: null,
        booking: {
          id: booking.id,
          courtName: "Court 2",
          startsAt: booking.startsAt,
          endsAt: booking.endsAt,
          heldByViewer: true,
        },
      });
    });
  });

  it("makes the holder the Organizer and admits only them and invited Users", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f);
      const { gameId } = await createBookingGame(asDb(db), {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });
      const game = await requireGame(asDb(db), gameId);

      expect(await userPassesJoinGate(asDb(db), game, f.customer)).toBe(true);
      expect(await userPassesJoinGate(asDb(db), game, f.other)).toBe(false);
      const {
        sent: [invite],
      } = await sendLookupInvite(asDb(db), {
        gameId,
        userId: f.customer,
        userIds: [f.other],
      });
      await expect(
        acceptLookupInvite(asDb(db), {
          inviteId: invite!.id,
          userId: f.other,
          sideIndex: 1,
          position: "left",
        }),
      ).resolves.toMatchObject({ ok: true, gameId, waitlisted: false });
      await expect(
        cancelGame(asDb(db), { gameId, userId: f.other }),
      ).rejects.toThrow("Only an organizer");
      await expect(
        cancelGame(asDb(db), { gameId, userId: f.customer }),
      ).resolves.toEqual({ ok: true });
    });
  });

  it("creates the Game on a Group the holder organizes, rated when the Group is verified", async () => {
    await withBookableVenue(async (db, f) => {
      const [loose, verified] = await db
        .insert(groups)
        .values([
          { name: "Thursday padel", createdBy: f.customer },
          { name: "Ladder", createdBy: f.customer, verifiedAt: NOW },
        ])
        .returning({ id: groups.id });
      const first = await insertBooking(db, f);
      const second = await insertBooking(db, f, { courtId: f.court2 });

      const onLoose = await createBookingGame(asDb(db), {
        bookingId: first.id,
        groupId: loose!.id,
        userId: f.customer,
        now: NOW,
      });
      const onVerified = await createBookingGame(asDb(db), {
        bookingId: second.id,
        groupId: verified!.id,
        userId: f.customer,
        now: NOW,
      });

      await expect(
        requireGame(asDb(db), onLoose.gameId),
      ).resolves.toMatchObject({
        groupId: loose!.id,
        rated: false,
        isPublic: false,
      });
      await expect(
        requireGame(asDb(db), onVerified.gameId),
      ).resolves.toMatchObject({ groupId: verified!.id, rated: true });
    });
  });

  it("refuses a Group the holder cannot organize, or of another sport", async () => {
    await withBookableVenue(async (db, f) => {
      const [theirs, football] = await db
        .insert(groups)
        .values([
          { name: "Not mine", createdBy: f.other },
          { name: "Five-a-side", createdBy: f.customer, sport: "football" },
        ])
        .returning({ id: groups.id });
      const booking = await insertBooking(db, f);
      const create = (groupId: string) =>
        createBookingGame(asDb(db), {
          bookingId: booking.id,
          groupId,
          userId: f.customer,
          now: NOW,
        });

      await expect(create(theirs!.id)).rejects.toThrow("Group creator");
      await expect(create(football!.id)).rejects.toThrow("padel Group");
      expect(await db.select({ id: games.id }).from(games)).toHaveLength(0);
    });
  });

  it("refuses a second Game while the first is live, and allows one after it is cancelled", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f);
      const create = () =>
        createBookingGame(asDb(db), {
          bookingId: booking.id,
          userId: f.customer,
          now: NOW,
        });
      const first = await create();
      await expect(create()).rejects.toThrow("already has a Game");

      await cancelGame(asDb(db), { gameId: first.gameId, userId: f.customer });
      const view = await bookingById(asDb(db), {
        bookingId: booking.id,
        actor: { userId: f.customer, publicMetadata: undefined },
        now: NOW,
      });
      expect(view.canCreateGame).toBe(true);
      expect(view.status).toBe("confirmed");

      const second = await create();
      const linked = await db.query.bookings.findFirst({
        where: eq(bookings.id, booking.id),
      });
      expect(linked?.gameId).toBe(second.gameId);
    });
  });

  it("refuses a non-holder, a Guest Booking and a Booking that is not confirmed and upcoming", async () => {
    await withBookableVenue(async (db, f) => {
      const create = (bookingId: string, userId = f.customer) =>
        createBookingGame(asDb(db), { bookingId, userId, now: NOW });

      const mine = await insertBooking(db, f);
      await expect(create(mine.id, f.other)).rejects.toThrow("Only the holder");

      const guest = await insertBooking(db, f, {
        courtId: f.court2,
        userId: null,
        guestName: "Walk-in",
        guestPhone: "+973 3300 0000",
      });
      await expect(create(guest.id)).rejects.toThrow("Only the holder");

      const pending = await insertBooking(db, f, {
        startsAt: at(8, 18),
        endsAt: at(8, 19),
        status: "pending_payment",
        holdExpiresAt: at(5, 12, 10),
      });
      await expect(create(pending.id)).rejects.toThrow("confirmed Booking");

      const cancelled = await insertBooking(db, f, {
        startsAt: at(9, 18),
        endsAt: at(9, 19),
        status: "cancelled",
      });
      await expect(create(cancelled.id)).rejects.toThrow("confirmed Booking");

      const past = await insertBooking(db, f, {
        startsAt: at(1, 18),
        endsAt: at(1, 19),
      });
      await expect(create(past.id)).rejects.toThrow("already ended");

      expect(await db.select({ id: games.id }).from(games)).toHaveLength(0);
    });
  });

  it("creates a football Booking Game on a pitch", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(courts)
        .set({ sport: "football" })
        .where(eq(courts.id, f.court2));
      const booking = await insertBooking(db, f, { courtId: f.court2 });
      const before = await bookingById(asDb(db), {
        bookingId: booking.id,
        actor: { userId: f.customer, publicMetadata: undefined },
        now: NOW,
      });
      expect(before.canCreateGame).toBe(true);

      const created = await createBookingGame(asDb(db), {
        bookingId: booking.id,
        userId: f.customer,
        sideSize: 7,
        playersAllowed: 16,
        now: NOW,
      });
      expect(created.matchId).toBeNull();
      const game = await db.query.games.findFirst({
        where: eq(games.id, created.gameId),
      });
      expect(game).toMatchObject({
        sport: "football",
        format: "friendly_game",
        groupId: null,
        rated: false,
        isPublic: false,
        sideSize: 7,
        playersAllowed: 16,
        teamsAllowed: null,
      });
      expect(await db.select({ id: matches.id }).from(matches)).toHaveLength(0);

      const defaults = await insertBooking(db, f, {
        courtId: f.court2,
        startsAt: at(9, 18),
        endsAt: at(9, 19),
      });
      const second = await createBookingGame(asDb(db), {
        bookingId: defaults.id,
        userId: f.customer,
        now: NOW,
      });
      const defaulted = await db.query.games.findFirst({
        where: eq(games.id, second.gameId),
      });
      expect(defaulted).toMatchObject({ sideSize: 5, playersAllowed: 10 });
    });
  });
});
