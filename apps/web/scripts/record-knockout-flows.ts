/**
 * Record the tournament Knockout flows (ADR-0020) in Chromium and save one
 * H.264 mp4 per flow to `apps/web/recordings/knockout/`, with key
 * screenshots next to them. Run after `db:seed` with the dev server up.
 *
 * Organizer steps (create, Draw, Re-roll, Post, Undo, Cancel Match) are
 * clicked in the UI as Sam. A drawn tournament has no score-entry UI yet, so
 * registrations, Set scores and result confirmations go through the same
 * router functions the tRPC doors call, as the seated players. A caption on
 * every step says which is which.
 *
 *   RECORD_USERNAME=... RECORD_PASSWORD=... pnpm --filter web record:knockout
 *   RECORD_ONLY=ko-02,ko-03   # optional subset
 */
import { execFileSync } from "node:child_process";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { and, asc, eq, inArray, isNotNull, isNull, desc } from "drizzle-orm";
import { chromium, type Browser, type Locator, type Page } from "playwright";

import {
  gameTeamPlayers,
  gameTeams,
  games,
  groups,
  matches,
  matchSets,
  user,
} from "@repo/db";

import { db } from "@repo/db";

import { addSet } from "@repo/api/routers/games/addSet";
import { confirmMatchResult } from "@repo/api/routers/games/confirmMatchResult";
import { createTournament } from "@repo/api/routers/games/createTournament";
import { drawPools } from "@repo/api/routers/games/drawPools";
import { postPoolDraw } from "@repo/api/routers/games/postPoolDraw";
import { registerWithPartner } from "@repo/api/routers/games/registerWithPartner";
import { scoreSet } from "@repo/api/routers/games/scoreSet";
import { createLoosePublic } from "@repo/api/routers/groups/createLoosePublic";
import { joinLoosePublic } from "@repo/api/routers/groups/joinLoosePublic";
import { selfDeclareRating } from "@repo/api/routers/ratings/selfDeclare";
import { markOnboardingComplete } from "@repo/api/routers/users/completeOnboarding";
import { writePreferredPosition } from "@repo/api/routers/users/setPreferredPosition";
import { knockoutMatchCode } from "@repo/domain/tournament-knockout";

const BASE_URL = process.env.RECORD_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "recordings", "knockout");
const RAW_DIR = join(OUT_DIR, "raw");
const VIEWPORT = { width: 430, height: 932 };
const AUTH_STATE = join(OUT_DIR, ".auth-me.json");

const GROUP_NAME = "Knockout Club";
const KO_NAME = "Saturday Knockout";
const GK_NAME = "Autumn Groups Cup";

