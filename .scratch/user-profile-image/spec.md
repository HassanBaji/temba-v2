# User profile image

Status: ready-for-agent

## Problem Statement

A signed-in **User** opening **You** always treats Clerk’s `imageUrl` as a real photo. Clerk always supplies that URL: when the User has never chosen a face, it is a generated default. There is no first-class Add / Edit photo on You — only Clerk’s `UserButton`, which is easy to miss as a photo control.

On lists, almost every avatar is initials-only. Group members, Standing, Community members and join requests, Team rows, Invites, Game seats, and waitlists render `UserAvatar` without the stored User image. The User column already exists and the Clerk webhook already copies `image_url` on create/update, including Clerk defaults. Friendly game hub and Home roster cards already pass that column through, so those cards can show Clerk’s generated face while every other list shows initials. People cannot recognise each other across Community, Group, Team, and Game the way they recognise a Venue logo.

## Solution

Clerk remains the only store for a User’s photo. On **You**, show the Clerk photo only when Clerk `hasImage` is true (OAuth/social and chosen uploads count). When it is false, show Temba initials from the display name — never Clerk’s generated default. You’s identity avatar is the product control to add or edit that photo: it opens Clerk **UserProfile** (crop, upload, remove). `UserButton` stays on You and hits the same Clerk photo.

The existing Clerk `user.created` / `user.updated` webhook is the only Temba write. Persist the Clerk image URL when `has_image` is true. Persist null when `has_image` is false (including after Remove). Do not add a Temba upload API, a new column, or Supabase Storage for Users (Venue logos stay ADR-0006).

A second slice then passes that stored image into every existing User avatar surface so other people see the same face. Vacant Game seats, open Team seats, Group/Community monograms, Venue logos, and the Lookup picker stay as they are.

Approving this spec approves the Test seams in Testing Decisions. No new `CONTEXT.md` glossary terms. Keep **User** (avoid player), **You**, **App**, **Community**, **Group**, **Team**, **Game**, **Operator**.

## User Stories

1. As a signed-in User on You, I want the identity header to show my Clerk photo when Clerk `hasImage` is true, so that You looks like me from the first session and not like a generic face.

2. As a signed-in User on You who has never chosen a photo (`hasImage` is false), I want Temba initials from my display name, so that I do not see Clerk’s generated default image.

3. As a signed-in User on You, I want those initials to follow the existing initials rules, so that You matches other avatar fallbacks in the App.

4. As a signed-in User on You while Clerk is still loading, I want the existing round skeleton in the identity header, so that the page does not flash a wrong face or a clickable photo control.

5. As a signed-in User on You, I want my display name, username, Level / Level band / Provisional, Teams row, Invites row, and Operator Venues row unchanged, so that adding a photo control does not restyle You.

6. As a User whose Clerk photo came from an OAuth provider (Clerk `hasImage` is true), I want that photo on You without a second upload, so that a Google (or similar) face already counts as my User image from the beginning.

7. As a User who only has Clerk’s generated default (`hasImage` is false), I want Temba to treat that as “no photo” everywhere this spec owns, so that Clerk defaults never become Temba identity.

8. As a User viewing a Friendly game roster card that already reads the stored User image, I want that card to show a real photo or Temba initials — not Clerk’s generated default — so that hub and Home match You’s has-image rule once the webhook has run.

9. As a signed-in User on You with no photo, I want the identity avatar to be an **Add profile photo** control, so that I can choose a photo without hunting Clerk’s account menu.

10. As a signed-in User on You who already has a photo, I want that avatar to be an **Edit profile photo** control, so that I can replace or remove it.

11. As a signed-in User activating Add or Edit profile photo, I want Clerk UserProfile to open (the same manager `UserButton` already owns), so that crop, upload, and remove stay on Clerk and the App does not invent a file input or cropper.

12. As a signed-in User in Clerk UserProfile, I want to upload, crop, replace, or remove my photo using Clerk’s own constraints, so that file type, size, and crop are not reimplemented as Venue-logo rules.

13. As a signed-in User with no photo, I want Remove inside Clerk to be Clerk’s problem (hidden or no-op there); on You I want the control labelled Add, not Edit, so that I am not invited to “edit” something I do not have.

14. As a signed-in User after a successful Add, Change, or Remove in Clerk, I want You to show the new Clerk `hasImage` / `imageUrl` without a full App reload, so that the header matches Clerk before lists catch up.

