import { createHmac } from "node:crypto";

import { groupMembers, groups, user } from "@repo/db/schema";
import { createPgliteDb } from "@repo/db/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const { testDbRef } = vi.hoisted(() => ({
  testDbRef: {
    current: undefined as
      | Awaited<ReturnType<typeof import("@repo/db/testing").createPgliteDb>>
      | undefined,
  },
}));

vi.mock("@repo/api/storage/s3", () => ({
  putS3Object: vi.fn(),
  deleteS3Object: vi.fn(),
}));

vi.mock("@repo/api/auth/resolve-app-user", () => ({
  resolveAppUser: async (clerkId: string) => {
    const rows = (await testDbRef.current?.db.query.user.findMany()) ?? [];
    const row = rows.find((candidate) => candidate.clerkId === clerkId);
    if (!row) throw new Error("User not found");
    return row;
  },
}));

import { createApp } from "./app";
import {
  TRPC_BODY_LIMIT_BYTES,
  TRPC_MAX_BATCH_SIZE,
  TRPC_RATE_LIMITS,
} from "./routes/trpc";
import { WEBHOOK_BODY_LIMIT_BYTES } from "./routes/webhooks";

let testDb: Awaited<ReturnType<typeof createPgliteDb>>;

beforeAll(async () => {
  testDb = await createPgliteDb();
  testDbRef.current = testDb;
});

afterAll(async () => {
  await testDb.close();
});

type AppDb = Parameters<typeof createApp>[0]["db"];

function appFor(userId: string | null, db: unknown = testDb.db) {
  return createApp({
    db: db as AppDb,
    authenticate: async () => ({
      userId,
      getPublicMetadata: async () => undefined,
    }),
    webOrigin: "http://localhost:3000",
    webhookSigningSecret: "whsec_dGVzdA==",
  });
}

function queryInput(json: unknown) {
  return encodeURIComponent(JSON.stringify({ json }));
}

function batchInput(calls: number, json: unknown) {
  return encodeURIComponent(
    JSON.stringify(
      Object.fromEntries(
        Array.from({ length: calls }, (_, index) => [index, { json }]),
      ),
    ),
  );
}

describe("health", () => {
  it("returns 200 when the database answers", async () => {
    const response = await appFor(null).request("/healthz");
    expect(response.status).toBe(200);
  });

  it("returns 503 when the database does not answer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unreachable = {
      execute: () => Promise.reject(new Error("connect ECONNREFUSED")),
    };
    const response = await appFor(null, unreachable).request("/healthz");
    expect(response.status).toBe(503);
    vi.restoreAllMocks();
  });
});

