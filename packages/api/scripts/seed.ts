/**
 * Local demo seed: fills an empty Temba database with enough Users,
 * Communities, Groups, Games, Teams, invites and requests to walk every App
 * flow by hand.
 *
 * Writes go through the same router functions the tRPC doors call, so the
 * rows obey the App's invariants (admit, pool draw, Match result
 * confirmation, Glicko-2). Only Venues (Operator doors read Clerk metadata)
 * and time shifts (a Game is created in the future, then moved into the past
 * so it reads as played) are written directly.
 *
 * Run: pnpm --filter @repo/api db:seed
 * See apps/web/scripts/README.md for how to sign in as a seeded User.
 */
import { eq, inArray, sql } from "drizzle-orm";

import {
  bookings,
  communityMemberInvites,
  gameTeamPlayers,
  games,
  gameMemberInvites,
  groupMemberInvites,
  matches,
  matchSets,
  teamMemberInvites,
  user,
  venueLinkRequests,
  venues,
} from "@repo/db";

import { db } from "#src/db";

import { settlePayment } from "#src/bookings/payments";
import { requireGame } from "#src/games/access";
import { occupySeat } from "#src/games/seats";
import { setJobSink } from "#src/jobs/enqueue";
import { createUnclaimedPlayer } from "#src/unclaimed-players/create-unclaimed-player";
import { cancelMyBooking } from "#src/routers/bookings/cancel";
import { createBooking } from "#src/routers/bookings/create";
import { createBookingGame } from "#src/routers/bookings/createGame";

import { approveTeamLink } from "#src/routers/communities/approveTeamLink";
import { createCommunity } from "#src/routers/communities/create";
import { createInviteLink as createCommunityInviteLink } from "#src/routers/communities/createInviteLink";
import { requestJoin as requestCommunityJoin } from "#src/routers/communities/requestJoin";
import { requestVenueLink } from "#src/routers/communities/requestVenueLink";
import { sendLookupInvite as sendCommunityLookupInvite } from "#src/routers/communities/sendLookupInvite";
import { setMemberRole } from "#src/routers/communities/setMemberRole";
import { softArchive as softArchiveCommunity } from "#src/routers/communities/softArchive";
import { acceptLookupInvite as acceptCommunityLookupInvite } from "#src/routers/communities/acceptLookupInvite";
import { addSet } from "#src/routers/games/addSet";
import { cancelGame } from "#src/routers/games/cancel";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { createGame } from "#src/routers/games/create";
import { createInviteLink as createGameInviteLink } from "#src/routers/games/createInviteLink";
import { createTournament } from "#src/routers/games/createTournament";
import { drawPools } from "#src/routers/games/drawPools";
import { postPoolDraw } from "#src/routers/games/postPoolDraw";
import { publishFootballTeams } from "#src/routers/games/publishFootballTeams";
import { register } from "#src/routers/games/register";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";
import { requestLevelRange } from "#src/routers/games/requestLevelRange";
import { saveFootballScore } from "#src/routers/games/saveFootballScore";
import { scoreSet } from "#src/routers/games/scoreSet";
import { sendLookupInvite as sendGameLookupInvite } from "#src/routers/games/sendLookupInvite";
import { acceptLookupInvite as acceptGroupLookupInvite } from "#src/routers/groups/acceptLookupInvite";
import { createClubPrivate } from "#src/routers/groups/createClubPrivate";
import { createClubPublic } from "#src/routers/groups/createClubPublic";
import { createInviteLink as createGroupInviteLink } from "#src/routers/groups/createInviteLink";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { createLoosePublic } from "#src/routers/groups/createLoosePublic";
import { joinClubPublic } from "#src/routers/groups/joinClubPublic";
import { joinLoosePublic } from "#src/routers/groups/joinLoosePublic";
import { requestJoin as requestGroupJoin } from "#src/routers/groups/requestJoin";
import { sendLookupInvite as sendGroupLookupInvite } from "#src/routers/groups/sendLookupInvite";
import { selfDeclareRating } from "#src/routers/ratings/selfDeclare";
import { acceptInAppInvite } from "#src/routers/teams/acceptInAppInvite";
import { createTeam } from "#src/routers/teams/create";
import { createInviteLink as createTeamInviteLink } from "#src/routers/teams/createInviteLink";
import { inviteInApp } from "#src/routers/teams/inviteInApp";
import { requestLink as requestTeamLink } from "#src/routers/teams/requestLink";
import { markOnboardingComplete } from "#src/routers/users/completeOnboarding";
import { writePreferredPosition } from "#src/routers/users/setPreferredPosition";
import { acceptLinkRequest as acceptGroupLinkRequest } from "#src/routers/groups/acceptLinkRequest";
import { addCourt } from "#src/routers/venues/addCourt";
import { addManager as addVenueManager } from "#src/routers/venues/addManager";
import { approveLinkRequest as approveVenueLinkRequest } from "#src/routers/venues/approveLinkRequest";
import { createVenue } from "#src/routers/venues/create";
import { sendGroupLinkRequest } from "#src/routers/venues/sendGroupLinkRequest";
import { rejectLinkRequest as rejectVenueLinkRequest } from "#src/routers/venues/rejectLinkRequest";
import { setOpeningHours } from "#src/routers/venues/setOpeningHours";
import { setPricingRules } from "#src/routers/venues/setPricingRules";
import { softArchive as softArchiveVenue } from "#src/routers/venues/softArchive";
import { updateBookingSettings } from "#src/routers/venues/updateBookingSettings";
import { updateCancellationPolicy } from "#src/routers/venues/updateCancellationPolicy";

import type { SelfDeclareChoice } from "@repo/domain/level-bands";
import { addProductDays, zonedParts } from "@repo/domain/product-timezone";
import type { Sport } from "@repo/domain/sport";

const ORIGIN = process.env.SEED_ORIGIN ?? "http://localhost:3000";

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  const local = ["localhost", "127.0.0.1", "::1"].includes(host);
  if (!local && process.env.SEED_ALLOW_REMOTE !== "1") {
    throw new Error(
      `Refusing to seed ${host || "an unknown host"}: the seed wipes every table. ` +
        "Point DATABASE_URL at a local database (or set SEED_ALLOW_REMOTE=1).",
    );
  }
}

async function wipe() {
  const rows = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const tables = [...rows].map((r) => `"public"."${r.tablename}"`);
  if (tables.length > 0) {
    await db.execute(
      sql.raw(`truncate table ${tables.join(", ")} restart identity cascade`),
    );
  }
}

