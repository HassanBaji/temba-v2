/**
 * Walk the seeded App flows in Chromium and save one video per flow to
 * `apps/temba/recordings/`. Run after `db:seed` with the dev server up.
 *
 * Needs a browser that can reach Clerk (every page load does a Clerk
 * handshake in development). Sign-in uses the real /login form, so the
 * `me` persona must be linked to a Clerk dev User (SEED_CLERK_ID_ME) whose
 * username/password you pass here. See scripts/README.md.
 *
 *   RECORD_USERNAME=... RECORD_PASSWORD=... pnpm --filter temba record:flows
 *   RECORD_ONLY=home,games-hub   # optional subset
 */
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";

import { eq } from "drizzle-orm";
import { chromium, type Browser, type Page } from "playwright";

import { communities, games, groups, teams } from "@repo/db";

import { db } from "~/server/db";

const BASE_URL = process.env.RECORD_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(process.cwd(), "recordings");
const VIEWPORT = { width: 430, height: 932 };
const AUTH_STATE = join(OUT_DIR, ".auth-me.json");

async function idOf(
  table: typeof games | typeof groups | typeof communities | typeof teams,
  name: string,
) {
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(eq(table.name, name))
    .limit(1);
  if (!row)
    throw new Error(`Seeded row "${name}" not found — run db:seed first`);
  return row.id;
}

async function pause(page: Page, ms = 1200) {
  await page.waitForTimeout(ms);
}

/** Scroll the page top to bottom slowly so the video shows everything. */
async function tour(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await pause(page, 1500);
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 350) {
    await page.mouse.wheel(0, 350);
    await pause(page, 500);
  }
  await pause(page, 800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(page, 800);
}

async function visit(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await tour(page);
}

async function clickIfPresent(page: Page, name: RegExp) {
  const button = page.getByRole("button", { name }).first();
  if (await button.isVisible().catch(() => false)) {
    await button.click();
    await pause(page, 2000);
    return true;
  }
  console.warn(`    (no "${name.source}" button on ${page.url()})`);
  return false;
}

async function openTab(page: Page, name: RegExp) {
  const tab = page.getByRole("tab", { name }).first();
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    await tour(page);
    return;
  }
  console.warn(`    (no "${name.source}" tab on ${page.url()})`);
}

async function signIn(page: Page, username: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.locator("#sign-in-identifier").fill(username);
  await page.locator("#sign-in-password").fill(password);
  await page.locator("#sign-in-password").press("Enter");
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 });
}

type Flow = {
  name: string;
  as: "me" | "newbie" | "signed-out";
  run: (page: Page) => Promise<void>;
};

