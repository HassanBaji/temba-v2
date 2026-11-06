# Notification emails

Status: approved, ready for implementation. Every decision below was settled with the user on 2026-11-06; the answers are recorded in section 3.1. Tickets: section 11, in Linear as TEM-414 … TEM-417.

## 1. Problem Statement

A User hears about their Groups and Games only when they open Temba. In-app Notifications exist (ADR-0022): a bell, an unread count polled every minute, and a Notifications page. But a Group approver who has not opened the app does not learn that someone joined their Group, an Organizer does not learn that a seat opened or filled, and a player does not learn that their Game finished or that an Organizer seated them until they look. Temba has no outbound email of any kind: Clerk sends its own verification mail, and nothing else leaves the product.

## 2. Solution

Every Notification a User would see in the app also reaches their inbox, as one **Notification email** per Notification, sent moments after the event commits. The email says what the in-app row says, in the User's language, and links to the Game or Group on the Web App. It goes only to a Clerk-verified email address, and only while the User's **Email notifications** setting is on. The setting is on for everyone and lives in Settings on web and mobile, beside Seat alerts; the footer of every email points there.

Nothing changes about how Notifications are written, who receives them, or how the clients show them. Email is a second channel on the same rows.

## 3. Discovery findings

### 3.1 Answered by the user on 2026-11-06

| # | Question | Answer |
| --- | --- | --- |
| 1 | Timing: bundled, instant, daily digest or mixed | **Instant.** One email per Notification row, as it happens. |
| 2 | Default among Users with a verified email | **On by default.** One toggle in Settings on web and mobile; the email footer points there. |
| 3 | Provider | **Resend.** Domain verification is a human step (section 10). |
| 4 | Language | **Stored Locale.** The User row gains a Locale the clients keep current; English until set. |
| 5 | Which of the 7 Notification types | **All 7.** |
| 6 | Unsubscribe | **Link to Settings.** The footer links to the web Settings page; turning emails off needs a signed-in session. No one-click token link and no `List-Unsubscribe` header in v1. |
| 7 | Booking Notifications (TEM-370, unbuilt) | **Out of scope.** Once TEM-370 writes Booking Notifications through `notify()`, they are emailed by this channel with no further work. |
| 8 | Test seam | **An `EmailSender` double**, like the Job queue's `JobSink`: one interface, a Resend implementation, a recording double in tests. |

### 3.2 What exists

- **Notifications** are fan-out rows, one per recipient, written by one module (`notify()`) inside the event's transaction (ADR-0022). Seven types: `group_member_joined`, `game_player_joined`, `game_player_left`, `game_finished`, `game_seated_by_organizer`, `level_set`, `history_linked`. Audiences are resolved at write time; Unclaimed players are dropped; a Soft-archived Community produces none; a dedupe key keeps `game_finished` and `history_linked` to one row per recipient. Rows are kept 90 days.
- **Copy** for every type is a pure domain function, `notificationCopy`, returning a title in parts (names in bold) and an optional subline, in English or Arabic from the Message catalog. Both clients render from it. The Web App maps a Notification to its page (Game, Group or the Games hub History tab) in a small client helper.
- **The Job queue** is Graphile Worker on Postgres (ADR-0030). `enqueue` runs inside the caller's transaction so a Job exists only if the event commits. Handlers are plain `handle(db, payload)` functions in the API Package; the API App only boots the worker. Tests swap the SQL sink for a `RecordingJobSink`. Provider configuration follows one pattern: a module-level `setPaymentProvider` override for tests, else read from the environment.
- **Email on the User** is optional. Phone is the one sign-in door (ADR-0049); "Add and verify your email" is a Profile task done through Clerk on both clients. The Clerk `user.created` / `user.updated` webhook syncs `email` and `email_verified` onto the User row, so the API knows a User's address and whether Clerk verified it without calling Clerk.
- **Locale** is client state: a cookie on web, a stored preference on mobile with a language switch in Settings. The server never learns it. Domain copy functions take `locale` as a parameter (ADR-0052).
- **Settings** on both clients already hold a switch row (Seat alerts, saved with Play windows through `users.setPlayWindows`) and show the email address with a Verify tag.
- **No email service exists.** The AWS keys in the API environment are a Railway Bucket, not SES. The production web origin is the `WEB_ORIGIN` environment variable of the API.
- **Booking Notifications** (five types, TEM-370) were specced but not built. The booking code already enqueues a `notification.booking` Job; no handler is registered, so those Jobs wait in the queue. Not a defect of this feature; noted so nobody is surprised.

## 4. User Stories

