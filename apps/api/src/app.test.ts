import { createPgliteDb } from "@repo/db/testing";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const { getS3Object } = vi.hoisted(() => ({ getS3Object: vi.fn() }));

vi.mock("@repo/api/storage/s3", () => ({
  getS3Object,
  putS3Object: vi.fn(),
  deleteS3Object: vi.fn(),
}));

import { createApp } from "./app";
import { TRPC_BODY_LIMIT_BYTES } from "./routes/trpc";

const GROUP_ID = "22222222-2222-4222-8222-222222222222";
const VENUE_ID = "33333333-3333-4333-8333-333333333333";

let testDb: Awaited<ReturnType<typeof createPgliteDb>>;

beforeAll(async () => {
  testDb = await createPgliteDb();
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

describe.each([
  ["group-images", GROUP_ID, "image", "group-images/" + GROUP_ID + "/image"],
  ["venue-logos", VENUE_ID, "logo", null],
])("media %s", (folder, id, leaf, key) => {
  const path = (value: string) => `/api/media/${folder}/${value}/${leaf}`;

  beforeEach(() => {
    getS3Object.mockReset();
  });

  it("returns 404 for an id that is not a UUID", async () => {
    const response = await appFor(null).request(path("not-a-uuid"));
    expect(response.status).toBe(404);
    expect(getS3Object).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown id", async () => {
    getS3Object.mockResolvedValue(null);
    const response = await appFor(null).request(path(id));
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    if (key) expect(getS3Object).toHaveBeenCalledWith(key);
  });

  it("streams a known object with a long cache header", async () => {
    const png = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d,
    ]);
    getS3Object.mockResolvedValue({ body: png, contentType: "image/png" });
    const response = await appFor(null).request(path(id));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from(png));
  });

  it("returns 502 without provider details when storage fails", async () => {
    getS3Object.mockRejectedValue(new Error("bad credentials"));
    const response = await appFor(null).request(path(id));
    expect(response.status).toBe(502);
    expect(await response.text()).toBe("");
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
