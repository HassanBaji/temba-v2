Status: ready-for-agent

## Problem Statement

Inviting people into a Community, Group, or Team is split across too many doors. Staff send **Email invites** to unknown addresses, copy never-expire **Invite links** they must rotate or revoke, and (for Teams) pick between an in-app door and an Email invite that does not show on My Teams even when the User already exists. Phone and username cannot find a User. Public types cannot share an Invite link. Incomplete Teams have no Invite link at all.

Players want two ways only: look up someone who already has a Temba account, or copy a short-lived link. They do not want named email or phone invites, and they do not want to manage revoke or rotate on the link.

## Solution

Replace named **Email invite** (and phone-as-invite-target) with two doors everywhere this spec touches:

1. **Lookup invite** — search an existing **User** by username, email, or phone, then send an in-app invite they must accept. Staff who can send may revoke unused Lookup invites.
2. **Invite link** — each copy mints a new token that expires 6 hours after mint. Older tokens stay live until each expires. No rotate or revoke UI. Any authenticated User may use a live token; it admits immediately.

Unknown people (no matching User) cannot be lookup-invited. They join only via a live Invite link after Clerk sign-in or sign-up.

These doors apply to every Community (Public and Private), every Group type, and every incomplete Team. Existing Public join doors stay: Community Public request-to-join, Loose Group Public **Group URL**, Club Group Public Member-join. Lookup invite and Invite link are extra.

Club Group Owner or Admin Lookup invite / Invite link **auto-admits** the User as Community **Member**, then joins the Club Group. The Club Group creator is not a Community admitter: Members-only Lookup invite, no Club Group Invite link.

Approving this spec approves the Test seams in Testing Decisions. It **amends** padel-teams (Email invite door, no Team Invite link, one unused Team door vs Email) and the Community/Group invite product in `.scratch/community/spec.md`.

## User Stories

1. As an Owner or Admin of a Community Public, I want to look up an existing User by username, email, or phone and send a Lookup invite, so that I can invite someone who already has an account without using email.

2. As an Owner or Admin of a Community Private, I want to send a Lookup invite the same way, so that Private clubs no longer need a named Email invite.

3. As an Owner or Admin of a Community Public or Private, I want to copy an Invite link, so that I can share a door with people who may not be Users yet.

4. As a User who is only a Member (not Owner or Admin), I want Community Lookup invite and Invite link minting to be refused, so that staff still admit people to the club.

5. As the creator of a Loose Group Public or Loose Group Private, I want to send Lookup invites and copy Invite links, so that both Loose Group types share the same two doors.

6. As anyone who is not that Loose Group’s creator, I want Loose Group Lookup invite and Invite link minting to be refused.

7. As an Owner or Admin, I want to send a Club Group Public or Club Group Private Lookup invite to any existing User, so that accepting auto-admits them as a Community Member and then joins the Club Group.

8. As an Owner or Admin, I want to copy a Club Group Invite link (Public or Private), so that a live token admits a non-Member to the Community and that Club Group in one accept.

9. As the creator of a Club Group who is not Owner or Admin, I want to Lookup-invite only Users who are already Community Members, so that I cannot admit people to the Community.

10. As the creator of a Club Group who is not Owner or Admin, I want minting a Club Group Invite link to be refused, so that an anonymous 6h URL cannot skip Owner/Admin.

11. As a Community Member who is not staff and not that Club Group’s creator, I want Club Group Lookup invite and Invite link minting to be refused.

12. As the creator of an incomplete Team, I want to send a Lookup invite for the open seat, so that my partner can accept in-app.

13. As the creator of an incomplete Team, I want to copy a Team Invite link, so that any authenticated User can take the open seat.

14. As anyone who is not that incomplete Team’s creator, I want Team Lookup invite and Invite link minting to be refused.

15. As the creator of a full Team, I want Lookup invite and Invite link minting to be refused, so that a two-seat Team cannot grow a third member.

16. As a User sending a Lookup invite, I want search to resolve exactly one existing User (email case-insensitive, username case-insensitive, phone exact on the stored Clerk primary), so that I am not browsing a User directory.