15. As a signed-in User, I want Clerk’s existing `UserButton` on You to remain, including its own photo tools, so that both paths write the same Clerk photo.

16. As a User after Clerk accepts a photo, I want the next successful `user.updated` webhook to persist that image URL on my Temba User, so that lists can show the same photo.

17. As a User created in Clerk with `has_image` false, I want the `user.created` webhook to persist a null image, so that new Users start as initials rather than Clerk defaults.

18. As a User who removes their Clerk photo, I want the `user.updated` webhook to persist null (not Clerk’s generated URL), so that lists drop the photo and show initials.

19. As a User who changes their Clerk photo, I want the webhook to replace the stored URL with the new one, so that lists are not stuck on the previous file.

20. As a User whose Clerk name, email, username, or phone also changes on the same `user.updated`, I want those fields to keep syncing as they do today, so that photo sync does not break Lookup invite matching.

21. As a Group member, I want Group members and Group Standing rows to show each User’s stored photo or initials, so that I can recognise people on that Group.

22. As a Community Member, I want Community members and pending Community join-request rows to show each User’s stored photo or initials, so that staff and Members recognise who is in the club and who is asking to join.

23. As a Team member or Community Member viewing Teams, I want Team home member rows, Teams-hub stacks, Community linked-Team stacks, and Team pending-invite inviter avatars to show stored photos or initials, so that partnerships are faces rather than name-only circles.

24. As a User on Invites, I want each Lookup invite row’s inviter to show their stored photo or initials, so that I can see who invited me.

25. As a User on a Game, I want occupied Friendly roster seats (hub and Home), Game seat-grid occupants, Game home registered Users, waitlisted Users, and Americano pool rows to show stored photos or initials, so that a Game’s people match Group and Community lists.

26. As a signed-in User whose Clerk UserProfile write fails (network, Clerk error), I want You to keep the previous photo or initials, so that a failed write does not look successful.

27. As a User whose Clerk webhook is delayed or returns 5xx (Clerk will retry), I want You to already show the Clerk result while lists stay on the last stored image until a successful webhook, so that You is never blocked on Temba persistence.

28. As a User viewing any avatar whose stored URL is missing, empty, or fails to load, I want Temba initials, so that a broken Clerk CDN URL does not leave a blank circle.

29. As a User, I want two rapid Clerk photo changes to resolve to whichever `user.updated` Clerk last accepted, so that Temba does not invent merge rules beyond last successful webhook.

30. As a signed-in User, I want only my own session to open UserProfile for my photo, so that another User cannot write my face.

31. As an Operator, Community Owner, or Community Admin, I want no control to set or clear another User’s photo, so that staff roles do not become a photo admin and Operator stays Venue work.

32. As a visitor who is not signed in, I want no You photo controls, so that Clerk photo writes stay behind the existing dashboard auth gate.

33. As a User of You, I want Add / Edit profile photo to have accessible names, to work with keyboard, and not to rely on colour alone; as a User of lists, I want row avatars to stay decorative (`aria-hidden`) because the User’s name is already in the row, so that photos do not become an extra unlabelled tab stop.

34. As a User of the App, I want Venue logos (ADR-0006), Community/Group/Venue `EntityMonogram`s, Coach image URLs, Rating/Level on You, Game admit/waitlist/cancel/Soft-archive rules, and Clerk Operator / group-creator metadata unchanged, so that this slice is only User photos.

35. As a User looking at people on a Soft-archived Club Group Game, a cancelled Game (read-only), or a waitlist, I want photos to follow the same visibility as those lists today — vacant seats still “+”, open Team seats still dashed placeholders — so that a missing person is never given a User photo.

36. As a User sending a Lookup invite, I want the Lookup picker to stay without avatars this slice, so that invite search does not grow a new identity surface.

37. As a User on You, I want an `AvatarBadge` on the identity avatar to be allowed as a visual hint that the circle is editable, so that Add/Edit is discoverable without a Settings section.

38. As a User who replaced an OAuth photo, I want no “restore original social photo” action in the App, so that Clerk remains the only history of previous files.

## Implementation Decisions

- **Owner.** Clerk is the source of truth for whether a User has a photo and for the bytes. Temba stores only a nullable image URL on the existing User row. No new Package, no new table, no new column, no migration unless a later defect proves the existing User image column cannot hold Clerk CDN URLs.

