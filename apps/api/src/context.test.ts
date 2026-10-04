import { createSign, generateKeyPairSync } from "node:crypto";

import { createClerkClient } from "@clerk/backend";
import { describe, expect, it, vi } from "vitest";

import { clerkAuthenticator } from "./context";

const WEB = "http://localhost:3000";
const publishableKey = `pk_test_${Buffer.from("clerk.example.test$").toString("base64")}`;
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwtKey = publicKey.export({ type: "spki", format: "pem" }).toString();

function b64(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(claims: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    sub: "user_1",
    sid: "sess_1",
    iss: "https://clerk.example.test",
    nbf: now - 10,
    iat: now - 10,
    exp: now + 60,
    ...claims,
  };
  const input = `${b64({ alg: "RS256", typ: "JWT", kid: "ins_test" })}.${b64(body)}`;
  const signature = createSign("RSA-SHA256")
    .update(input)
    .sign(privateKey)
    .toString("base64url");
  return `${input}.${signature}`;
}

function setup(options: { acceptSessionCookie?: boolean } = {}) {
  const clerk = createClerkClient({ secretKey: "sk_test_x", publishableKey });
  const getUser = vi
    .spyOn(clerk.users, "getUser")
    .mockResolvedValue({ publicMetadata: { role: "operator" } } as never);
  const authenticate = clerkAuthenticator({
    secretKey: "sk_test_x",
    publishableKey,
    jwtKey,
    authorizedParties: [WEB],
    clerk,
    ...options,
  });
  return { authenticate, getUser };
}

function request(headers: Record<string, string>) {
  return new Request("http://localhost:4000/api/trpc/users.home", { headers });
}

describe("clerkAuthenticator", () => {
  it("accepts a valid bearer token", async () => {
    const { authenticate } = setup();
    const session = await authenticate(
      request({ authorization: `Bearer ${sign({ azp: WEB })}` }),
    );
    expect(session.userId).toBe("user_1");
  });

  it("accepts a token without an azp claim", async () => {
    const { authenticate } = setup();
    const session = await authenticate(
      request({ authorization: `Bearer ${sign({})}` }),
    );
    expect(session.userId).toBe("user_1");
  });

  it("rejects an expired token", async () => {
    const { authenticate } = setup();
    const past = Math.floor(Date.now() / 1000) - 3600;
    const session = await authenticate(
      request({
        authorization: `Bearer ${sign({ azp: WEB, iat: past - 60, nbf: past - 60, exp: past })}`,
      }),
    );
    expect(session.userId).toBeNull();
  });

  it("rejects a token issued to another party", async () => {
    const { authenticate } = setup();
    const session = await authenticate(
      request({
        authorization: `Bearer ${sign({ azp: "https://evil.example" })}`,
      }),
    );
    expect(session.userId).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const { authenticate } = setup();
    const token = sign({ azp: WEB });
    const session = await authenticate(
      request({ authorization: `Bearer ${token.slice(0, -4)}AAAA` }),
    );
    expect(session.userId).toBeNull();
  });

  it("rejects a request with no token", async () => {
    const { authenticate } = setup();
    expect((await authenticate(request({}))).userId).toBeNull();
  });

  it("rejects a request carrying only the session cookie", async () => {
    const { authenticate } = setup();
    const session = await authenticate(
      request({ cookie: `__session=${sign({ azp: WEB })}` }),
    );
    expect(session.userId).toBeNull();
  });

  it("accepts the session cookie when the rollback flag is on", async () => {
    const { authenticate } = setup({ acceptSessionCookie: true });
    const session = await authenticate(
      request({
        cookie: `__session=${sign({ azp: WEB })}; __clerk_db_jwt=dev; __client_uat=1`,
      }),
    );
    expect(session.userId).toBe("user_1");
  });

  it("ignores a cookie when a valid bearer token is present", async () => {
    const { authenticate } = setup();
    const session = await authenticate(
      request({
        authorization: `Bearer ${sign({ azp: WEB })}`,
        cookie: "__session=garbage",
      }),
    );
    expect(session.userId).toBe("user_1");
  });

  it("asks Clerk for the public metadata at most once per request", async () => {
    const { authenticate, getUser } = setup();
    const session = await authenticate(
      request({ authorization: `Bearer ${sign({ azp: WEB })}` }),
    );
    expect(getUser).not.toHaveBeenCalled();
    const [first, second] = await Promise.all([
      session.getPublicMetadata(),
      session.getPublicMetadata(),
    ]);
    await session.getPublicMetadata();
    expect(first).toEqual({ role: "operator" });
    expect(second).toEqual(first);
    expect(getUser).toHaveBeenCalledTimes(1);
  });
});