17. As a User whose search matches nobody, I want send to be refused with no invite row, so that unknown people use Invite link only.

18. As a User whose search would match more than one User, I want send to be refused, so that lookup never picks the wrong person.

19. As a User looking up someone already a Member of that Community, already in that Group, or already on that Team, I want send to be refused.

20. As a User sending a second unused Lookup invite to the same User on the same Community, Group, or Team, I want send to be refused, so that I revoke first instead of stacking invites.

21. As the creator of an incomplete Team, I want Lookup invite send to be refused if the unordered pair with that User is already a Team or reserved, so that global pair uniqueness holds at send for named invites.

22. As a User with an unused Lookup invite addressed to me, I want to see it on a personal **Invites** dashboard page, so that I can accept without opening a Private home I cannot see yet.

23. As a User with unused Lookup invites from a Team, a Group, and a Community, I want all of them on that one Invites page, so that I do not hunt three hubs.

24. As a User on Invites, I want to accept a Lookup invite and become a Member / Group member / Team member according to the entity, so that Lookup invite is not auto-join.

25. As staff who can send Lookup invites, I want unused Lookup invites listed on the entity home with revoke, so that a wrong named invite does not stay live.

26. As staff, I want Lookup invites to have no 6-hour timer, so that expiry is only for Invite links.

27. As an invitee, I want Invite links absent from the Invites page, so that that list is Lookup invites only.

28. As staff copying an Invite link, I want the first copy to mint a token and start a 6-hour clock, so that the door dies on its own.

29. As staff copying an Invite link again during the window, I want a **new** token with its own 6-hour clock, so that recopy is not revoke and does not extend old tokens.

30. As staff, I want the UI to show and copy only the newest token, so that I am not managing a list of live URLs.

31. As a User who still has an older copied URL, I want that older token to work until its own 6 hours elapse, so that recopy does not kill a link I already shared.

32. As staff, I want no rotate or revoke controls on Invite links, so that I am not managing link lifecycle beyond copy.

33. As any authenticated User with a live Community or Group Invite link, I want accept to join immediately as Member or Group member (no request), so that Invite link stays a door.

34. As a signed-out person opening `/invites/community/link/[token]`, `/invites/group/link/[token]`, or `/invites/team/link/[token]`, I want to sign in or sign up with Clerk and then join if the token is still live, so that Temba is not an identity provider.

35. As a User opening an expired or invalid Invite link, I want a dead state that does not join anyone, so that a stale URL is not a door.

36. As a User of a Community Public who only has the Community URL, I still want to request-to-join, so that Invite link does not replace that queue.

37. As an authenticated User with a Loose Group Public Group URL, I still want to join via that Group URL, so that Group URL stays distinct from Invite link.

38. As a Community Member of a Club Group Public, I still want to join that Group without an invite, so that Member-join remains.

39. As a User accepting an Owner/Admin Club Group Lookup invite or Invite link who is not yet a Community Member, I want to be auto-admitted as Member and then joined to the Club Group, so that Club Group admit can bring someone into the club.

40. As a User accepting that auto-admit, I want the Community role to be Member (not Owner or Admin), so that staff roles are not granted by Group invite.

41. As a User who is not a Community Member hitting a Club Group Invite link minted by Owner/Admin, I want the same auto-admit-then-join, so that the anonymous door matches Lookup invite.

42. As a Club Group creator (not Owner/Admin) sending Lookup invite, I want a non-Member to be refused, so that I cannot auto-admit.

43. As a User accepting a Community or Loose Group Lookup invite, I want to join only that entity (no extra Community membership from a Loose Group), so that auto-admit is Club Group plus Team-link-approve only.

44. As the creator of an incomplete Team, I want a pending Lookup invite and live Invite link tokens to coexist, so that I can name a partner and still share a link.

45. As any authenticated User with a live Team Invite link, I want first successful accept to fill the open seat, so that the Team becomes full.

46. As a User, I want that successful Team fill to kill all live Team Invite link tokens and unused Team Lookup invites, so that leftover 6h URLs cannot target a full Team.

