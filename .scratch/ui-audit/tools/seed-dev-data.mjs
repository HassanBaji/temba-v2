// Throwaway dev-data seeder for the UI/UX audit. Not part of the product.
import fs from "node:fs";
import postgres from "postgres";

const url = /DATABASE_URL="([^"]+)"/.exec(
  fs.readFileSync("../../apps/temba/.env", "utf8"),
)[1];
const sql = postgres(url, { prepare: false });

const now = new Date();
const days = (n) => new Date(now.getTime() + n * 86400000);
const at = (n, h, m = 0) => {
  const d = days(n);
  d.setHours(h, m, 0, 0);
  return d;
};

const pick = (arr, i) => arr[i % arr.length];

async function main() {
  const existing = await sql`select id, name, email from "user" order by created_at`;
  const realUsers = existing.map((u) => ({ id: u.id, name: u.name }));
  console.log("existing users:", realUsers.map((u) => u.name).join(", "));

  // ---- synthetic players -------------------------------------------------
  const synthetic = [
    ["Omar Al-Sayed", "omar.alsayed@example.com", true],
    ["Layla Haddad", "layla.haddad@example.com", true],
    ["Yousif Mansoor", "yousif.mansoor@example.com", false],
    ["Noor Abdulla", "noor.abdulla@example.com", true],
    ["Ahmed Buhazza", "ahmed.buhazza@example.com", false],
    ["Sara Fakhro", "sara.fakhro@example.com", true],
    ["Khalid Janahi", "khalid.janahi@example.com", false],
    ["Mariam Zayani", "mariam.zayani@example.com", true],
    ["Rashed Kanoo", "rashed.kanoo@example.com", false],
    ["Dana Al-Khalifa", "dana.alkhalifa@example.com", true],
  ];

  const players = [...realUsers];
  for (const [i, [name, email, hasImage]] of synthetic.entries()) {
    const [row] = await sql`
      insert into "user" (name, email, email_verified, phone_number_verified, image, number_of_games_played, created_at, updated_at)
      values (${name}, ${email}, true, false,
              ${hasImage ? `https://i.pravatar.cc/200?u=${encodeURIComponent(email)}` : null},
              ${6 + ((i * 5) % 30)}, ${now}, ${now})
      on conflict (email) do update set name = excluded.name, image = excluded.image
      returning id, name`;
    players.push(row);
  }
  console.log("players:", players.length);

  const owner = players.find((p) => p.name === "haji") ?? players[0];

  // ---- venues ------------------------------------------------------------
  const venueRows = await sql`
    select v.id, v.name, v.city from venues v where v.archived_at is null order by v.name limit 4`;
  const venueA = venueRows[0];
  const venueB = venueRows[1] ?? venueRows[0];
  const courtsA = await sql`select id, name from courts where venue_id = ${venueA.id} limit 3`;
  console.log("venue:", venueA.name, "courts:", courtsA.length);

  // ---- communities -------------------------------------------------------
  async function upsertCommunity(name, description, type, venueId, sports) {
    let [c] = await sql`select id from communities where name = ${name}`;
    if (!c) {
      [c] = await sql`
        insert into communities (name, description, type, created_by, venue_id)
        values (${name}, ${description}, ${type}, ${owner.id}, ${venueId})
        returning id`;
    }
    for (const s of sports) {
      await sql`insert into community_sports (community_id, sport) values (${c.id}, ${s})
                on conflict on constraint community_sports_community_id_sport_unique do nothing`;
    }
    return c.id;
  }

  const communityA = await upsertCommunity(
    "Bahrain Padel Club",
    "Bahrain's home for competitive and social padel. Weekly ladders, open sessions and club nights.",
    "public",
    venueA.id,
    ["padel"],
  );
  const communityB = await upsertCommunity(
    "Seef Racket Society",
    "Invite-only club playing padel and football out of Seef district.",
    "private",
    venueB.id,
    ["padel", "football"],
  );

  async function addCommunityMember(communityId, userId, role) {
    await sql`insert into community_members (community_id, user_id, role)
              values (${communityId}, ${userId}, ${role})
              on conflict on constraint community_members_community_id_user_id_unique do nothing`;
  }

  // every real user joins community A so whichever account is signed in sees data
  for (const [i, p] of players.entries()) {
    const role = p.id === owner.id ? "owner" : i < 3 ? "admin" : "member";
    await addCommunityMember(communityA, p.id, role);
  }
  for (const p of players.slice(0, 6)) {
    await addCommunityMember(communityB, p.id, p.id === owner.id ? "owner" : "member");
  }

  // ---- groups ------------------------------------------------------------
  async function upsertGroup(name, description, type, communityId) {
    let [g] = await sql`select id from groups where name = ${name}`;
    if (!g) {
      [g] = await sql`
        insert into groups (name, description, type, sport, community_id, created_by)
        values (${name}, ${description}, ${type}, 'padel', ${communityId}, ${owner.id})
        returning id`;
    }
    return g.id;
  }

  const groupDefs = [
    ["Tuesday Night Padel", "Mixed-level club night. Rotating pairs, 3 sets, everyone plays.", "public", communityA, 12],
    ["Advanced Ladder", "Invite-only competitive ladder for B and above.", "private", communityA, 8],
    ["Seef Social Padel", "Casual pickup padel around Seef. All welcome.", "public", null, 14],
    ["Weekend Warriors", "Saturday morning regulars.", "private", null, 6],
  ];

  const groupIds = [];
  for (const [name, desc, type, communityId, memberCount] of groupDefs) {
    const gid = await upsertGroup(name, desc, type, communityId);
    groupIds.push({ id: gid, name, memberCount, communityId });

    const roster = [...realUsers, ...players.slice(realUsers.length)].slice(0, memberCount);
    for (const [i, p] of roster.entries()) {
      const played = 4 + ((i * 7) % 22);
      await sql`
        insert into group_members (group_id, user_id, total_games_played, total_sets_won, total_points_won)
        values (${gid}, ${p.id}, ${played}, ${Math.round(played * (0.35 + ((i * 13) % 45) / 100))}, ${played * (18 + ((i * 11) % 14))})
        on conflict on constraint group_members_group_id_user_id_unique
        do update set total_games_played = excluded.total_games_played,
                      total_sets_won = excluded.total_sets_won,
                      total_points_won = excluded.total_points_won`;
    }
  }
  console.log("groups:", groupIds.map((g) => g.name).join(", "));

  // ---- games -------------------------------------------------------------
  const gameDefs = [
    // [groupIdx, name, startOffsetDays, hour, status, maxPlayers, totalPrice]
    [0, "Club Night — Court 1", 1, 19, "confirmed", 4, "24.00"],
    [0, "Club Night — Court 2", 1, 20, "pending", 4, "24.00"],
    [2, "Seef Pickup", 3, 18, "pending", 4, "16.00"],
    [1, "Ladder: Round 6", 5, 21, "confirmed", 4, "28.00"],
    [3, "Saturday Doubles", 6, 9, "confirmed", 4, null],
    [0, "Club Night — Court 1", -7, 19, "completed", 4, "24.00"],
    [0, "Club Night — Court 2", -14, 20, "completed", 4, "24.00"],
    [1, "Ladder: Round 5", -4, 21, "completed", 4, "28.00"],
    [2, "Seef Pickup", -2, 18, "completed", 4, "16.00"],
    [2, "Seef Pickup (rained off)", -1, 18, "cancelled", 4, "16.00"],
  ];

  const [{ n: alreadySeeded }] = await sql`select count(*)::int as n from games`;
  if (alreadySeeded > 0) {
    console.log("games already present, skipping game seed");
  } else {
    for (const [gi, name, off, hour, status, maxPlayers, totalPrice] of gameDefs) {
      const group = groupIds[gi];
      const start = at(off, hour);
      const end = new Date(start.getTime() + 90 * 60000);
      const [game] = await sql`
        insert into games (name, court_id, start_time, end_time, duration_in_minutes,
                           total_price, price_per_player, max_players, status, sport,
                           sets_played, status_updated_at, created_by, is_public, group_id)
        values (${name}, ${venueA.id}, ${start}, ${end}, 90,
                ${totalPrice}, ${totalPrice ? (Number(totalPrice) / 4).toFixed(2) : null},
                ${maxPlayers}, ${status}, 'padel',
                ${status === "completed" ? 3 : null}, ${now}, ${owner.id},
                ${group.communityId === null}, ${group.id})
        returning id`;

      const roster = await sql`
        select user_id from group_members where group_id = ${group.id} limit 4`;
      // leave one open spot on a couple of upcoming games
      const seats = status === "pending" ? roster.slice(0, 3) : roster;

      const playerIds = [];
      for (const [i, r] of seats.entries()) {
        const [gp] = await sql`
          insert into game_players (game_id, user_id, "playerType", added_by, sets_won, sets_lost, paid_at, paid_amount, self_performance_rating)
          values (${game.id}, ${r.user_id}, 'player', ${owner.id},
                  ${status === "completed" ? (i < 2 ? 2 : 1) : null},
                  ${status === "completed" ? (i < 2 ? 1 : 2) : null},
                  ${status === "completed" && totalPrice ? days(off) : null},
                  ${totalPrice ? (Number(totalPrice) / 4).toFixed(2) : null},
                  ${status === "completed" ? 3 + (i % 3) : null})
          returning id`;
        playerIds.push(gp.id);
      }

      if (status === "completed" && playerIds.length === 4) {
        for (const [side, label] of [[0, "Team A"], [1, "Team B"]]) {
          const [gt] = await sql`
            insert into game_teams (game_id, name, sets_won, sets_lost, created_at, updated_at)
            values (${game.id}, ${label}, ${side === 0 ? 2 : 1}, ${side === 0 ? 1 : 2}, ${now}, ${now})
            returning id`;
          // game_team_players exists in the Drizzle schema but has no migration
          // applied to this database, so the join rows are skipped here.
          void gt;
        }
      }
    }
    console.log("games seeded:", gameDefs.length);
  }

  // ---- teams -------------------------------------------------------------
  async function upsertTeam(name, communityId, createdBy, memberIds, stats) {
    let [t] = await sql`select id from teams where name = ${name}`;
    if (!t) {
      [t] = await sql`
        insert into teams (name, sport, community_id, created_by, games_played, wins, losses)
        values (${name}, 'padel', ${communityId}, ${createdBy}, ${stats[0]}, ${stats[1]}, ${stats[2]})
        returning id`;
    }
    for (const uid of memberIds) {
      await sql`insert into team_members (team_id, user_id) values (${t.id}, ${uid})
                on conflict do nothing`;
    }
    return t.id;
  }

  await upsertTeam("Smash Bros", communityA, players[0].id, [players[0].id, players[3].id], [18, 12, 6]);
  await upsertTeam("Court Kings", null, players[1].id, [players[1].id, players[4].id], [9, 4, 5]);

  // ---- pending join requests + invites ----------------------------------
  const requesters = players.slice(-3);
  for (const r of requesters) {
    await sql`delete from community_members where community_id = ${communityB} and user_id = ${r.id}`;
    await sql`insert into community_join_requests (community_id, user_id, status)
              values (${communityB}, ${r.id}, 'pending')
              on conflict do nothing`.catch((e) => console.log("join_requests skip:", e.message));
  }

  console.log("done");
}

main()
  .catch((e) => {
    console.error("SEED FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
