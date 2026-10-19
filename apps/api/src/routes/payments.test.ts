import { describe, expect, it } from "vitest";

import { paymentsRoute } from "./payments";

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
  it("rejects a provider that is not the configured one", async () => {
    const res = await app.request("/webhooks/payments/other", {
      method: "POST",
      body: "{}",
    });
    expect(res.status).toBe(400);
  });
});
