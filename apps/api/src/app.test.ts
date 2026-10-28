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
import { TRPC_BODY_LIMIT_BYTES } from "./routes/trpc";

let testDb: Awaited<ReturnType<typeof createPgliteDb>>;

beforeAll(async () => {
  testDb = await createPgliteDb();
  testDbRef.current = testDb;
});

afterAll(async () => {
  await testDb.close();
});

function appFor(userId: string | null) {
  return createApp({
    db: testDb.db as unknown as Parameters<typeof createApp>[0]["db"],
    authenticate: async () => ({
      userId,
      getPublicMetadata: async () => undefined,
    }),
    webOrigin: "http://localhost:3000",
    webhookSigningSecret: "whsec_dGVzdA==",
  });
}

describe("health", () => {
  it("returns 200", async () => {
    const response = await appFor(null).request("/healthz");
    expect(response.status).toBe(200);
  });
});

describe("tRPC route", () => {
  it("answers a public procedure without a session", async () => {
    const input = encodeURIComponent(
      JSON.stringify({ json: { text: "there" } }),
    );
    const response = await appFor(null).request(
      `/api/trpc/games.hello?input=${input}`,
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { data: { json: { greeting: string } } };
    };
    expect(body.result.data.json.greeting).toBe("Hello there");
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

describe("webhook", () => {
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