1. As a Group approver, I want an email when someone joins my Group, so that I know my Group grew without opening Temba.
2. As an Organizer, I want an email when someone joins my Game, so that I can see the Game filling.
3. As an Organizer, I want an email when someone comes off the Waitlist into my Game, so that I know who took the seat.
4. As an Organizer, I want an email when someone leaves my Game, so that I can find a replacement in time.
5. As an Organizer, I want the leave email to name the partner who was removed with the leaver, so that I know how many seats opened.
6. As an Organizer, I want an email when every Match of my Game is in, so that I know the Game is settled.
7. As a player, I want an email when my Game has finished, so that I can see my results.
8. As a player, I want an email when an Organizer seats me on a Game, so that I know to turn up.
9. As a player, I want an email when a Level setter sets my Level, with the reason, so that I understand the change.
10. As a new User who signed up with a phone that an Unclaimed player used, I want the "we linked your Games" Notification emailed if I have a verified email, so that I find my history.
11. As any recipient, I want the email to read exactly what the in-app Notification reads, so that the two channels never disagree.
12. As any recipient, I want the email in the language I use Temba in, Arabic right-to-left when that is my language, so that it reads naturally.
13. As any recipient, I want one tap from the email to the Game or Group on the Web App, so that I can act on it.
14. As any recipient, I want to know why I received the email and how to stop them, so that I never feel spammed.
15. As a User, I want an Email notifications switch in Settings on web and on mobile, so that I can turn emails off or back on.
16. As a User without a verified email, I want Settings to tell me that emails need a verified address and take me to the email task, so that I know what to do.
17. As a User who turned emails off, I want nothing to arrive, including events that happened seconds before I flipped the switch and had not been sent yet, so that off means off.
18. As a User whose email Clerk has not verified, I want no email to be sent to that address, so that a mistyped address never receives someone else's Game details.
19. As a User who removed my email in Clerk, I want emails to stop at once, so that a stale address is never written to.
20. As a User, I want exactly one email per Notification, never a duplicate after a retry or a redeploy, so that the inbox stays trustworthy.
21. As a User, I want nothing emailed for a Notification the app itself would not show me (an unknown type, a Soft-archived Community), so that the channels agree.
22. As a User who acted (joined, left, seated someone), I want no email about my own action, so that emails are only about others.
23. As an Operator, I want the email channel to be off until the provider is configured, so that a local or staging API never sends mail.
24. As an Operator, I want a failed send to retry and a permanently failed one to be visible in the Job queue with its error, so that delivery problems are diagnosable.
25. As an Operator, I want Booking Notifications to be emailed automatically once TEM-370 lands, so that the channel needs no second project.
26. As a developer, I want tests that assert on recipient, subject and body without any network, so that the suite stays fast and offline.

## 5. Implementation Decisions

### 5.1 The channel

- **A Notification email is a channel on an existing Notification, not a new record.** There is no email table and no email queue of its own. `notify()` stays the only writer of Notifications; after inserting, it enqueues one `notification.email` Job per row it actually inserted (rows skipped by the dedupe key get no Job), in the same transaction. Job key `notification:email:<notificationId>`, dedupe mode, five attempts.
- **The Job handler decides whether to send.** It loads the Notification with the same joins the list procedure uses (actor, partner, Team, Group, Game, Level override), through one shared loader used by both the procedure and the handler. It sends only when all hold: the row exists and has no `emailed_at`; the recipient has an email and `email_verified` is true; the recipient's Email notifications setting is on; `notificationCopy` returns copy for the type and audience. Any failed check completes the Job without sending and without error: it is a definitive answer, not a retryable one.
- **Exactly once.** `emailed_at` on the Notification is stamped when the provider accepts the message. The provider call carries the Job key as its idempotency key, so a retry after a crash between send and stamp cannot produce a second email.
- **Instant.** No bundling, no digest. Every row is its own email.
- **Retention is untouched.** `emailed_at` is a column on the Notification; rows still leave after 90 days with the existing sweep.

### 5.2 The sender seam

- **One `EmailSender` interface** in the API Package's notifications area: `send({ to, subject, html, text, idempotencyKey })`, returning the provider's message id. Two implementations: Resend (HTTP, API key from the environment, `From` from the environment) and a recording double for tests. Selection mirrors the payment provider: a module-level override for tests, else `EMAIL_PROVIDER` from the environment, `none` by default. With `none` the handler completes without sending and leaves `emailed_at` null, logging once per Job that the channel is off.
- **Environment** on the API App: `EMAIL_PROVIDER` (`none` | `resend`, default `none`), `RESEND_API_KEY`, `EMAIL_FROM` (display name and address, for example `Temba <notifications@…>`). Both required when the provider is `resend`, validated at boot the same way the Tap keys are. The worker that runs `notification.email` must have them; today that is the API service itself.
- **Failure handling** follows ADR-0030. Network errors and provider 5xx throw and retry. A provider 4xx is permanent: logged as `job_failed` and completed. Bounces and complaints are left to Resend's suppression list in v1; no inbound webhook.

