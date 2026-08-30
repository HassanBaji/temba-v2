// Throwaway QA seeder. Not part of the product.
// Reads DATABASE_URL from apps/temba/.env and upserts dummy data for QA.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "../../../packages/db/node_modules/postgres/src/index.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const url = /DATABASE_URL="([^"]+)"/.exec(
  fs.readFileSync(path.join(root, "apps/temba/.env"), "utf8"),
)[1];
console.log("url", url);
const sql = postgres(url, { prepare: false, max: 1 });

const now = new Date();
const days = (n) => new Date(now.getTime() + n * 86400000);
const at = (n, h, m = 0) => {
  const d = days(n);
  d.setHours(h, m, 0, 0);
  return d;
};
const token = () => crypto.randomBytes(24).toString("hex");

const INITIAL_MU = 1500;
const INITIAL_PHI = 350;
const INITIAL_SIGMA = 0.06;
const BAND_MIDPOINT_HUNDREDTHS = {
  D3: 35,
  D2: 105,
  D1: 175,
  C3: 245,
  C2: 315,
  C1: 385,
  B3: 455,
  B2: 525,
  B1: 595,
  A: 665,
};
const muFromBand = (band) =>
  INITIAL_MU + (BAND_MIDPOINT_HUNDREDTHS[band] - 300) * 5;

const SYNTHETIC = [
  ["Omar Al-Sayed", "omar.alsayed@example.com", true, "C1"],
  ["Layla Haddad", "layla.haddad@example.com", true, "B3"],
  ["Yousif Mansoor", "yousif.mansoor@example.com", false, "B2"],
  ["Noor Abdulla", "noor.abdulla@example.com", true, "C2"],
  ["Ahmed Buhazza", "ahmed.buhazza@example.com", false, "D1"],
  ["Sara Fakhro", "sara.fakhro@example.com", true, "C3"],
  ["Khalid Janahi", "khalid.janahi@example.com", false, "B1"],
  ["Mariam Zayani", "mariam.zayani@example.com", true, "C1"],
  ["Rashed Kanoo", "rashed.kanoo@example.com", false, "D2"],
  ["Dana Al-Khalifa", "dana.alkhalifa@example.com", true, "A"],
];

