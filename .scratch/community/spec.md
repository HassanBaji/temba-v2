Status: ready-for-agent

## Problem Statement

Players need a Community (a club) that can contain many Groups, offer more than one sport, and be either listed (request-to-join) or unlisted (invite-only). Unlisted clubs and Loose Group Private squads must admit people who do not yet have a Temba account, via a named Email invite and a copyable Invite link, without Temba becoming a second identity provider.

Today there is no Community. Group is the only social unit: one sport, one public/private type, no parent, no roles, no invites, no unique membership. Games may hang off a Group and currently cascade-delete with it. The App has no Community or Group UI and no email sender.

## Solution

Add Community as an optional parent of Group in the DB Package, and ship create, join, Directory, archive, and Private invites in the App (tRPC, dashboard UI, invite-accept URLs).

A Group is either a Club Group (has a Community) or a Loose Group (no Community). That parent is chosen at create time and is immutable in v1. Games stay on Groups.

Community Public is listed and joinable by request (no Email invite, no Invite link). Community Private is unlisted; Owner and Admin send Email invites and one reusable Invite link; accepting auto-joins as Member. Club Groups have no email or Invite link; staff invite existing Community members in-app. Loose Group Public uses the Group URL (open-with-link). Loose Group Private uses Email invite plus one reusable Invite link from the User who created it.

Invite URLs are Temba’s. Signed-out people sign in or sign up with Clerk, then Temba attaches membership. Email invites join only if the authenticated email matches. Invite links join any authenticated User until rotated or revoked. Soft-archive hides a Community and its Club Groups together; Games are kept. Hard delete of a Group that still has Games is blocked.

Approving this spec approves the Test seams in Testing Decisions.

## User Stories

1. As an authenticated User, I want to create a Community Public with a name and at least one sport (padel, football, or both), so that I become its Owner of a listed club.

2. As an authenticated User, I want to create a Community Private with a name and at least one sport, so that the club is unlisted and invite-only.

3. As a new Owner, I want the Community to exist with zero Groups, so that I can set up the club before adding squads.

4. As an authenticated User, I want a Directory of live Community Public clubs only, so that I can find clubs to request. Community Private clubs and all Groups are absent from that list. No city or sport filters in v1.

5. As an authenticated User, I want to request to join a live Community Public (including an empty one), with no message and no expiry, so that Owner or Admin can admit me.

6. As an Owner or Admin, I want to approve a join request, so that the requester becomes a Member immediately.

7. As an Owner or Admin, I want to reject a join request, so that they do not become a Member. The rejected User may re-request.

8. As an Owner or Admin, I want to leave a request pending (ignore it), so that I am not forced to reject.

9. As a Member who is not Owner or Admin, I want to be refused when I try to approve requests, so that only staff admit people to a Community Public.

10. As an Owner or Admin of a Community Private, I want to send an Email invite to any address (unknown OK), so that that person can join as a Member. If a User already exists for that email, attach the invite to them and still send the email. One unused Email invite per Community and email. No time expiry. I can revoke unused.

11. As an Owner or Admin of a Community Private, I want to copy one reusable Invite link, so that I can share a door. Unlimited uses, no time expiry. Anyone who authenticates with Clerk and opens a live link becomes a Member.

12. As an Owner or Admin, I want to rotate that Invite link (old token dies, new token minted) or revoke it (no active link), so that a leaked URL can be killed.

13. As a Member of a Community Private, I want creating Email invites or Invite links to be refused, so that only staff admit people.

14. As a person who received an Email invite URL and has no account, I want to sign up with Clerk from that URL, then be auto-joined if my Clerk email matches the invited address (case-insensitive).

15. As a User whose authenticated email does not match the Email invite, I want join to be refused, so that a forwarded mail cannot attach a different person. Opening the URL while signed in as someone else must not consume the invite.

16. As an invited person opening a Community Private Invite link while signed out, I want to sign in or sign up with Clerk, then be auto-joined as Member with no second staff approval. Email match does not apply to Invite links.

17. As a User, I want Community Public clubs to have no Email invite and no Invite link, so that listed clubs stay request-to-join and staff cannot skip the queue with a magic URL.

18. As an Owner or Admin, I want to create a Club Group in my Community with a name, type (public or private), and exactly one sport from Community sports, so that the squad plays that sport. I am added as a Group member as the creator.

19. As a Member who is not Owner or Admin, I want creating a Club Group to be refused, so that staff control squads inside the club.

20. As an authenticated User, I want to create a Loose Group with a name, type, and one sport, so that I can run a squad outside any club. I am added as a Group member.

