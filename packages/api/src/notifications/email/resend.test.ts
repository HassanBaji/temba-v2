import { describe, expect, it } from "vitest";

import { createResendSender } from "./resend";

const MESSAGE = {
  to: "omar@example.com",
  subject: "Omar joined Night Crew",
  html: "<p>Omar joined Night Crew</p>",
  text: "Omar joined Night Crew",
  idempotencyKey: "notification:email:abc",
};

function transport(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
  return { calls, fetch };
}

function sender(status: number, body: unknown) {
  const t = transport(status, body);
  return {
    calls: t.calls,
    sender: createResendSender({
      apiKey: "re_test",
      from: "Temba <notifications@temba.example>",
      fetch: t.fetch,
    }),
  };
}

describe("createResendSender", () => {
  it("sends the message once under its idempotency key and reports the id", async () => {
    const { calls, sender: resend } = sender(200, { id: "msg_1" });

    await expect(resend.send(MESSAGE)).resolves.toEqual({
      kind: "sent",
      messageId: "msg_1",
    });
    expect(calls).toHaveLength(1);
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe(MESSAGE.idempotencyKey);
    expect(headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      from: "Temba <notifications@temba.example>",
      to: ["omar@example.com"],
      subject: MESSAGE.subject,
    });
  });

  it("treats a 4xx as the provider's final answer", async () => {
    const { sender: resend } = sender(422, {
      name: "validation_error",
      message: "Invalid `to` field",
    });
    await expect(resend.send(MESSAGE)).resolves.toEqual({
      kind: "rejected",
      reason: "Resend refused the email with 422: Invalid `to` field",
    });
  });

  it("throws on a 5xx so the Job retries", async () => {
    const { sender: resend } = sender(503, {});
    await expect(resend.send(MESSAGE)).rejects.toThrow("503");
  });

  it("lets a network error through", async () => {
    const resend = createResendSender({
      apiKey: "re_test",
      from: "Temba <notifications@temba.example>",
      fetch: () => Promise.reject(new Error("socket hang up")),
    });
    await expect(resend.send(MESSAGE)).rejects.toThrow("socket hang up");
  });
});