const STEP_PAUSE = Number(process.env.RECORD_PAUSE_MS ?? 2000);

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    host = "";
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(
      `Refusing to record against ${host || "an unknown host"}: this script writes Games and scores. Point DATABASE_URL at a local database.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Data: the Group, players and tournaments, written through router functions
// ---------------------------------------------------------------------------

const EXTRA_PLAYERS = [
  { name: "Rui Costa", username: "ruicosta", level: "C2", position: "left" },
  { name: "Ines Duarte", username: "inesd", level: "C1", position: "right" },
  { name: "Kofi Mensah", username: "kofim", level: "C3", position: "left" },
  { name: "Elena Petrova", username: "elenap", level: "B3", position: "right" },
  { name: "Pablo Ruiz", username: "pablor", level: "C2", position: "left" },
  { name: "Mia Jensen", username: "miaj", level: "D1", position: "right" },
  { name: "Noah Weber", username: "noahw", level: "C1", position: "either" },
] as const;

const KO_PAIRS: [string, string][] = [
  ["samrivera", "omaraziz"],
  ["linah", "priyan"],
  ["mayachen", "diegos"],
  ["sofiar", "yusufk"],
  ["emmal", "leom"],
  ["aishab", "marcof"],
];

const GK_PAIRS: [string, string][] = [
  ...KO_PAIRS,
  ["tombecker", "beno"],
  ["hanas", "jonasb"],
  ["zarak", "ruicosta"],
  ["inesd", "kofim"],
  ["elenap", "pablor"],
  ["miaj", "noahw"],
];

type Users = Map<string, { id: string; name: string }>;

async function loadUsers(): Promise<Users> {
  const rows = await db
    .select({ id: user.id, name: user.name, username: user.username })
    .from(user);
  return new Map(
    rows.flatMap((row) =>
      row.username ? [[row.username, { id: row.id, name: row.name }]] : [],
    ),
  );
}

function need(users: Users, username: string) {
  const found = users.get(username);
  if (!found) {
    throw new Error(`User ${username} not found. Run db:seed first.`);
  }
  return found;
}

/** A Loose Public Group Sam owns, with every player of both tournaments in it. */
async function ensureKnockoutGroup() {
  for (const extra of EXTRA_PLAYERS) {
    const existing = await db.query.user.findFirst({
      where: eq(user.username, extra.username),
    });
    if (existing) continue;
    const [row] = await db
      .insert(user)
      .values({
        name: extra.name,
        username: extra.username,
        email: `${extra.username}@example.test`,
        emailVerified: true,
      })
      .returning({ id: user.id });
    if (!row) throw new Error(`Failed to insert ${extra.username}`);
    await selfDeclareRating(db, row.id, "padel", extra.level);
    await writePreferredPosition(db, {
      userId: row.id,
      preferredPosition: extra.position,
    });
    await markOnboardingComplete(db, { userId: row.id });
  }

  const users = await loadUsers();
  const sam = need(users, "samrivera");
  let group = await db.query.groups.findFirst({
    where: eq(groups.name, GROUP_NAME),
  });
  if (!group) {
    const created = await createLoosePublic(db, {
      name: GROUP_NAME,
      description: "Knockout days and cups.",
      sport: "padel",
      userId: sam.id,
    });
    group = await db.query.groups.findFirst({
      where: eq(groups.id, created.id),
    });
    const members = new Set(GK_PAIRS.flat());
    members.delete("samrivera");
    for (const username of members) {
      await joinLoosePublic(db, {
        groupId: created.id,
        userId: need(users, username).id,
      });
    }
  }
  if (!group) throw new Error("Knockout Club was not created");
  return { groupId: group.id, users };
}

async function latestGame(name: string) {
  const [row] = await db
    .select()
    .from(games)
    .where(and(eq(games.name, name), isNull(games.cancelledAt)))
    .orderBy(desc(games.createdAt))
    .limit(1);
  return row ?? null;
}

async function firstVenueWithCourts() {
  const venue = await db.query.venues.findFirst({
    where: (v, { eq: equals }) => equals(v.name, "Padel Central"),
    with: { courts: true },
  });
  if (!venue) throw new Error("Padel Central not found. Run db:seed first.");
  return venue;
}

/** Fallback when a flow runs without the one that creates its tournament. */
async function ensureTournament(
  name: string,
  shape: "knockout_only" | "groups_then_knockout",
  groupId: string,
  users: Users,
) {
  const existing = await latestGame(name);
  if (existing) return existing;
  const venue = await firstVenueWithCourts();
  const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(15, 0, 0, 0);
  await createTournament(db, {
    createdBy: need(users, "samrivera").id,
    name,
    groupId,
    isPublic: false,
    tournamentShape: shape,
    teamCount: shape === "knockout_only" ? 8 : 12,
    ...(shape === "groups_then_knockout"
      ? { poolCount: 3, qualifiersPerPool: 2 }
      : {}),
    matchMinutes: 30,
    windowStart: start,
    windowEnd: end,
    venueId: venue.id,
    courtIds: venue.courts.map((court) => court.id),
  });
  const created = await latestGame(name);
  if (!created) throw new Error(`Failed to create ${name}`);
  return created;
}

async function registerPairs(
  gameId: string,
  users: Users,
  pairs: [string, string][],
) {
  const registered = await db.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    with: { players: { with: { gamePlayer: true } } },
  });
  const seated = new Set(
    registered.flatMap((team) =>
      team.players.flatMap((link) =>
        link.gamePlayer.userId ? [link.gamePlayer.userId] : [],
      ),
    ),
  );
  let side = registered.length;
  for (const [a, b] of pairs) {
    const left = need(users, a);
    const right = need(users, b);
    if (seated.has(left.id)) continue;
    side += 1;
    await registerWithPartner(db, {
      gameId,
      userId: left.id,
      partnerUserId: right.id,
      sideIndex: side,
      position: "left",
    });
  }
}

type KnockoutRow = typeof matches.$inferSelect;

async function knockoutMatches(gameId: string) {
  return db
    .select()
    .from(matches)
    .where(and(eq(matches.gameId, gameId), isNotNull(matches.knockoutRound)))
    .orderBy(asc(matches.knockoutRound), asc(matches.knockoutPosition));
}

async function poolMatches(gameId: string) {
  return db
    .select()
    .from(matches)
    .where(and(eq(matches.gameId, gameId), isNull(matches.knockoutRound)))
    .orderBy(asc(matches.roundNumber), asc(matches.startTime));
}

async function matchById(matchId: string) {
  const row = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!row) throw new Error(`Match ${matchId} not found`);
  return row;
}

async function teamPlayers(gameTeamId: string | null) {
  if (!gameTeamId) return [];
  const links = await db.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    with: { gamePlayer: { with: { user: { columns: { name: true } } } } },
  });
  return links.flatMap((link) =>
    link.gamePlayer.userId
      ? [{ id: link.gamePlayer.userId, name: link.gamePlayer.user?.name ?? "" }]
      : [],
  );
}

async function teamName(gameTeamId: string | null) {
  const players = await teamPlayers(gameTeamId);
  return players.map((player) => player.name).join(" / ");
}

async function teamIdOf(gameId: string, userId: string) {
  const teams = await db.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
  });
  const links = await db.query.gameTeamPlayers.findMany({
    where: inArray(
      gameTeamPlayers.gameTeamId,
      teams.map((team) => team.id),
    ),
    with: { gamePlayer: true },
  });
  return (
    links.find((link) => link.gamePlayer.userId === userId)?.gameTeamId ?? null
  );
}

async function knockoutRoundCount(gameId: string) {
  const rows = await knockoutMatches(gameId);
  return Math.max(...rows.map((row) => row.knockoutRound ?? 0));
}

async function codeOf(match: KnockoutRow) {
  return knockoutMatchCode(
    match.knockoutRound ?? 1,
    match.knockoutPosition ?? 1,
    await knockoutRoundCount(match.gameId),
  );
}

/** Sets that make `winner` (slot 1 or 2) win in straight Sets. */
function straightSets(winner: 1 | 2): [number, number][] {
  return winner === 1
    ? [
        [6, 3],
        [6, 4],
      ]
    : [
        [3, 6],
        [4, 6],
      ];
}

/** Set scores from the winning side, e.g. `6-3 6-4`. */
function setsLine(sets: [number, number][]) {
  return sets.map(([a, b]) => `${Math.max(a, b)}-${Math.min(a, b)}`).join(" ");
}

/**
 * One player of the Match enters each Set (and is confirmed by doing so);
 * with `confirm`, every other seated player then confirms the result.
 */
async function scoreMatch(
  gameId: string,
  matchId: string,
  sets: [number, number][],
  confirm = true,
) {
  const match = await matchById(matchId);
  const players = [
    ...(await teamPlayers(match.slot1GameTeamId)),
    ...(await teamPlayers(match.slot2GameTeamId)),
  ];
  const scorer = players[0];
  if (!scorer) throw new Error(`No players on Match ${matchId}`);
  for (const [a, b] of sets) {
    const set = await addSet(db, { gameId, matchId, userId: scorer.id });
    await scoreSet(db, {
      gameId,
      matchId,
      setId: set.id,
      userId: scorer.id,
      slot1GamesWon: a,
      slot2GamesWon: b,
    });
  }
  if (!confirm) return;
  for (const player of players.slice(1)) {
    await confirmMatchResult(db, { gameId, matchId, userId: player.id });
  }
}

async function confirmAll(gameId: string, matchId: string) {
  const match = await matchById(matchId);
  const players = [
    ...(await teamPlayers(match.slot1GameTeamId)),
    ...(await teamPlayers(match.slot2GameTeamId)),
  ];
  for (const player of players.slice(1)) {
    await confirmMatchResult(db, { gameId, matchId, userId: player.id });
  }
}

async function matchSetCount(matchId: string) {
  const rows = await db.query.matchSets.findMany({
    where: eq(matchSets.matchId, matchId),
  });
  return rows.length;
}

// ---------------------------------------------------------------------------
// Browser helpers
// ---------------------------------------------------------------------------

type Kind = "UI" | "API" | "VIEW";

const captions = new WeakMap<Page, { kind: Kind; text: string }>();

async function paintCaption(page: Page) {
  const caption = captions.get(page);
  if (!caption) return;
  await page
    .evaluate(({ kind, text }) => {
      let box = document.getElementById("ko-caption");
      if (!box) {
        box = document.createElement("div");
        box.id = "ko-caption";
        box.setAttribute("aria-hidden", "true");
        Object.assign(box.style, {
          position: "fixed",
          left: "8px",
          right: "8px",
          top: "8px",
          zIndex: "2147483647",
          pointerEvents: "none",
          background: "rgba(17, 17, 17, 0.88)",
          color: "#fff",
          font: "600 13px/1.35 system-ui, -apple-system, sans-serif",
          padding: "8px 10px",
          borderRadius: "10px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        });
        document.documentElement.appendChild(box);
      }
      const colors = { UI: "#16a34a", API: "#ea580c", VIEW: "#2563eb" };
      box.innerHTML = "";
      const badge = document.createElement("span");
      badge.textContent = kind;
      Object.assign(badge.style, {
        display: "inline-block",
        background: colors[kind],
        color: "#fff",
        borderRadius: "6px",
        padding: "1px 6px",
        marginRight: "7px",
        fontSize: "11px",
        letterSpacing: "0.04em",
      });
      box.append(badge, document.createTextNode(text));
    }, caption)
    .catch(() => undefined);
}

async function say(page: Page, kind: Kind, text: string, ms = STEP_PAUSE) {
  console.log(`    [${kind}] ${text}`);
  captions.set(page, { kind, text });
  await paintCaption(page);
  await page.waitForTimeout(ms);
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page
    .waitForFunction(
      () => !document.querySelector('[data-slot="skeleton"]'),
      undefined,
      { timeout: 30_000 },
    )
    .catch(() => undefined);
  await paintCaption(page);
}

/** Hold the current frame over the page until `releaseFrame` (see FREEZE_INIT_SCRIPT). */
async function holdFrame(page: Page) {
  if (!page.url().startsWith(BASE_URL)) return;
  const frame = await page.screenshot({ type: "jpeg", quality: 80 });
  await page
    .evaluate(
      (src) => sessionStorage.setItem("ko-freeze", src),
      `data:image/jpeg;base64,${frame.toString("base64")}`,
    )
    .catch(() => undefined);
}

async function releaseFrame(page: Page) {
  await page
    .evaluate(() => {
      (window as { koFreezeHold?: boolean }).koFreezeHold = false;
      sessionStorage.removeItem("ko-freeze");
      document.getElementById("ko-freeze")?.remove();
    })
    .catch(() => undefined);
}

/**
 * Navigate, keeping the previous frame on screen until the new page has
 * rendered so the video skips the dev-server loading skeleton.
 */
async function goto(page: Page, path: string) {
  await holdFrame(page);
  await page.goto(`${BASE_URL}${path}`);
  await settle(page);
  await page.waitForTimeout(300);
  await releaseFrame(page);
}

/** Reload to pick up server-side writes, keeping the scroll position. */
async function reload(page: Page) {
  const y = await page.evaluate(() => window.scrollY).catch(() => 0);
  await holdFrame(page);
  await page.reload();
  await settle(page);
  await page
    .evaluate((top) => window.scrollTo({ top }), y)
    .catch(() => undefined);
  await page.waitForTimeout(400);
  await releaseFrame(page);
}

async function scrollTo(page: Page, target: Locator, block = "center") {
  await target.first().waitFor({ state: "attached", timeout: 15_000 });
  await target.first().evaluate(
    (el, b) =>
      el.scrollIntoView({
        behavior: "smooth",
        block: b as ScrollLogicalPosition,
      }),
    block,
  );
  await page.waitForTimeout(900);
}

async function scrollTop(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(800);
}

/** Smoothly scroll the whole page so the video shows everything. */
async function tour(page: Page, step = 320, ms = 650) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  let y = await page.evaluate(() => window.scrollY);
  while (y + VIEWPORT.height < height) {
    y += step;
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "smooth" }),
      y,
    );
    await page.waitForTimeout(ms);
  }
  await page.waitForTimeout(600);
}

async function highlight(page: Page, target: Locator) {
  await target
    .first()
    .evaluate((el) => {
      (el as HTMLElement).style.outline = "3px solid #ea580c";
      (el as HTMLElement).style.outlineOffset = "2px";
      (el as HTMLElement).style.borderRadius = "10px";
    })
    .catch(() => undefined);
}

async function click(page: Page, target: Locator) {
  const first = target.first();
  await first.waitFor({ state: "visible", timeout: 20_000 });
  await first.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await first.click();
  await page.waitForTimeout(900);
}

const shots: string[] = [];

async function shot(page: Page, name: string, fullPage = true) {
  const path = join(OUT_DIR, `${name}.png`);
  const caption = page.locator("#ko-caption");
  if (fullPage) {
    await caption
      .evaluate((el) => (el.style.visibility = "hidden"))
      .catch(() => undefined);
  }
  await page.screenshot({ path, fullPage });
  if (fullPage) {
    await caption
      .evaluate((el) => (el.style.visibility = "visible"))
      .catch(() => undefined);
  }
  shots.push(path);
  console.log(`    screenshot ${path}`);
}

type Check = { flow: string; step: string; ok: boolean; note?: string };
const checks: Check[] = [];
let currentFlow = "";

async function expectText(
  page: Page,
  step: string,
  text: string | RegExp,
  timeout = 10_000,
) {
  const target = page.getByText(text).first();
  const ok = await target
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);
  checks.push({
    flow: currentFlow,
    step,
    ok,
    note: ok ? undefined : `missing text ${String(text)}`,
  });
  if (!ok) {
    const name = `FAIL-${currentFlow}-${checks.length}`;
    await shot(page, name);
    console.warn(`    ✗ ${step}: missing ${String(text)} (${name}.png)`);
  } else {
    console.log(`    ✓ ${step}`);
  }
  return ok;
}

function expectValue(step: string, ok: boolean, note?: string) {
  checks.push({ flow: currentFlow, step, ok, note: ok ? undefined : note });
  console.log(`    ${ok ? "✓" : "✗"} ${step}${ok ? "" : `: ${note}`}`);
  return ok;
}

async function signIn(page: Page, username: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForFunction(
    () => (window as { Clerk?: { loaded?: boolean } }).Clerk?.loaded === true,
    undefined,
    { timeout: 60_000 },
  );
  await page.locator("#sign-in-identifier").fill(username);
  await page.locator("#sign-in-password").fill(password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding|login\/factor-two)/, {
    timeout: 60_000,
  });
  if (page.url().includes("/login/factor-two")) {
    await page
      .locator("#second-factor-code")
      .fill(process.env.RECORD_OTP ?? "424242");
    const verify = page.getByRole("button", { name: /^verify$/i });
    if (await verify.isEnabled().catch(() => false)) await verify.click();
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 60_000 });
  }
}

// ---------------------------------------------------------------------------
// UI steps
// ---------------------------------------------------------------------------

function radio(page: Page, name: string | RegExp) {
  return page.getByRole("radio", { name });
}

async function pickTimeChip(page: Page, sectionId: string, label: RegExp) {
  const section = page.locator(`#${sectionId}`);
  const chip = section.getByRole("radio", { name: label });
  if (
    !(await chip
      .first()
      .isVisible()
      .catch(() => false))
  ) {
    await click(page, section.getByRole("button", { name: /^more$/i }));
  }
  await click(page, chip);
}