21. As a Community Member, I want to join a Club Group Public in that Community with no extra request, so that public-to-members means open inside the club.

22. As a User who is not a member of a Community, I want joining any of its Club Groups to be refused, so that Club Group membership requires Community membership.

23. As an Owner, Admin, or that Club Group’s creator, I want to invite a Community Member into a Club Group Private in-app (existing User, no email or Invite link), so that invite-only squads stay closed even to members.

24. As a Community Member who is not staff and not that Group’s creator, I want inviting myself or others into a Club Group Private to be refused.

25. As an authenticated User with a Loose Group Public URL, I want to join that Group immediately, so that Loose Group Public means open-with-link, not listed, and not a second invite product.

26. As the creator of a Loose Group Private, I want to send an Email invite (unknown address OK, same match and revoke rules as Community) and to copy one reusable Invite link (rotate or revoke), so that Loose Group Private can admit people who are not yet Users.

27. As anyone who is not that Loose Group Private’s creator, I want creating its Email invites or Invite links to be refused.

28. As a Club Group member, I want to leave that Group and remain in the Community (possibly with zero Groups).

29. As a Community member, I want to leave the Community and be removed from all of its Club Groups, without touching my Loose Groups or other Communities.

30. As a User, I want to belong to multiple Communities at once.

31. As an Owner or Admin, I want to add a sport to Community sports, so that we can add football later.

32. As an Owner or Admin, I want removing a sport to be refused while any Club Group of that sport exists in that Community.

33. As an Owner or Admin, I want to Soft-archive a live Community, so that it and its Club Groups disappear from the Directory and new joins, requests, Email invites, and Invite links stop. Club Groups stay attached (they do not become Loose Groups). Loose Groups are untouched. Games on those Club Groups are kept. Live Invite links and unused Email invites for that Community must not admit anyone after archive. Unarchive restores the same Invite link token unless staff rotate.

34. As a member of a Soft-archived Community, I want to open it and its Club Groups and see history and Games, so that archive is not data loss.

35. As a non-member, I want a deep link to a Soft-archived Community or its Club Group to show an archived state, not a live join page and not a never-existed empty 404.

36. As an Owner or Admin, I want to unarchive, so that listing and join rules resume.

37. As a User browsing live public pickup Games, I want Games whose Group’s Community is Soft-archived not to appear as live public pickup, even if the Game row is still marked public.

38. As an Owner, I want to promote a Member or Admin to Owner, and to demote another Owner, so that staff can change. Multiple Owners are allowed.

39. As the last Owner, I want leave and self-demote to be refused until I promote someone else. Leaving must not Soft-archive the Community.

40. As an Admin, I want to be unable to promote or demote Owners or to promote myself to Owner, so that only Owners change Owner-ship. Admins still admit people, create Club Groups, Soft-archive, unarchive, send Community Private Email invites, and rotate Invite links.

41. As the creator of a Loose Group, I want deleting that Group to be refused while it has Games or any member other than me, so that Games cannot vanish through a cascade.

42. As an Owner or Admin, I want the same delete block for a Club Group (Games or extra members). An empty Group (only the creator, no Games) may be deleted by someone allowed to manage it (Owner or Admin for Club Groups; the creator for Loose Groups).

## Implementation Decisions

- Schema, migrations, and kit live in the DB Package. Follow existing Drizzle style: uuid primary keys, Postgres enums plus TypeScript enums, created and updated timestamps. New tables use the same unprefixed naming as Group and Game today. Kit table filter stays as it is.

- The App keeps its existing database re-export of the DB Package. tRPC routers import the database client through that re-export, not by reaching into the DB Package at every call site.

- UI and tRPC live in the App. New routers register on the existing app router. Directory and dashboard Community/Group reads and writes are authenticated. Invite-accept URLs are not behind the dashboard auth wall: signed-out people can open them, then Clerk sign-in or sign-up returns to that invite URL. Do not send them to the dashboard first. Do not use Route `/public`.

- No new framework, no new Package, no mail Package. There is no existing mailer. Behavior: the App delivers an email to the invited address containing Temba’s Email invite URL. Transactional email provider is TBD; env lives on the App next to Clerk and the database URL. Clerk remains the only identity provider. Temba does not send login tokens.

- Groups gain an optional Community parent (null means Loose Group; set means Club Group). Deleting a Community must not cascade into Groups or Games (restrict). Do not put archive state on Groups; Club Groups inherit Soft-archive from the Community. Keep Group type (public or private), one sport (padel or football), creator, name, description, and games-played counter. There is no API to change the parent after insert.