### 5.3 Rendering

- **Subject** is the Notification title as plain text (bold parts flattened). **Body**: the title with the names in bold, the subline when the type has one, the Group name on a Group Game, one button to the Game, Group or Games hub on the Web App, and a footer that says why the email arrived and links to Settings. A short plain-text alternative carries the same lines.
- **Links** are built from the API's web origin plus the same page mapping the Web App uses for a Notification; the mapping is repeated in the API Package, because the domain Package may not hold web route strings. Mobile deep links are Phase 7 and not part of this.
- **Copy** comes from a new `email` Message catalog in both languages: button labels per destination, the footer, the Settings link text. Title and subline reuse `notificationCopy` unchanged. Arabic emails set `dir="rtl"` and `lang="ar"`; Latin digits stay (Locale rule).
- **Design**: black and white, hairline borders, no images, no shadows, system font stack; the Temba name as text. Simple table layout for mail-client compatibility. The rendering function is pure and lives in the API Package because the API is its only caller.

### 5.4 Preferences and language

- **Email notifications** is one boolean on the User, `email_notifications`, default true, set by a new `users.setEmailNotifications` procedure. `profileDetails` returns it. Settings on web and mobile show a switch row beside Seat alerts; when the User has no verified email the row stays visible with a subtitle saying emails need a verified address, linking to the email task.
- **Stored Locale** is a nullable `locale` column on the User (`en` | `ar`), set by a new `users.setLocale` procedure. Each client calls it when the Locale it is showing differs from the one `profileDetails` reports: on dashboard or app load for a signed-in User, and when the language switch changes. Null reads as English. The server never picks a Locale from request headers for email.
- Only the API's own `WEB_ORIGIN` builds links; the email never embeds a client-supplied URL.

### 5.5 Out of the handler's way

- `notify()` callers are unchanged. No procedure learns about email.
- The `history_linked` Notification is emailed like any other when its recipient has a verified email; in practice a fresh phone sign-up rarely does, and that is fine.
- A worker-only Railway service (`API_ENABLED=false`) would need the email environment too; nothing else changes for it.

## 6. Domain docs

### 6.1 Glossary additions for `CONTEXT.md` (apply in ticket 1)

Under **Product**, after **Notification**:

> **Notification email**:
> The email copy of one Notification, sent once to the recipient's verified email address moments after the Notification is written, while Email notifications are on for that User. It reads what the in-app row reads and links to the Game or Group on the Web App. Never a digest, never sent to an unverified address, never sent twice.
> _Avoid_: email alert, digest, newsletter, mail (when you mean this entity)

> **Email notifications**:
> The one on-or-off setting that says whether a User receives Notification emails. On for every User until they turn it off in Settings; it does nothing while the User has no verified email.
> _Avoid_: email preferences, subscription, opt-in, unsubscribe (when you mean the setting)

> **Stored Locale**:
> The Locale the API keeps for a User, written by the clients whenever the language they show changes, and read wherever the product speaks to the User away from a client, such as a Notification email. English until the User has used Temba in another language.
> _Avoid_: language preference, user language, locale setting, Accept-Language

Under **Workspace**:

> **Email sender**:
> The one API Package seam through which every email leaves Temba: Resend behind it in production, nothing behind it until the provider is configured, a recording double in tests.
> _Avoid_: mailer, mail client, SMTP, Resend (when you mean the seam)

Amend **Notification**: replace "Not a push message, not an email, not an invite." with "Not a push message, not an invite; its email copy is the Notification email."

### 6.2 ADR proposal: `docs/adr/0054-a-notification-email-is-a-job-on-the-notification-row.md` (apply in ticket 1)