- **has-image rule.** You reads Clerk session `hasImage` + `imageUrl`. Pass the URL into the existing User avatar only when `hasImage` is true; otherwise pass null so initials render. Webhook `user.created` and `user.updated` persist `image_url` only when Clerk `has_image` is true; otherwise persist null. Do not persist Clerk’s generated default URL. Do not add a `has_image` column; null means no Temba photo.

- **No Temba upload API.** The You identity avatar opens Clerk UserProfile (`openUserProfile` or an equivalent Clerk session API). No `<input type="file">` on You. No tRPC mutation for the blob. No Operator or Member procedure writes another User’s image. Venue Supabase Storage (ADR-0006) is not used for Users. Clerk’s crop, MIME, and size rules apply; do not copy Venue logo 2 MB JPEG/PNG/WebP validation.

- **You identity header.** Keep the existing header: avatar, display name, username, Clerk account control. Make the large identity avatar a named control: **Add profile photo** when `hasImage` is false; **Edit profile photo** when true. `AvatarBadge` is allowed. After UserProfile closes, reload the Clerk User so You updates without a full navigation. `UserButton` remains on You.

- **Copy.** Product copy is **Add profile photo** / **Edit profile photo**. Do not introduce “player photo”, “avatar” as a domain term, or a Settings page. Do not display Clerk field names (`hasImage`, `imageUrl`) in the App.

- **Webhook remainder.** Existing Clerk webhook verification, `user.created` / `user.updated` handling, and name/email/username/phone sync stay. Photo is the same upsert, with the has-image rule. No `user.deleted` work this slice. Clerk retries on 5xx; do not add a Temba outbox.

- **Stale rows.** Rows written before this rule may still hold Clerk default URLs until the next successful `user.updated`. You is correct immediately via Clerk `hasImage`. Do not ship a guessed URL backfill. Friendly roster cards that already pass the stored image pick up the rule on the next webhook.

- **Ticket 02 — pass image through existing avatars.** Do not invent new list chrome. Select and return the stored User image on the payloads those surfaces already use, and pass it into the existing User avatar / avatar stack. Surfaces: Group members; Group Standing; Community members; Community join requests; Community linked-Team stacks; Teams hub stacks and pending-invite inviter; Team home members; Invites inbox inviter; Friendly roster occupants (already passed — keep using the stored URL under the new null rule); Game seat-grid occupants; Game home registered Users, waitlist, Americano pool, and Game-team rows that already use User avatar. Team stacks must use real member `{ name, image }`, not splits of `displayName`. Mixed stacks are allowed (photo next to initials). Vacant Game seats stay “+”. Open Team seats stay dashed placeholders. Incomplete Team stacks still show one User plus an open seat, not a fake second photo. Lookup picker stays without avatars. Do not add avatars to rows that have none today except where a UserAvatar already exists and only `image` was omitted.

- **Permissions and visibility.** Only the signed-in User’s Clerk session may add or edit their photo. Operator, Owner, and Admin cannot edit another User’s photo. Who *sees* a photo is who already sees that User on that list; this slice does not add a public User profile, a Directory of Users, or signed-out avatars beyond existing invite shells.

- **Accessibility.** You photo actions are named buttons (or an equivalent named control), keyboard operable. List avatars stay `aria-hidden` where the User’s name is already the row title. Do not put the raw image URL in accessible names. Existing round skeleton on You load stays.

- **Unchanged.** Venue logo upload/replace/clear; Community home Venue logo / monogram; Group monograms; Coach image column; Rating/Level; Game create/admit/waitlist/kick/cancel; Soft-archive; invite doors; Clerk `operator` and `groupCreator`; UserButton on You. Duplicate sidebar `UserButton` is a redesign leftover and is out of this slice.

- **Redesign compatibility.** `.scratch/redesign/spec.md` says Clerk’s UserButton owns account management and no custom settings surface is invented. This spec is compatible if implementers open Clerk UserProfile from the identity avatar. It conflicts if someone copies the Venue logo file input onto You.

## Testing Decisions

### What a good test is

Test external behaviour: Clerk has-image vs initials on You; opening UserProfile from the identity avatar; webhook persist/null; list rows showing the stored URL vs initials. Do not assert Clerk component internals, CSS class names, or table JSON except where a flow fails. Prefer the existing Vitest + PGlite harness for webhook upsert and for list presenters that already have tests. Do not add Playwright, a new runner, or CI. Manual signed-in checks cover You and the list surfaces.

### Test seams