async function step<T>(label: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`\n✗ ${label}`);
    throw error;
  }
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Today at `hour`:`minute` local time, shifted by `days`. */
function at(days: number, hour: number, minute = 0) {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

type Persona = {
  key: string;
  name: string;
  username: string;
  level: SelfDeclareChoice;
  position: "left" | "right" | "either";
  onboarded?: boolean;
};

/**
 * `me` is the main demo persona; `newbie` has not finished onboarding. Point
 * either at a real Clerk dev User with SEED_CLERK_ID_ME / SEED_CLERK_ID_NEWBIE
 * (or any persona with SEED_CLERK_ID_<KEY>) to sign in as them.
 */
const PERSONAS: Persona[] = [
  {
    key: "me",
    name: "Sam Rivera",
    username: "samrivera",
    level: "C2",
    position: "right",
  },
  {
    key: "newbie",
    name: "Nora Newman",
    username: "noranew",
    level: "unknown",
    position: "either",
    onboarded: false,
  },
  {
    key: "lina",
    name: "Lina Haddad",
    username: "linah",
    level: "B3",
    position: "left",
  },
  {
    key: "omar",
    name: "Omar Aziz",
    username: "omaraziz",
    level: "C1",
    position: "right",
  },
  {
    key: "maya",
    name: "Maya Chen",
    username: "mayachen",
    level: "C2",
    position: "left",
  },
  {
    key: "diego",
    name: "Diego Santos",
    username: "diegos",
    level: "C3",
    position: "right",
  },
  {
    key: "priya",
    name: "Priya Nair",
    username: "priyan",
    level: "B2",
    position: "either",
  },
  {
    key: "tom",
    name: "Tom Becker",
    username: "tombecker",
    level: "D1",
    position: "left",
  },
  {
    key: "sofia",
    name: "Sofia Rossi",
    username: "sofiar",
    level: "C2",
    position: "right",
  },
  {
    key: "yusuf",
    name: "Yusuf Kaya",
    username: "yusufk",
    level: "C3",
    position: "left",
  },
  {
    key: "emma",
    name: "Emma Laurent",
    username: "emmal",
    level: "B1",
    position: "right",
  },
  {
    key: "jonas",
    name: "Jonas Berg",
    username: "jonasb",
    level: "D2",
    position: "either",
  },
  {
    key: "aisha",
    name: "Aisha Bello",
    username: "aishab",
    level: "C1",
    position: "left",
  },
  {
    key: "marco",
    name: "Marco Ferri",
    username: "marcof",
    level: "B3",
    position: "right",
  },
  {
    key: "hana",
    name: "Hana Sato",
    username: "hanas",
    level: "D1",
    position: "left",
  },
  {
    key: "leo",
    name: "Leo Martin",
    username: "leom",
    level: "C3",
    position: "right",
  },
  {
    key: "zara",
    name: "Zara Khan",
    username: "zarak",
    level: "A",
    position: "either",
  },
  {
    key: "ben",
    name: "Ben Okafor",
    username: "beno",
    level: "D3",
    position: "right",
  },
];

type Users = Record<string, { id: string; clerkId: string; name: string }>;

async function seedUsers(): Promise<Users> {
  const users: Users = {};
  for (const persona of PERSONAS) {
    const clerkId =
      process.env[`SEED_CLERK_ID_${persona.key.toUpperCase()}`] ??
      `seed_${persona.key}`;
    const [row] = await db
      .insert(user)
      .values({
        clerkId,
        name: persona.name,
        username: persona.username,
        email: `${persona.username}@example.test`,
        emailVerified: true,
      })
      .returning({ id: user.id });
    if (!row) throw new Error(`Failed to insert ${persona.key}`);
    users[persona.key] = { id: row.id, clerkId, name: persona.name };

    if (persona.onboarded === false) continue;
    await selfDeclareRating(db, row.id, "padel", persona.level);
    await writePreferredPosition(db, {
      userId: row.id,
      preferredPosition: persona.position,
    });
    await markOnboardingComplete(db, { userId: row.id });
  }
  return users;
}

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

async function seedVenues() {
  const venue = async (
    name: string,
    city: string,
    country: string,
    courtNames: string[],
    sport: Sport = "padel",
  ) => {
    const created = await createVenue(db, { name, city, country });
    const courtIds: string[] = [];
    for (const courtName of courtNames) {
      const court = await addCourt(db, {
        venueId: created.id,
        name: courtName,
        sport,
        actor: { userId: "seed", publicMetadata: { operator: true } },
      });
      courtIds.push(court.id);
    }
    return { id: created.id, courtIds };
  };

  const central = await venue("Padel Central", "Lisbon", "PT", [
    "Court 1",
    "Court 2",
    "Court 3",
    "Court 4",
  ]);
  const operator = { userId: "seed", publicMetadata: { operator: true } };
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    await setOpeningHours(db, {
      venueId: central.id,
      weekday,
      windows:
        weekday === 5
          ? []
          : [
              { opensAtMinutes: 8 * 60, closesAtMinutes: 14 * 60 },
              { opensAtMinutes: 16 * 60, closesAtMinutes: 23 * 60 },
            ],
      actor: operator,
    });
  }
  await setPricingRules(db, {
    venueId: central.id,
    rules: [
      {
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        startMinutes: 0,
        endMinutes: 17 * 60,
        hourlyRateFils: 10_000,
        label: "Off-peak",
      },
      {
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        startMinutes: 17 * 60,
        endMinutes: 24 * 60,
        hourlyRateFils: 16_000,
        label: "Peak",
      },
    ],
    actor: operator,
  });
  await updateCancellationPolicy(db, {
    venueId: central.id,
    policy: {
      tiers: [
        { hoursBefore: 48, refundPercent: 100 },
        { hoursBefore: 12, refundPercent: 50 },
      ],
      lateRefundPercent: 0,
      customerCancelUntilMinutes: 60,
    },
    actor: operator,
  });
  await updateBookingSettings(db, {
    venueId: central.id,
    acceptingBookings: true,
    durationOptionsMinutes: [60, 90, 120],
    bookingHorizonDays: 21,
    description: "Four indoor padel courts in central Lisbon.",
    bookingNotes: "Reception is on the first floor.",
    actor: operator,
  });
  const riverside = await venue("Riverside Padel", "Lisbon", "PT", [
    "Panoramic",
    "Court B",
  ]);
  const harbour = await venue("Harbour Racket Club", "Porto", "PT", [
    "Centre Court",
    "Court 2",
    "Court 3",
  ]);
  const pitches = await venue(
    "Matchday Pitches",
    "Lisbon",
    "PT",
    ["Pitch A", "Pitch B"],
    "football",
  );
  const pitchHours = [{ opensAtMinutes: 8 * 60, closesAtMinutes: 23 * 60 }];
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    await setOpeningHours(db, {
      venueId: pitches.id,
      weekday,
      windows: pitchHours,
      actor: operator,
    });
  }
  await setPricingRules(db, {
    venueId: pitches.id,
    rules: pitches.courtIds.map((courtId) => ({
      courtId,
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      startMinutes: 0,
      endMinutes: 24 * 60,
      hourlyRateFils: 30_000,
      label: "All day",
    })),
    actor: operator,
  });
  await updateBookingSettings(db, {
    venueId: pitches.id,
    acceptingBookings: true,
    durationOptionsMinutes: [60, 90],
    bookingHorizonDays: 21,
    actor: operator,
  });
  const oldTown = await venue("Old Town Arena", "Lisbon", "PT", ["Court 1"]);
  await softArchiveVenue(db, { venueId: oldTown.id });

  const skyline = await venue("Skyline Padel", "Lisbon", "PT", ["Court 1"]);
  const bay = await venue("Bay Padel", "Porto", "PT", ["Court 1", "Court 2"]);

  return { central, riverside, harbour, pitches, oldTown, skyline, bay };
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