/** Steps 1 and 2 of the create flow, in the Knockout Club Group. */
async function createStepsOneTwo(page: Page) {
  await goto(page, "/dashboard/games/new");
  await say(
    page,
    "UI",
    "Organizer (Sam) opens Create and picks Friendly tournament",
  );
  await click(page, radio(page, /friendly tournament/i));
  await settle(page);
  if (/step=1|new$/.test(page.url())) {
    await click(page, page.getByRole("button", { name: /^continue/i }));
  }
  await settle(page);

  await say(page, "UI", `Picks the Group "${GROUP_NAME}" and Padel Central`);
  const groupChip = radio(page, new RegExp(GROUP_NAME));
  if (
    !(await groupChip
      .first()
      .isVisible()
      .catch(() => false))
  ) {
    await click(page, page.getByText(/^All \d+ groups$/));
    await click(
      page,
      page
        .getByRole("dialog")
        .getByRole("radio", { name: new RegExp(GROUP_NAME) }),
    );
  } else {
    await click(page, groupChip);
  }
  await click(page, radio(page, /padel central/i));
  const allCourts = page.getByRole("button", { name: /^All \d+ courts$/ });
  if (
    await allCourts
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await click(page, allCourts);
  }
  const unpicked = page
    .locator("#game-court")
    .getByRole("button", { pressed: false, name: /^(?!All \d+ courts).+/ });
  for (let i = 0; i < 8 && (await unpicked.count()) > 0; i += 1) {
    await unpicked.first().click();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(800);
}

async function setStepper(
  page: Page,
  id: string,
  target: number,
  fewer: string,
  more: string,
) {
  const value = async () => {
    const text = await page
      .locator(`#${id}`)
      .innerText()
      .catch(() => "");
    const match = /(\d+)/.exec(text);
    return match ? Number(match[1]) : NaN;
  };
  for (let i = 0; i < 20; i += 1) {
    const now = await value();
    if (Number.isNaN(now) || now === target) return now;
    const button = page.getByRole("button", {
      name: now < target ? more : fewer,
    });
    if (!(await button.isEnabled().catch(() => false))) return now;
    await click(page, button);
  }
  return value();
}

async function pickDayAndTime(page: Page, finish: RegExp) {
  await scrollTo(page, page.locator("#game-window-day"));
  await click(page, page.locator("#game-window-day").getByRole("radio").nth(2));
  await pickTimeChip(page, "game-window-start", /^9:00/);
  await pickTimeChip(page, "game-window-finish", finish);
  await scrollTo(page, page.getByRole("radio", { name: /^30 min$/ }));
  await click(page, page.getByRole("radio", { name: /^30 min$/ }));
}

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------

type Context = { groupId: string; users: Users };

type Flow = {
  name: string;
  run: (page: Page, ctx: Context) => Promise<void>;
};

const flowCreateKnockoutOnly: Flow = {
  name: "ko-01-create-knockout-only",
  run: async (page) => {
    await createStepsOneTwo(page);
    await scrollTo(page, page.locator("#tournament-team-count"));
    await say(page, "UI", "Plans 8 Game teams");
    const teams = await setStepper(
      page,
      "tournament-team-count",
      8,
      "Fewer Game teams",
      "More Game teams",
    );
    expectValue("Game teams stepper set to 8", teams === 8, `got ${teams}`);
    await click(page, page.getByRole("button", { name: /^continue/i }));
    await settle(page);

    await say(
      page,
      "VIEW",
      "Step 3: the Format picker. Groups only is preselected",
    );
    const groupsOnly = radio(page, /groups only/i);
    expectValue(
      "Groups only preselected",
      (await groupsOnly.first().getAttribute("aria-checked")) === "true",
      "Groups only not checked",
    );
    await scrollTo(page, page.locator("#tournament-pool-count"));
    expectValue(
      "Groups and Rounds steppers shown for Groups only",
      (await page.locator("#tournament-pool-count").isVisible()) &&
        (await page.locator("#tournament-round-count").isVisible()),
      "Groups or Rounds stepper missing",
    );
    await say(page, "VIEW", "Groups only shows the Groups and Rounds steppers");
    await shot(page, "ko-01-format-groups-only", false);

    await scrollTo(page, page.locator("#tournament-shape"), "start");
    await say(page, "UI", "Organizer picks Knockout only");
    await click(page, radio(page, /knockout only/i));
    const poolHidden = !(await page
      .locator("#tournament-pool-count")
      .isVisible());
    const roundsHidden = !(await page
      .locator("#tournament-round-count")
      .isVisible());
    expectValue(
      "Knockout only hides the Groups stepper",
      poolHidden,
      "Groups stepper still visible",
    );
    expectValue(
      "Knockout only hides the Rounds stepper",
      roundsHidden,
      "Rounds stepper still visible",
    );
    await say(
      page,
      "VIEW",
      "Groups and Rounds steppers are gone; the tree is sized from the teams",
    );
    await shot(page, "ko-01-format-knockout-only", false);

    await say(page, "UI", "Picks a day, 9:00 to 2:00 PM, 30 min games");
    await pickDayAndTime(page, /^2:00/);
    await tour(page);
    await say(page, "VIEW", "The day-fit line includes the Knockout rounds");
    await shot(page, "ko-01-step3-schedule", false);

    await click(page, page.getByRole("button", { name: /^continue/i }));
    await settle(page);
    await say(page, "UI", `Step 4: names it "${KO_NAME}"`);
    await page.locator("#tournament-name").fill(KO_NAME);
    await page.waitForTimeout(800);
    await scrollTo(page, page.getByText(/^Knockout$/), "center");
    await expectText(
      page,
      "Review shows Format: Knockout only",
      "Knockout only",
    );
    await expectText(
      page,
      "Review Knockout row: Quarter-finals onward (8 teams, no byes)",
      "Quarter-finals onward",
    );
    await highlight(page, page.getByText(/onward/));
    await say(
      page,
      "VIEW",
      "Review: Format Knockout only, Knockout row (8 teams: quarter-finals onward, no byes)",
      2500,
    );
    await shot(page, "ko-01-review-knockout-only", false);

    await say(page, "UI", "Back to step 3 to compare: Groups, then knockout");
    await page.goBack();
    await settle(page);
    await scrollTo(page, page.locator("#tournament-shape"), "start");
    await click(page, radio(page, /groups, then knockout/i));
    await scrollTo(page, page.locator("#tournament-qualifiers-per-pool"));
    await expectText(
      page,
      "Through from each group stepper shown",
      "Through from each group",
    );
    await expectText(
      page,
      "Consequence line under the stepper",
      /into the knockout/,
    );
    await highlight(
      page,
      page.locator("#tournament-qualifiers-per-pool").locator(".."),
    );
    await say(
      page,
      "VIEW",
      "Groups, then knockout adds 'Through from each group' and its consequence line",
      2500,
    );
    await shot(page, "ko-01-format-groups-then-knockout", false);

    await scrollTo(page, page.locator("#tournament-shape"), "start");
    await say(page, "UI", "Switches back to Knockout only");
    await click(page, radio(page, /knockout only/i));
    await click(page, page.getByRole("button", { name: /^continue/i }));
    await settle(page);
    await scrollTo(page, page.getByText(/onward/), "center");
    await say(page, "VIEW", "Review again before creating");
    await say(page, "UI", "Organizer clicks Create tournament");
    await click(
      page,
      page.getByRole("button", { name: /^create tournament$/i }),
    );
    await page.waitForURL(/\/dashboard\/games\/[0-9a-f-]{36}/, {
      timeout: 30_000,
    });
    await settle(page);
    await say(page, "VIEW", "Tournament home before the draw");
    await expectText(page, "Created tournament home shows its name", KO_NAME);
    await shot(page, "ko-01-created-home", false);
    await tour(page);
    const created = await latestGame(KO_NAME);
    expectValue(
      "Stored shape is knockout_only with no pool_count",
      created?.tournamentShape === "knockout_only" && created.poolCount == null,
      `shape ${created?.tournamentShape} pools ${created?.poolCount}`,
    );
  },
};

const flowKnockoutDrawAndPost: Flow = {
  name: "ko-02-knockout-draw-and-post",
  run: async (page, ctx) => {
    const game = await ensureTournament(
      KO_NAME,
      "knockout_only",
      ctx.groupId,
      ctx.users,
    );
    await goto(page, `/dashboard/games/${game.id}`);
    await say(
      page,
      "VIEW",
      `${KO_NAME}: planned for 8 Game teams, nobody registered yet`,
    );
    await say(
      page,
      "API",
      "6 pairs register as complete Game teams (Sam + Omar among them)",
      1200,
    );
    await registerPairs(game.id, ctx.users, KO_PAIRS);
    await reload(page);
    await say(
      page,
      "VIEW",
      "6 complete Game teams registered: the tree will size to 6, with 2 Byes",
    );
    await tour(page);
    await scrollTop(page);

    const entry = page.getByRole("button", { name: /^open the draw$/i });
    await scrollTo(page, entry);
    await say(page, "UI", "Organizer opens the draw");
    await click(page, entry);
    await say(page, "VIEW", "The draw drawer: random, nobody is seeded");
    await say(page, "UI", "Organizer clicks Draw the knockout");
    await click(
      page,
      page.getByRole("button", { name: /^draw the knockout$/i }),
    );
    await page.waitForTimeout(1500);
    await expectText(
      page,
      "Draft shows the first round (Quarter-finals)",
      /Quarter-finals/,
    );
    await expectText(page, "Draft shows Byes", /^Bye$/);
    await say(
      page,
      "VIEW",
      "Draft: first-round pairings and which teams have a Bye",
      2500,
    );
    await shot(page, "ko-02-draft-1", false);
    const drawer = page.getByRole("dialog");
    const draftText1 = await drawer.innerText();
    await drawer
      .locator(".overflow-y-auto")
      .first()
      .evaluate((el) =>
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }),
      )
      .catch(() => undefined);
    await page.waitForTimeout(1500);

    await say(page, "UI", "Organizer clicks Draw again (re-roll)");
    await click(page, page.getByRole("button", { name: /^draw again$/i }));
    await page.waitForTimeout(1500);
    const draftText2 = await drawer.innerText();
    expectValue(
      "Re-roll changed the draft",
      draftText1 !== draftText2,
      "draft text identical after re-roll (can happen by chance)",
    );
    await say(page, "VIEW", "A new random draft", 2500);
    await shot(page, "ko-02-draft-2", false);

    await say(page, "UI", "Organizer clicks Post the draw");
    await click(page, page.getByRole("button", { name: /^post the draw$/i }));
    await page.waitForTimeout(2000);
    await settle(page);
    await expectText(page, "Posted tree heading Knockout", /^Knockout$/);
    await say(
      page,
      "VIEW",
      "Posted: the tree with Quarter-finals, Semi-finals and Final",
    );
    await expectText(page, "Tree shows Quarter-finals", /^Quarter-finals$/);
    await expectText(page, "Tree shows Semi-finals", /^Semi-finals$/);
    await expectText(page, "Tree shows Final", /^Final$/);
    await expectText(
      page,
      "Tree shows Winner of placeholders",
      /^Winner of Q\d$/,
    );
    await expectText(page, "Tree shows Byes", /^Bye$/);
    await expectText(page, "Tree shows Final code", /^Final$/);
    await shot(page, "ko-02-tree-posted");
    await tour(page, 280, 900);

    const undo = page.getByRole("button", { name: /^undo the draw$/i });
    if (await undo.isVisible().catch(() => false)) {
      await scrollTo(page, undo);
      await say(
        page,
        "UI",
        "Undo the draw is offered until a Set is played: Organizer clicks it",
      );
      await click(page, undo);
      await say(
        page,
        "VIEW",
        "Confirm dialog: every knockout Match is deleted",
      );
      await click(page, page.getByRole("button", { name: /^undo draw$/i }));
      await page.waitForTimeout(2000);
      await settle(page);
      await scrollTop(page);
      await expectText(
        page,
        "Undo returns to the pre-draw home",
        /open the draw/i,
      );
      await say(page, "VIEW", "Back before the draw");
      const reopen = page.getByRole("button", { name: /^open the draw$/i });
      await scrollTo(page, reopen);
      await say(page, "UI", "Organizer opens the draw, draws and posts again");
      await click(page, reopen);
      const drawAgain = page.getByRole("button", {
        name: /^(draw the knockout|draw again)$/i,
      });
      await click(page, drawAgain);
      await page.waitForTimeout(1500);
      await click(page, page.getByRole("button", { name: /^post the draw$/i }));
      await page.waitForTimeout(2000);
      await settle(page);
    } else {
      expectValue(
        "Undo the draw offered after posting",
        false,
        "no Undo the draw button",
      );
    }
    await scrollTop(page);
    await say(
      page,
      "VIEW",
      "The posted tree: codes Q1–Q4 / S1, S2 / Final, 'Winner of' places and Byes",
    );
    await tour(page, 280, 900);
    await shot(page, "ko-02-tree-final");
    const rows = await knockoutMatches(game.id);
    expectValue(
      "5 Knockout Matches rows (6 entrants - 1), 2 in round 1",
      rows.length === 5 &&
        rows.filter((r) => r.knockoutRound === 1).length === 2,
      `rows ${rows.length}, round 1 ${rows.filter((r) => r.knockoutRound === 1).length}`,
    );
  },
};