describe("security headers", () => {
  it("sets HSTS, nosniff, a deny frame policy and a referrer policy", async () => {
    const response = await appFor(null).request("/healthz");
    expect(response.headers.get("strict-transport-security")).toMatch(
      /max-age=\d+/,
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});

describe("tRPC route", () => {
  it("answers a public procedure without a session", async () => {
    const response = await appFor(null).request(
      `/api/trpc/games.inviteLinkByShortCode?input=${queryInput({ code: "nope" })}`,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { data: { json: { token: string | null } } };
    };
    expect(body.result.data.json.token).toBeNull();
  });

  it("hides the message and stack of an internal error and logs the call", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const response = await appFor("user_missing").request(
      "/api/trpc/users.home",
    );
    expect(response.status).toBe(500);
    const body = (await response.json()) as {
      error: { json: { message: string; data: Record<string, unknown> } };
    };
    expect(body.error.json.message).toBe("Something went wrong.");
    expect(body.error.json.data.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error.json.data).not.toHaveProperty("stack");
    expect(JSON.stringify(body)).not.toContain("User not found");
    expect(error).toHaveBeenCalledWith(
      "[tRPC] error",
      {
        path: "users.home",
        code: "INTERNAL_SERVER_ERROR",
        userId: "user_missing",
      },
      expect.any(Error),
    );
    vi.restoreAllMocks();
  });

  it("rejects a batch over the limit", async () => {
    const app = appFor(null);
    const paths = (count: number) =>
      Array.from({ length: count }, () => "games.previewInviteLink").join(",");
    const over = await app.request(
      `/api/trpc/${paths(TRPC_MAX_BATCH_SIZE + 1)}?batch=1&input=${batchInput(TRPC_MAX_BATCH_SIZE + 1, { token: "x" })}`,
    );
    expect(over.status).toBe(400);

    const atLimit = await app.request(
      `/api/trpc/${paths(TRPC_MAX_BATCH_SIZE)}?batch=1&input=${batchInput(TRPC_MAX_BATCH_SIZE, { token: "x" })}`,
    );
    expect(atLimit.status).toBe(200);
  });

  it("limits public invite lookups per client IP", async () => {
    const app = appFor(null);
    const lookup = (ip: string) =>
      app.request(
        `/api/trpc/groups.inviteLinkByShortCode?input=${queryInput({ code: "nope" })}`,
        { headers: { "x-forwarded-for": `203.0.113.9, ${ip}` } },
      );
    for (let call = 0; call < TRPC_RATE_LIMITS.publicLookup.limit; call += 1) {
      expect((await lookup("198.51.100.1")).status).toBe(200);
    }
    const limited = await lookup("198.51.100.1");
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);

    expect((await lookup("198.51.100.2")).status).toBe(200);
  });

  it("limits signed-out calls per client IP more tightly than a session", async () => {
    const app = appFor(null);
    const signedOut = TRPC_RATE_LIMITS.signedOut.limit;
    const headers = { "x-forwarded-for": "198.51.100.3" };
    const batch = Array.from({ length: 20 }, () => "users.home").join(",");
    for (let sent = 0; sent < signedOut; sent += 20) {
      const response = await app.request(`/api/trpc/${batch}?batch=1`, {
        headers,
      });
      expect(response.status).not.toBe(429);
    }
    const limited = await app.request("/api/trpc/users.home", { headers });
    expect(limited.status).toBe(429);

    const claims = Buffer.from(JSON.stringify({ sub: "user_x" })).toString(
      "base64url",
    );
    const withSession = await app.request("/api/trpc/users.home", {
      headers: { ...headers, authorization: `Bearer h.${claims}.s` },
    });
    expect(withSession.status).not.toBe(429);
  });

  it("answers a public procedure that reads the database without a session", async () => {
    const input = encodeURIComponent(
      JSON.stringify({ json: { token: "unknown-token" } }),
    );
    const response = await appFor(null).request(
      `/api/trpc/games.previewInviteLink?input=${input}`,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { data: { json: { status: string } } };
    };
    expect(body.result.data.json.status).toBe("invalid");
  });

  it("returns UNAUTHORIZED from a protected procedure without a session", async () => {
    const response = await appFor(null).request("/api/trpc/users.home");
    expect(response.status).toBe(401);
    const body = (await response.json()) as {
      error: { json: { data: { code: string } } };
    };
    expect(body.error.json.data.code).toBe("UNAUTHORIZED");
  });

  it("rejects a body over the limit and accepts a 2 MB image upload body", async () => {
    const app = appFor(null);
    const oversized = await app.request("/api/trpc/users.home", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "x".repeat(TRPC_BODY_LIMIT_BYTES + 1),
    });
    expect(oversized.status).toBe(413);

    const base64Image = "A".repeat(Math.ceil((2 * 1024 * 1024 * 4) / 3));
    const upload = await app.request("/api/trpc/users.home", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ json: { image: base64Image } }),
    });
    expect(upload.status).not.toBe(413);
  });
});

describe("users router", () => {
  it("answers users.home for a seeded User", async () => {
    await testDb.db.insert(user).values({
      name: "Home",
      email: "home@example.com",
      clerkId: "user_home",
    });

    const response = await appFor("user_home").request("/api/trpc/users.home");

    expect(response.status).toBe(200);
  });
});

