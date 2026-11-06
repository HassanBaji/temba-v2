import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Db } from "@repo/db";
import {
  GameFormatEnum,
  games,
  groups,
  GroupTypeEnum,
  notifications,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { recordJobs } from "#src/jobs/job-sink.test-support";
import { notificationEmailJob } from "#src/jobs/specs";
import { recordEmails } from "#src/notifications/email/recording.test-support";
import { notify } from "#src/notifications/notify";

import { handle } from "./notification.email";

const ORIGIN = "https://temba.example";

async function insertUser(
  database: TestDatabase,
  args: {
    name: string;
    email?: string | null;
    emailVerified?: boolean;
    emailNotifications?: boolean;
  },
) {
  const [row] = await database
    .insert(user)
    .values({
      name: args.name,
      email: args.email === undefined ? `${args.name}@example.com` : args.email,
      phoneNumber: `+9733${Math.floor(Math.random() * 1e7)
        .toString()
        .padStart(7, "0")}`,
      emailVerified: args.emailVerified ?? true,
      emailNotifications: args.emailNotifications ?? true,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({ name: "Night Crew", type: GroupTypeEnum.PUBLIC, createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row.id;
}

async function insertGame(
  database: TestDatabase,
  args: { createdBy: string; groupId: string },
) {
  const [venue] = await database
    .insert(venues)
    .values({ name: "Venue", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const [row] = await database
    .insert(games)
    .values({
      name: "Thursday Padel",
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId: venue.id,
      createdBy: args.createdBy,
      groupId: args.groupId,
      windowStart: new Date("2026-10-08T17:00:00.000Z"),
    })
    .returning({ id: games.id });
  if (!row) {
    throw new Error("Failed to insert game");
  }
  return row.id;
}

async function insertJoined(
  database: TestDatabase,
  args: { recipient: string; actor: string; groupId: string },
) {
  const [row] = await database
    .insert(notifications)
    .values({
      recipientUserId: args.recipient,
      type: "group_member_joined",
      actorUserId: args.actor,
      groupId: args.groupId,
    })
    .returning({ id: notifications.id });
  if (!row) {
    throw new Error("Failed to insert notification");
  }
  return row.id;
}

async function emailedAt(database: TestDatabase, id: string) {
  const row = await database.query.notifications.findFirst({
    where: eq(notifications.id, id),
    columns: { emailedAt: true },
  });
  return row?.emailedAt ?? null;
}

function asDb(database: TestDatabase) {
  return database as unknown as Db;
}

async function withScene(
  run: (
    db: TestDatabase,
    scene: { approver: string; joiner: string; groupId: string },
  ) => Promise<void>,
  approver: Parameters<typeof insertUser>[1] = { name: "approver" },
) {
  const { db, close } = await createPgliteDb();
  try {
    const approverId = await insertUser(db, approver);
    const joiner = await insertUser(db, { name: "joiner" });
    const groupId = await insertGroup(db, approverId);
    await run(db, { approver: approverId, joiner, groupId });
  } finally {
    await close();
  }
}

describe("notification.email", () => {
  const emails = recordEmails();
  const jobs = recordJobs();

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("emails the recipient's verified address and stamps the row", async () => {
    vi.stubEnv("WEB_ORIGIN", ORIGIN);
    await withScene(async (db, scene) => {
      const id = await insertJoined(db, {
        recipient: scene.approver,
        actor: scene.joiner,
        groupId: scene.groupId,
      });
      const now = new Date("2026-10-08T12:00:00.000Z");

      await handle(asDb(db), { notificationId: id }, undefined, now);

      expect(emails.sent).toHaveLength(1);
      expect(emails.sent[0]).toMatchObject({
        to: "approver@example.com",
        subject: "joiner joined Night Crew",
        idempotencyKey: notificationEmailJob(id).key,
      });
      expect(emails.sent[0]?.html).toContain(
        `href="${ORIGIN}/dashboard/groups/${scene.groupId}"`,
      );
      expect(emails.sent[0]?.text).toContain(
        `${ORIGIN}/dashboard/you/settings`,
      );
      expect(await emailedAt(db, id)).toEqual(now);
    });
  });

  it("emails the Game page for a Game Notification written by notify()", async () => {
    vi.stubEnv("WEB_ORIGIN", ORIGIN);
    await withScene(async (db, scene) => {
      const gameId = await insertGame(db, {
        createdBy: scene.approver,
        groupId: scene.groupId,
      });
      await notify(db, {
        type: "game_finished",
        recipients: [{ userId: scene.approver, audience: "admin" }],
        excludeUserIds: [],
        gameId,
        groupId: scene.groupId,
        dedupeKey: `game_finished:${gameId}`,
      });
      const [job] = jobs.added;
      if (!job) {
        throw new Error("Expected notify() to enqueue the email Job");
      }

      await handle(asDb(db), job.payload as { notificationId: string });

      expect(emails.sent).toHaveLength(1);
      expect(emails.sent[0]).toMatchObject({
        subject: "Thursday Padel has finished",
        idempotencyKey: job.key,
      });
      expect(emails.sent[0]?.html).toContain("Every Match is in.");
      expect(emails.sent[0]?.html).toContain("In Night Crew");
      expect(emails.sent[0]?.html).toContain(
        `href="${ORIGIN}/dashboard/games/${gameId}"`,
      );
    });
  });

  it("sends nothing twice: a stamped row completes without an email", async () => {
    await withScene(async (db, scene) => {
      const id = await insertJoined(db, {
        recipient: scene.approver,
        actor: scene.joiner,
        groupId: scene.groupId,
      });
      const stamped = new Date("2026-10-01T00:00:00.000Z");
      await db
        .update(notifications)
        .set({ emailedAt: stamped })
        .where(eq(notifications.id, id));

      await handle(asDb(db), { notificationId: id });

      expect(emails.sent).toEqual([]);
      expect(await emailedAt(db, id)).toEqual(stamped);
    });
  });

  it("sends nothing to a User without an email", async () => {
    await withScene(
      async (db, scene) => {
        const id = await insertJoined(db, {
          recipient: scene.approver,
          actor: scene.joiner,
          groupId: scene.groupId,
        });
        await handle(asDb(db), { notificationId: id });
        expect(emails.sent).toEqual([]);
        expect(await emailedAt(db, id)).toBeNull();
      },
      { name: "approver", email: null },
    );
  });

  it("sends nothing to an address Clerk has not verified", async () => {
    await withScene(
      async (db, scene) => {
        const id = await insertJoined(db, {
          recipient: scene.approver,
          actor: scene.joiner,
          groupId: scene.groupId,
        });
        await handle(asDb(db), { notificationId: id });
        expect(emails.sent).toEqual([]);
        expect(await emailedAt(db, id)).toBeNull();
      },
      { name: "approver", emailVerified: false },
    );
  });

  it("sends nothing while Email notifications are off", async () => {
    await withScene(
      async (db, scene) => {
        const id = await insertJoined(db, {
          recipient: scene.approver,
          actor: scene.joiner,
          groupId: scene.groupId,
        });
        await handle(asDb(db), { notificationId: id });
        expect(emails.sent).toEqual([]);
        expect(await emailedAt(db, id)).toBeNull();
      },
      { name: "approver", emailNotifications: false },
    );
  });

  it("sends nothing for a Notification the app would not show", async () => {
    await withScene(async (db, scene) => {
      const [row] = await db
        .insert(notifications)
        .values({
          recipientUserId: scene.approver,
          type: "game_finished",
          audience: "admin",
        })
        .returning({ id: notifications.id });
      if (!row) {
        throw new Error("Failed to insert notification");
      }
      await handle(asDb(db), { notificationId: row.id });
      expect(emails.sent).toEqual([]);
      expect(await emailedAt(db, row.id)).toBeNull();
    });
  });

  it("completes for a Notification that no longer exists", async () => {
    await withScene(async (db) => {
      await expect(
        handle(asDb(db), {
          notificationId: "00000000-0000-4000-8000-000000000000",
        }),
      ).resolves.toBeUndefined();
      expect(emails.sent).toEqual([]);
    });
  });

  it("leaves the row unstamped when the provider refuses the email, and logs job_failed", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    emails.result = { kind: "rejected", reason: "Invalid `to` field" };
    await withScene(async (db, scene) => {
      const id = await insertJoined(db, {
        recipient: scene.approver,
        actor: scene.joiner,
        groupId: scene.groupId,
      });

      await expect(
        handle(asDb(db), { notificationId: id }),
      ).resolves.toBeUndefined();

      expect(await emailedAt(db, id)).toBeNull();
      const logged = spy.mock.calls.map(
        ([line]) => JSON.parse(String(line)) as Record<string, unknown>,
      );
      expect(logged).toEqual([
        expect.objectContaining({
          event: "job_failed",
          name: "notification.email",
          key: notificationEmailJob(id).key,
          permanent: true,
          error: "Invalid `to` field",
        }),
      ]);
    });
  });

  it("rethrows a transport failure and leaves the row unstamped so the Job retries", async () => {
    emails.result = new Error("Resend send failed with 503");
    await withScene(async (db, scene) => {
      const id = await insertJoined(db, {
        recipient: scene.approver,
        actor: scene.joiner,
        groupId: scene.groupId,
      });

      await expect(handle(asDb(db), { notificationId: id })).rejects.toThrow(
        "503",
      );

      expect(await emailedAt(db, id)).toBeNull();
    });
  });

  it("completes without sending while no provider is configured", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    emails.result = { kind: "off" };
    await withScene(async (db, scene) => {
      const id = await insertJoined(db, {
        recipient: scene.approver,
        actor: scene.joiner,
        groupId: scene.groupId,
      });

      await handle(asDb(db), { notificationId: id });

      expect(await emailedAt(db, id)).toBeNull();
      expect(log).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
        event: "email_channel_off",
        key: notificationEmailJob(id).key,
      });
    });
  });
});
