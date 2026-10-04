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
 * Run: pnpm --filter web db:seed
 * See scripts/README.md for how to sign in as a seeded User.
 */
import { eq, inArray, sql } from "drizzle-orm";

import {
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

import { db } from "~/server/db";

import { approveTeamLink } from "~/server/api/routers/communities/approveTeamLink";
import { createCommunity } from "~/server/api/routers/communities/create";
import { createInviteLink as createCommunityInviteLink } from "~/server/api/routers/communities/createInviteLink";
import { requestJoin as requestCommunityJoin } from "~/server/api/routers/communities/requestJoin";
import { requestVenueLink } from "~/server/api/routers/communities/requestVenueLink";
import { sendLookupInvite as sendCommunityLookupInvite } from "~/server/api/routers/communities/sendLookupInvite";
import { setMemberRole } from "~/server/api/routers/communities/setMemberRole";
import { softArchive as softArchiveCommunity } from "~/server/api/routers/communities/softArchive";
import { acceptLookupInvite as acceptCommunityLookupInvite } from "~/server/api/routers/communities/acceptLookupInvite";
import { addSet } from "~/server/api/routers/games/addSet";
import { cancelGame } from "~/server/api/routers/games/cancel";
import { confirmMatchResult } from "~/server/api/routers/games/confirmMatchResult";
import { createGame } from "~/server/api/routers/games/create";
import { createInviteLink as createGameInviteLink } from "~/server/api/routers/games/createInviteLink";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { drawPools } from "~/server/api/routers/games/drawPools";
import { postPoolDraw } from "~/server/api/routers/games/postPoolDraw";
import { register } from "~/server/api/routers/games/register";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { registerWithPartner } from "~/server/api/routers/games/registerWithPartner";
import { requestLevelRange } from "~/server/api/routers/games/requestLevelRange";
import { scoreSet } from "~/server/api/routers/games/scoreSet";
import { sendLookupInvite as sendGameLookupInvite } from "~/server/api/routers/games/sendLookupInvite";
import { acceptLookupInvite as acceptGroupLookupInvite } from "~/server/api/routers/groups/acceptLookupInvite";
import { createClubPrivate } from "~/server/api/routers/groups/createClubPrivate";
import { createClubPublic } from "~/server/api/routers/groups/createClubPublic";
import { createInviteLink as createGroupInviteLink } from "~/server/api/routers/groups/createInviteLink";
import { createLoosePrivate } from "~/server/api/routers/groups/createLoosePrivate";
import { createLoosePublic } from "~/server/api/routers/groups/createLoosePublic";
import { joinClubPublic } from "~/server/api/routers/groups/joinClubPublic";
import { joinLoosePublic } from "~/server/api/routers/groups/joinLoosePublic";
import { requestJoin as requestGroupJoin } from "~/server/api/routers/groups/requestJoin";
import { sendLookupInvite as sendGroupLookupInvite } from "~/server/api/routers/groups/sendLookupInvite";
import { selfDeclareRating } from "~/server/api/routers/ratings/selfDeclare";
import { acceptInAppInvite } from "~/server/api/routers/teams/acceptInAppInvite";
import { createTeam } from "~/server/api/routers/teams/create";
import { createInviteLink as createTeamInviteLink } from "~/server/api/routers/teams/createInviteLink";
import { inviteInApp } from "~/server/api/routers/teams/inviteInApp";
import { requestLink as requestTeamLink } from "~/server/api/routers/teams/requestLink";
import { markOnboardingComplete } from "~/server/api/routers/users/completeOnboarding";
import { writePreferredPosition } from "~/server/api/routers/users/setPreferredPosition";
import { addCourt } from "~/server/api/routers/venues/addCourt";
import { approveLinkRequest as approveVenueLinkRequest } from "~/server/api/routers/venues/approveLinkRequest";
import { createVenue } from "~/server/api/routers/venues/create";
import { rejectLinkRequest as rejectVenueLinkRequest } from "~/server/api/routers/venues/rejectLinkRequest";
import { softArchive as softArchiveVenue } from "~/server/api/routers/venues/softArchive";

import type { SelfDeclareChoice } from "~/lib/level-bands";

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
  ) => {
    const created = await createVenue(db, { name, city, country });
    const courtIds: string[] = [];
    for (const courtName of courtNames) {
      const court = await addCourt(db, {
        venueId: created.id,
        name: courtName,
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
  const riverside = await venue("Riverside Padel", "Lisbon", "PT", [
    "Panoramic",
    "Court B",
  ]);
  const harbour = await venue("Harbour Racket Club", "Porto", "PT", [
    "Centre Court",
    "Court 2",
    "Court 3",
  ]);
  const oldTown = await venue("Old Town Arena", "Lisbon", "PT", ["Court 1"]);
  await softArchiveVenue(db, { venueId: oldTown.id });

  return { central, riverside, harbour, oldTown };
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
    secret,
  };
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

async function seedTeams(u: Users, c: Communities) {
  const make = async (ownerKey: string, name: string | undefined) =>
    createTeam(db, {
      name,
      sport: "padel",
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

  return { smash, netRunners, lobs, duo, rally };
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
  // ... and one Sam organizes, where Tom asked to be let in.
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
    requestLevelRange(db, { gameId: beginners.id, userId: u.diego!.id }),
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
