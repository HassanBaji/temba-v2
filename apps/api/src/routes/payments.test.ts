import { describe, expect, it } from "vitest";

import { paymentsRoute } from "./payments";
import { WEBHOOK_BODY_LIMIT_BYTES } from "./webhooks";

const app = paymentsRoute({ returnUrl: "temba://book/bookings" });
const ID = "11111111-1111-4111-8111-111111111111";

describe("GET /payments/return", () => {
  it("opens the deep link and offers a fallback button", async () => {
    const res = await app.request(`/payments/return?bookingId=${ID}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain(`temba://book/bookings/${ID}?returned=1`);
    expect(html).toContain("Return to the app");
  });

  it("allows only its own nonced script and cannot be framed", async () => {
    const res = await app.request(`/payments/return?bookingId=${ID}`);
    const csp = res.headers.get("content-security-policy") ?? "";
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce).toBeTruthy();
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(await res.text()).toContain(`<script nonce="${nonce}">`);
  });

  it("never reflects a bookingId that is not a uuid", async () => {
    const res = await app.request(
      `/payments/return?bookingId=${encodeURIComponent('"><script>x</script>')}`,
    );
    const html = await res.text();
    expect(html).not.toContain("<script>x");
    expect(html).not.toContain("temba://");
  });
});

describe("POST /webhooks/payments/:provider", () => {
  it("rejects an oversized body", async () => {
    const res = await app.request("/webhooks/payments/tap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "x".repeat(WEBHOOK_BODY_LIMIT_BYTES + 1),
    });
    expect(res.status).toBe(413);
  });

  it("rejects a provider that is not the configured one", async () => {
    const res = await app.request("/webhooks/payments/other", {
      method: "POST",
      body: "{}",
    });
    expect(res.status).toBe(400);
  });
});