async function flows(): Promise<Flow[]> {
  const game = (name: string) => idOf(games, name);
  const ids = {
    fullGame: await game("Tuesday Ladder"),
    halfFull: await game("Friday Night Padel"),
    oneLeft: await game("Thursday Mixer"),
    levelLocked: await game("B-level Session"),
    levelRequests: await game("Intermediate Night"),
    awaitingConfirm: await game("Friday rematch"),
    unscored: await game("Yesterday's ladder"),
    finalGame: await game("Ladder round 3"),
    cancelled: await game("Rained off"),
    americano: await game("Autumn Americano"),
    openTournament: await game("Club Championship"),
    draftTournament: await game("Autumn Cup"),
    liveTournament: await game("Friday Cup"),
    ladder: await idOf(groups, "Tuesday Ladder"),
    advanced: await idOf(groups, "Advanced Squad"),
    friday: await idOf(groups, "Friday Night Padel"),
    lisbon: await idOf(communities, "Lisbon Padel Club"),
    sunset: await idOf(communities, "Sunset Social"),
    porto: await idOf(communities, "Porto Padel Collective"),
    legacy: await idOf(communities, "Old Town Padel (archived)"),
    smash: await idOf(teams, "Smash Brothers"),
    netRunners: await idOf(teams, "Net Runners"),
  };
  const gameLink = await db.query.gameInviteLinks.findFirst();
  const groupLink = await db.query.groupInviteLinks.findFirst();

  return [
    {
      name: "01-welcome-and-legal",
      as: "signed-out",
      run: async (page) => {
        await visit(page, "/");
        await visit(page, "/login");
        await visit(page, "/signup");
        await visit(page, "/terms");
      },
    },
    {
      name: "02-invite-links-signed-out",
      as: "signed-out",
      run: async (page) => {
        if (gameLink?.shortCode) await visit(page, `/g/${gameLink.shortCode}`);
        if (groupLink?.shortCode)
          await visit(page, `/gr/${groupLink.shortCode}`);
      },
    },
    {
      name: "03-onboarding-questionnaire",
      as: "newbie",
      run: async (page) => {
        await visit(page, "/onboarding");
        await clickIfPresent(page, /right/i);
        await clickIfPresent(page, /continue|next/i);
        await tour(page);
      },
    },
    {
      name: "04-home",
      as: "me",
      run: async (page) => visit(page, "/dashboard"),
    },
    {
      name: "05-games-hub",
      as: "me",
      run: async (page) => {
        await visit(page, "/dashboard/games");
        await visit(page, "/dashboard/games?tab=history");
      },
    },
    {
      name: "06-friendly-game-states",
      as: "me",
      run: async (page) => {
        await visit(page, `/dashboard/games/${ids.fullGame}`);
        await visit(page, `/dashboard/games/${ids.halfFull}`);
        await visit(page, `/dashboard/games/${ids.oneLeft}`);
        await visit(page, `/dashboard/games/${ids.finalGame}`);
        await visit(page, `/dashboard/games/${ids.cancelled}`);
      },
    },
    {
      name: "07-level-range",
      as: "me",
      run: async (page) => {
        await visit(page, `/dashboard/games/${ids.levelLocked}`);
        await visit(page, `/dashboard/games/${ids.levelRequests}`);
      },
    },
    {
      name: "08-results-and-confirmation",
      as: "me",
      run: async (page) => {
        await visit(page, `/dashboard/games/${ids.unscored}`);
        await visit(page, `/dashboard/games/${ids.awaitingConfirm}`);
        await clickIfPresent(page, /confirm/i);
        await tour(page);
      },
    },
    {
      name: "09-friendly-tournaments",
      as: "me",
      run: async (page) => {
        await visit(page, `/dashboard/games/${ids.openTournament}`);
        await visit(page, `/dashboard/games/${ids.draftTournament}`);
        await visit(page, `/dashboard/games/${ids.liveTournament}`);
      },
    },
    {
      name: "10-americano",
      as: "me",
      run: async (page) => {
        await visit(page, `/dashboard/games/${ids.americano}`);
        await visit(page, `/dashboard/games/${ids.americano}?tab=players`);
      },
    },
    {
      name: "11-create-game",
      as: "me",
      run: async (page) => {
        await visit(page, "/dashboard/games/new");
        await visit(
          page,
          `/dashboard/games/new?groupId=${ids.ladder}&type=friendly_game`,
        );
        await visit(
          page,
          `/dashboard/games/new?groupId=${ids.friday}&type=friendly_tournament`,
        );
      },
    },
    {
      name: "12-groups",
      as: "me",
      run: async (page) => {
        await visit(page, "/dashboard/groups");
        await visit(page, "/dashboard/groups?tab=public");
        await visit(page, `/dashboard/groups/${ids.ladder}`);
        await visit(page, `/dashboard/groups/${ids.ladder}?tab=games`);
        await visit(page, `/dashboard/groups/${ids.ladder}?tab=members`);
        await visit(page, `/dashboard/groups/${ids.advanced}?tab=members`);
        await visit(page, "/dashboard/groups/new");
      },
    },
    {
      name: "13-communities",
      as: "me",
      run: async (page) => {
        await visit(page, "/dashboard/communities");
        await visit(page, `/dashboard/communities/${ids.lisbon}`);
        await openTab(page, /members/i);
        await openTab(page, /teams/i);
        await openTab(page, /requests/i);
        await clickIfPresent(page, /^approve$/i);
        await visit(page, `/dashboard/communities/${ids.sunset}`);
        await visit(page, `/dashboard/communities/${ids.porto}`);
        await visit(page, `/dashboard/communities/${ids.legacy}`);
        await visit(page, "/dashboard/communities/new");
      },
    },
    {
      name: "14-teams",
      as: "me",
      run: async (page) => {
        await visit(page, "/dashboard/teams");
        await visit(page, `/dashboard/teams/${ids.smash}`);
        await visit(page, `/dashboard/teams/${ids.netRunners}`);
        await visit(page, "/dashboard/teams/new");
      },
    },
    {
      name: "15-invites-inbox",
      as: "me",
      run: async (page) => visit(page, "/dashboard/invites"),
    },
    {
      name: "16-venues-operator",
      as: "me",
      run: async (page) => {
        await visit(page, "/dashboard/venues");
        const venue = await db.query.venues.findFirst();
        if (venue) await visit(page, `/dashboard/venues/${venue.id}`);
        await visit(page, "/dashboard/venues/new");
      },
    },
    {
      name: "17-profile-and-settings",
      as: "me",
      run: async (page) => {
        await visit(page, "/dashboard/you");
        await visit(page, "/dashboard/you/settings");
      },
    },
  ];
}

async function authState(browser: Browser, persona: "me" | "newbie") {
  const prefix = persona === "me" ? "RECORD" : "RECORD_NEWBIE";
  const username = process.env[`${prefix}_USERNAME`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!username || !password) return null;
  const path =
    persona === "me" ? AUTH_STATE : join(OUT_DIR, ".auth-newbie.json");
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await signIn(page, username, password);
  await context.storageState({ path });
  await context.close();
  return path;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const only = process.env.RECORD_ONLY?.split(",").map((s) => s.trim());
  const browser = await chromium.launch({
    headless: process.env.RECORD_HEADED !== "1",
  });
  const states = {
    me: await authState(browser, "me"),
    newbie: await authState(browser, "newbie"),
    "signed-out": undefined,
  };

  for (const flow of await flows()) {
    if (
      only &&
      !only.includes(flow.name) &&
      !only.some((o) => flow.name.endsWith(o))
    ) {
      continue;
    }
    const storageState = states[flow.as];
    if (storageState === null) {
      console.log(`- ${flow.name}: skipped (no credentials for ${flow.as})`);
      continue;
    }
    console.log(`- ${flow.name}`);
    const context = await browser.newContext({
      viewport: VIEWPORT,
      storageState,
      recordVideo: { dir: OUT_DIR, size: VIEWPORT },
    });
    const page = await context.newPage();
    try {
      await flow.run(page);
    } catch (error) {
      console.error(`    failed: ${(error as Error).message}`);
    }
    const video = page.video();
    await context.close();
    if (video) {
      const target = join(OUT_DIR, `${flow.name}.webm`);
      await rm(target, { force: true });
      await rename(await video.path(), target);
    }
  }

  await browser.close();
  console.log(`\nVideos in ${OUT_DIR}`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