async function ensurePosted(gameId: string, organizerId: string) {
  const game = await db.query.games.findFirst({ where: eq(games.id, gameId) });
  if (game?.drawPostedAt) return;
  await drawPools(db, { gameId, organizerUserId: organizerId });
  await postPoolDraw(db, { gameId, organizerUserId: organizerId });
}

const flowKnockoutPlay: Flow = {
  name: "ko-03-knockout-play-to-champion",
  run: async (page, ctx) => {
    const sam = need(ctx.users, "samrivera");
    const game = await ensureTournament(
      KO_NAME,
      "knockout_only",
      ctx.groupId,
      ctx.users,
    );
    await registerPairs(game.id, ctx.users, KO_PAIRS);
    await ensurePosted(game.id, sam.id);
    const samTeam = await teamIdOf(game.id, sam.id);
    const path = `/dashboard/games/${game.id}`;
    await goto(page, path);
    await say(page, "VIEW", `${KO_NAME}: drawn and posted. Nothing played yet`);
    await tour(page, 300, 700);
    await scrollTop(page);

    const firstRound = (await knockoutMatches(game.id)).filter(
      (m) => m.knockoutRound === 1,
    );
    const [qa, qb] = firstRound;
    if (!qa || !qb) throw new Error("Expected two first-round Matches");
    // Sam's team wins its Quarter-final if it plays one; the other one is the level Match.
    const samInB =
      qb.slot1GameTeamId === samTeam || qb.slot2GameTeamId === samTeam;
    const normal = samInB ? qb : qa;
    const level = samInB ? qa : qb;
    const winnerSlot = (m: KnockoutRow): 1 | 2 =>
      m.slot2GameTeamId === samTeam ? 2 : 1;

    const normalCode = await codeOf(normal);
    const normalSets = straightSets(winnerSlot(normal));
    await say(
      page,
      "API",
      `${normalCode}: ${await teamName(winnerSlot(normal) === 1 ? normal.slot1GameTeamId : normal.slot2GameTeamId)} win ${setsLine(normalSets)}. Players submit and confirm via API (no score UI for tournaments yet)`,
      1500,
    );
    await scoreMatch(game.id, normal.id, normalSets);
    await reload(page);
    const normalCard = page
      .locator("li")
      .filter({ hasText: new RegExp(`^${normalCode}`) });
    await scrollTo(page, normalCard);
    await highlight(page, normalCard);
    await expectText(page, `${normalCode} shows a winner tag`, /^won$/);
    await say(
      page,
      "VIEW",
      `${normalCode} is won and the winner moves into its Semi-final`,
      2500,
    );
    const advanced = (await knockoutMatches(game.id)).filter(
      (m) => m.knockoutRound === 2,
    );
    const winnerTeam =
      winnerSlot(normal) === 1
        ? normal.slot1GameTeamId
        : normal.slot2GameTeamId;
    expectValue(
      `${normalCode} winner written into round 2`,
      advanced.some(
        (m) =>
          m.slot1GameTeamId === winnerTeam || m.slot2GameTeamId === winnerTeam,
      ),
      "winner not found in round 2",
    );
    const semiOfWinner = advanced.find(
      (m) =>
        m.slot1GameTeamId === winnerTeam || m.slot2GameTeamId === winnerTeam,
    );
    if (semiOfWinner) {
      const code = await codeOf(semiOfWinner);
      const card = page
        .locator("li")
        .filter({ hasText: new RegExp(`^${code}`) });
      await scrollTo(page, card);
      await highlight(page, card);
      const both = semiOfWinner.slot1GameTeamId && semiOfWinner.slot2GameTeamId;
      await say(
        page,
        "VIEW",
        both
          ? `${code}: the Bye team now meets the ${normalCode} winner`
          : `${code}: winner placed, waiting on the other side`,
        2500,
      );
      await shot(page, "ko-03-winner-advanced");
    }

    const levelCode = await codeOf(level);
    await say(
      page,
      "API",
      `${levelCode}: players enter 6-3 then 3-6, one Set each: a level Knockout Match`,
      1500,
    );
    await scoreMatch(
      game.id,
      level.id,
      [
        [6, 3],
        [3, 6],
      ],
      false,
    );
    await reload(page);
    const levelCard = page
      .locator("li")
      .filter({ hasText: new RegExp(`^${levelCode}`) });
    await scrollTo(page, levelCard);
    await highlight(page, levelCard);
    await expectText(
      page,
      `${levelCode} shows "Add a deciding Set"`,
      "Add a deciding Set",
    );
    const levelRow = await matchById(level.id);
    expectValue(
      `${levelCode} level Match not completed`,
      levelRow.status !== "completed",
      `status ${levelRow.status}`,
    );
    await say(
      page,
      "VIEW",
      `${levelCode} is level: "Add a deciding Set". Nobody advances`,
      3000,
    );
    await shot(page, "ko-03-level-match");

    const levelSlot1Wins: [number, number][] = [[6, 4]];
    await say(
      page,
      "API",
      `${levelCode}: players add a deciding Set 6-4 and confirm`,
      1500,
    );
    const deciding = await addSet(db, {
      gameId: game.id,
      matchId: level.id,
      userId: (await teamPlayers(level.slot1GameTeamId))[0]!.id,
    });
    await scoreSet(db, {
      gameId: game.id,
      matchId: level.id,
      setId: deciding.id,
      userId: (await teamPlayers(level.slot1GameTeamId))[0]!.id,
      slot1GamesWon: levelSlot1Wins[0]![0],
      slot2GamesWon: levelSlot1Wins[0]![1],
    });
    await confirmAll(game.id, level.id);
    await reload(page);
    await scrollTo(page, levelCard);
    await highlight(page, levelCard);
    await expectText(page, `${levelCode} now has a winner`, /^won$/);
    const levelAfter = await matchById(level.id);
    expectValue(
      `${levelCode} completes after the deciding Set (3 Sets)`,
      levelAfter.status === "completed" &&
        (await matchSetCount(level.id)) === 3,
      `status ${levelAfter.status}`,
    );
    await say(
      page,
      "VIEW",
      `${levelCode} completes and its winner advances`,
      2500,
    );
    await scrollTo(
      page,
      page.getByRole("heading", { name: /^Semi-finals$/ }),
      "start",
    );
    await say(page, "VIEW", "Both Semi-finals are now set");
    await shot(page, "ko-03-semis-set");

    // Home and My Games while Sam's team waits in a Semi-final.
    await say(page, "UI", "Sam goes to Home");
    await goto(page, "/dashboard");
    const homeRow = page.getByText(/Semi-final/).first();
    const homeOk = await expectText(
      page,
      "Home lists Sam's Knockout Match labelled Semi-final",
      /Semi-final/,
      15_000,
    );
    if (homeOk) {
      await scrollTo(page, homeRow);
      await highlight(
        page,
        homeRow.locator("xpath=ancestor::*[self::a or self::li][1]"),
      );
    }
    await say(
      page,
      "VIEW",
      "Home: Sam's next Knockout Match, labelled with the Knockout round",
      3000,
    );
    await shot(page, "ko-03-home-semi-final", false);
    await say(page, "UI", "Sam opens My Games");
    await goto(page, "/dashboard/games");
    const gamesOk = await expectText(
      page,
      "My Games lists the Semi-final row",
      /Semi-final/,
      15_000,
    );
    if (gamesOk) {
      const row = page.getByText(/Semi-final/).first();
      await scrollTo(page, row);
      await highlight(
        page,
        row.locator("xpath=ancestor::*[self::a or self::li][1]"),
      );
    }
    await say(page, "VIEW", "My Games: the Semi-final row", 3000);
    await shot(page, "ko-03-my-games-semi-final", false);

    await goto(page, path);
    const semis = (await knockoutMatches(game.id)).filter(
      (m) => m.knockoutRound === 2,
    );
    const samSemi = semis.find(
      (m) => m.slot1GameTeamId === samTeam || m.slot2GameTeamId === samTeam,
    )!;
    const otherSemi = semis.find((m) => m.id !== samSemi.id)!;
    const otherCode = await codeOf(otherSemi);
    const otherCard = page
      .locator("li")
      .filter({ hasText: new RegExp(`^${otherCode}`) });
    await scrollTo(page, otherCard);
    await highlight(page, otherCard);
    await say(
      page,
      "VIEW",
      `${otherCode} cannot be played: the Organizer cancels it`,
    );
    await say(page, "UI", `Organizer clicks Cancel Match on ${otherCode}`);
    await click(
      page,
      otherCard.getByRole("button", { name: /^cancel match$/i }),
    );
    await expectText(
      page,
      "Walkover dialog asks who goes through",
      "Goes through",
    );
    await say(
      page,
      "VIEW",
      "The dialog asks which team goes through; no Rating changes",
      2500,
    );
    const throughName = await teamName(otherSemi.slot2GameTeamId);
    await say(page, "UI", `Organizer picks ${throughName} and confirms`);
    await click(
      page,
      page.getByRole("dialog").getByRole("radio", { name: throughName }),
    );
    await shot(page, "ko-03-walkover-dialog", false);
    await click(
      page,
      page.getByRole("dialog").getByRole("button", { name: /^cancel match$/i }),
    );
    await page.waitForTimeout(2000);
    await settle(page);
    await scrollTo(page, otherCard);
    await highlight(page, otherCard);
    await expectText(page, "Tree shows Walkover tag", /^Walkover$/);
    const woRow = await matchById(otherSemi.id);
    expectValue(
      "Walkover stored on the cancelled Match",
      woRow.status === "cancelled" &&
        woRow.walkoverGameTeamId === otherSemi.slot2GameTeamId,
      `status ${woRow.status} walkover ${woRow.walkoverGameTeamId}`,
    );
    await say(
      page,
      "VIEW",
      `${otherCode} shows Walkover and ${throughName} goes to the Final`,
      3000,
    );
    await shot(page, "ko-03-walkover");

    const samSemiCode = await codeOf(samSemi);
    const samSemiSets = straightSets(winnerSlot(samSemi));
    await say(
      page,
      "API",
      `${samSemiCode}: Sam's team wins ${setsLine(samSemiSets)}, everyone confirms`,
      1500,
    );
    await scoreMatch(game.id, samSemi.id, samSemiSets);
    await reload(page);
    await scrollTo(
      page,
      page.getByRole("heading", { name: /^Final$/ }),
      "start",
    );
    await say(page, "VIEW", "The Final is set");
    const final = (await knockoutMatches(game.id)).find(
      (m) => m.knockoutRound === 3,
    )!;
    const finalSets = straightSets(winnerSlot(final));
    await say(
      page,
      "API",
      `Final: ${await teamName(winnerSlot(final) === 1 ? final.slot1GameTeamId : final.slot2GameTeamId)} win ${setsLine(finalSets)}; players submit and confirm`,
      1500,
    );
    await scoreMatch(game.id, final.id, finalSets);
    await reload(page);
    await scrollTo(
      page,
      page.getByRole("heading", { name: /^Final$/ }),
      "start",
    );
    await expectText(page, "Final shows the Champion tag", /^Champion$/);
    await say(
      page,
      "VIEW",
      "The Final's winner is tagged Champion in the tree",
      2500,
    );
    await shot(page, "ko-03-champion-tree");
    await scrollTop(page);
    await expectText(
      page,
      "Tournament home shows Champion line",
      /^Champion: /,
    );
    await highlight(page, page.getByText(/^Champion: /));
    await say(
      page,
      "VIEW",
      "Tournament home: Champion: Sam Rivera / Omar Aziz",
      3000,
    );
    await shot(page, "ko-03-champion-home", false);
    await tour(page, 300, 700);

    const undo = page.getByRole("button", { name: /^undo the draw$/i });
    if (await undo.isVisible().catch(() => false)) {
      await scrollTo(page, undo);
      await highlight(page, undo);
      await say(
        page,
        "VIEW",
        "'Undo the draw' is still offered after the Final was played",
      );
      await say(page, "UI", "Organizer tries it");
      await click(page, undo);
      await click(page, page.getByRole("button", { name: /^undo draw$/i }));
      await page.waitForTimeout(2000);
      const refused = page.getByText(/cannot undo/i);
      await expectText(
        page,
        "Undo after play is refused with a message",
        /cannot undo/i,
      );
      await scrollTo(page, refused);
      await highlight(page, refused);
      await say(
        page,
        "VIEW",
        `Refused: "${(
          await refused
            .first()
            .innerText()
            .catch(() => "")
        ).trim()}"`,
        3000,
      );
      await shot(page, "ko-03-undo-after-play-refused", false);
      const still = await db.query.games.findFirst({
        where: eq(games.id, game.id),
      });
      expectValue(
        "Tree kept after refused undo",
        Boolean(still?.drawPostedAt),
        "draw was undone",
      );
    }
  },
};