- Group membership gains a unique pair of Group and User. No role columns on Group membership. Stats stay on that row.

- Game-to-Group delete becomes restrict instead of cascade, so a Group with Games cannot be deleted at the database either. Game may still have no Group. Do not move Games off Groups. Do not rename Group.

- Existing Groups with no Community parent are Loose Groups. No backfill Community.

- Communities store name, description, type (public or private), creator, and Soft-archive timestamp (null means live).

- Community membership stores Community, User, and role (Owner, Admin, or Member) on that row, unique per Community and User.

- Community sports is the allow-list: Community plus sport, using the existing Group sport enum (do not add a fourth padel/football enum), unique per Community and sport. Create Community requires at least one sport.

- Join requests apply to Community Public only (the App refuses them for Community Private). One row per Community and User, status pending, approved, or rejected, no message, optional decider. Re-request turns rejected into pending on the same row. Ignore leaves pending.

- Email invites and Invite links are separate tables with different consume rules. Do not collapse them into one polymorphic subject table (same split style as Game players versus coaching-session players).

- Community Email invites: Community Private only, normalized lowercase email, optional User when one exists for that email, inviter, opaque unique token for the URL, accepted and revoked timestamps. At most one unused row per Community and email. Owner or Admin only; refuse if Community Public or Soft-archived.

- Group Email invites: same shape keyed by Group. App: Loose Group Private only; only the Group creator may insert.

- Community Invite links: opaque token, creator, revoked timestamp null means active. At most one active link per Community. Rotate revokes the active row and inserts a new token in one transaction. Revoke sets revoked. No expiry. App: Community Private, Owner or Admin; refuse consume if Public or Soft-archived.

- Group Invite links: same, Loose Group Private only, creator only, at most one active per Group.

- In-app Club Group Private invites of existing Community members: keyed by User, not email. Unused unique per Group and invitee. Inviter is Community Owner, Admin, or that Group’s creator. Invitee must already be a Community member. Do not put Club Groups on the Email invite or Invite link tables.

- Invite-accept URLs carry an opaque token and distinguish Community Email invite, Community Invite link, Group Email invite, and Group Invite link. After a Clerk session exists, consume in the App.

- Foreign keys stay on User id, like Group creator today. Email matching uses the Temba User email, kept in sync with Clerk for that session. Any write needs a Temba User row: resolve or create the minimum fields User requires from the authenticated session. Do not add a Clerk id on Community or Group. Do not switch this feature to better-auth.

- Creating a Community inserts the Community, an Owner membership, and at least one Community sports row in one transaction.

- Creating a Club Group: caller is Owner or Admin; sport is required and on the allow-list; parent is set; creator is inserted as a Group member.

- Creating a Loose Group: no parent; any authenticated User; sport required; creator inserted as a Group member.

- Club Group Public join: caller is a live Community member.

- Club Group Private join: accepted in-app Group invite only.

- Loose Group Public join: authenticated User, no parent, type public. The Group page URL is the door, not an Invite link row.

- Loose Group Private join: Email invite (email match) or Invite link (any authenticated User).

- Community Private join: Email invite (email match) or Invite link (any authenticated User). No join-request rows for Community Private.

- Community Public join: join request only.

- Leave Community: remove Community membership and all Group memberships for Groups with that Community. Do not touch Loose Groups.

- Leave Group: remove that Group membership only.

- Last Owner: refuse any leave, delete, or demote that would leave zero Owners. Soft-archive is a separate mutation, not a side effect of leaving.

- Role changes: Owners only promote and demote (Member, Admin, Owner). Admins cannot change Owner-ship.

- Soft-archive and unarchive: Owner or Admin. Club Groups stay rows with the same parent. Refuse consume of that Community’s Email invites and Invite links while archived; do not auto-revoke tokens (unarchive restores the same link unless staff rotate).

- Directory query: Community Public and not Soft-archived.

- Live public pickup Games: exclude Games whose Group has a Soft-archived Community. Do not flip the Game public flag on the row.

- Delete Group: refuse if any Game points at it, or if any Group member besides the creator exists. Otherwise Owner or Admin (Club Group) or the creator (Loose Group) may delete. Community is not hard-deleted in v1.

- Community names are not globally unique (same as Group names today).

- Authenticated dashboard: Directory plus create Community; Community home (Groups, members, requests if Community Public staff, Email invites and Invite link if Community Private staff, Soft-archive); Group home (Club Group or Loose Group). Reuse existing UI primitives. No Group Directory page.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): an authenticated User can run a Community (and optional Club Groups) and a Loose Group with the join, listing, Soft-archive, and Private invite rules in this spec, without deleting Games, and without Temba acting as an identity provider.

