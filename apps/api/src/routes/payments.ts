import { receivePaymentWebhook } from "@repo/api/payments/receive-webhook";
import { Hono } from "hono";

const BOOKING_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function landingPage(deepLink: string | null) {
  const body = deepLink
    ? `<p>Returning to the app…</p><p><a href="${deepLink}">Return to the app</a></p><script>window.location.href=${JSON.stringify(deepLink)};</script>`
    : `<p>You can close this page and return to the app.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment</title><style>body{font-family:system-ui,sans-serif;background:#fff;color:#000;text-align:center;padding:48px 16px}a{display:inline-block;margin-top:16px;padding:12px 24px;border:1px solid #000;color:#000;text-decoration:none}</style></head><body>${body}</body></html>`;
}

export function paymentsRoute(options: { returnUrl: string }) {
  return new Hono()
    .post("/webhooks/payments/:provider", async (c) => {
      const receipt = await receivePaymentWebhook({
        provider: c.req.param("provider"),
        headers: c.req.raw.headers,
        body: await c.req.text(),
      });
      return c.text(receipt.reason ?? "OK", receipt.status);
    })
    .get("/payments/return", (c) => {
      const bookingId = c.req.query("bookingId");
      const deepLink =
        bookingId && BOOKING_ID.test(bookingId)
          ? `${options.returnUrl}/${bookingId}?returned=1`
          : null;
      return c.html(landingPage(deepLink));
    });
}