const flowCreateGroupsThenKnockout: Flow = {
  name: "ko-04-groups-then-knockout-create-and-draw",
  run: async (page, ctx) => {
    await createStepsOneTwo(page);
    await scrollTo(page, page.locator("#tournament-team-count"));
    await say(page, "UI", "Plans 12 Game teams");
    const teams = await setStepper(
      page,
      "tournament-team-count",
      12,
      "Fewer Game teams",
      "More Game teams",
    );
    expectValue("Game teams stepper set to 12", teams === 12, `got ${teams}`);
    await click(page, page.getByRole("button", { name: /^continue/i }));
    await settle(page);

    await say(page, "UI", "Picks Format: Groups, then knockout");
    await click(page, radio(page, /groups, then knockout/i));
    await scrollTo(page, page.locator("#tournament-pool-count"));
    await say(page, "UI", "Sets 3 groups");
    const pools = await setStepper(
      page,
      "tournament-pool-count",
      3,
      "Fewer groups",
      "More groups",
    );
    expectValue("Groups stepper set to 3", pools === 3, `got ${pools}`);
    await scrollTo(page, page.locator("#tournament-qualifiers-per-pool"));
    await say(page, "UI", "Through from each group: 2");
    const through = await setStepper(
      page,
      "tournament-qualifiers-per-pool",
      2,
      "Fewer teams through",
      "More teams through",
    );
    expectValue("Through from each group = 2", through === 2, `got ${through}`);
    await expectText(
      page,
      "Consequence line: 6 teams into the knockout, 2 byes",
      /6 teams into the knockout, 2 byes/,
    );
    await highlight(page, page.getByText(/into the knockout/));
    await say(page, "VIEW", "6 teams into the knockout, 2 byes", 2500);
    await shot(page, "ko-04-through-from-each-group", false);

    await say(page, "UI", "Picks a day, 9:00 to 3:00 PM, 30 min games");
    await pickDayAndTime(page, /^3:00/);
    await tour(page);
    await say(
      page,
      "VIEW",
      "Day-fit includes the Pool Rounds and the Knockout rounds",
    );
    await shot(page, "ko-04-step3-schedule", false);
    await click(page, page.getByRole("button", { name: /^continue/i }));
    await settle(page);
    await say(page, "UI", `Names it "${GK_NAME}"`);
    await page.locator("#tournament-name").fill(GK_NAME);
    await page.waitForTimeout(600);
    await scrollTo(page, page.getByText(/onward/), "center");
    await expectText(
      page,
      "Review Knockout row mentions top two and byes",
      /onward/,
    );
    await highlight(page, page.getByText(/onward/));
    await say(
      page,
      "VIEW",
      "Review: Knockout row for Groups, then knockout",
      2500,
    );
    await shot(page, "ko-04-review", false);
    await say(page, "UI", "Organizer clicks Create tournament");
    await click(
      page,
      page.getByRole("button", { name: /^create tournament$/i }),
    );
    await page.waitForURL(/\/dashboard\/games\/[0-9a-f-]{36}/, {
      timeout: 30_000,
    });
    await settle(page);
    const game = await latestGame(GK_NAME);
    expectValue(
      "Stored shape groups_then_knockout, 3 pools, 2 through",
      game?.tournamentShape === "groups_then_knockout" &&
        game.poolCount === 3 &&
        game.qualifiersPerPool === 2,
      `shape ${game?.tournamentShape} pools ${game?.poolCount} q ${game?.qualifiersPerPool}`,
    );
    if (!game) throw new Error("Not created");

    await say(
      page,
      "API",
      "12 pairs register as complete Game teams (Sam + Omar among them)",
      1200,
    );
    await registerPairs(game.id, ctx.users, GK_PAIRS);
    await reload(page);
    await say(page, "VIEW", "12 complete Game teams");
    await tour(page, 400, 500);
    const entry = page.getByRole("button", { name: /^open the draw$/i });
    await scrollTo(page, entry);
    await say(
      page,
      "UI",
      "Organizer opens the draw and clicks Draw the groups",
    );
    await click(page, entry);
    await click(page, page.getByRole("button", { name: /^draw the groups$/i }));
    await page.waitForTimeout(1500);
    await say(page, "VIEW", "Drafted groups", 2500);
    await shot(page, "ko-04-draft-1", false);
    await say(page, "UI", "Organizer clicks Draw again (re-roll)");
    await click(page, page.getByRole("button", { name: /^draw again$/i }));
    await page.waitForTimeout(1500);
    await say(page, "VIEW", "A new draft", 2000);
    await say(page, "UI", "Organizer clicks Post the group draw");
    await click(
      page,
      page.getByRole("button", { name: /^post the group draw$/i }),
    );
    await page.waitForTimeout(2500);
    await settle(page);
    await scrollTop(page);
    await say(
      page,
      "VIEW",
      "Posted: three Pool tables, then the Knockout with placeholders",
    );
    await expectText(page, "Knockout section heading", /^Knockout$/);
    await expectText(page, "Qualifier placeholder like A1", /^[ABC][12]$/);
    await expectText(page, "Winner of placeholder", /^Winner of Q\d$/);
    await expectText(page, "Byes to Pool winners", /^Bye$/);
    await tour(page, 300, 800);
    const knockout = page.locator("#tournament-knockout-heading");
    await scrollTo(page, knockout, "start");
    await say(
      page,
      "VIEW",
      "Knockout tree: A1/B1 Byes, cross-group Quarter-finals, 'Winner of' places",
      3000,
    );
    await shot(page, "ko-04-posted-placeholders");
    const rows = await knockoutMatches(game.id);
    expectValue(
      "5 Knockout Matches created at post",
      rows.length === 5,
      `rows ${rows.length}`,
    );
  },
};