47. As a User accepting a Team Invite link, I want accept to be refused without consuming that token if I am already the member, the Team is full, the linked Community is Soft-archived, or the unordered pair is already a Team or reserved, so that a failed click is not a revoke.

48. As a User joining a Group or Community via Invite link, I want other live tokens for that entity to stay valid until each expires, so that many-seat doors keep Q13-C occupancy.

49. As a User of a Soft-archived Community, I want Lookup send, Lookup accept, mint Invite link, and accept Invite link to be refused for that Community and its Club Groups, so that archive still pauses admit.

50. As a User on a Team linked to a Soft-archived Community, I want Team Lookup invite and Invite link mint/accept to be refused; as a User of an unattached Team, I want those doors unchanged.

51. As an allowed viewer, I still want to open a linked Team while the Community is Soft-archived, so that archive is not data loss.

52. As a User, I want leftover Email invite URLs (`/invites/.../email/[token]`) to refuse join after this ships, so that Email invite is gone as a door.

53. As a User, I want never-expire Invite links from before this spec to be invalid immediately, so that every live URL follows the 6-hour rule.

54. As a User with an unused Lookup invite that already existed (Team or Club Group Private in-app rows), I want that invite to remain until I accept or staff revoke, so that named in-app invites are not wiped.

55. As a User signing in, I want Temba to persist Clerk username and primary phone onto my User (and refresh them on later resolve), so that Lookup invite search by those keys can match.

56. As a User whose Clerk account has no username or no phone, I want those search keys to miss while email still works, so that lookup degrades honestly.

57. As a User, I want no SMS and no mail send for invites, so that copy URL and in-app accept are the only delivery.

58. As a User on dashboard, I want a sidebar **Invites** item opening `/dashboard/invites`, so that pending Lookup invites have a home next to Home, Groups, Teams, Communities (and Venues for Operators).

59. As a User on My Teams, I want that page to list Teams I sit on, not pending Lookup invites, so that pending lives on Invites.

60. As a User who is not yet a member, I want Private Community, Loose Group Private, and Loose Team homes to stay closed except Invite-link accept pages, so that Lookup invite accept happens on Invites.

61. As an Owner or Admin minting a Community Public Invite link, I want using it to skip request-to-join and admit immediately, so that staff can still choose the queue or the door.

62. As a User already a Member using a Community Invite link, I want accept to be refused without joining twice, and without being the thing that expires every other token.

63. As a developer of later slices, I want Email invite send/accept/UI gone and Invite link unique-one-active indexes gone, so that we do not keep two unused Team invite tables as parallel product doors.

## Implementation Decisions

- Schema, migrations, and kit stay in the DB Package. App tRPC and dashboard UI stay in the Temba App. No new Package. Clerk remains the only identity provider.

- **Glossary:** Update root `CONTEXT.md` with this spec (Lookup invite; Invite link 6h/many tokens/no revoke, all listed entity types; Email invite retired; Community Public/Private, Club Group Public/Private, Loose Group Public/Private, Team incomplete seat). Do not add “unified invite” or “phone invite” as product terms. Phone is a Lookup invite search key.

- **Lookup invite tables:** Keep Group and Team member-invite tables (User-keyed, unused unique per entity+User, `invitedBy`, `acceptedAt`, `revokedAt`). Add Community member invites with the same shape. Do not bind Lookup invites to email or phone on the row; resolve User at send.

- **Lookup send:** One search string. Resolve exactly one User: case-insensitive exact email; case-insensitive exact username; phone exact on stored Clerk primary. 0 or >1 → refuse. Already member → refuse. Unused duplicate → refuse. Team also refuse reserved/existing pair at send. Group creator Club Group send: refuse if invitee is not already a Community Member. Owner/Admin Club Group send: allow non-Members (auto-admit on accept).

- **Lookup accept:** Invitee must accept. Community/Loose Group: insert membership only. Owner/Admin Club Group (invitee not yet Member): in one transaction, insert Community Member then Group membership. Group-creator Club Group accept: invitee must already be a Member (else refuse; do not consume if you can still revoke — prefer refuse without accepting). Team: insert second member; then revoke/expire all unused Team Lookup invites and all live Team Invite link tokens.

