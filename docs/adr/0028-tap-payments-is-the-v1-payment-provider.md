# Tap Payments is the v1 payment provider, charged immediately, behind the PaymentProvider boundary

**Status:** accepted. The boundary, the manual adapter and the payment jobs are in place; the Tap adapter is `packages/api/src/payments/tap.ts`, tested against the fixtures in `packages/api/src/payments/__fixtures__/tap/` (hand-built from Tap's documentation until test-mode captures replace them).

Tap Payments takes a Customer's money for a Booking. It is Bahrain-native, settles in BHD with three decimals (fils map exactly), takes cards and BENEFIT on one hosted page, has a Charges API (create with redirect and 3DS, retrieve, a webhook `post.url` with a signed `hashstring`) and a Refunds API, and needs no SDK: `@repo/api` calls it with plain `fetch`, and the hosted redirect works in Expo through the in-app browser.

All provider code sits behind `PaymentProvider` in `packages/api/src/payments/provider.ts`: `begin`, `retrieve`, `refund`, `verifyWebhook`. `PAYMENT_PROVIDER` (`manual` by default) picks the adapter in `paymentProvider()`. The mobile payment step keys on the `payment.kind` the API returns, not on Tap, so another provider is one adapter file and one `payment_provider` enum value.

## Immediate charge

The Customer is charged when they book. There is no authorise-then-capture: `held` is not a Payment status, `PaymentBegin` has no `held` branch and the interface has no `capture`. The hold window is ten minutes and the refund path already exists, so capturing later buys nothing and adds a state. If holds come back, both are additive.

## How a Booking is paid

`bookings.create` reserves the Court as `pending_payment` with a ten-minute hold, opens a `pending` Payment and schedules `booking.expire-hold`. With the manual adapter the Booking confirms in the same transaction. With a hosted provider a `payment.create-charge` Job creates the charge, so a slow or failing provider never holds a request open. The client polls `bookings.paymentState`, opens the redirect, and calls `bookings.confirmPayment` on return. The webhook, `payment.poll-charge` and `confirmPayment` all end in `applyChargeState`, which only moves a `pending` Payment, so whichever arrives first wins and the others are no-ops. A charge captured after the hold lapsed is refunded in full by a `payment.refund` Job.

## Considered options

1. BENEFIT Pay direct. Rejected: no cards.
2. Stripe. Rejected: no BENEFIT, and availability for a Bahrain entity is unconfirmed.
3. Checkout.com. Rejected: no BENEFIT advantage over Tap.

## Consequences

- Refunds on a Tap Payment are Jobs keyed by a `refundKey`; the adapter must make a repeated key a no-op, because Tap has no idempotency header on refunds.
- A manual Payment is never refunded by a Job. Cancelling a manually paid Booking writes `refundDueFils` and leaves the ledger `paid` until the manager records the refund.
- Webhooks are stored in `payment_webhook_deliveries` and processed by a Job, so a replayed delivery key is a no-op and nothing is lost if processing fails. Deliveries are pruned after 90 days by `booking.reconcile`.
- Tests use a scripted `FakePaymentProvider` and the recording Job sink; no test reaches a real provider.