> # A Notification email is a Job on the Notification row, sent through one Email sender
>
> **Status:** accepted. Spec: `.scratch/email-notifications/spec.md`. Extends ADR-0022 and ADR-0030.
>
> Users asked to hear about their Groups and Games without opening Temba. In-app Notifications are fan-out rows written in the event's transaction (ADR-0022), and Graphile Worker is the Job queue (ADR-0030). Temba had no outbound email.
>
> ## Decision
>
> - **Email is a channel on the Notification, not a new record.** `notify()` enqueues one `notification.email` Job per inserted row in the same transaction, keyed by the Notification id. The handler re-reads the row, decides whether to send, and stamps `emailed_at`. There is no email table, outbox or digest.
> - **Only a Clerk-verified address, only while Email notifications is on.** `email_verified` comes from the Clerk webhook sync; the setting is a boolean on the User, default on.
> - **One Email sender seam; Resend behind it.** Every email leaves through one interface in the API Package, chosen like the payment provider: `EMAIL_PROVIDER` from the environment, `none` by default, a test override in code. Resend was chosen for a small HTTP API, idempotency keys and a managed suppression list.
> - **The User's Locale is stored.** Clients write the Locale they show; the handler renders with it, English when null. The server never infers a language from headers for email.
>
> **Considered options.** (1) Sending inline in the procedure after commit: rejected, no retry and a slow provider lengthens every request. (2) A bundling window or daily digest: declined by the user for v1; instant delivery was chosen knowing the join volume. (3) One-click signed unsubscribe link: declined for v1 in favour of a link to Settings. (4) Postmark or SES: more setup for the same outcome at this volume. (5) Bilingual emails instead of a stored Locale: twice the length for every reader.
>
> **Consequences.** An email exists only if its Notification committed, and the Job key makes a retry safe. Booking Notifications (TEM-370) and any future type are emailed with no new code once `notify()` writes them. Phase 7 push can hang off the same enqueue point. Bounces rely on Resend's suppression list until an inbound webhook is added. Turning the setting off does not recall Jobs already queued; the handler re-checks the setting at send time, so the window is the queue latency.

## 7. Testing Decisions

A good test exercises the behaviour a User or Operator sees: given this event and this User, this email (or none) is handed to the Email sender with this recipient, subject and body. Tests never assert on Resend's wire format or on internal helper calls.

Seams, highest first, all existing except the Email sender:

- **`RecordingJobSink`** (exists): the `notify` tests assert that each inserted Notification enqueues one `notification.email` Job with the right key and payload, that dedupe-skipped rows enqueue nothing, and that the Job rides the event's transaction.
- **`handle(db, payload)`** on the handler (pattern exists): PGlite plus a **`RecordingEmailSender`** (new, the one new seam). Cases: sends and stamps `emailed_at`; already stamped sends nothing; no email, unverified email, setting off, unknown type each send nothing and complete; a missing row completes; Arabic Stored Locale renders `dir="rtl"` and Arabic copy; the idempotency key equals the Job key; a thrown provider error leaves `emailed_at` null.
- **Rendering** as a pure function: snapshot-free assertions on subject text, the presence of the bold names, the button URL per type, the footer link, both Locales.
- **Procedures** through their exported plain functions against PGlite, as every router test does: `setEmailNotifications` and `setLocale` write and `profileDetails` reads back.
- **Clients**: the Settings switch row follows the Seat alerts row; the existing component tests for Settings, where they exist, gain the new row. No end-to-end mail test; the Resend path is checked once by hand per section 10.

Prior art: `notify.test.ts`, the `booking.confirmed` handler test with `RecordingJobSink`, the payment provider's `fake.test-support`, `setPlayWindows.test.ts`.

## 8. Out of Scope

- Bundling, digests, quiet hours or per-type preferences. One switch, instant delivery.
- A one-click unsubscribe token link and the `List-Unsubscribe` header. The footer links to Settings.
- Bounce and complaint webhooks from Resend; marking an address bad on the User.
- Booking Notifications (TEM-370) and Venue console emails. They inherit the channel when built.
- Welcome, verification, password or marketing emails. Clerk owns account mail; there is no marketing.
- Push notifications, device tokens and mobile deep links (Phase 7).
- SMS.
- A language picker that writes the Stored Locale directly; the clients mirror what they show.
- Emailing Unclaimed players or Guests (they have no account).

## 9. Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Organizers find instant join emails noisy on a filling Game | Medium | The decision was taken knowingly; the Settings switch is one tap away. A bundling window can be added later at the enqueue point without touching procedures. |
| Resend free tier (100 a day) is exceeded | Likely once Groups are active | Human step: pick a paid plan before launch; `job_failed` logs surface 429s. |
| Mail lands in spam | Medium until DKIM and DMARC settle | Human step verifies SPF, DKIM and DMARC on the sending domain before `EMAIL_PROVIDER=resend` is set. |
| A Job is queued, the User turns emails off, the email still arrives | Low, seconds wide | The handler re-reads the setting at send time. |
| `WEB_ORIGIN` on the worker points at the wrong App | Low | Same variable the invite links already use. |
| The Stored Locale lags the client (a User switches to Arabic and gets one English email) | Low | Both clients write on every change and on load. |

