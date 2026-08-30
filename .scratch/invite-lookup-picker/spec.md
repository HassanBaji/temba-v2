Status: ready-for-agent

## Problem Statement

Lookup invite is supposed to let staff **choose existing Users** and invite them. What shipped is an exact-match text field: type a full username, email, or phone, send one User, or get “Lookup did not match exactly one User.” There is no list, no partial search, and no way to invite several people in one submit. Game home duplicates that field (label “User”) instead of the shared panel. On a Game that already has a Group, Group members are not ranked first.

The same exact-match field is the Partner input on individual Friendly game / tournament register-with-partner (and waitlist-with-partner). That is not a Lookup invite — it seats or waitlists immediately — but it has the same “guess the exact string” pain.

Players who already have Temba accounts should be findable in a dropdown. Unknown people still use Invite link. This spec does not add a global User directory page.

## Solution

Replace exact-match Lookup send (and the Partner exact-match field) with a **searchable select** of existing Users the actor is allowed to choose:

1. **Lookup invite** — staff who may send search an authorized typeahead, select one or more Users (incomplete Team: one), send unused Lookup invite rows. The invitee still accepts on Invites. Invite link is unchanged.
2. **Partner pick** — a User who can register-with-partner on an individual Friendly game or tournament uses the **same single-select chrome** to pick one existing User, then Register or Join waitlist. That action is **not** a Lookup invite: both Users register or waitlist immediately; no accept on Invites.

Typeahead lists matches as you type. Empty query shows a bounded first page of 20, not every User. No load more. No infinite scroll. No Directory-style page of all Users.

Community, Group, and Game Lookup invite are multi-select (chips + dropdown checklist, max 20 ids per send, partial success). Incomplete Team Lookup and partner pick are single-select (one chip, then the action).

On Games that have a Group: public Group Games rank Group members first (with a “Group member” cue) and still list other searchable Users; non-public Group Games list Group members only (existing send / join-gate rule). Groupless Games have no boost. Team-only Games still have no Lookup invite.

Approving this spec approves the Test seams in Testing Decisions. It **amends** `.scratch/invite-lookup-and-link/spec.md` (story 16 and Out of Scope “User directory or prefix/partial search”) and the Game Lookup / partner-lookup product in `.scratch/games-matches/spec.md` and `.scratch/individual-game-seats/spec.md` (how the User is chosen only). It does **not** rewrite those specs in place.

## User Stories

1. As an Owner or Admin of a Community, I want to search existing Users in a dropdown and send Lookup invites, so that I do not have to type an exact username, email, or phone.

2. As an Owner or Admin of a Community, I want to select several Users and send Lookup invites in one submit, so that I can invite a handful of people without repeating the form.

3. As a Member who is not Owner or Admin, I want Community Lookup search and send to be refused, so that staff still admit people to the club.

4. As the creator of a Loose Group, I want the same searchable Lookup invite picker, so that Loose Group admit matches Community except for who may send.

5. As anyone who is not that Loose Group’s creator, I want Loose Group Lookup search and send to be refused.

6. As an Owner or Admin of a Club Group, I want the searchable picker to include Users who are not yet Community Members, so that accepting can still auto-admit as Member then join the Group.

7. As the creator of a Club Group who is not Owner or Admin, I want the picker to list only existing Community Members, so that I cannot admit people to the Community.

8. As a Community Member who is not staff and not that Club Group’s creator, I want Club Group Lookup search and send to be refused.

9. As the creator of an incomplete Team, I want a searchable single-select of existing Users for the open seat, so that I pick my partner from a list instead of guessing their exact identifier.

10. As the creator of an incomplete Team, I want selecting more than one User to be impossible, so that a two-seat Team cannot grow a third member.

11. As anyone who is not that incomplete Team’s creator, I want Team Lookup search and send to be refused.

12. As the creator of a full Team, I want the Lookup picker not to be offered, so that a full Team still cannot invite.

13. As a Game organizer on an individual Game, I want the same searchable Lookup invite picker on Game home, so that Game Lookup is not a second exact-match text field.

14. As a Game organizer, I want Game home to use the shared Lookup invite panel (picker), so that Community, Group, Team, and Game do not drift.

15. As a User sending a Lookup invite, I want matches as I type, so that a prefix or partial name is enough.

16. As a User who has not typed yet, I want a first page of at most 20 allowed Users (alphabetical, unless Game ranking applies), so that I can browse without dumping every User in Temba.

17. As a User whose query still matches more than 20 people, I want only 20 rows and no “load more”, so that I type more to narrow instead of scrolling the whole table.