/** Click through every Pool table tab so the video shows all groups. */
async function showPoolTabs(page: Page, ms = 1300) {
  const tabs = page.getByRole("tab", { name: /^group [a-z]$/i });
  const count = await tabs.count();
  if (count === 0) return;
  await scrollTo(page, tabs.first(), "start");
  for (let i = 0; i < count; i += 1) {
    await tabs.nth(i).click();
    await page.waitForTimeout(ms);
  }
}

const flowGroupsThenKnockoutPlay: Flow = {
  name: "ko-05-groups-then-knockout-play",
  run: async (page, ctx) => {
    const sam = need(ctx.users, "samrivera");
    const game = await ensureTournament(
      GK_NAME,
      "groups_then_knockout",
      ctx.groupId,
      ctx.users,
    );
    await registerPairs(game.id, ctx.users, GK_PAIRS);
    await ensurePosted(game.id, sam.id);
    const samTeam = await teamIdOf(game.id, sam.id);
    const path = `/dashboard/games/${game.id}`;
    await goto(page, path);
    await say(page, "VIEW", `${GK_NAME}: groups posted, nothing played`);

    const teams = await db.query.gameTeams.findMany({
      where: eq(gameTeams.gameId, game.id),
    });
    // Strength decides every Pool Match. Sam's team is made third in its group so it misses the knockout.
    const strength = new Map<string, number>();
    const byPool = new Map<number, typeof teams>();
    for (const team of teams) {
      const pool = team.poolIndex ?? 0;
      byPool.set(pool, [...(byPool.get(pool) ?? []), team]);
    }
    for (const poolTeams of byPool.values()) {
      const ordered = [...poolTeams].sort(
        (a, b) => (a.sideIndex ?? 0) - (b.sideIndex ?? 0),
      );
      const samIndex = ordered.findIndex((team) => team.id === samTeam);
      if (samIndex >= 0) {
        const [samRow] = ordered.splice(samIndex, 1);
        ordered.splice(2, 0, samRow!);
      }
      ordered.forEach((team, index) => strength.set(team.id, 10 - index));
    }
    const pool = await poolMatches(game.id);
    const rounds = [...new Set(pool.map((m) => m.roundNumber))].sort(
      (a, b) => (a ?? 0) - (b ?? 0),
    );
    const lastPool = pool.at(-1)!;
    for (const round of rounds) {
      const inRound = pool.filter(
        (m) => m.roundNumber === round && m.id !== lastPool.id,
      );
      if (inRound.length === 0) continue;
      await say(
        page,
        "API",
        `Pool Round ${round}: ${inRound.length} Matches scored and confirmed by their players`,
        1200,
      );
      for (const match of inRound) {
        const winner =
          (strength.get(match.slot1GameTeamId ?? "") ?? 0) >
          (strength.get(match.slot2GameTeamId ?? "") ?? 0)
            ? 1
            : 2;
        await scoreMatch(game.id, match.id, straightSets(winner));
      }
      await reload(page);
      await scrollTop(page);
      await say(page, "VIEW", `Pool tables after Round ${round}`, 800);
      await showPoolTabs(page);
      await scrollTop(page);
    }
    const knockoutBefore = await knockoutMatches(game.id);
    expectValue(
      "No qualifier placed before the last Pool Match settles",
      knockoutBefore.every(
        (m) =>
          m.knockoutRound !== 1 ||
          (m.slot1GameTeamId == null && m.slot2GameTeamId == null),
      ),
      "a first-round slot was filled early",
    );
    const knockout = page.locator("#tournament-knockout-heading");
    await scrollTo(page, knockout, "start");
    await say(
      page,
      "VIEW",
      "One Pool Match left: the tree still shows A1 / B2 placeholders",
      2500,
    );
    await shot(page, "ko-05-before-last-pool-match");

    const lastWinner =
      (strength.get(lastPool.slot1GameTeamId ?? "") ?? 0) >
      (strength.get(lastPool.slot2GameTeamId ?? "") ?? 0)
        ? 1
        : 2;
    await say(page, "API", "The last Pool Match is scored and confirmed", 1500);
    await scoreMatch(game.id, lastPool.id, straightSets(lastWinner));
    await reload(page);
    await scrollTo(page, knockout, "start");
    const after = await knockoutMatches(game.id);
    const placed = after.filter(
      (m) => m.slot1GameTeamId ?? m.slot2GameTeamId,
    ).length;
    expectValue(
      "Qualifiers placed automatically after the last Pool Match",
      placed >= 3,
      `matches with a team: ${placed}`,
    );
    await expectText(
      page,
      "Did-not-go-through line for Sam's team",
      "Your team did not go through. The tournament is over for your team.",
    );
    await highlight(page, page.getByText(/did not go through/));
    await say(
      page,
      "VIEW",
      "Qualifiers dropped in automatically; Byes to group winners. Sam's team (3rd) did not go through",
      3500,
    );
    await shot(page, "ko-05-qualifiers-placed");
    const byeSlots = after
      .filter((m) => m.knockoutRound === 2)
      .flatMap((m) => [
        { team: m.slot1GameTeamId, pool: m.slot1SourcePoolPosition },
        { team: m.slot2GameTeamId, pool: m.slot2SourcePoolPosition },
      ])
      .filter((slot) => slot.pool != null);
    expectValue(
      "Byes go to Pool winners (second-round sources are position 1)",
      byeSlots.length === 2 &&
        byeSlots.every((slot) => slot.pool === 1 && slot.team != null),
      JSON.stringify(byeSlots),
    );
    const firstRound = after.filter((m) => m.knockoutRound === 1);
    expectValue(
      "No first-round Match pairs two teams from the same Pool",
      firstRound.every(
        (m) => m.slot1SourcePoolIndex !== m.slot2SourcePoolIndex,
      ),
      JSON.stringify(
        firstRound.map((m) => [m.slot1SourcePoolIndex, m.slot2SourcePoolIndex]),
      ),
    );
    await scrollTop(page);
    await say(
      page,
      "VIEW",
      "Final Pool tables: top two in each group went through",
      800,
    );
    await showPoolTabs(page, 1600);
    await scrollTo(page, knockout, "start");
    await tour(page, 280, 900);

    const roundCount = await knockoutRoundCount(game.id);
    for (let round = 1; round <= roundCount; round += 1) {
      const inRound = (await knockoutMatches(game.id)).filter(
        (m) =>
          m.knockoutRound === round &&
          m.status !== "completed" &&
          m.status !== "cancelled",
      );
      const name =
        round === roundCount
          ? "Final"
          : round === roundCount - 1
            ? "Semi-finals"
            : "Quarter-finals";
      for (const match of inRound) {
        const code = await codeOf(match);
        const sets = straightSets(round % 2 === 1 ? 1 : 2);
        await say(
          page,
          "API",
          `${code}: players submit ${setsLine(sets)} and confirm`,
          1000,
        );
        await scoreMatch(game.id, match.id, sets);
      }
      await reload(page);
      const heading = page.getByRole("heading", {
        name: new RegExp(`^${name}$`),
      });
      await scrollTo(page, heading, "start");
      await say(page, "VIEW", `${name} played; winners advance`, 2500);
    }
    await expectText(page, "Champion tag in the Final", /^Champion$/);
    await shot(page, "ko-05-champion-tree");
    await scrollTop(page);
    await expectText(page, "Champion line on tournament home", /^Champion: /);
    await highlight(page, page.getByText(/^Champion: /));
    await say(page, "VIEW", "The tournament has a Champion", 3000);
    await shot(page, "ko-05-champion-home", false);
    await tour(page, 350, 600);
  },
};