describe("Invite links", () => {
  it("builds a new Group Invite link on the web origin", async () => {
    const [creator] = await testDb.db
      .insert(user)
      .values({ name: "Host", email: "host@example.com", clerkId: "user_host" })
      .returning({ id: user.id });
    const [group] = await testDb.db
      .insert(groups)
      .values({ name: "Friday Night", createdBy: creator!.id })
      .returning({ id: groups.id });
    await testDb.db
      .insert(groupMembers)
      .values({ groupId: group!.id, userId: creator!.id });

    const response = await appFor("user_host").request(
      "/api/trpc/groups.createInviteLink",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ json: { groupId: group!.id } }),
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { data: { json: { inviteUrl: string } } };
    };
    expect(body.result.data.json.inviteUrl).toMatch(
      /^http:\/\/localhost:3000\//,
    );
  });
});

const WEBHOOK_SECRET = "whsec_dGVzdA==";

function signedWebhook(payload: unknown) {
  const body = JSON.stringify(payload);
  const id = `msg_${Math.random().toString(36).slice(2)}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac(
    "sha256",
    Buffer.from(WEBHOOK_SECRET.slice("whsec_".length), "base64"),
  )
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return {
    method: "POST",
    headers: {
      "svix-id": id,
      "svix-timestamp": timestamp,
      "svix-signature": `v1,${signature}`,
      "content-type": "application/json",
    },
    body,
  };
}

function clerkUserData(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    object: "user",
    username: null,
    first_name: "Dana",
    last_name: "Rowe",
    image_url: "https://img.clerk.com/photo.png",
    has_image: true,
    primary_email_address_id: "idn_email",
    primary_phone_number_id: null,
    email_addresses: [
      {
        id: "idn_email",
        email_address: `${id}@example.com`,
        verification: { status: "verified" },
      },
    ],
    phone_numbers: [],
    updated_at: 1_700_000_000_000,
    ...overrides,
  };
}

describe("webhook", () => {
  it("anonymises the User on user.deleted and ignores a late user.updated", async () => {
    const clerkId = "user_deleted_dana";
    const created = await appFor(null).request(
      "/api/webhooks",
      signedWebhook({ type: "user.created", data: clerkUserData(clerkId) }),
    );
    expect(created.status).toBe(200);

    const deleted = await appFor(null).request(
      "/api/webhooks",
      signedWebhook({
        type: "user.deleted",
        data: { id: clerkId, object: "user", deleted: true },
      }),
    );
    expect(deleted.status).toBe(200);

    const late = await appFor(null).request(
      "/api/webhooks",
      signedWebhook({
        type: "user.updated",
        data: clerkUserData(clerkId, { updated_at: 1_700_000_100_000 }),
      }),
    );
    expect(late.status).toBe(200);

    const users = await testDb.db.query.user.findMany();
    const rows = users.filter((row) => row.deletedClerkId === clerkId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      clerkId: null,
      name: "Deleted player",
      firstName: null,
      email: null,
      phoneNumber: null,
      image: null,
    });
    expect(rows[0]?.deletedAt).toBeInstanceOf(Date);
    expect(users.some((row) => row.clerkId === clerkId)).toBe(false);
  });

  it("acknowledges a payload that can never apply so it is not retried", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await appFor(null).request(
      "/api/webhooks",
      signedWebhook({
        type: "user.created",
        data: clerkUserData("user_no_identifier", {
          primary_email_address_id: null,
          email_addresses: [],
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Ignored");
    vi.restoreAllMocks();
  });

  it("rejects an oversized body before verifying it", async () => {
    const response = await appFor(null).request("/api/webhooks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "x".repeat(WEBHOOK_BODY_LIMIT_BYTES + 1),
    });
    expect(response.status).toBe(413);
  });

  it("returns 400 for a bad signature", async () => {
    const response = await appFor(null).request("/api/webhooks", {
      method: "POST",
      headers: {
        "svix-id": "msg_1",
        "svix-timestamp": String(Math.floor(Date.now() / 1000)),
        "svix-signature": "v1,invalid",
        "content-type": "application/json",
      },
      body: JSON.stringify({ type: "user.created", data: {} }),
    });
    expect(response.status).toBe(400);
  });
});