18. As a User searching by name or username, I want case-insensitive contains match on name and username, so that I do not need an exact string.

19. As a User whose query looks like an email, I want email to match and email to show on the row, so that pasting a known address still finds that User.

20. As a User whose query looks like a phone, I want phone to match and phone to show on the row, so that pasting a known number still finds that User.

21. As a User searching by name, I want email and phone omitted from rows and not used as match keys, so that a name search is not a PII dump.

22. As a User looking at a result row, I want to see name and username, so that I can tell people apart without always seeing email.

23. As a User sending a Lookup invite, I want myself excluded from the list, so that I cannot invite myself.

24. As a User sending a Community Lookup invite, I want people who are already Members, or who already have an unused Lookup invite on that Community, hidden, so that I only see people I can still invite.

25. As a User sending a Group Lookup invite, I want people already in that Group, or with an unused Group Lookup invite, hidden.

26. As a User sending a Team Lookup invite, I want people already on that Team, or with an unused Team Lookup invite, hidden.

27. As a Game organizer sending a Game Lookup invite, I want Users already registered or waitlisted on that Game, or with an unused Game Lookup invite, hidden, so that I do not invite people who cannot accept.

28. As a Game organizer of a **public** Group Game, I want Group members listed first with a “Group member” cue, and other allowed Users still listed, so that I can prefer people already in the Group without being stuck inside it.

29. As a Game organizer of a **non-public** Group Game, I want the picker to list Group members only, so that invites do not widen that Game.

30. As a Game organizer of a groupless Game, I want no Group-member boost, so that ranking is not invented where there is no Group.

31. As a Game organizer of a team-only Game, I want no Lookup invite picker, so that a User-shaped Lookup still cannot drag in a partner.

32. As a User on Community, Group, or Game Lookup invite, I want selected people as chips above the dropdown and a checklist in the list, so that I can see who I am about to invite.

33. As a User on incomplete Team Lookup invite, I want one selected User as a chip, then Send, so that Team stays one partner.

34. As a User sending Community, Group, or Game Lookup invites, I want one submit to create one unused Lookup invite row per selected User (max 20), so that I am not capped at one invite per click beyond that page size.

35. As a User who still has more people to invite after a batch of 20, I want to send again, so that the cap is per submit, not per entity forever.

36. As a User whose batch includes people who became ineligible (already member, unused invite, not allowed), I want the valid targets sent and the refused ones named, so that one conflict does not block the whole batch.

37. As a User whose entire batch is refused, I want named errors and no invite rows, so that I know why nobody was invited.

38. As an invitee, I want each Lookup invite from a batch to appear on Invites and to require accept, so that multi-send is not auto-join.

39. As staff who can send, I want unused Lookup invites still listed on the entity with revoke, so that a wrong named invite does not stay live.

40. As an Owner or Admin whose Club Group Lookup invite is accepted by a non-Member, I want auto-admit as Member then Group join to stay as shipped, so that picker-vs-exact-match does not change admit.

41. As a User who is not yet a member, I want Private homes to stay closed except Invite-link accept; Lookup accept stays on Invites.

42. As staff copying an Invite link, I want mint-on-copy, 6-hour tokens, no revoke, and unknown people still using that door, so that this spec does not touch Invite link.

43. As a User who cannot send Lookup invites, I want Lookup search to be refused the same way send is refused, so that there is no wider User directory behind search.

44. As any User, I want no global page that lists all Temba Users, so that search exists only as the send (or partner) door.

45. As a User who can register on an individual Friendly game or tournament, I want to pick a partner from the same searchable single-select as Team Lookup, so that I do not type an exact partner string.

46. As a User registering with a partner, I want one chip and then Register (or Join waitlist), not Send Lookup invite, so that I do not confuse seating with an invite.

47. As a User registering with a partner, I want us both to register or waitlist **immediately**, so that partner pick is not an accept-on-Invites flow.

48. As a User joining the waitlist with a partner when the Game is full, I want the same partner typeahead, so that waitlist-with-partner is not left on exact-match.

49. As a User picking a partner, I want myself, already-registered Users, waitlisted Users, and Users who fail the Game join gate hidden, so that I only see people who can sit with me.

50. As a User picking a partner on a public Group Game, I want Group members first with a “Group member” cue, and other allowed Users still listed.

51. As a User picking a partner on a non-public Group Game, I want Group members only, so that the join gate is visible in the list.

52. As a User picking a partner on a groupless Game, I want no Group-member boost.

53. As a User who cannot register-with-partner, I want partner search refused, so that partner typeahead is not a public directory.