## 10. Human steps

1. Create a Resend account; add the sending domain; publish its SPF, DKIM and DMARC records; wait for Verified.
2. Choose the plan that covers expected daily volume.
3. On the Railway API service set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`; confirm `WEB_ORIGIN` is the production web origin. Leave `EMAIL_PROVIDER` unset everywhere else.
4. Run the migration (two User columns, one Notification column).
5. Smoke test: on production, with a test account whose email is verified, complete the last Match of a Game and confirm the email arrives, reads correctly in both languages, and its button opens the Game.

## 11. Tickets (in Linear: TEM-414 … TEM-417)

Vertical slices in dependency order. Ticket 1 is the tracer bullet and carries the gate column so a send is never possible without an off switch, even before the switch has a UI.

### Ticket 1 (TEM-414): A finished Game, a join, a leave and every other Notification reach the recipient's verified email

**What to build:** the whole channel for English: the Email sender seam with the `none` and Resend adapters and the recording double; `email_notifications` on the User (default on, no UI yet) and `emailed_at` on the Notification; `notify()` enqueuing one `notification.email` Job per inserted row; the handler that re-reads, gates, renders and sends through the seam and stamps the row; the `email` Message catalog in both languages (rendering uses English until ticket 2); the environment variables with boot validation; the glossary additions and ADR-0054.

**Blocked by:** none (can start immediately).

- [ ] Each of the 7 types produces an email whose subject is the in-app title in plain text and whose body has the title, subline where the type has one, the Group name on a Group Game, one button to the right Web App page, and a footer linking to Settings.
- [ ] Nothing is sent when the recipient has no email, an unverified email, `email_notifications` false, an already stamped row, or an unknown type or audience; the Job completes without error.
- [ ] A dedupe-skipped Notification enqueues no Job; an inserted one enqueues exactly one, keyed by the Notification id, inside the event's transaction.
- [ ] A retry after a crash between send and stamp cannot send twice (idempotency key equals the Job key).
- [ ] With `EMAIL_PROVIDER` unset the handler completes without sending and `emailed_at` stays null.
- [ ] `EMAIL_PROVIDER=resend` without `RESEND_API_KEY` or `EMAIL_FROM` fails at boot.
- [ ] Tests on PGlite with `RecordingJobSink` and `RecordingEmailSender` cover the cases in section 7; the gate passes.

### Ticket 2 (TEM-415): The email arrives in the language the User uses Temba in

**What to build:** the Stored Locale: a nullable `locale` on the User, `users.setLocale`, `profileDetails` returning it; the web and mobile Apps calling it on load for a signed-in User and when the language switch changes, whenever the shown Locale differs; the handler rendering with the Stored Locale, Arabic right-to-left with `lang="ar"`, English when null.

**Blocked by:** Ticket 1.

- [ ] A User who switched the Web App or the mobile App to Arabic receives the next email in Arabic, `dir="rtl"`, Latin digits, every string from the catalog.
- [ ] A User who never switched receives English.
- [ ] Switching back to English on either client changes the next email back.
- [ ] `setLocale` rejects anything but `en` or `ar`; the clients call it only when the value differs from the stored one.

### Ticket 3 (TEM-416): A User turns Notification emails off and on in Settings

**What to build:** `users.setEmailNotifications`; the Email notifications switch row beside Seat alerts in web Settings and mobile Settings, saved optimistically like Seat alerts; when the User has no verified email the row shows a subtitle saying emails need a verified address and links to the email task; the email footer's Settings link lands on that row's page.

**Blocked by:** Ticket 1.

- [ ] Turning the switch off on web or mobile stops emails from the next Notification on; turning it on resumes them.
- [ ] A User without a verified email sees the row with the subtitle and a way to the email task; the switch state is still saved.
- [ ] The footer link in an email opens the web Settings page.
- [ ] Both catalogs carry the new strings; procedure tests cover write and read-back.

### Ticket 4 (TEM-417, human): Resend account, sending domain and Railway environment

**What to build:** the human steps in section 10, then the production smoke test in both languages.

**Blocked by:** Tickets 1 and 2 for the smoke test; the account and domain work can start at once.

- [ ] Domain shows Verified in Resend with SPF, DKIM and DMARC.
- [ ] Railway API service has `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM`.
- [ ] A finished Game on production delivers an email to a verified test address, in English and in Arabic, whose button opens the Game.

## Comments