If you implement this spec, you implement these seams:

- Create Community Public and Community Private; creator is Owner; empty Community is joinable or requestable
- Directory shows only live Community Public — not Community Private, not Soft-archived, not Groups
- Community Public request: approve becomes Member; reject then re-request; ignore stays pending; Members cannot approve; no Email invite or Invite link
- Community Private Email invite to an unknown address: Clerk signup with matching email auto-joins Member; mismatch or other signed-in User does not consume
- Community Private Email invite to an email that already has a User: attach and email; matching session auto-joins
- Community Private Invite link: copy, unlimited joins, rotate kills old token, revoke leaves no door; Members cannot mint links
- Club Group: no email or Invite link; in-app invite of Community members only; outsiders cannot join Club Groups
- Owner or Admin create Club Group with allow-list sport; Member cannot
- Any authenticated User creates a Loose Group
- Loose Group Public: join via Group URL, not Invite link table
- Loose Group Private: Email invite and Invite link by creator only; same Clerk, match, and rotate rules
- Leave Group keeps Community; leave Community drops all Club Groups, not Loose Groups
- User in two Communities
- Add sport OK; remove sport blocked while a Club Group of that sport exists
- Soft-archive hides Community and Club Groups together; members see history and Games; non-members see archived; unarchive restores; Loose Groups untouched; archived Community invites and links refuse consume
- Soft-archived Community Games do not appear as live public pickup
- Last Owner cannot leave or demote; multiple Owners; leave is not Soft-archive
- Cannot delete a Group that has Games or extra members
- Cannot join the same Group twice (unique membership)
- Opening an invite URL does not log anyone in without Clerk

Manual check: existing home, login, dashboard Clerk behavior and stub Game tRPC still work. Route `/public` still redirects to login.

### Modules under that seam

DB Package schema for Community, Group, membership, and invites; App tRPC; dashboard Community and Group pages; invite-accept pages; App-side email send — only as they affect the flows above.

### Prior art

None. Temba has no tests and no mailer. The Game router is a stub.

## Out of Scope

- Attach a Loose Group to a Community, or detach a Club Group (immutable parent)
- Group roles (captain or admin on Groups). Creator is audit plus Club Group Private in-app invite and Loose Group Private invite permission
- Members sending Community invites (“bring a friend”)
- Group Directory; city or sport filters; listing Groups anywhere but Community home or direct URL
- Join-request message; time expiry on Email invites or Invite links
- SMS
- Community Public Email invite or Invite link (would skip or duplicate request-to-join)
- Club Group email or Invite link (including stacked Community-plus-Group admit)
- Temba magic-link auth or a second identity provider. Clerk only
- Invites by phone. Email is the only named channel besides the reusable URL
- Loose Group Soft-archive. Hard purge of Soft-archived Communities
- New sports beyond padel and football
- Changing Courts, coaches, coaching sessions, or the Game public column meaning except the Soft-archive pickup filter
- Moving Game off Groups; renaming Group
- Clerk to better-auth (or the reverse); deleting better-auth leftover tables
- A second App; using Route `/public` or Workspace as product words
- A mail Package; choosing a specific email vendor in this spec (provider TBD)
- CI, test runner, visual redesign, unrelated dashboard template replacement beyond Community and Group navigation

## Further Notes

Glossary: Root CONTEXT.md (Workspace terms plus Product terms). Architecture: docs/adr/0004 (optional Community parent), 0005 (Soft-archive). ADRs 0001–0003 are Workspace conversion and do not constrain this feature except: one App, Route `/public` is not a product, schema lives in the DB Package.

Locked v1 defaults (not a further grill): join request has no message and no expiry; Email invite is named, unknown OK, Clerk then email must match, auto-join, no expiry, revoke unused, one unused per subject and email; Invite link is one reusable token, unlimited, no expiry, rotate or revoke, any authenticated User; email and Invite link only on Community Private (Owner/Admin) and Loose Group Private (creator); Directory is Community Public only; unique Group membership; Community creator is Owner; Group creator auto-joins the Group; create Community requires at least one sport; names not globally unique; only Owners change roles; Owner and Admin Soft-archive and (if Community Private) manage invites; Soft-archived Community refuses invite consume and keeps tokens unless staff rotate; mail provider TBD.

Next step: vertical tickets. Do not implement until tickets exist and an implementer is asked to run them.