const FLOWS: Flow[] = [
  flowCreateKnockoutOnly,
  flowKnockoutDrawAndPost,
  flowKnockoutPlay,
  flowCreateGroupsThenKnockout,
  flowGroupsThenKnockoutPlay,
];

// ---------------------------------------------------------------------------

async function authState(browser: Browser) {
  const username = process.env.RECORD_USERNAME;
  const password = process.env.RECORD_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "Set RECORD_USERNAME and RECORD_PASSWORD for the `me` persona.",
    );
  }
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await signIn(page, username, password);
  await context.storageState({ path: AUTH_STATE });
  await context.close();
  return AUTH_STATE;
}

/**
 * Shows the frame `reload` stored in sessionStorage until the recorder
 * releases it: the dev Clerk handshake can redirect once more, and hydration
 * can drop foreign nodes. Plain JS, because tsx would wrap named functions in
 * a helper the page does not have.
 */
const FREEZE_INIT_SCRIPT = `
(function () {
  var src = sessionStorage.getItem("ko-freeze");
  if (!src) return;
  var img = document.createElement("img");
  img.id = "ko-freeze";
  img.src = src;
  img.setAttribute("aria-hidden", "true");
  img.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483646;pointer-events:none;";
  window.koFreezeHold = true;
  function attach() {
    if (window.koFreezeHold && !img.isConnected && document.documentElement) {
      document.documentElement.appendChild(img);
    }
  }
  attach();
  new MutationObserver(attach).observe(document, { childList: true, subtree: true });
})();
`;