- **Lookup revoke:** Allowed for the same staff who could send on that entity. No 6h expiry on Lookup invites.

- **Invite link tables:** Keep Community and Group Invite link rows; add Team Invite links. Each row: entity id, createdBy, token (unique), createdAt, **expiresAt** (= createdAt + 6 hours). Drop “one active per entity” unique indexes. Many live tokens per entity are allowed. No User-facing revoke/rotate; do not require staff `revokedAt` for the new product (expiry and Team seat-fill are the kills). On Team successful fill, mark all live Team tokens unusable (expire now, or equivalent).

- **Mint/copy:** Authorized staff only (matrix in Solution / stories). Each copy inserts a new token. API returns the newest live token URL for the clipboard. UI displays only that newest URL. Full Team cannot mint. Soft-archived Community (and its Club Groups) cannot mint. Linked Team on Soft-archived Community cannot mint.

- **Invite link accept:** Existing invite-shell pages; add Team path `/invites/team/link/[token]`. Keep `/invites/community/link/[token]` and `/invites/group/link/[token]`. Signed-out → Clerk, then consume if `now < expiresAt` and rules pass. Any authenticated User. Admits immediately. Club Group Owner/Admin token: auto-admit Member then join Group. Group/Community: successful join does not kill sibling tokens. Team: first successful fill kills all Team tokens and unused Team Lookup invites. Refuse **without consuming** if already member/full/Soft-archive/reserved pair (Team). Expired/invalid → dead copy, not a join.

- **Authorization matrix (lock):**
  - Community Public and Private: Owner/Admin Lookup + Invite link.
  - Loose Group Public and Private: creator only, both doors.
  - Club Group Public and Private: Owner/Admin both doors (auto-admit). Group creator: Lookup of existing Members only; **no** Invite link.
  - Incomplete Team: creator only, both doors.
  - Do not expand to every Member.

- **Public join doors (additive):** Keep Community Public request-to-join, Loose Group Public Group URL join, Club Group Public Member-join. Invite link is a second URL, not a rename of Group URL.

- **Identity:** On User resolve (create and later update): persist Clerk primary email (lowercase, already), Clerk username as given, Clerk primary phone as given, and phone verified if Clerk says so. Not a Temba-owned username. No E.164 product.

- **Personal Invites:** Dashboard page `/dashboard/invites` plus sidebar item. Lists unused Lookup invites for the viewer across Community, Group, and Team. Accept (and none of the Invite link tokens). My Teams pending Lookup invites move here; My Teams remains Teams you sit on. Entity home keeps staff unused Lookup list + revoke + copy newest Invite link. Remove Email invite forms, rotate/revoke link buttons, and Team’s two named-email forms.

- **Retirement on ship:** Unused Email invites cannot be accepted; leftover email-token routes refuse. Existing never-expire Invite links are invalid immediately (expire-now or equivalent). Next copy mints 6h tokens. Remove Email invite send tRPC, mail stubs for invites, and accept UI. Team Email invite table and Group/Community Email invite tables stop being a product door (leave rows inert or stop reading them; do not accept).

- **Expiry enforcement:** Check-on-read (list newest, accept, mint). No expiry worker required.

- **Soft-archive:** ADR-0005 stands. Refuse Lookup send/accept, mint, and Invite-link accept for archived Community and its Club Groups; refuse invite/accept on already linked Teams; unattached Teams OK; viewers still open linked Team history.

- **Pair uniqueness:** Unchanged. Team Invite link is anonymous until accept; check on accept; refuse without consuming.

- **UI:** Reuse existing primitives (lists, buttons, toasts, invite-shell). No visual redesign. Copy newest URL to clipboard on mint (same idea as today’s copy). Padel-only UI lock unchanged.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): an authenticated User can admit people to Community, Group, and incomplete Team by Lookup invite (search existing User, accept from Invites, staff revoke) and by 6-hour Invite link (copy newest token, concurrent older tokens still work until 6h, no revoke UI), with Email invite gone — without Temba acting as an identity provider, without SMS, and without removing Public request-to-join / Group URL / Club Group Public Member-join.

