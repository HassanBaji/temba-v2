import { afterEach, describe, expect, it, vi } from "vitest";

import { emailSender, resetEmailSender, setEmailSender } from "./index";
import { noneSender } from "./none";
import { RecordingEmailSender } from "./recording.test-support";

describe("emailSender", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetEmailSender();
  });

  it("is off until EMAIL_PROVIDER names a provider", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "");
    expect(emailSender()).toBe(noneSender);
    await expect(
      emailSender().send({
        to: "a@example.com",
        subject: "s",
        html: "h",
        text: "t",
        idempotencyKey: "k",
      }),
    ).resolves.toEqual({ kind: "off" });
  });

  it("prefers the test override", () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    const recording = new RecordingEmailSender();
    setEmailSender(recording);
    expect(emailSender()).toBe(recording);
  });

  it("refuses resend without its key and sender address", () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "Temba <notifications@temba.example>");
    expect(() => emailSender()).toThrow("RESEND_API_KEY and EMAIL_FROM");
  });

  it("builds the Resend sender once from the environment", () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Temba <notifications@temba.example>");
    expect(emailSender()).toBe(emailSender());
  });

  it("rejects a provider with no adapter", () => {
    vi.stubEnv("EMAIL_PROVIDER", "pigeon");
    expect(() => emailSender()).toThrow('"pigeon" has no adapter');
  });
});