54. As a User on register-with-partner, I want vacant-side and Position pickers unchanged, so that this spec only replaces how the partner User is chosen.

55. As a User of an Americano, I want no partner picker, so that Americano stays individual-only.

56. As a User of a team-only Game, I want to register a complete Team, not a partner typeahead or Lookup invite.

57. As a User of a Soft-archived Club Group Game or a Community/Group/Team whose invite doors are closed by Soft-archive, I want Lookup search, Lookup send, and partner pick not offered (and refused if called), so that archive still pauses admit and join.

58. As a User of a cancelled Game, I want Lookup invite and partner pick not offered.

59. As a User whose search matches nobody I am allowed to choose, I want an empty list and no send, so that unknown people still use Invite link (Lookup) or seat-pick solo / Invite link (Game), not a invented User.

60. As a User sending Lookup invites, I want the old “Lookup did not match exactly one User” exact-match door gone from Lookup UI, so that the picker is the only Lookup send UI.

61. As a User registering with a partner, I want the old partner exact-match field gone, so that the typeahead is the only partner-identity UI.

62. As a Club Group creator (not Owner/Admin) searching, I want non-Members absent from the list even if their name matches, so that hide rules win over contains match.

63. As a Game organizer on a non-public Group Game, I want non-members absent from Lookup search even if their name matches.

64. As staff, I want Lookup invite still to have no 6-hour timer, so that expiry stays Invite-link-only.

65. As an invitee, I want Invite links still absent from the Invites page.

66. As a User on Community or Group Lookup, I want empty-query order to be alphabetical (name, then username), so that only Game surfaces boost Group members.

67. As a User who pastes a known username that is a contains match for several people, I want up to 20 rows to pick from, so that lookup never silently picks the wrong person.

68. As a User sending a second unused Team Lookup invite while one is already live (any User), I want send refused until I revoke, so that Team’s one-unused-invite rule stays.

69. As a developer of later slices, I want no new glossary noun for the shared control, so that CONTEXT.md does not grow a “User picker” entity.

## Implementation Decisions

- Schema, migrations, and kit stay in the DB Package. App tRPC and dashboard UI stay in the Temba App. No new Package. Clerk remains the only identity provider. **No schema change:** Lookup invite tables stay User-keyed, unused unique per entity+User. Incomplete Team still has unique one unused invite for the whole Team. Partner register still writes Game players / Waitlist, not invite rows.

- **Glossary:** Update root `CONTEXT.md` Lookup invite to: “An in-app invitation to an existing User, chosen from a searchable list of Users the sender is allowed to invite. The invitee must accept. Staff who may send may revoke unused Lookup invites. Community, Group, and Game allow selecting more than one User per send; incomplete Team allows one.” `_Avoid_`: Email invite, phone invite, magic link, Invite link, User directory (there is no global directory page; search is the send door only). Do **not** add “User picker”, “directory search”, or similar. Partner pick is UI chrome on register-with-partner, not a domain noun.

- **Amend, do not rewrite in place:** `.scratch/invite-lookup-and-link/spec.md` story 16 (exact-one resolve so the sender is “not browsing a User directory”) and Out of Scope “User directory or prefix/partial search” are superseded for Lookup invite UI and search. Unknown people still cannot be Lookup-invited; Invite link remains that door. `.scratch/games-matches/spec.md` Game Lookup invite (existing User, accept required, revoke unused, team-only refuse, non-public Group Game members only, Soft-archive refuse) stays; only **how the User is chosen** changes (searchable picker, multi-send cap 20). `.scratch/individual-game-seats/spec.md` register-with-partner (vacant side, caller Position, both pass join gate, waitlist two FIFO rows when full) stays; partner identity is a User id from the typeahead, not `partnerQuery` exact-match. Soft-archive ADR-0005, Club Group auto-admit, Team pair uniqueness, Game join gates, accept, and revoke are unchanged except how the User is chosen.

- **Search vs send:** Search is a separate authorized query per surface. Empty query is allowed. Limit 20. Send no longer takes a search string. Community / Group / Game send take `userIds` (UUID array, min 1, max 20). Incomplete Team send takes one User id (max 1). `registerWithPartner` takes `partnerUserId` instead of `partnerQuery`. Side index and Position on partner register stay as shipped. If `resolveLookupUser` (exact email/username, exact phone) is unused after these doors move, remove it; do not leave exact-match as the Lookup or Partner UI.