If you implement this spec, you implement these seams:

- Lookup miss refuses; exact email/username/phone match; already-member and duplicate unused refuse
- Clerk username and primary phone persist so those keys can match; missing Clerk username/phone → that key misses, email still works
- Staff matrix: Community Owner/Admin; Loose Group creator; Club Group Owner/Admin vs Group creator (Members-only Lookup, no Invite link); incomplete Team creator only; full Team cannot invite
- Community Lookup invite: pending on Invites; accept joins Community only; staff revoke on Community home
- Owner/Admin Club Group Lookup/Invite link of a non-Member: auto-admit Member then Group; Group creator cannot
- Invite link: each copy new token; UI newest only; older URL live until its 6h; no rotate/revoke; expiry on accept
- Signed-out Invite link: Clerk then join if live; expired/invalid dead; Team path exists
- Public additive: request-to-join, Loose Group Public Group URL, Club Group Public Member-join still work; Invite link admits immediately including Community Public
- Team: Lookup and live links coexist; first successful accept fills seat and kills all Team tokens and unused Team Lookup invites; refuse without consuming on pair/full/already-member/Soft-archive linked
- Soft-archive refuse on Community/Club Group/linked Team invite doors; unattached Team OK
- Email invite URLs refuse; old never-expire Invite links invalid; unused in-app Lookup rows remain
- Invites sidebar page lists Lookup invites only; My Teams is membership not pending

Manual check: existing Community, Group, Team, Home, Venues (Operator), login, Soft-archive, and Route `/public` still redirect to login.

### Modules under that seam

DB Package invite and User identity columns; App tRPC for lookup/link/pending; dashboard Invites page and entity-home invite chrome; Invite link accept pages (including Team); `resolveAppUser` Clerk username/phone — only as they affect the flows above.

### Prior art

Community and Group Invite link accept shells, Club Group Private in-app member invites, Team in-app invites and My Teams pending, Soft-archive refuse patterns, padel-only UI. No automated tests.

## Out of Scope

- SMS; named Email invite or phone-as-invite-target; choosing a mail vendor; Temba as identity provider
- User directory or prefix/partial search; E.164 / last-digits phone product; Temba-owned username distinct from Clerk
- Invite-link revoke/rotate UI; listing all live tokens in the UI
- Removing Community Public request-to-join, Loose Group Public Group URL, or Club Group Public Member-join
- Letting every Member mint invites; letting Club Group creator auto-admit to the Community
- Partner replace without dissolve; Lookup invite or Invite link on a **full** Team; Soft-archive of Teams
- Merging all invite tables into one polymorphic table; expiry worker; visual redesign; CI / test runner
- Changing Game completion, Directory, Community sports, Venue link, or Operator Venue catalog
- Auto-join from Lookup invite (must accept); granting Owner/Admin via auto-admit

## Further Notes

Glossary: Root `CONTEXT.md` (this spec). Soft-archive: ADR-0005 stands (invite consume refused while archived). ADR-0004 (Group parent immutable) untouched. Teams still diverge from ADR-0004 via link/unlink (padel-teams).

Amends `.scratch/padel-teams/spec.md` locks: Email invite door; no Team Invite link; Team in-app vs Email as two named-email forms; Invite link = non-goal; SMS/phone as invite channel. Does not reopen Team size, pair uniqueness, link/unlink, or stats.

Amends `.scratch/community/spec.md` invite doors: Email invite; never-expire one-active Invite link with rotate/revoke; Community Public “no Invite link”; Club Group Private in-app of Members only; Loose Group Private Email invite. Does not reopen Community create, roles, Directory-as-planned, or Group parent.

Settled grilling: conversation that produced this spec (rounds through shared-understanding confirm).

Locked defaults: Invites page + sidebar; check-on-read 6h; Clerk primary phone; Clerk username as given; Invite link URL patterns above; Email invite UI/tRPC/accept gone on ship.