async function seedBookings(u: Users, v: Venues) {
  // The graphile_worker schema only exists once the API worker has booted.
  setJobSink({ add: () => Promise.resolve(), remove: () => Promise.resolve() });

  const FRIDAY = 5;
  const now = new Date();

  const hourOn = (dayOffset: number, hour: number) => {
    let offset = dayOffset;
    const weekdayOf = (days: number) => {
      const { year, month, day } = zonedParts(addProductDays(now, days));
      return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    };
    while (dayOffset > 0 && weekdayOf(offset) === FRIDAY) offset += 1;
    return new Date(
      addProductDays(now, offset).getTime() + hour * 60 * 60 * 1000,
    );
  };

  const [court1, court2] = v.central.courtIds;
  const venue = await db.query.venues.findFirst({
    where: eq(venues.id, v.central.id),
    columns: { cancellationPolicy: true },
  });
  if (!court1 || !court2 || !venue) throw new Error("Central Venue missing");

  const book = (
    userKey: string,
    courtId: string,
    dayOffset: number,
    hour: number,
    durationMinutes: number,
  ) =>
    createBooking(db, {
      venueId: v.central.id,
      courtId,
      userId: u[userKey]!.id,
      startsAt: hourOn(dayOffset, hour),
      durationMinutes,
      now,
    });

  await book("me", court1, 2, 18, 60);
  const yusufs = await createBooking(db, {
    venueId: v.central.id,
    courtId: court2,
    userId: u.yusuf!.id,
    startsAt: hourOn(2, 17),
    durationMinutes: 90,
    paymentMethod: "at_venue",
    now,
  });
  const bookingGame = await createBookingGame(db, {
    bookingId: yusufs.booking.id,
    userId: u.yusuf!.id,
    pricePerPlayerFils: Math.ceil(yusufs.booking.priceFils / 4),
    now,
  });
  await sendGameLookupInvite(db, {
    gameId: bookingGame.gameId,
    userId: u.yusuf!.id,
    userIds: [u.me!.id],
  });
  const paid = await book("lina", court1, 3, 9, 60);
  await settlePayment(db, {
    bookingId: paid.booking.id,
    outcome: "paid",
    method: "cash",
    actorUserId: u.me!.id,
    amountFils: paid.booking.priceFils,
    now,
  });
  const dropped = await book("omar", court2, 4, 18, 60);
  await cancelMyBooking(db, {
    bookingId: dropped.booking.id,
    userId: u.omar!.id,
    now,
  });

  const past = async (
    userKey: string,
    courtId: string,
    dayOffset: number,
    hour: number,
    status: "confirmed" | "no_show",
    paymentStatus: "paid" | "pending",
  ) => {
    const [row] = await db
      .insert(bookings)
      .values({
        venueId: v.central.id,
        courtId,
        userId: u[userKey]!.id,
        startsAt: hourOn(dayOffset, hour),
        endsAt: hourOn(dayOffset, hour + 1),
        status,
        noShowAt: status === "no_show" ? hourOn(dayOffset, hour + 1) : null,
        source: "app",
        priceFils: 16_000,
        cancellationPolicy: venue.cancellationPolicy,
        createdByUserId: u[userKey]!.id,
      })
      .returning({ id: bookings.id });
    if (paymentStatus === "paid") {
      await settlePayment(db, {
        bookingId: row!.id,
        outcome: "paid",
        method: "card",
        actorUserId: u[userKey]!.id,
        amountFils: 16_000,
        now,
      });
    }
  };

  await past("me", court1, -5, 18, "confirmed", "paid");
  await past("maya", court2, -2, 18, "confirmed", "paid");
  await past("tom", court1, -3, 19, "no_show", "pending");
}

// ---------------------------------------------------------------------------
// Communities
// ---------------------------------------------------------------------------

type Venues = Awaited<ReturnType<typeof seedVenues>>;

async function joinCommunityByInvite(
  communityId: string,
  inviterId: string,
  inviteeIds: string[],
) {
  await sendCommunityLookupInvite(db, {
    communityId,
    userId: inviterId,
    userIds: inviteeIds,
  });
  const invites = await db.query.communityMemberInvites.findMany({
    where: eq(communityMemberInvites.communityId, communityId),
  });
  for (const invite of invites) {
    if (!inviteeIds.includes(invite.userId)) continue;
    await acceptCommunityLookupInvite(db, {
      inviteId: invite.id,
      userId: invite.userId,
    });
  }
}