- **Search authorization (lock):** Lookup search is authorized **identically** to Lookup send. Community Public and Private: Owner/Admin. Loose Group Public and Private: creator only. Club Group Public and Private: Owner/Admin (any User they may invite); Group creator: Community Members only; other Members: refuse. Incomplete Team: creator only; full Team: refuse. Game: organizers; team-only: no Lookup search. Soft-archive / closed invite doors: refuse. Unauthorized search → refuse (same as send), not an empty list pretending the User cannot see the door. Partner search: anyone who can register-with-partner on that Game (individual Friendly game or tournament, registration open, join gate, not already registered/waitlisted as the caller). Not organizers-only. Americano and team-only: no partner search.

- **Hide filters (search must not return these rows):** Lookup: self; already Member / Group member / Team member / registered **or waitlisted** on the Game; unused Lookup invite already live on that entity; Club Group creator Members-only (non-Members hidden); non-public Group Game non-members. Partner: self; already registered or waitlisted; fail Game join gate (including non-public Group Game non-members). Team-only Game and Soft-archive / closed / cancelled: picker not offered; procedures refuse.

- **Matching:** Trim the query. Empty query: no text filter; apply hide filters; order as below; cap 20. Non-empty: case-insensitive **contains** on name and username. **Email-like:** query contains `@` — also match email case-insensitively (contains); include email on those rows. **Phone-like:** after stripping spaces, hyphens, and parentheses, the remainder is an optional `+` plus digits, length ≥ 6 — also match stored phone (contains on the stripped forms); include phone on those rows. Name/username searches must not match or display email or phone. Cap 20 after filter and rank.

- **Ranking / empty-query order:** Community, Group, Team Lookup: alphabetical by name, then username. Game Lookup and partner pick on a **public** Group Game: Group members first (stable, then alphabetical within each band), then other allowed Users; rows that are Group members show a “Group member” cue. **Non-public** Group Game: Group members only (join-gate / send rule); alphabetical. Groupless: alphabetical, no boost.

- **Batch send / partial success:** For each id, apply existing per-entity refuse rules (already member, unused duplicate, not allowed, self, Team pair reserved, Team one-unused-invite, Game already on Game/waitlist, etc.). Insert unused Lookup invite rows for every still-valid id. Return sent ids and refused targets **by name** with the same messages send uses today. Do not roll back successful inserts because a sibling id failed. If every id is refused, insert nothing and still return the named refusals (not a single exact-match error). Client shows refused names without blocking display of who was sent. Races (someone joined between search and send) use these same named errors.

- **Team:** Single-select only. Unique unused invite per Team+User **and** unique one unused invite for the whole Team remain. A second send while any unused Team Lookup invite is live is refused until revoke.

- **Partner action:** Not a Lookup invite. One selected User id. Submit is Register or Join waitlist as shipped (two Waitlist User rows when full; each promotes alone). No Invites row. No accept. Vacant-side + caller Position remain required while the Game is open; waitlist-with-partner when full stays. Both caller and partner must pass the join gate at submit even if search already hid disallowed Users.

- **UI chrome:** One small shared control for this feature (justified: the App has Input, Select, DropdownMenu, Checkbox, Badge, Button, Field; Venue search is Input + RowList, not a dropdown combobox; there is no Combobox/Command/Popover/cmdk). Do not add a new Package. Prefer existing primitives; add cmdk only if those cannot do chips + dropdown checklist. Do not name the control in CONTEXT.md. **Multi-select:** chips/tokens of selected Users above the dropdown, checklist in the list, then Send Lookup invite. **Team and Partner:** one chip, then Send Lookup invite / Register / Join waitlist. Game Lookup invite uses this control inside the **shared** Lookup invite panel; remove Game home’s duplicate inline exact-match form. Invite link panels stay. Side and Position Selects on partner register stay.

- **Identity columns:** Still Clerk-persisted email, username, phone as shipped. No Temba-owned username. No E.164 product. Missing username or phone: that key misses; name and email can still match.

- **Padel-only UI lock, no visual redesign** of the rest of the App. This spec is the picker on existing invite and partner surfaces only.

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): Staff who can send Lookup invites pick existing Users from an authorized typeahead (Group members first on public Group Games; Group members only on non-public Group Games), send one or many unused Lookup invites in one submit (Team: one). Invitees still accept on Invites. Invite link is unchanged. **Plus:** a User who can register on an individual Friendly game or tournament picks a partner from the same single-select typeahead and registers or waitlists immediately (not a Lookup invite). Exact-match-as-the-only door is gone from both Lookup invite UI and that Partner field.

If you implement this spec, you implement these seams:

- Community / Group / Game: typeahead, chips, multi-select send, cap 20, partial success with named refusals
- Incomplete Team: single-select one chip; full Team and non-creator refused; one unused Team invite rule holds
- Game home Lookup uses the shared panel; no second exact-match “User” field
- Empty query ≤ 20; type more to narrow; no load more; no global User directory page
- Contains name/username; email/phone match and display only when the query looks like those
- Hide: self, already on entity, waitlisted (Game), unused invite, Club Group creator Members-only, non-public Group Game non-members
- Public Group Game: Group members first + cue, other Users still listed (Lookup and partner)
- Team-only Game: no Lookup picker; Americano: no partner picker
- Unauthorized Lookup search refused like send (Member vs Owner/Admin, Loose Group non-creator, etc.)
- Partner search allowed for anyone who can register-with-partner; hidden disallowed Users; Register / Join waitlist immediate; no Invites row
- Waitlist-with-partner uses the same typeahead; two FIFO rows when full
- Accept still required for Lookup; Club Group Owner/Admin auto-admit unchanged; revoke unused unchanged
- Invite link mint/copy/accept unchanged
- Soft-archive / closed / cancelled: picker not offered; search and send refused
- Exact-match-only Lookup and partnerQuery UI gone

Manual check: existing Community, Group, Team, Game seat-join, Invite link, Invites accept, Soft-archive, login still work. Route `/public` still redirects to login.

### Modules under that seam

App tRPC search + send/register contracts; shared picker chrome and Lookup invite panel (including Game home); Game partner field; CONTEXT.md glossary line — only as they affect the flows above. No new invite tables.

### Prior art

Shipped Lookup invite send/revoke/accept and Invite link (invite-lookup-and-link); Game Lookup and register-with-partner (games-matches, individual-game-seats); Venue search dialog (Input + RowList, not a combobox); Select on Game home (Team picker, side/Position). No automated tests.

## Out of Scope

- Invite link (mint, copy, 6h, no revoke, accept)
- Email invite (already retired); SMS; Temba as identity provider
- A global User directory page, unbounded dump of every User, load more, infinite scroll
- Americano partner register (there is none)
- Team-only Game Lookup invite; Lookup invite or Invite link on a **full** Team
- Auto-join from Lookup invite; changing accept, revoke, Club Group auto-admit, Team pair uniqueness, or Soft-archive rules
- Changing vacant-side / Position rules, Waitlist FIFO, or seat-join solo
- Visual redesign of the rest of the App
- Adding cmdk or a new Package unless existing primitives cannot implement chips + dropdown
- E.164 / last-digits phone product; Temba-owned username distinct from Clerk
- Merging invite tables; expiry worker; CI / test runner

## Further Notes

Amends `.scratch/invite-lookup-and-link/spec.md` (story 16; Out of Scope directory / prefix search) and `CONTEXT.md` Lookup invite. Amends `.scratch/games-matches/spec.md` Game Lookup **choice UI** and `.scratch/individual-game-seats/spec.md` partner **identity** (`partnerQuery` → selected User id). Does not replace those specs. Does not reopen Invite link, Team size, pair uniqueness, or ADR-0005.

Settled grilling Q1–Q21 (Q11 override: partner picker in scope with Team-like single-select; Q12–Q16 and Q17–Q21 as recommended). Locked defaults: page/batch 20; chips + checklist; partial success; identical typeahead contract for Lookup and partner; Lookup search = send matrix; partner search = register-with-partner; no “User picker” glossary term.

## Implementation tickets (Linear)

All labelled `ready-for-agent`. Spec: `.scratch/invite-lookup-picker/spec.md`.

| # | Ticket | Blocked by |
|---|--------|------------|
| 1 | [TEM-82 Community Lookup invite picker](https://linear.app/temba-app/issue/TEM-82/community-lookup-invite-picker) | — |
| 2 | [TEM-83 Group Lookup invite picker](https://linear.app/temba-app/issue/TEM-83/group-lookup-invite-picker) | TEM-82 |
| 3 | [TEM-84 Incomplete Team Lookup invite picker](https://linear.app/temba-app/issue/TEM-84/incomplete-team-lookup-invite-picker) | TEM-82 |
| 4 | [TEM-85 Game Lookup invite picker](https://linear.app/temba-app/issue/TEM-85/game-lookup-invite-picker) | TEM-82 |
| 5 | [TEM-86 Game partner pick](https://linear.app/temba-app/issue/TEM-86/game-partner-pick) | TEM-85 |

Frontier: **TEM-82** only. Do not implement until an implementer / orchestrator is asked to run the tickets in order.