Highest seam (two, matching the tickets): (1) a signed-in User on You adds, edits, and removes a Clerk photo via UserProfile, You respects `hasImage`, and the webhook persists URL or null; (2) those stored images appear on existing User avatar lists, while vacant seats, monograms, Venue logos, and the Lookup picker stay as they are.

If you implement this spec, you implement these seams:

- You, `hasImage` true: Clerk photo in the identity header
- You, `hasImage` false: Temba initials, not Clerk’s generated default
- You while Clerk is loading: existing skeleton; no photo control flash
- Identity avatar is named Add profile photo / Edit profile photo, keyboard-accessible; opens Clerk UserProfile
- UserButton remains on You and can still change the same Clerk photo
- Webhook `has_image` true: stored URL set; `has_image` false on create or after remove: stored null; name/email/username/phone still sync
- Friendly roster cards that already pass stored image: photo when URL present, initials when null (no Clerk default)
- After ticket 02: Group members and Standing; Community members and join requests; Team home, Teams hub stacks, Community Team stacks, Team pending inviter; Invites inviter; Game seat grid, Game home registered/waitlist/Americano/Game-team avatars
- Mixed stack: one User with a photo and one without
- Vacant Game seat stays “+”; open Team seat stays dashed; no photo on empty seats
- Lookup picker still has no avatars
- Operator / Owner / Admin cannot change another User’s photo
- List visibility unchanged (including Soft-archived Club Group Games a User can already open)
- Venue logos, Group/Community monograms, Coach column, Level on You unchanged
- Existing Vitest suites stay green; new upsert coverage lives next to existing PGlite tests (prior art: community-membership and hub-list-rows tests)

Approving this spec approves these seams.

## Out of Scope

- Supabase (or any Temba blob bucket) for User photos
- A new User image column, `has_image` column, or guessed backfill of existing Clerk-default URLs
- A Temba tRPC upload/replace/clear for User photos
- A Temba file input or cropper on You
- Operator, Owner, or Admin editing another User’s photo
- A public User profile page, User Directory, or signed-out photo gallery
- Restore original OAuth photo after a replacement
- Changing Venue logos (ADR-0006), Group monograms, Community monograms, or Coach `imageUrl`
- Rating / Level / Provisional behaviour
- Game admit, waitlist, kick, cancel, price, or Soft-archive rules
- `user.deleted` webhook handling
- Redesigning Clerk UserButton chrome (it may still show Clerk’s generated default inside Clerk’s widget)
- Removing the duplicate sidebar UserButton
- New avatar primitives or a second avatar component
- Lookup picker avatars
- Invite-link accept shells that currently monogram Community / Group / Game (not User rows)
- Open Graph / share images for Games
- Overlaying the signed-in User’s live Clerk URL onto list rows
- Displaying Clerk internals (`hasImage`, webhook names) in the App

## Further Notes

- Settled grilling: `.scratch/user-profile-image/decisions.md`.
- ADR-0006 stays Venue-only. This slice does not need a new ADR: User photos stay on Clerk, which that ADR already contrasts with Venue logos.
- Glossary: no new `CONTEXT.md` terms. Use **User** (avoid player), **You**, **App**, **Community**, **Group**, **Team**, **Game**, **Operator**. “Profile photo” is You copy. “User image” is the stored URL. “Avatar” is UI chrome, not a domain entity.
- Prerequisite: existing Clerk webhook upsert and You identity header (`useUser` + User avatar + UserButton). Friendly hub/Home roster already selects User image; ticket 01’s webhook rule is what makes that roster honour has-image.
- Ticket 01 is demoable on You (and on Friendly roster cards that already pass image). Ticket 02 is blocked by 01 because lists read the stored URL.
- Clerk session uses `hasImage` / `imageUrl`; webhook payload uses `has_image` / `image_url`. Same rule, two spellings — do not leak either spelling into UI copy.
- Full Clerk UserProfile is a full account modal, not photo-only. Accepted.

## Implementation tickets

Published to Linear. Frontier is [TEM-128](https://linear.app/temba-app/issue/TEM-128/you-addedit-profile-image-via-clerk).

1. [TEM-128](https://linear.app/temba-app/issue/TEM-128/you-addedit-profile-image-via-clerk) You add/edit profile image via Clerk — unblocked.
2. [TEM-129](https://linear.app/temba-app/issue/TEM-129/show-stored-user-image-on-existing-avatar-surfaces) Show stored User image on existing avatar surfaces — blocked by TEM-128.