async function upsertUser(name, email, hasImage, gamesPlayed) {
  const [row] = await sql`
    insert into "user" (name, email, email_verified, phone_number_verified, image, number_of_games_played, created_at, updated_at)
    values (${name}, ${email}, true, false,
            ${hasImage ? `https://i.pravatar.cc/200?u=${encodeURIComponent(email)}` : null},
            ${gamesPlayed}, ${now}, ${now})
    on conflict (email) do update set
      name = excluded.name,
      image = coalesce("user".image, excluded.image)
    returning id, name, email`;
  return row;
}

async function upsertCommunity(name, description, type, createdBy, venueId) {
  const [existing] = await sql`select id from communities where name = ${name}`;
  if (existing) return existing.id;
  const [created] = await sql`
    insert into communities (name, description, type, created_by, venue_id)
    values (${name}, ${description}, ${type}, ${createdBy}, ${venueId})
    returning id`;
  return created.id;
}

async function addCommunitySport(communityId, sport) {
  await sql`
    insert into community_sports (community_id, sport)
    values (${communityId}, ${sport})
    on conflict on constraint community_sports_community_id_sport_unique do nothing`;
}

async function addCommunityMember(communityId, userId, role) {
  await sql`
    insert into community_members (community_id, user_id, role)
    values (${communityId}, ${userId}, ${role})
    on conflict on constraint community_members_community_id_user_id_unique do nothing`;
}

async function upsertGroup(name, description, type, communityId, createdBy) {
  const [existing] = await sql`select id from groups where name = ${name}`;
  if (existing) return existing.id;
  const [created] = await sql`
    insert into groups (name, description, type, sport, community_id, created_by)
    values (${name}, ${description}, ${type}, 'padel', ${communityId}, ${createdBy})
    returning id`;
  return created.id;
}

async function addGroupMember(groupId, userId, played, setsWon, pointsWon) {
  await sql`
    insert into group_members (group_id, user_id, total_games_played, total_sets_won, total_points_won)
    values (${groupId}, ${userId}, ${played}, ${setsWon}, ${pointsWon})
    on conflict on constraint group_members_group_id_user_id_unique
    do update set
      total_games_played = excluded.total_games_played,
      total_sets_won = excluded.total_sets_won,
      total_points_won = excluded.total_points_won`;
}

async function upsertTeam(name, communityId, createdBy, memberIds, stats) {
  let [t] = await sql`select id from teams where name = ${name}`;
  if (!t) {
    [t] = await sql`
      insert into teams (name, sport, community_id, created_by, games_played, wins, losses)
      values (${name}, 'padel', ${communityId}, ${createdBy}, ${stats[0]}, ${stats[1]}, ${stats[2]})
      returning id`;
  }
  for (const uid of memberIds) {
    await sql`
      insert into team_members (team_id, user_id)
      values (${t.id}, ${uid})
      on conflict on constraint team_members_team_id_user_id_unique do nothing`;
  }
  return t.id;
}

async function upsertRating(userId, band) {
  const mu = muFromBand(band);
  await sql`
    insert into ratings (user_id, sport, mu, phi, sigma, level_band, self_declared_at, created_at, updated_at)
    values (${userId}, 'padel', ${mu}, ${INITIAL_PHI}, ${INITIAL_SIGMA}, ${band}, ${now}, ${now}, ${now})
    on conflict on constraint ratings_user_id_sport_unique do nothing`;
}

async function ensureGamePlayer(gameId, userId) {
  const [existing] = await sql`
    select id from game_players where game_id = ${gameId} and user_id = ${userId}`;
  if (existing) return existing.id;
  const [created] = await sql`
    insert into game_players (game_id, user_id)
    values (${gameId}, ${userId})
    returning id`;
  return created.id;
}

async function ensureSide(gameId, sideIndex, name, teamId = null) {
  const [existing] = await sql`
    select id from game_teams where game_id = ${gameId} and side_index = ${sideIndex}`;
  if (existing) return existing.id;
  const [created] = await sql`
    insert into game_teams (game_id, name, side_index, team_id)
    values (${gameId}, ${name}, ${sideIndex}, ${teamId})
    returning id`;
  return created.id;
}

async function ensureSeat(gameTeamId, gamePlayerId, position) {
  const [existing] = await sql`
    select id from game_team_players
    where game_team_id = ${gameTeamId} and game_player_id = ${gamePlayerId}`;
  if (existing) return;
  await sql`
    insert into game_team_players (game_team_id, game_player_id, position)
    values (${gameTeamId}, ${gamePlayerId}, ${position})
    on conflict do nothing`;
}

async function seatPair(
  gameId,
  sideIndex,
  label,
  leftUserId,
  rightUserId,
  teamId = null,
) {
  const gameTeamId = await ensureSide(gameId, sideIndex, label, teamId);
  if (leftUserId) {
    const pid = await ensureGamePlayer(gameId, leftUserId);
    await ensureSeat(gameTeamId, pid, "left");
  }
  if (rightUserId) {
    const pid = await ensureGamePlayer(gameId, rightUserId);
    await ensureSeat(gameTeamId, pid, "right");
  }
  return gameTeamId;
}

async function findGameByName(name) {
  const [row] = await sql`select id from games where name = ${name} limit 1`;
  return row?.id ?? null;
}

async function findGameByNameAndStatus(name, status) {
  const [row] = await sql`
    select g.id
    from games g
    join matches m on m.game_id = g.id
    where g.name = ${name} and m.status = ${status}
    limit 1`;
  return row?.id ?? null;
}

async function createFriendlyGame({
  name,
  groupId,
  isPublic,
  createdBy,
  start,
  status,
  cancelled = false,
}) {
  const existing = await findGameByName(name);
  if (existing) return existing;
  const end = new Date(start.getTime() + 90 * 60000);
  const [game] = await sql`
    insert into games (
      name, format, registration_mode, group_id, is_public,
      window_start, window_end, players_allowed, teams_allowed,
      sport, created_by, cancelled_at
    )
    values (
      ${name}, 'friendly_game', 'individual', ${groupId}, ${isPublic},
      ${start}, ${end}, 4, 2, 'padel', ${createdBy},
      ${cancelled ? now : null}
    )
    returning id`;
  await sql`
    insert into matches (game_id, start_time, end_time, duration_in_minutes, status, court_id)
    values (${game.id}, ${start}, ${end}, 90, ${cancelled ? "cancelled" : status}, null)`;
  return game.id;
}

async function createAmericano({
  name,
  groupId,
  isPublic,
  createdBy,
  start,
  playersAllowed,
}) {
  const existing = await findGameByName(name);
  if (existing) return existing;
  const end = new Date(start.getTime() + 180 * 60000);
  const [game] = await sql`
    insert into games (
      name, format, registration_mode, group_id, is_public,
      window_start, window_end, players_allowed, teams_allowed,
      sport, created_by
    )
    values (
      ${name}, 'americano', 'individual', ${groupId}, ${isPublic},
      ${start}, ${end}, ${playersAllowed}, null, 'padel', ${createdBy}
    )
    returning id`;
  return game.id;
}

async function createTournament({
  name,
  groupId,
  isPublic,
  createdBy,
  start,
  teamsAllowed,
}) {
  const existing = await findGameByName(name);
  if (existing) return existing;
  const end = new Date(start.getTime() + 240 * 60000);
  const [game] = await sql`
    insert into games (
      name, format, registration_mode, group_id, is_public,
      window_start, window_end, players_allowed, teams_allowed,
      sport, created_by
    )
    values (
      ${name}, 'friendly_tournament', 'team_only', ${groupId}, ${isPublic},
      ${start}, ${end}, null, ${teamsAllowed}, 'padel', ${createdBy}
    )
    returning id`;
  return game.id;
}

async function assignCourtIfMissing(gameId, courtId) {
  await sql`
    update matches
    set court_id = coalesce(court_id, ${courtId}), updated_at = ${now}
    where game_id = ${gameId}`;
}

async function completeFriendly({
  gameId,
  courtId,
  leftA,
  rightA,
  leftB,
  rightB,
  sets,
  status,
}) {
  const side1 = await seatPair(gameId, 1, "Team A", leftA, rightA);
  const side2 = await seatPair(gameId, 2, "Team B", leftB, rightB);
  await sql`
    update matches
    set status = ${status},
        court_id = coalesce(court_id, ${courtId}),
        slot_1_game_team_id = coalesce(slot_1_game_team_id, ${side1}),
        slot_2_game_team_id = coalesce(slot_2_game_team_id, ${side2}),
        updated_at = ${now}
    where game_id = ${gameId}`;

  if (status !== "completed" || !sets) return;

  const matches = await sql`select id from matches where game_id = ${gameId}`;
  for (const match of matches) {
    const [{ n }] =
      await sql`select count(*)::int as n from match_sets where match_id = ${match.id}`;
    if (n > 0) continue;
    for (const [s1, s2] of sets) {
      await sql`
        insert into match_sets (match_id, slot_1_games_won, slot_2_games_won)
        values (${match.id}, ${s1}, ${s2})`;
    }
  }
}

async function main() {
  const existingUsers =
    await sql`select id, name, email from "user" order by created_at`;
  console.log("existing users:", existingUsers.map((u) => u.name).join(", "));

  const players = [];
  for (const u of existingUsers) players.push(u);
  for (const [i, [name, email, hasImage]] of SYNTHETIC.entries()) {
    const row = await upsertUser(name, email, hasImage, 6 + ((i * 5) % 30));
    if (!players.some((p) => p.id === row.id)) players.push(row);
  }

  const byName = (name) => players.find((p) => p.name === name);
  const owner = byName("haji") ?? players[0];
  const realUsers = existingUsers.filter(
    (u) => !SYNTHETIC.some((s) => s[1] === u.email),
  );

  const venueRows = await sql`
    select v.id, v.name from venues v where v.archived_at is null order by v.name limit 4`;
  if (venueRows.length === 0) {
    throw new Error("QA db has no venues; cannot seed communities or matches");
  }
  const venueA = venueRows[0];
  const venueB = venueRows[1] ?? venueRows[0];
  const courtsA =
    await sql`select id, name from courts where venue_id = ${venueA.id} order by name limit 3`;
  const court1 = courtsA[0]?.id ?? null;
  const court2 = courtsA[1]?.id ?? courtsA[0]?.id ?? null;
  console.log("venue:", venueA.name, "courts:", courtsA.length);

  const communityA = await upsertCommunity(
    "Bahrain Padel Club",
    "Bahrain's home for competitive and social padel. Weekly ladders, open sessions and club nights.",
    "public",
    owner.id,
    venueA.id,
  );
  const communityB = await upsertCommunity(
    "Seef Racket Society",
    "Invite-only club playing padel and football out of Seef district.",
    "private",
    owner.id,
    venueB.id,
  );
  const communityC = await upsertCommunity(
    "Riffa Socials",
    "New public community still looking for a home Venue.",
    "public",
    owner.id,
    null,
  );
  await addCommunitySport(communityA, "padel");
  await addCommunitySport(communityB, "padel");
  await addCommunitySport(communityB, "football");
  await addCommunitySport(communityC, "padel");

  for (const [i, p] of players.entries()) {
    const role = p.id === owner.id ? "owner" : i < 3 ? "admin" : "member";
    await addCommunityMember(communityA, p.id, role);
  }
  await addCommunityMember(communityC, owner.id, "owner");
  for (const p of players.slice(0, 8)) {
    await addCommunityMember(
      communityB,
      p.id,
      p.id === owner.id ? "owner" : "member",
    );
  }
  // Real accounts always see the seeded Club even if they signed up later.
  for (const p of realUsers) {
    await addCommunityMember(
      communityA,
      p.id,
      p.id === owner.id ? "owner" : "member",
    );
  }

  const groupDefs = [
    [
      "Tuesday Night Padel",
      "Mixed-level club night. Rotating pairs, 3 sets, everyone plays.",
      "public",
      communityA,
      12,
    ],
    [
      "Advanced Ladder",
      "Invite-only competitive ladder for B and above.",
      "private",
      communityA,
      8,
    ],
    [
      "Seef Social Padel",
      "Casual pickup padel around Seef. All welcome.",
      "public",
      null,
      14,
    ],
    ["Weekend Warriors", "Saturday morning regulars.", "private", null, 6],
  ];
  const groups = [];
  for (const [name, desc, type, communityId, memberCount] of groupDefs) {
    const id = await upsertGroup(name, desc, type, communityId, owner.id);
    groups.push({ id, name, memberCount, communityId });
    const roster = [
      ...realUsers,
      ...players.filter((p) => !realUsers.some((r) => r.id === p.id)),
    ].slice(0, memberCount);
    for (const [i, p] of roster.entries()) {
      const played = 4 + ((i * 7) % 22);
      await addGroupMember(
        id,
        p.id,
        played,
        Math.round(played * (0.35 + ((i * 13) % 45) / 100)),
        played * (18 + ((i * 11) % 14)),
      );
    }
  }
  console.log("groups:", groups.map((g) => g.name).join(", "));

  const smash = await upsertTeam(
    "Smash Bros",
    communityA,
    (byName("baji") ?? players[0]).id,
    [
      (byName("baji") ?? players[0]).id,
      (byName("Yousif Mansoor") ?? players[1]).id,
    ],
    [18, 12, 6],
  );
  const kings = await upsertTeam(
    "Court Kings",
    null,
    owner.id,
    [owner.id, (byName("Noor Abdulla") ?? players[2]).id],
    [9, 4, 5],
  );
  const ninjas = await upsertTeam(
    "Net Ninjas",
    communityA,
    (byName("Layla Haddad") ?? players[1]).id,
    [
      (byName("Layla Haddad") ?? players[1]).id,
      (byName("Sara Fakhro") ?? players[3]).id,
    ],
    [11, 7, 4],
  );
  const dropshots = await upsertTeam(
    "Drop Shots",
    null,
    (byName("Omar Al-Sayed") ?? players[4]).id,
    [
      (byName("Omar Al-Sayed") ?? players[4]).id,
      (byName("Mariam Zayani") ?? players[5]).id,
    ],
    [6, 2, 4],
  );

  const ratingBands = {
    haji: "B2",
    baji: "C1",
    baji2: "C2",
    alii: "C1",
  };
  for (const p of players) {
    const synthetic = SYNTHETIC.find((s) => s[1] === p.email);
    const band = synthetic?.[3] ?? ratingBands[p.name] ?? "C2";
    await upsertRating(p.id, band);
  }

  const gTue = groups[0];
  const gLadder = groups[1];
  const gSeef = groups[2];
  const gWeekend = groups[3];
  const p = (name, fallback = 0) => byName(name)?.id ?? players[fallback].id;

  const completedSets = [
    [
      [6, 4],
      [3, 6],
      [6, 3],
    ],
    [
      [6, 2],
      [6, 4],
    ],
    [
      [7, 5],
      [4, 6],
      [6, 2],
    ],
    [
      [6, 3],
      [6, 1],
    ],
  ];

  const club1Past =
    (await findGameByNameAndStatus("Club Night — Court 1", "completed")) ??
    (await createFriendlyGame({
      name: "Club Night — Court 1",
      groupId: gTue.id,
      isPublic: false,
      createdBy: owner.id,
      start: at(-8, 19),
      status: "completed",
    }));
  const club2Past =
    (await findGameByNameAndStatus("Club Night — Court 2", "completed")) ??
    (await createFriendlyGame({
      name: "Club Night — Court 2",
      groupId: gTue.id,
      isPublic: false,
      createdBy: owner.id,
      start: at(-15, 20),
      status: "completed",
    }));
  const ladderPast =
    (await findGameByNameAndStatus("Ladder: Round 5", "completed")) ??
    (await createFriendlyGame({
      name: "Ladder: Round 5",
      groupId: gLadder.id,
      isPublic: false,
      createdBy: owner.id,
      start: at(-5, 21),
      status: "completed",
    }));
  const seefPast =
    (await findGameByNameAndStatus("Seef Pickup", "completed")) ??
    (await createFriendlyGame({
      name: "Seef Pickup",
      groupId: gSeef.id,
      isPublic: true,
      createdBy: owner.id,
      start: at(-3, 18),
      status: "completed",
    }));
  const rainedOff =
    (await findGameByNameAndStatus("Seef Pickup (rained off)", "cancelled")) ??
    (await createFriendlyGame({
      name: "Seef Pickup (rained off)",
      groupId: gSeef.id,
      isPublic: true,
      createdBy: owner.id,
      start: at(-2, 18),
      status: "cancelled",
      cancelled: true,
    }));

  const club1Today = await findGameByNameAndStatus(
    "Club Night — Court 1",
    "confirmed",
  );
  const club2Today = await findGameByNameAndStatus(
    "Club Night — Court 2",
    "pending",
  );
  const seefSoon = await findGameByNameAndStatus("Seef Pickup", "pending");
  const ladderSoon = await findGameByNameAndStatus(
    "Ladder: Round 6",
    "confirmed",
  );
  const saturday = await findGameByNameAndStatus(
    "Saturday Doubles",
    "confirmed",
  );

  const club1Upcoming = await createFriendlyGame({
    name: "Tuesday Club Night",
    groupId: gTue.id,
    isPublic: false,
    createdBy: owner.id,
    start: at(2, 19),
    status: "confirmed",
  });
  const club2Upcoming = await createFriendlyGame({
    name: "Tuesday Club Night — Court 2",
    groupId: gTue.id,
    isPublic: false,
    createdBy: owner.id,
    start: at(2, 20),
    status: "pending",
  });
  const seefUpcoming = await createFriendlyGame({
    name: "Seef Thursday Pickup",
    groupId: gSeef.id,
    isPublic: true,
    createdBy: owner.id,
    start: at(4, 18),
    status: "pending",
  });
  const ladderUpcoming = await createFriendlyGame({
    name: "Ladder: Round 7",
    groupId: gLadder.id,
    isPublic: false,
    createdBy: owner.id,
    start: at(6, 21),
    status: "confirmed",
  });
  const saturdayUpcoming = await createFriendlyGame({
    name: "Weekend Doubles",
    groupId: gWeekend.id,
    isPublic: true,
    createdBy: owner.id,
    start: at(6, 9),
    status: "confirmed",
  });

  await completeFriendly({
    gameId: club1Past,
    courtId: court1,
    leftA: p("haji"),
    rightA: p("baji"),
    leftB: p("baji2"),
    rightB: p("Layla Haddad"),
    sets: completedSets[0],
    status: "completed",
  });
  await completeFriendly({
    gameId: club2Past,
    courtId: court2,
    leftA: p("haji"),
    rightA: p("baji2"),
    leftB: p("Omar Al-Sayed"),
    rightB: p("Yousif Mansoor"),
    sets: completedSets[1],
    status: "completed",
  });
  await completeFriendly({
    gameId: ladderPast,
    courtId: court1,
    leftA: p("Layla Haddad"),
    rightA: p("haji"),
    leftB: p("Omar Al-Sayed"),
    rightB: p("Khalid Janahi"),
    sets: completedSets[2],
    status: "completed",
  });
  await completeFriendly({
    gameId: seefPast,
    courtId: court2,
    leftA: p("baji"),
    rightA: p("Yousif Mansoor"),
    leftB: p("baji2"),
    rightB: p("alii", 3),
    sets: completedSets[3],
    status: "completed",
  });
  await completeFriendly({
    gameId: rainedOff,
    courtId: court1,
    leftA: p("haji"),
    rightA: p("baji"),
    leftB: p("baji2"),
    rightB: p("Yousif Mansoor"),
    sets: null,
    status: "cancelled",
  });

  async function fillUpcoming(gameId, status, seats, waitlistedUserId) {
    if (!gameId) return;
    const [leftA, rightA, leftB, rightB] = seats;
    await completeFriendly({
      gameId,
      courtId: court1,
      leftA,
      rightA,
      leftB,
      rightB,
      sets: null,
      status,
    });
    if (waitlistedUserId) {
      await sql`
        insert into game_waitlist (game_id, user_id)
        values (${gameId}, ${waitlistedUserId})
        on conflict do nothing`;
    }
  }

  await fillUpcoming(club1Upcoming, "confirmed", [
    p("haji"),
    p("baji"),
    p("baji2"),
    p("Layla Haddad"),
  ]);
  await fillUpcoming(club2Upcoming, "pending", [
    p("haji"),
    p("Omar Al-Sayed"),
    p("Sara Fakhro"),
    null,
  ]);
  await fillUpcoming(
    seefUpcoming,
    "pending",
    [p("baji2"), p("Yousif Mansoor"), p("alii", 3), null],
    p("Dana Al-Khalifa"),
  );
  await fillUpcoming(ladderUpcoming, "confirmed", [
    p("haji"),
    p("Khalid Janahi"),
    p("Layla Haddad"),
    p("Omar Al-Sayed"),
  ]);
  await fillUpcoming(saturdayUpcoming, "confirmed", [
    p("haji"),
    p("alii", 3),
    p("baji"),
    p("Noor Abdulla"),
  ]);

  // Existing named upcoming rows (from earlier seeds) — give them seats too.
  for (const [id, status, seats] of [
    [
      club1Today,
      "confirmed",
      [p("haji"), p("baji"), p("baji2"), p("Layla Haddad")],
    ],
    [club2Today, "pending", [p("haji"), p("baji"), p("Layla Haddad"), null]],
    [
      ladderSoon,
      "confirmed",
      [p("haji"), p("baji"), p("Layla Haddad"), p("Omar Al-Sayed")],
    ],
    [
      saturday,
      "confirmed",
      [p("haji"), p("baji"), p("Layla Haddad"), p("Omar Al-Sayed")],
    ],
  ]) {
    if (id && id !== club1Past && id !== club2Past) {
      await fillUpcoming(id, status, seats);
    }
  }
  if (seefSoon && seefSoon !== seefPast) {
    await fillUpcoming(seefSoon, "pending", [
      p("haji"),
      p("baji"),
      p("baji2"),
      null,
    ]);
  }

  const americanoId = await createAmericano({
    name: "Americano Night",
    groupId: gTue.id,
    isPublic: false,
    createdBy: owner.id,
    start: at(3, 19),
    playersAllowed: 8,
  });
  const americanoRoster = [
    p("haji"),
    p("baji"),
    p("baji2"),
    p("Layla Haddad"),
    p("Omar Al-Sayed"),
    p("Yousif Mansoor"),
    p("Sara Fakhro"),
    p("Noor Abdulla"),
  ];
  for (const uid of americanoRoster) {
    await ensureGamePlayer(americanoId, uid);
  }
  await sql`
    insert into game_waitlist (game_id, user_id)
    values (${americanoId}, ${p("Khalid Janahi")})
    on conflict do nothing`;
  await sql`
    insert into game_waitlist (game_id, user_id)
    values (${americanoId}, ${p("Mariam Zayani")})
    on conflict do nothing`;

  const tournamentId = await createTournament({
    name: "Friday Club Tournament",
    groupId: gTue.id,
    isPublic: false,
    createdBy: owner.id,
    start: at(5, 17),
    teamsAllowed: 4,
  });
  const tourneyTeams = [
    [smash, "Smash Bros"],
    [kings, "Court Kings"],
    [ninjas, "Net Ninjas"],
    [dropshots, "Drop Shots"],
  ];
  const tourneySides = [];
  for (const [i, [teamId, label]] of tourneyTeams.entries()) {
    const side = await ensureSide(tournamentId, i + 1, label, teamId);
    const members =
      await sql`select user_id from team_members where team_id = ${teamId} limit 2`;
    if (members[0]) {
      const pid = await ensureGamePlayer(tournamentId, members[0].user_id);
      await ensureSeat(side, pid, "left");
    }
    if (members[1]) {
      const pid = await ensureGamePlayer(tournamentId, members[1].user_id);
      await ensureSeat(side, pid, "right");
    }
    tourneySides.push(side);
  }
  const existingTourneyMatch =
    await sql`select id from matches where game_id = ${tournamentId} limit 1`;
  if (existingTourneyMatch.length === 0 && tourneySides.length >= 2) {
    const start = at(5, 17);
    const end = new Date(start.getTime() + 90 * 60000);
    const [m1] = await sql`
      insert into matches (game_id, start_time, end_time, duration_in_minutes, status, court_id, slot_1_game_team_id, slot_2_game_team_id)
      values (${tournamentId}, ${start}, ${end}, 90, 'pending', ${court1}, ${tourneySides[0]}, ${tourneySides[1]})
      returning id`;
    const start2 = at(5, 19);
    const end2 = new Date(start2.getTime() + 90 * 60000);
    await sql`
      insert into matches (game_id, start_time, end_time, duration_in_minutes, status, court_id, slot_1_game_team_id, slot_2_game_team_id)
      values (${tournamentId}, ${start2}, ${end2}, 90, 'pending', ${court2}, ${tourneySides[2]}, ${tourneySides[3]})`;
    void m1;
  }

  // Pending invites so signed-in real users can exercise the Invites screen.
  const seefMemberIds = new Set(
    (
      await sql`select user_id from community_members where community_id = ${communityB}`
    ).map((r) => r.user_id),
  );
  for (const u of realUsers) {
    if (seefMemberIds.has(u.id)) continue;
    await sql`
      insert into community_member_invites (community_id, user_id, invited_by)
      values (${communityB}, ${u.id}, ${owner.id})
      on conflict do nothing`;
  }

  const weekendMemberIds = new Set(
    (
      await sql`select user_id from group_members where group_id = ${gWeekend.id}`
    ).map((r) => r.user_id),
  );
  for (const u of realUsers) {
    if (weekendMemberIds.has(u.id)) continue;
    await sql`
      insert into group_member_invites (group_id, user_id, invited_by)
      values (${gWeekend.id}, ${u.id}, ${owner.id})
      on conflict do nothing`;
  }

  const smashMemberIds = new Set(
    (await sql`select user_id from team_members where team_id = ${smash}`).map(
      (r) => r.user_id,
    ),
  );
  const smashInvitee = realUsers.find((u) => !smashMemberIds.has(u.id));
  if (smashInvitee) {
    await sql`
      insert into team_member_invites (team_id, user_id, invited_by)
      values (${smash}, ${smashInvitee.id}, ${owner.id})
      on conflict do nothing`;
  }

  const requesters = players.filter((p) => !seefMemberIds.has(p.id)).slice(-3);
  for (const r of requesters) {
    await sql`delete from community_members where community_id = ${communityB} and user_id = ${r.id}`;
    await sql`
      insert into community_join_requests (community_id, user_id, status)
      values (${communityB}, ${r.id}, 'pending')
      on conflict on constraint community_join_requests_community_id_user_id_unique do nothing`;
  }

  const [existingVlr] = await sql`
    select id from venue_link_requests where community_id = ${communityC} and status = 'pending'`;
  if (!existingVlr) {
    await sql`
      insert into venue_link_requests (community_id, venue_id, requested_by, status)
      values (${communityC}, ${venueA.id}, ${owner.id}, 'pending')`;
  }
  const [existingTlr] = await sql`
    select id from team_link_requests where team_id = ${kings} and status = 'pending'`;
  if (!existingTlr) {
    await sql`
      insert into team_link_requests (team_id, community_id, requested_by, status)
      values (${kings}, ${communityA}, ${owner.id}, 'pending')`;
  }

  const [existingCoach] =
    await sql`select id from coach where name = ${"Faisal Coach"}`;
  let coachId = existingCoach?.id;
  if (!coachId) {
    const [coach] = await sql`
      insert into coach (sport, name, mobile, email, description, court_id, image_url, is_active, added_by)
      values (
        'padel', 'Faisal Coach', '+97300000001', 'faisal.coach@example.com',
        'Club pro covering weekday evenings.', ${venueA.id},
        ${"https://i.pravatar.cc/200?u=faisal.coach@example.com"}, true, ${owner.id}
      )
      returning id`;
    coachId = coach.id;
  }
  const [existingSession] = await sql`
    select id from coaching_session where coach_id = ${coachId} limit 1`;
  if (!existingSession) {
    const start = at(3, 16);
    const end = new Date(start.getTime() + 60 * 60000);
    const [session] = await sql`
      insert into coaching_session (coach_id, start_time, end_time, duration_in_minutes, price, status, court_id)
      values (${coachId}, ${start}, ${end}, 60, 25, 'confirmed', ${venueA.id})
      returning id`;
    await sql`
      insert into coaching_session_players (coaching_session_id, user_id)
      values (${session.id}, ${p("haji")})`;
    await sql`
      insert into coaching_session_players (coaching_session_id, user_id)
      values (${session.id}, ${p("baji2")})`;
  }

  const [existingGil] =
    await sql`select id from group_invite_links where group_id = ${gTue.id} limit 1`;
  if (!existingGil) {
    await sql`
      insert into group_invite_links (group_id, created_by, token, expires_at)
      values (${gTue.id}, ${owner.id}, ${token()}, ${days(14)})`;
  }
  const [existingGilGame] =
    await sql`select id from game_invite_links where game_id = ${club1Upcoming} limit 1`;
  if (!existingGilGame) {
    await sql`
      insert into game_invite_links (game_id, created_by, token, expires_at)
      values (${club1Upcoming}, ${owner.id}, ${token()}, ${days(7)})`;
  }

  const counts = await sql`
    select
      (select count(*)::int from "user") as users,
      (select count(*)::int from communities) as communities,
      (select count(*)::int from groups) as groups,
      (select count(*)::int from teams) as teams,
      (select count(*)::int from games) as games,
      (select count(*)::int from matches) as matches,
      (select count(*)::int from game_team_players) as seats,
      (select count(*)::int from match_sets) as sets,
      (select count(*)::int from ratings) as ratings,
      (select count(*)::int from coach) as coaches
  `;
  console.log("seeded counts:", counts[0]);
  console.log("done");
}

main()
  .catch((e) => {
    console.error("SEED FAILED:", e.message);
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
