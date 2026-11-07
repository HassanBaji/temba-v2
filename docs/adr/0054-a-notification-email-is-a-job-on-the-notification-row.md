# A Notification email is a Job on the Notification row, sent through one Email sender

**Status:** accepted. Spec: `.scratch/email-notifications/spec.md`. Extends ADR-0022 and ADR-0030.

Users asked to hear about their Groups and Games without opening Temba. In-app Notifications are fan-out rows written in the event's transaction (ADR-0022), and Graphile Worker is the Job queue (ADR-0030). Temba had no outbound email.

## Decision

- **Email is a channel on the Notification, not a new record.** `notify()` enqueues one `notification.email` Job per inserted row in the same transaction, keyed by the Notification id. The handler re-reads the row, decides whether to send, and stamps `emailed_at`. There is no email table, outbox or digest.
- **Only a Clerk-verified address, only while Email notifications is on.** `email_verified` comes from the Clerk webhook sync; the setting is a boolean on the User, default on.
- **One Email sender seam; Resend behind it.** Every email leaves through one interface in the API Package, chosen like the payment provider: `EMAIL_PROVIDER` from the environment, `none` by default, a test override in code. Resend was chosen for a small HTTP API, idempotency keys and a managed suppression list.
- **The User's Locale is stored.** Clients write the Locale they show; the handler renders with it, English when null. The server never infers a language from headers for email.

**Considered options.** (1) Sending inline in the procedure after commit: rejected, no retry and a slow provider lengthens every request. (2) A bundling window or daily digest: declined by the user for v1; instant delivery was chosen knowing the join volume. (3) One-click signed unsubscribe link: declined for v1 in favour of a link to Settings. (4) Postmark or SES: more setup for the same outcome at this volume. (5) Bilingual emails instead of a stored Locale: twice the length for every reader.

**Consequences.** An email exists only if its Notification committed, and the Job key makes a retry safe. Booking Notifications (TEM-370) and any future type are emailed with no new code once `notify()` writes them. Phase 7 push can hang off the same enqueue point. Bounces rely on Resend's suppression list until an inbound webhook is added. Turning the setting off does not recall Jobs already queued; the handler re-checks the setting at send time, so the window is the queue latency.