async function seedCommunities(u: Users, venues: Venues) {
  // Sam owns a live Public Community with a linked Venue, staff, members,
  // pending join requests, and a Team link request to decide.
  const lisbon = await createCommunity(db, {
    name: "Lisbon Padel Club",
    description:
      "Weekly ladders, socials and friendly tournaments at Padel Central.",
    type: "public",
    sports: ["padel"],
    userId: u.me!.id,
  });
  await joinCommunityByInvite(lisbon.id, u.me!.id, [
    u.lina!.id,
    u.omar!.id,
    u.maya!.id,
    u.diego!.id,
    u.priya!.id,
    u.sofia!.id,
    u.yusuf!.id,
    u.emma!.id,
    u.leo!.id,
  ]);
  await setMemberRole(db, {
    communityId: lisbon.id,
    callerId: u.me!.id,
    userId: u.lina!.id,
    role: "admin",
  });
  await requestVenueLink(db, {
    communityId: lisbon.id,
    userId: u.me!.id,
    venueId: venues.central.id,
  });
  const lisbonLink = await db.query.venueLinkRequests.findFirst({
    where: eq(venueLinkRequests.communityId, lisbon.id),
  });
  await approveVenueLinkRequest(db, {
    requestId: lisbonLink!.id,
    userId: u.me!.id,
  });
  await requestCommunityJoin(db, { communityId: lisbon.id, userId: u.tom!.id });
  await requestCommunityJoin(db, {
    communityId: lisbon.id,
    userId: u.hana!.id,
  });
  await sendCommunityLookupInvite(db, {
    communityId: lisbon.id,
    userId: u.me!.id,
    userIds: [u.jonas!.id],
  });
  await createCommunityInviteLink(db, {
    communityId: lisbon.id,
    userId: u.me!.id,
    origin: ORIGIN,
  });

  // Sam is a plain Member of a Private Community run by Marco.
  const sunset = await createCommunity(db, {
    name: "Sunset Social",
    description: "Invite-only evening sessions at Riverside.",
    type: "private",
    sports: ["padel"],
    userId: u.marco!.id,
  });
  await joinCommunityByInvite(sunset.id, u.marco!.id, [
    u.me!.id,
    u.zara!.id,
    u.aisha!.id,
    u.emma!.id,
  ]);
  await requestVenueLink(db, {
    communityId: sunset.id,
    userId: u.marco!.id,
    venueId: venues.riverside.id,
  });
  const sunsetLink = await db.query.venueLinkRequests.findFirst({
    where: eq(venueLinkRequests.communityId, sunset.id),
  });
  await approveVenueLinkRequest(db, {
    requestId: sunsetLink!.id,
    userId: u.marco!.id,
  });

  // A Public Community Sam is not in (join-by-URL request flow), with a
  // Venue link request still waiting for an Operator.
  const porto = await createCommunity(db, {
    name: "Porto Padel Collective",
    description: "Padel meetups around the Harbour.",
    type: "public",
    sports: ["padel"],
    userId: u.zara!.id,
  });
  await joinCommunityByInvite(porto.id, u.zara!.id, [u.marco!.id, u.ben!.id]);
  await requestVenueLink(db, {
    communityId: porto.id,
    userId: u.zara!.id,
    venueId: venues.harbour.id,
  });

  // Sam has a pending Lookup invite into a Private Community.
  const harbourCircle = await createCommunity(db, {
    name: "Harbour Circle",
    description: "Private league for Porto regulars.",
    type: "private",
    sports: ["padel"],
    userId: u.emma!.id,
  });
  await sendCommunityLookupInvite(db, {
    communityId: harbourCircle.id,
    userId: u.emma!.id,
    userIds: [u.me!.id],
  });

  // Sam owns a Soft-archived Community (unarchive flow, frozen doors).
  const legacy = await createCommunity(db, {
    name: "Old Town Padel (archived)",
    description: "Our first club; kept for history.",
    type: "public",
    sports: ["padel"],
    userId: u.me!.id,
  });
  await joinCommunityByInvite(legacy.id, u.me!.id, [u.tom!.id, u.jonas!.id]);
  await requestVenueLink(db, {
    communityId: legacy.id,
    userId: u.me!.id,
    venueId: venues.harbour.id,
  });
  const legacyLink = await db.query.venueLinkRequests.findFirst({
    where: eq(venueLinkRequests.communityId, legacy.id),
  });
  await rejectVenueLinkRequest(db, {
    requestId: legacyLink!.id,
    userId: u.zara!.id,
  });
  const legacyGroup = await createClubPublic(db, {
    communityId: legacy.id,
    name: "Old Town Mornings",
    sport: "padel",
    userId: u.me!.id,
  });
  await softArchiveCommunity(db, { communityId: legacy.id, userId: u.me!.id });

  return { lisbon, sunset, porto, harbourCircle, legacy, legacyGroup };
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

type Communities = Awaited<ReturnType<typeof seedCommunities>>;

async function joinGroupByInvite(
  groupId: string,
  inviterId: string,
  inviteeIds: string[],
) {
  await sendGroupLookupInvite(db, {
    groupId,
    userId: inviterId,
    userIds: inviteeIds,
  });
  const invites = await db.query.groupMemberInvites.findMany({
    where: eq(groupMemberInvites.groupId, groupId),
  });
  for (const invite of invites) {
    if (!inviteeIds.includes(invite.userId)) continue;
    await acceptGroupLookupInvite(db, {
      inviteId: invite.id,
      userId: invite.userId,
    });
  }
}

async function seedGroups(u: Users, c: Communities) {
  // Club Group Public in Sam's Community; the main place Games happen.
  const ladder = await createClubPublic(db, {
    communityId: c.lisbon.id,
    name: "Tuesday Ladder",
    description: "Competitive doubles every Tuesday at Padel Central.",
    sport: "padel",
    userId: u.me!.id,
  });
  for (const key of [
    "lina",
    "omar",
    "maya",
    "diego",
    "priya",
    "sofia",
    "yusuf",
    "emma",
    "leo",
  ]) {
    await joinClubPublic(db, { groupId: ladder.id, userId: u[key]!.id });
  }

  // Club Group Public with Require approval on and pending requests.
  const advanced = await createClubPublic(db, {
    communityId: c.lisbon.id,
    name: "Advanced Squad",
    description: "B-level and above. Requests reviewed by staff.",
    sport: "padel",
    userId: u.me!.id,
    requiresApproval: true,
  });
  await requestGroupJoin(db, { groupId: advanced.id, userId: u.maya!.id });
  await requestGroupJoin(db, { groupId: advanced.id, userId: u.diego!.id });
  // A non-Member request: approving it also admits them to the Community.
  await requestGroupJoin(db, { groupId: advanced.id, userId: u.marco!.id });

  // Club Group Private, invite only.
  const coaches = await createClubPrivate(db, {
    communityId: c.lisbon.id,
    name: "Coaches Circle",
    description: "Private planning group for session leads.",
    sport: "padel",
    userId: u.lina!.id,
  });
  await joinGroupByInvite(coaches.id, u.lina!.id, [u.me!.id, u.priya!.id]);

  // Loose Group Public Sam created.
  const friday = await createLoosePublic(db, {
    name: "Friday Night Padel",
    description: "Casual games after work. Everyone welcome.",
    sport: "padel",
    userId: u.me!.id,
  });
  for (const key of [
    "omar",
    "maya",
    "tom",
    "sofia",
    "aisha",
    "hana",
    "jonas",
    "ben",
  ]) {
    await joinLoosePublic(db, { groupId: friday.id, userId: u[key]!.id });
  }
  await createGroupInviteLink(db, {
    groupId: friday.id,
    userId: u.me!.id,
    origin: ORIGIN,
  });

  // Sunset Social's Club Group; Sam joins as a Community Member.
  const sunsetEvenings = await createClubPublic(db, {
    communityId: c.sunset.id,
    name: "Sunset Evenings",
    sport: "padel",
    userId: u.marco!.id,
  });
  for (const key of ["me", "zara", "aisha", "emma"]) {
    await joinClubPublic(db, {
      groupId: sunsetEvenings.id,
      userId: u[key]!.id,
    });
  }

  // Public Groups list for Sam: an open Loose Group, one that needs
  // approval, and a Club Group Public in a Community Sam is not in.
  const beach = await createLoosePublic(db, {
    name: "Beach Padel Crew",
    description: "Sunday mornings by the sea.",
    sport: "padel",
    userId: u.aisha!.id,
  });
  for (const key of ["hana", "ben", "tom"]) {
    await joinLoosePublic(db, { groupId: beach.id, userId: u[key]!.id });
  }
  const earlyBirds = await createLoosePublic(db, {
    name: "Early Birds 7am",
    description: "Serious morning sessions. Ask to join.",
    sport: "padel",
    userId: u.priya!.id,
    requiresApproval: true,
  });
  await joinLoosePublic(db, {
    groupId: earlyBirds.id,
    userId: u.zara!.id,
  }).catch(() => undefined);
  const portoOpen = await createClubPublic(db, {
    communityId: c.porto.id,
    name: "Porto Open Play",
    sport: "padel",
    userId: u.zara!.id,
  });
  await joinClubPublic(db, { groupId: portoOpen.id, userId: u.marco!.id });

  // Loose Group Public for football; its Games are rosters.
  const fiveASide = await createLoosePublic(db, {
    name: "Sunday Five-a-side",
    description: "Pickup football on pitches. Come as you are.",
    sport: "football",
    userId: u.tom!.id,
  });
  for (const key of ["me", "omar", "maya", "diego", "ben", "jonas"]) {
    await joinLoosePublic(db, { groupId: fiveASide.id, userId: u[key]!.id });
  }

  // Loose Group Private that Sam has a pending Lookup invite to.
  const secret = await createLoosePrivate(db, {
    name: "Thursday Doubles",
    description: "Fixed four, sometimes a sub.",
    sport: "padel",
    userId: u.leo!.id,
  });
  await sendGroupLookupInvite(db, {
    groupId: secret.id,
    userId: u.leo!.id,
    userIds: [u.me!.id],
  });

  return {
    ladder,
    advanced,
    coaches,
    friday,
    sunsetEvenings,
    beach,
    earlyBirds,
    portoOpen,
    fiveASide,
    secret,
  };
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

async function seedTeams(u: Users, c: Communities) {
  const make = async (
    ownerKey: string,
    name: string | undefined,
    sport: "padel" | "football" = "padel",
  ) =>
    createTeam(db, {
      name,
      sport,
      userId: u[ownerKey]!.id,
      userName: u[ownerKey]!.name,
    });
  const invite = async (teamId: string, fromKey: string, toKey: string) =>
    inviteInApp(db, {
      teamId,
      userId: u[fromKey]!.id,
      inviteeUserId: u[toKey]!.id,
    });

  // Complete Team: Sam + Omar, linked to Lisbon Padel Club.
  const smash = await make("me", "Smash Brothers");
  const smashInvite = await invite(smash.id, "me", "omar");
  await acceptInAppInvite(db, { inviteId: smashInvite.id, userId: u.omar!.id });
  await requestTeamLink(db, {
    teamId: smash.id,
    communityId: c.lisbon.id,
    userId: u.me!.id,
  });
  const smashLink = await db.query.teamLinkRequests.findFirst();
  if (smashLink) {
    await approveTeamLink(db, { requestId: smashLink.id, userId: u.me!.id });
  }

  // Incomplete Team: Sam waiting on Maya, plus an Invite link.
  const netRunners = await make("me", "Net Runners");
  await invite(netRunners.id, "me", "maya");
  await createTeamInviteLink(db, {
    teamId: netRunners.id,
    userId: u.me!.id,
    origin: ORIGIN,
  });

  // Pending in-app Team invite to Sam.
  const lobs = await make("sofia", "Lob Stars");
  await invite(lobs.id, "sofia", "me");

  // A complete Team asking to link to Sam's Community (Owner decides).
  const duo = await make("lina", "Lina & Priya");
  const duoInvite = await invite(duo.id, "lina", "priya");
  await acceptInAppInvite(db, { inviteId: duoInvite.id, userId: u.priya!.id });
  await requestTeamLink(db, {
    teamId: duo.id,
    communityId: c.lisbon.id,
    userId: u.lina!.id,
  });

  // Two more complete Teams for team-only registrations.
  const rally = await make("diego", "Rally Kings");
  const rallyInvite = await invite(rally.id, "diego", "yusuf");
  await acceptInAppInvite(db, {
    inviteId: rallyInvite.id,
    userId: u.yusuf!.id,
  });

  const squad = await make("tom", "Sunday Seven", "football");
  for (const memberKey of ["emma", "jonas", "aisha", "marco", "hana"]) {
    const squadInvite = await invite(squad.id, "tom", memberKey);
    await acceptInAppInvite(db, {
      inviteId: squadInvite.id,
      userId: u[memberKey]!.id,
    });
  }

  return { smash, netRunners, lobs, duo, rally, squad };
}

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

type Groups = Awaited<ReturnType<typeof seedGroups>>;

type Seat = { key: string; side: 1 | 2; position: "left" | "right" };

/** Four seats: first two keys on side 1, last two on side 2. */
function seats(keys: [string, string, string, string]): Seat[] {
  return [
    { key: keys[0], side: 1, position: "left" },
    { key: keys[1], side: 1, position: "right" },
    { key: keys[2], side: 2, position: "left" },
    { key: keys[3], side: 2, position: "right" },
  ];
}

async function friendly(
  u: Users,
  args: {
    groupId: string;
    organizerKey: string;
    venueId: string;
    courtId?: string | null;
    name?: string;
    start: Date;
    minutes?: number;
    seats?: Seat[];
    pricePerPlayerFils?: number | null;
    levelMinTenths?: number | null;
    levelMaxTenths?: number | null;
  },
) {
  const created = await createGame(db, {
    createdBy: u[args.organizerKey]!.id,
    name: args.name,
    groupId: args.groupId,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    windowStart: args.start,
    windowEnd: new Date(
      args.start.getTime() + (args.minutes ?? 90) * 60 * 1000,
    ),
    venueId: args.venueId,
    courtId: args.courtId ?? null,
    pricePerPlayerFils: args.pricePerPlayerFils ?? null,
    levelMinTenths: args.levelMinTenths ?? null,
    levelMaxTenths: args.levelMaxTenths ?? null,
  });
  for (const seat of args.seats ?? []) {
    await step(`seat ${seat.key} on ${args.name ?? created.id}`, () =>
      registerSeat(db, {
        gameId: created.id,
        userId: u[seat.key]!.id,
        sideIndex: seat.side,
        position: seat.position,
      }),
    );
  }
  return { id: created.id, matchId: created.matchId! };
}

async function seatedUserIds(match: typeof matches.$inferSelect) {
  const teamIds = [match.slot1GameTeamId, match.slot2GameTeamId].filter(
    (id): id is string => id != null,
  );
  const links = await db.query.gameTeamPlayers.findMany({
    where: inArray(gameTeamPlayers.gameTeamId, teamIds),
    with: { gamePlayer: { columns: { userId: true } } },
  });
  return links.flatMap((link) =>
    link.gamePlayer.userId ? [link.gamePlayer.userId] : [],
  );
}

/** Move a Game (and its Matches) so it started `daysAgo` days ago. */
async function moveIntoPast(gameId: string, start: Date) {
  const game = await db.query.games.findFirst({ where: eq(games.id, gameId) });
  if (!game?.windowStart || !game.windowEnd) return;
  const shift = start.getTime() - game.windowStart.getTime();
  await db
    .update(games)
    .set({
      windowStart: new Date(game.windowStart.getTime() + shift),
      windowEnd: new Date(game.windowEnd.getTime() + shift),
      createdAt: new Date(start.getTime() - 3 * DAY),
    })
    .where(eq(games.id, gameId));
  await db.execute(sql`
    update ${matches}
    set start_time = start_time + (${shift} * interval '1 millisecond'),
        end_time = end_time + (${shift} * interval '1 millisecond')
    where game_id = ${gameId} and start_time is not null
  `);
}

/**
 * Score a Friendly game's Match. `scores` are [slot 1, slot 2] games won per
 * Set; `scorerKey` enters them (and is auto-confirmed). `confirmKeys` then
 * confirm; once everyone seated has, the Match completes and rates.
 */
async function playFriendly(
  u: Users,
  game: { id: string; matchId: string },
  scorerKey: string,
  scores: [number, number][],
  confirmKeys: string[],
) {
  const sets = await db.query.matchSets.findMany({
    where: eq(matchSets.matchId, game.matchId),
    orderBy: (s, { asc }) => [asc(s.setNumber)],
  });
  for (const [index, [a, b]] of scores.entries()) {
    let set = sets[index];
    if (!set) {
      await addSet(db, {
        gameId: game.id,
        matchId: game.matchId,
        userId: u[scorerKey]!.id,
      });
      const refreshed = await db.query.matchSets.findMany({
        where: eq(matchSets.matchId, game.matchId),
        orderBy: (s, { asc }) => [asc(s.setNumber)],
      });
      set = refreshed[index];
    }
    await scoreSet(db, {
      gameId: game.id,
      matchId: game.matchId,
      setId: set!.id,
      userId: u[scorerKey]!.id,
      slot1GamesWon: a,
      slot2GamesWon: b,
    });
  }
  for (const key of confirmKeys) {
    await confirmMatchResult(db, {
      gameId: game.id,
      matchId: game.matchId,
      userId: u[key]!.id,
    });
  }
}

async function seedGames(u: Users, g: Groups, v: Venues) {
  const central = v.central;
  const riverside = v.riverside;

  // --- Played Friendly games: rated history, form, stats, Match history ---
  const history: {
    daysAgo: number;
    group: "ladder" | "friday";
    seats: [string, string, string, string];
    scores: [number, number][];
    name?: string;
  }[] = [
    {
      daysAgo: 35,
      group: "friday",
      seats: ["me", "omar", "maya", "tom"],
      scores: [
        [6, 3],
        [6, 4],
      ],
    },
    {
      daysAgo: 28,
      group: "ladder",
      seats: ["me", "lina", "diego", "sofia"],
      scores: [
        [4, 6],
        [6, 3],
        [6, 4],
      ],
    },
    {
      daysAgo: 21,
      group: "friday",
      seats: ["sofia", "aisha", "me", "hana"],
      scores: [
        [6, 2],
        [6, 1],
      ],
    },
    {
      daysAgo: 14,
      group: "ladder",
      seats: ["me", "yusuf", "emma", "priya"],
      scores: [
        [3, 6],
        [4, 6],
      ],
      name: "Ladder round 3",
    },
    {
      daysAgo: 10,
      group: "friday",
      seats: ["me", "jonas", "ben", "tom"],
      scores: [
        [6, 0],
        [6, 2],
      ],
    },
    {
      daysAgo: 7,
      group: "ladder",
      seats: ["omar", "me", "leo", "maya"],
      scores: [[6, 6]],
      name: "Ladder round 4",
    },
    {
      daysAgo: 4,
      group: "ladder",
      seats: ["lina", "priya", "diego", "yusuf"],
      scores: [
        [6, 4],
        [7, 5],
      ],
    },
  ];
  for (const played of history) {
    const group = played.group === "ladder" ? g.ladder : g.friday;
    const venue = played.group === "ladder" ? central : riverside;
    const start = at(-played.daysAgo, 19);
    const game = await friendly(u, {
      groupId: group.id,
      organizerKey: "me",
      venueId: venue.id,
      courtId: venue.courtIds[0],
      name: played.name,
      start: at(2, 19),
      seats: seats(played.seats),
      pricePerPlayerFils: 8000,
    });
    await moveIntoPast(game.id, start);
    await step(`play history ${played.daysAgo}d`, () =>
      playFriendly(
        u,
        game,
        played.seats[0],
        played.scores,
        played.seats.slice(1),
      ),
    );
  }

  // --- Played, but Sam still has to confirm the result ---
  const awaiting = await friendly(u, {
    groupId: g.friday.id,
    organizerKey: "me",
    venueId: riverside.id,
    courtId: riverside.courtIds[1],
    name: "Friday rematch",
    start: at(2, 20),
    seats: seats(["omar", "me", "sofia", "aisha"]),
  });
  await moveIntoPast(awaiting.id, at(-2, 20));
  await playFriendly(
    u,
    awaiting,
    "sofia",
    [
      [6, 4],
      [3, 6],
      [7, 6],
    ],
    ["aisha"],
  );

  // --- Played with no score entered yet (enter Sets flow) ---
  const unscored = await friendly(u, {
    groupId: g.ladder.id,
    organizerKey: "me",
    venueId: central.id,
    courtId: central.courtIds[2],
    name: "Yesterday's ladder",
    start: at(2, 18),
    seats: seats(["me", "leo", "emma", "yusuf"]),
  });
  await moveIntoPast(unscored.id, at(-1, 18));

  // --- Upcoming Friendly games ---
  // Full, with a waitlist.
  const full = await friendly(u, {
    groupId: g.ladder.id,
    organizerKey: "me",
    venueId: central.id,
    courtId: central.courtIds[0],
    name: "Tuesday Ladder",
    start: at(1, 19),
    seats: seats(["me", "omar", "lina", "sofia"]),
    pricePerPlayerFils: 10000,
  });
  await registerSeat(db, { gameId: full.id, userId: u.maya!.id });
  await registerSeat(db, { gameId: full.id, userId: u.leo!.id });

  // Half full: Sam seated with a partner, two open seats on the other side.
  const halfFull = await friendly(u, {
    groupId: g.friday.id,
    organizerKey: "me",
    venueId: riverside.id,
    courtId: riverside.courtIds[0],
    name: "Friday Night Padel",
    start: at(4, 20),
    pricePerPlayerFils: 7500,
  });
  await registerWithPartner(db, {
    gameId: halfFull.id,
    userId: u.me!.id,
    partnerUserId: u.tom!.id,
    sideIndex: 1,
    position: "right",
  });

  // One seat left, Sam not in (join a single seat flow).
  const oneLeft = await friendly(u, {
    groupId: g.ladder.id,
    organizerKey: "lina",
    venueId: central.id,
    courtId: central.courtIds[1],
    name: "Thursday Mixer",
    start: at(3, 18, 30),
    seats: seats(["lina", "priya", "diego", "yusuf"]).slice(0, 3),
  });

  // Empty Game Sam organizes, open for anyone in the Group.
  await friendly(u, {
    groupId: g.friday.id,
    organizerKey: "me",
    venueId: riverside.id,
    name: "Sunday Social",
    start: at(6, 10),
    minutes: 120,
  });

  // Level-restricted Game above Sam's Level (Level range request flow) ...
  const highLevel = await friendly(u, {
    groupId: g.ladder.id,
    organizerKey: "lina",
    venueId: central.id,
    courtId: central.courtIds[3],
    name: "B-level Session",
    start: at(5, 19),
    levelMinTenths: 40,
    levelMaxTenths: 60,
    seats: seats(["lina", "emma", "priya", "leo"]).slice(0, 2),
  });
  // ... and one Sam organizes, where Emma asked to be let in.
  const beginners = await friendly(u, {
    groupId: g.ladder.id,
    organizerKey: "me",
    venueId: central.id,
    name: "Intermediate Night",
    start: at(8, 19),
    levelMinTenths: 25,
    levelMaxTenths: 45,
    seats: seats(["me", "sofia", "omar", "maya"]).slice(0, 2),
  });
  await step("level range request", () =>
    requestLevelRange(db, { gameId: beginners.id, userId: u.emma!.id }),
  );
  // ... with an Unclaimed player Sam added by phone in one of its open seats.
  await step("unclaimed player", () =>
    db.transaction(async (tx) => {
      const { user: unclaimed } = await createUnclaimedPlayer(tx, {
        phoneNumber: "+97336124408",
        name: "Ali Hassan",
        addedByUserId: u.me!.id,
        startingLevel: { sport: "padel", level: "not_sure" },
      });
      const game = await requireGame(tx, beginners.id);
      await occupySeat(tx, game, unclaimed.id, 2, "left");
    }),
  );

  // Pending Game Lookup invite to Sam, and a Game Invite link (/g/{code}).
  const sunsetGame = await friendly(u, {
    groupId: g.sunsetEvenings.id,
    organizerKey: "marco",
    venueId: riverside.id,
    courtId: riverside.courtIds[0],
    name: "Sunset Doubles",
    start: at(2, 19, 30),
    seats: seats(["marco", "zara", "aisha", "emma"]).slice(0, 2),
  });
  await sendGameLookupInvite(db, {
    gameId: sunsetGame.id,
    userId: u.marco!.id,
    userIds: [u.me!.id],
  });
  await createGameInviteLink(db, {
    gameId: halfFull.id,
    userId: u.me!.id,
    origin: ORIGIN,
  });

  // Cancelled Game.
  const cancelled = await friendly(u, {
    groupId: g.friday.id,
    organizerKey: "me",
    venueId: riverside.id,
    name: "Rained off",
    start: at(3, 9),
  });
  await cancelGame(db, { gameId: cancelled.id, userId: u.me!.id });

  // --- Football Game: a roster, no seats ---
  const pitchGame = await createGame(db, {
    createdBy: u.tom!.id,
    name: "Sunday five-a-side",
    groupId: g.fiveASide.id,
    isPublic: false,
    format: "friendly_game",
    registrationMode: "individual",
    sideSize: 5,
    playersAllowed: 12,
    windowStart: at(5, 19),
    windowEnd: at(5, 20),
    venueId: v.pitches.id,
    courtId: v.pitches.courtIds[0]!,
    pricePerPlayerFils: 3000,
  });
  for (const key of ["tom", "me", "omar", "maya", "diego", "ben", "jonas"]) {
    await register(db, { gameId: pitchGame.id, userId: u[key]!.id });
  }

  // --- Americano ---
  const americano = await createGame(db, {
    createdBy: u.me!.id,
    name: "Autumn Americano",
    groupId: g.ladder.id,
    isPublic: false,
    format: "americano",
    registrationMode: "individual",
    playersAllowed: 8,
    windowStart: at(9, 10),
    windowEnd: at(9, 13),
    venueId: central.id,
    courtIds: central.courtIds.slice(0, 2),
    pricePerPlayerFils: 15000,
  });
  for (const key of ["me", "omar", "maya", "diego", "sofia"]) {
    await register(db, { gameId: americano.id, userId: u[key]!.id });
  }

  // --- Friendly tournaments ---
  // Open for registration, before the draw.
  const openTournament = await createTournament(db, {
    createdBy: u.me!.id,
    name: "Club Championship",
    groupId: g.ladder.id,
    isPublic: false,
    teamCount: 8,
    poolCount: 2,
    matchMinutes: 20,
    windowStart: at(12, 9),
    windowEnd: at(12, 17),
    venueId: central.id,
    courtIds: central.courtIds,
    pricePerPlayerFils: 20000,
  });
  const openPairs: [string, string][] = [
    ["lina", "priya"],
    ["omar", "maya"],
    ["diego", "yusuf"],
    ["emma", "leo"],
  ];
  for (const [index, [a, b]] of openPairs.entries()) {
    await step(`tournament pair ${a}+${b}`, () =>
      registerWithPartner(db, {
        gameId: openTournament.id,
        userId: u[a]!.id,
        partnerUserId: u[b]!.id,
        sideIndex: index + 1,
        position: "left",
      }),
    );
  }
  // Registering alone leaves half-filled Game teams the organizer can merge.
  for (const [offset, key] of ["sofia", "me"].entries()) {
    await step(`tournament solo ${key}`, () =>
      registerSeat(db, {
        gameId: openTournament.id,
        userId: u[key]!.id,
        sideIndex: openPairs.length + offset + 1,
        position: "right",
      }),
    );
  }

  // Full field with a drafted (not yet posted) draw: re-roll / post flow.
  const draftTournament = await createTournament(db, {
    createdBy: u.me!.id,
    name: "Autumn Cup",
    groupId: g.friday.id,
    isPublic: false,
    teamCount: 4,
    poolCount: 1,
    matchMinutes: 20,
    windowStart: at(10, 18),
    windowEnd: at(10, 21),
    venueId: riverside.id,
    courtIds: riverside.courtIds,
  });
  const draftPairs: [string, string][] = [
    ["tom", "ben"],
    ["aisha", "hana"],
    ["jonas", "omar"],
    ["maya", "sofia"],
  ];
  for (const [index, [a, b]] of draftPairs.entries()) {
    await step(`draft tournament pair ${a}+${b}`, () =>
      registerWithPartner(db, {
        gameId: draftTournament.id,
        userId: u[a]!.id,
        partnerUserId: u[b]!.id,
        sideIndex: index + 1,
        position: "left",
      }),
    );
  }
  await step("draft draw", () =>
    drawPools(db, { gameId: draftTournament.id, organizerUserId: u.me!.id }),
  );

  // Drawn and under way today: pools posted, some Matches scored.
  const liveTournament = await createTournament(db, {
    createdBy: u.me!.id,
    name: "Friday Cup",
    groupId: g.friday.id,
    isPublic: false,
    teamCount: 4,
    poolCount: 1,
    matchMinutes: 25,
    windowStart: at(3, 9),
    windowEnd: at(3, 14),
    venueId: riverside.id,
    courtIds: riverside.courtIds,
  });
  const livePairs: [string, string][] = [
    ["me", "omar"],
    ["maya", "tom"],
    ["sofia", "aisha"],
    ["hana", "jonas"],
  ];
  for (const [index, [a, b]] of livePairs.entries()) {
    await step(`live tournament pair ${a}+${b}`, () =>
      registerWithPartner(db, {
        gameId: liveTournament.id,
        userId: u[a]!.id,
        partnerUserId: u[b]!.id,
        sideIndex: index + 1,
        position: "left",
      }),
    );
  }
  await step("draw pools", () =>
    drawPools(db, { gameId: liveTournament.id, organizerUserId: u.me!.id }),
  );
  await step("post pool draw", () =>
    postPoolDraw(db, { gameId: liveTournament.id, organizerUserId: u.me!.id }),
  );
  await moveIntoPast(liveTournament.id, new Date(Date.now() - 2 * HOUR));
  const liveMatches = await db.query.matches.findMany({
    where: eq(matches.gameId, liveTournament.id),
    orderBy: (m, { asc }) => [asc(m.startTime)],
  });
  // Round 1 is completed (pool table has standings); in round 2 one Match
  // has a score waiting on the other players, one is not scored yet.
  const liveScores: { score: [number, number]; confirm: boolean }[] = [
    { score: [6, 3], confirm: true },
    { score: [4, 6], confirm: true },
    { score: [6, 5], confirm: false },
  ];
  for (const [index, { score, confirm }] of liveScores.entries()) {
    const match = liveMatches[index]!;
    await step(`score tournament match ${index + 1}`, async () => {
      const players = await seatedUserIds(match);
      const scorer = players[0]!;
      let set = await db.query.matchSets.findFirst({
        where: eq(matchSets.matchId, match.id),
      });
      if (!set) {
        await addSet(db, {
          gameId: liveTournament.id,
          matchId: match.id,
          userId: u.me!.id,
        });
        set = await db.query.matchSets.findFirst({
          where: eq(matchSets.matchId, match.id),
        });
      }
      const others = players.filter((id) => id !== u.me!.id);
      const enteredBy = confirm ? scorer : others[0]!;
      await scoreSet(db, {
        gameId: liveTournament.id,
        matchId: match.id,
        setId: set!.id,
        userId: enteredBy,
        slot1GamesWon: score[0],
        slot2GamesWon: score[1],
      });
      if (!confirm) return;
      for (const id of players) {
        if (id === enteredBy) continue;
        await confirmMatchResult(db, {
          gameId: liveTournament.id,
          matchId: match.id,
          userId: id,
        });
      }
    });
  }

  return {
    full,
    halfFull,
    oneLeft,
    highLevel,
    beginners,
    sunsetGame,
    awaiting,
    unscored,
    americano,
    openTournament,
    draftTournament,
    liveTournament,
  };
}

// ---------------------------------------------------------------------------
// Football: full rosters for team picking and goal tracking
// ---------------------------------------------------------------------------

type Footballer = {
  key: string;
  role: "outfield" | "keeper";
  position: "def" | "mid" | "fwd";
};

const FOOTBALL_LEVELS: Record<string, SelfDeclareChoice> = {
  me: "C2",
  tom: "B2",
  omar: "C1",
  maya: "C3",
  diego: "B3",
  ben: "D1",
  jonas: "C2",
  lina: "B1",
  priya: "D2",
  sofia: "C1",
  yusuf: "B3",
  emma: "D3",
  marco: "A",
  hana: "C3",
  leo: "B2",
  aisha: "D1",
  zara: "C2",
};

function outfield(key: string, position: Footballer["position"]): Footballer {
  return { key, role: "outfield", position };
}

function keeper(key: string): Footballer {
  return { key, role: "keeper", position: "def" };
}

/**
 * Sam organizes all three Games, so signing in as `me` reaches the team
 * picker and the score sheet. Each Game is created in the future, filled,
 * then moved so it has kicked off: the score only opens at kick-off.
 */
async function seedFootball(u: Users, v: Venues) {
  for (const [key, level] of Object.entries(FOOTBALL_LEVELS)) {
    await selfDeclareRating(db, u[key]!.id, "football", level);
  }

  const group = await createLoosePublic(db, {
    name: "Thursday Football",
    description: "Full-roster pickup games. Bibs provided.",
    sport: "football",
    userId: u.me!.id,
  });
  for (const key of Object.keys(FOOTBALL_LEVELS)) {
    if (key === "me") continue;
    await joinLoosePublic(db, { groupId: group.id, userId: u[key]!.id });
  }

  const pitch = v.pitches;
  const footballGame = async (args: {
    name: string;
    sideSize: 5 | 7;
    start: Date;
    players: Footballer[];
  }) => {
    const created = await createGame(db, {
      createdBy: u.me!.id,
      name: args.name,
      groupId: group.id,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      sideSize: args.sideSize,
      playersAllowed: args.players.length,
      windowStart: args.start,
      windowEnd: new Date(args.start.getTime() + 90 * 60 * 1000),
      venueId: pitch.id,
      courtId: pitch.courtIds[0]!,
      pricePerPlayerFils: 2500,
    });
    for (const player of args.players) {
      await step(`football ${player.key} on ${args.name}`, () =>
        register(db, {
          gameId: created.id,
          userId: u[player.key]!.id,
          football: { role: player.role, position: player.position },
        }),
      );
    }
    return created.id;
  };
  const ids = (keys: string[]) => keys.map((key) => u[key]!.id);

  // Kicked off, teams not picked: try "Balanced by level" and manual.
  const sevens = await footballGame({
    name: "Thursday seven-a-side",
    sideSize: 7,
    start: at(20, 19),
    players: [
      keeper("ben"),
      keeper("hana"),
      outfield("me", "mid"),
      outfield("tom", "fwd"),
      outfield("omar", "def"),
      outfield("maya", "fwd"),
      outfield("diego", "mid"),
      outfield("jonas", "def"),
      outfield("lina", "mid"),
      outfield("priya", "def"),
      outfield("sofia", "fwd"),
      outfield("yusuf", "mid"),
      outfield("emma", "def"),
      outfield("marco", "fwd"),
    ],
  });
  await moveIntoPast(sevens, new Date(Date.now() - 20 * 60 * 1000));

  // Kicked off, teams published, no score yet: enter goals and scorers.
  const fives = await footballGame({
    name: "Monday five-a-side",
    sideSize: 5,
    start: at(21, 19),
    players: [
      keeper("aisha"),
      keeper("leo"),
      outfield("me", "fwd"),
      outfield("zara", "mid"),
      outfield("diego", "def"),
      outfield("yusuf", "fwd"),
      outfield("omar", "mid"),
      outfield("maya", "fwd"),
      outfield("tom", "def"),
      outfield("marco", "mid"),
    ],
  });
  await publishFootballTeams(db, {
    gameId: fives,
    userId: u.me!.id,
    method: "manual",
    bibs: { slot1: "black", slot2: "white" },
    slot1: ids(["aisha", "me", "zara", "diego", "yusuf"]),
    slot2: ids(["leo", "omar", "maya", "tom", "marco"]),
  });
  await moveIntoPast(fives, new Date(Date.now() - 45 * 60 * 1000));

  // Played last week, 4–3 with named scorers, confirmed by both sides.
  const played = await footballGame({
    name: "Last week's five-a-side",
    sideSize: 5,
    start: at(22, 19),
    players: [
      keeper("ben"),
      keeper("hana"),
      outfield("me", "fwd"),
      outfield("lina", "mid"),
      outfield("priya", "def"),
      outfield("sofia", "fwd"),
      outfield("emma", "def"),
      outfield("jonas", "mid"),
      outfield("omar", "fwd"),
      outfield("maya", "mid"),
    ],
  });
  await publishFootballTeams(db, {
    gameId: played,
    userId: u.me!.id,
    method: "manual",
    bibs: { slot1: "red", slot2: "navy" },
    slot1: ids(["ben", "me", "lina", "priya", "sofia"]),
    slot2: ids(["hana", "emma", "jonas", "omar", "maya"]),
  });
  await moveIntoPast(played, at(-7, 19));
  await saveFootballScore(db, {
    gameId: played,
    userId: u.me!.id,
    slot1Goals: 4,
    slot2Goals: 3,
    scorers: [
      { userId: u.me!.id, goals: 2 },
      { userId: u.sofia!.id, goals: 1 },
      { userId: u.priya!.id, goals: 1 },
      { userId: u.omar!.id, goals: 2 },
      { userId: u.emma!.id, goals: 1 },
    ],
  });
  const playedMatch = await db.query.matches.findFirst({
    where: eq(matches.gameId, played),
  });
  await confirmMatchResult(db, {
    gameId: played,
    matchId: playedMatch!.id,
    userId: u.omar!.id,
  });
}

// ---------------------------------------------------------------------------
// Group link requests
// ---------------------------------------------------------------------------

async function seedGroupLinks(u: Users, v: Venues, g: Groups) {
  const manage = async (venueId: string, key: string) => {
    await addVenueManager(db, {
      venueId,
      userId: u[key]!.id,
      grantedByUserId: u.me!.id,
    });
    return {
      userId: u[key]!.id,
      publicMetadata: undefined,
    };
  };

  const skylineManager = await manage(v.skyline.id, "zara");
  await sendGroupLinkRequest(db, {
    venueId: v.skyline.id,
    groupId: g.friday.id,
    actor: skylineManager,
  });

  const bayManager = await manage(v.bay.id, "aisha");
  const request = await sendGroupLinkRequest(db, {
    venueId: v.bay.id,
    groupId: g.beach.id,
    actor: bayManager,
  });
  await acceptGroupLinkRequest(db, {
    requestId: request.id,
    userId: u.aisha!.id,
  });
}

async function main() {
  assertLocalDatabase();
  console.log("Wiping local database…");
  await wipe();

  const u = await step("users", seedUsers);
  const v = await step("venues", seedVenues);
  const c = await step("communities", () => seedCommunities(u, v));
  const g = await step("groups", () => seedGroups(u, c));
  await step("teams", () => seedTeams(u, c));
  await step("games", () => seedGames(u, g, v));
  await step("football", () => seedFootball(u, v));
  await step("bookings", () => seedBookings(u, v));
  await step("group links", () => seedGroupLinks(u, v, g));

  const counts = await db.execute<{ table: string; rows: number }>(sql`
    select 'users' as table, count(*)::int as rows from ${user}
    union all select 'venues', count(*)::int from ${venues}
    union all select 'games', count(*)::int from ${games}
    union all select 'matches', count(*)::int from ${matches}
    union all select 'game invites', count(*)::int from ${gameMemberInvites}
    union all select 'team invites', count(*)::int from ${teamMemberInvites}
  `);
  console.log("\nSeeded:");
  for (const row of counts)
    console.log(`  ${row.table.padEnd(14)} ${row.rows}`);

  console.log("\nSign-in personas (clerk_id → name):");
  for (const persona of PERSONAS) {
    const seeded = u[persona.key]!;
    console.log(
      `  ${persona.key.padEnd(7)} ${seeded.clerkId.padEnd(34)} ${seeded.name}`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