/** Compile the routes once off camera so the videos show no dev skeletons. */
async function warmUp(browser: Browser, storageState: string) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState,
  });
  const page = await context.newPage();
  const someGame = await db.query.games.findFirst({
    where: eq(games.name, "Friday Cup"),
  });
  for (const path of [
    "/dashboard",
    "/dashboard/games",
    "/dashboard/games/new",
    "/dashboard/games/new?type=friendly_tournament&step=2",
    ...(someGame ? [`/dashboard/games/${someGame.id}`] : []),
  ]) {
    await page.goto(`${BASE_URL}${path}`).catch(() => undefined);
    await settle(page);
  }
  await context.close();
}

function toMp4(webm: string, mp4: string) {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      webm,
      "-vf",
      "fps=15,scale=430:-2",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "28",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      mp4,
    ],
    { stdio: "inherit" },
  );
}

async function main() {
  assertLocalDatabase();
  await mkdir(RAW_DIR, { recursive: true });
  const only = process.env.RECORD_ONLY?.split(",").map((s) => s.trim());
  const { groupId, users } = await ensureKnockoutGroup();
  const browser = await chromium.launch({
    headless: process.env.RECORD_HEADED !== "1",
  });
  const storageState = await authState(browser);
  if (process.env.RECORD_SKIP_WARMUP !== "1")
    await warmUp(browser, storageState);

  for (const flow of FLOWS) {
    if (only && !only.some((o) => flow.name.startsWith(o) || flow.name === o)) {
      continue;
    }
    currentFlow = flow.name;
    console.log(`- ${flow.name}`);
    const context = await browser.newContext({
      viewport: VIEWPORT,
      storageState,
      recordVideo: { dir: RAW_DIR, size: VIEWPORT },
    });
    await context.addInitScript({ content: FREEZE_INIT_SCRIPT });
    await context.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.addEventListener("DOMContentLoaded", () =>
        document.head.append(style),
      );
    });
    const page = await context.newPage();
    page.on("load", () => void paintCaption(page));
    try {
      await flow.run(page, { groupId, users });
      await say(page, "VIEW", "End of flow", 1200);
    } catch (error) {
      const message = (error as Error).message.split("\n")[0] ?? "";
      checks.push({
        flow: flow.name,
        step: "flow ran to the end",
        ok: false,
        note: message,
      });
      console.error(`    failed: ${(error as Error).message}`);
      await shot(page, `FAIL-${flow.name}-crash`).catch(() => undefined);
    }
    const video = page.video();
    await context.close();
    if (video) {
      const webm = join(RAW_DIR, `${flow.name}.webm`);
      await rm(webm, { force: true });
      await rename(await video.path(), webm);
      const mp4 = join(OUT_DIR, `${flow.name}.mp4`);
      toMp4(webm, mp4);
      const size = (await stat(mp4)).size;
      console.log(`    video ${mp4} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    }
  }

  await browser.close();
  console.log("\nChecks:");
  for (const check of checks) {
    console.log(
      `  ${check.ok ? "PASS" : "FAIL"}  ${check.flow}  ${check.step}${check.note ? `  (${check.note})` : ""}`,
    );
  }
  console.log(`\nVideos and screenshots in ${OUT_DIR}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
