# One endpoint per file under App tRPC routers

Status: ready-for-agent

Tickets (Linear, `ready-for-agent`): [TEM-134](https://linear.app/temba-app/issue/TEM-134/establish-one-endpoint-per-file-router-convention-ratings-exemplar) Establish one-endpoint-per-file router convention (Ratings exemplar) → then parallel [TEM-135](https://linear.app/temba-app/issue/TEM-135/move-usershome-into-a-users-router-folder) Move `users.home` into a users router folder ∥ [TEM-136](https://linear.app/temba-app/issue/TEM-136/move-game-list-create-and-byid-into-game-procedure-files) Move Game list, create, and `byId` into Game procedure files ∥ [TEM-140](https://linear.app/temba-app/issue/TEM-140/move-group-router-into-one-procedure-file-per-door) Move Group router into one procedure file per door ∥ [TEM-141](https://linear.app/temba-app/issue/TEM-141/move-community-home-members-and-soft-archive-adapters-into-community) Move Community home, Members, and Soft-archive adapters into Community procedure files ∥ [TEM-143](https://linear.app/temba-app/issue/TEM-143/move-team-router-into-one-procedure-file-per-door) Move Team router into one procedure file per door ∥ [TEM-144](https://linear.app/temba-app/issue/TEM-144/move-venue-operator-router-into-one-procedure-file-per-door) Move Venue Operator router into one procedure file per door; Game chain [TEM-136](https://linear.app/temba-app/issue/TEM-136/move-game-list-create-and-byid-into-game-procedure-files) → [TEM-137](https://linear.app/temba-app/issue/TEM-137/move-game-register-seats-and-waitlist-into-game-procedure-files) Move Game register, seats, and Waitlist into Game procedure files → [TEM-138](https://linear.app/temba-app/issue/TEM-138/move-game-organize-sets-and-level-range-into-game-procedure-files) Move Game organize, Sets, and Level range into Game procedure files → [TEM-139](https://linear.app/temba-app/issue/TEM-139/move-game-invite-adapters-into-game-procedure-files) Move Game Invite adapters into Game procedure files; Community chain [TEM-141](https://linear.app/temba-app/issue/TEM-141/move-community-home-members-and-soft-archive-adapters-into-community) → [TEM-142](https://linear.app/temba-app/issue/TEM-142/move-community-join-team-link-venue-link-and-invite-adapters-into) Move Community join, Team link, Venue link, and Invite adapters into Community procedure files; then [TEM-145](https://linear.app/temba-app/issue/TEM-145/alias-ui-read-models-from-routeroutputs) Alias UI read-models from `RouterOutputs` → [TEM-146](https://linear.app/temba-app/issue/TEM-146/integrate-and-verify-one-endpoint-per-file-routers) Integrate and verify one-endpoint-per-file routers.

This spec **supersedes** `.scratch/split-domain-router-files/spec.md` for *file placement of endpoint logic only*. Do not silently rewrite that file. Comment Linear TEM-106…TEM-118 that remaining placement work is superseded; do not close those issues from this program.

Approving this spec approves the Test seams in Testing Decisions and the Implementation Decisions below.

## Problem Statement

Maintainers and agents cannot read one App API door without bouncing. tRPC routers are thin assemblers in one fat file per domain. The work those assemblers call already lives under App server domain folders, one verb per file — so a register change is `games.ts` plus `server/games/register.ts` plus helpers. The previous file-cut optimized for a domain-verb tree with tRPC as a transport shell. That is the wrong locality for this codebase: the door a client calls should be the file a maintainer opens.

Users of the shipped App should see no product change. Public tRPC paths, payloads, copy, and status codes stay the same.

## Solution

Put each tRPC procedure in its own file under `api/routers/<domain>/`. Keep that door’s validation, authorization, business rules, database work, and response construction in that file. Router `index.ts` files only compose procedures.

Call existing shared glossary modules when the rule is genuinely reused across doors (Soft-archive, Game admit, Community membership, Invite doors, Friendly Game create, ratings/Glicko-2, Invite search-lookup, Venue logo storage, auth). Do not extract helpers, utilities, or extra layers to make files smaller. Inline helpers that have only one endpoint caller.

This is a wide expand–contract refactor. Product behaviour, Invite doors policy, Game admit, Soft-archive, and Community membership rules are not reopened.

## User Stories

### Maintainers and agents

1. As a maintainer, I want each tRPC procedure in its own file under the routers tree, so that I open one file for `games.register` instead of a fat assembler plus a twin domain verb.

2. As a maintainer, I want that procedure file to contain the door’s validation, authorization, rules, queries, and response, so that I do not jump through a parallel domain-verb tree to understand register or join.

3. As a maintainer, I want router index files to only compose procedures, so that the index stays small and is not a second hiding place for logic.

4. As an agent, I want endpoint-only domain verb files deleted after the move, so that `server/games/create.ts` does not remain as a forever-thin twin of `games.create`.

5. As an agent, I want no new helper/service/repository/use-case layer for this cut, so that the App API is not over-engineered.

6. As an agent, I want a helper used by only one endpoint inlined into that endpoint file, so that helper folders do not become junk drawers.

7. As a maintainer, I want a helper used by two or more endpoints to remain shared, so that require-Community, staff checks, and occupancy predicates are not copied.

8. As a maintainer, I want Game admit, Soft-archive, Community membership, Invite doors, and Friendly Game create to stay their own modules, so that procedure files call occupancy, freeze, membership, and token lifecycle instead of reimplementing them.

9. As a maintainer, I want Invite search-lookup, Venue logo storage, and `resolveAppUser` to stay shared, so that four hosts do not grow a second search or a second bucket client.

10. As a maintainer, I want no new Workspace Package for this cut, so that ADR-0002 (one App) still holds.

11. As a maintainer, I want public tRPC keys unchanged (`games.create`, `games.byId`, `games.register`, `communities.create`, …), so that existing clients keep compiling.

12. As a maintainer, I want filenames to default to the procedure key, so that `byId.ts` matches `games.byId`; descriptive names remain allowed when they help navigation.

13. As a maintainer, I want procedure files not imported by home, Invite doors, or RSC pages, so that the routers tree does not become a hidden domain barrel.

14. As a maintainer, I want leftover shared Game modules to stay under the existing Game server folder, so that admit and seats remain next to each other without moving under routers.

15. As an agent, I want the first router converted as a convention exemplar (Ratings), so that later batches copy one pattern instead of inventing a second.

16. As an agent, I want converting a fat router file into a folder to happen in the same change, so that `games.ts` never sits beside `games/index.ts`.

17. As a maintainer, I want leftover procedures to temporarily remain in that folder’s index during a serial chain, so that Games can move in batches without a red tree.

18. As a maintainer, I want demo `hello` and `getSecretMessage` to stay one-liners in their own Game procedure files, so that they are not promoted into domain verbs.

19. As a maintainer, I want `users.home` as `users/home.ts` plus a tiny index, so that one procedure does not spawn a `users` domain folder.

20. As a maintainer, I want Ratings `me` and `selfDeclare` each in their own file, so that Glicko-2 is not reshuffled while the router follows the convention.

21. As a maintainer, I want host Invite procedures to keep calling Invite doors only, so that Game, Group, Community, and Team do not grow a second mint/accept.

22. As a maintainer, I want Community Soft-archive/unarchive/leave procedures to keep calling Soft-archive `commit` and Community membership `leave`, so that freeze and leave stay one writer each.

23. As a maintainer, I want Game register/seat/Team/partner/Waitlist promote to keep calling Game admit, so that occupancy is not a fourth writer in the procedure file.

24. As a maintainer, I want Friendly create to keep calling `createFriendlyGame`, so that Americano/Friendly tournament remain a branch of the same `create` procedure.

25. As a maintainer, I want `AppRouter` top-level keys to stay `communities`, `games`, `groups`, `ratings`, `teams`, `users`, `venues`.

### Per-router coverage

26. As a maintainer, I want every Game procedure (hub lists, create, `byId`, register doors, organize, Sets, Level range, Courts, Invite adapters, demos) in the Game routers folder.

27. As a maintainer, I want every Community procedure (create, home, Members, roles, Soft-archive adapters, sports, mine, join requests, Team link, Venue link, Invite adapters) in the Community routers folder.

28. As a maintainer, I want every Group procedure (Club Group / Loose Group create, mine, `byId`, join, leave, empty delete, Invite adapters) in the Group routers folder.

29. As a maintainer, I want every Team procedure (create, mine, incomplete-seat invites, Community link, unlink, dissolve) in the Team routers folder.

30. As a maintainer, I want every Venue Operator procedure (catalog, Courts, logos, Soft-archive adapters, Venue link decide) in the Venue routers folder.

31. As a maintainer, I want Venue logo byte upload to stay in storage, so that the upload procedure calls the bucket helpers and does not own the bucket.

### Shared leftovers after the move

32. As a maintainer, I want Game `access`, `seats`, admit, Waitlist internals used by more than one door, Game invite admit helpers, Level-range allowance, and hub-list mapping to remain shared, so that Invite doors and home keep compiling without importing routers.

33. As a maintainer, I want `listMyGamesHubRows` to remain a shared Game-list function, so that Home upcoming Games and the Games hub My Games list stay one filter.

34. As a maintainer, I want home upcoming-Game filters to remain shared, so that hub lists and Group home do not copy live/history predicates.

35. As a maintainer, I want single-caller Community home helpers inlined into Community `byId`, so that `countOwners` is not a helper folder resident.

36. As a maintainer, I want Group upcoming/history filter files inlined into Group `byId` when they have no other endpoint caller.

37. As a maintainer, I want domain barrels to shrink to remaining shared exports, so that they stop re-exporting every moved verb.

38. As a maintainer, I want leftover re-export barrels from the previous file-cut (`organize`, `sets`, `waitlist`, `courts`, `venue`, `hub-list-rows` as verb dumps) contracted once callers are gone.

### UI consumers

39. As a UI author, I want hub Game card occupant/side types to come from `RouterOutputs["games"]["listMyGames"]` (or the public pickup alias), so that I do not import `HubListSide` from a Game server barrel.

40. As a UI author, I want Game seat-grid types to come from `RouterOutputs["games"]["byId"]` (or an alias of that shape), so that the seat grid does not import `GameSide` from the Game server barrel.

41. As a UI author, I want Group Game list types to come from `RouterOutputs["groups"]["byId"]`, so that Group home does not import `GroupGame` from the Group server barrel.

42. As a UI author, I want Community Member, Club Group, Club Team, Venue, join request, Team link request, and live-Venue types to come from `RouterOutputs` of the Community procedures that return them.

43. As a UI author, I want Community create and Loose Group create pages to use router input types (or `RouterOutputs` / `RouterInputs`) for public vs private, so that they do not import `CommunityType` / `GroupType` from domain `utils`.

44. As an Operator UI author, I want Venue logo MIME types to come from storage (or a type-only re-export next to the upload procedure), so that the Venue detail page does not depend on a Venue `utils` dump.

45. As a UI author, I want Lookup invite picker row types to keep coming from Invite search-lookup / Invite doors, so that four hosts share one search row.

46. As a UI author, I want presentational types (`StatStripItem`, `AvatarStackPerson`, `AppNavItem`, shadcn sidebar context, Game summary CTA, badge label maps) to stay in components and `lib`.

47. As a UI author, I want pages that already alias `RouterOutputs` for hub and Home upcoming Games to keep that alias.

### Tests

48. As a maintainer, I want existing Vitest + PGLite suites to stay green, so that the move is not proven by folder-name tests.

49. As a maintainer, I want `createGame` tests to keep calling a db-taking function, so that we do not spin up tRPC auth for PGLite.

50. As a maintainer, I want that db-taking function to live in the same file as the procedure when the function is endpoint-specific, so that the test import is the procedure file rather than a twin domain file.

51. As a maintainer, I want glossary tests (Soft-archive, Game admit, Community membership, Invite doors, Friendly Game create, home upcoming Games, ratings Level) to keep importing those modules directly.

52. As a maintainer, I want no new tests whose only purpose is “the function lives in its own file.”

53. As a maintainer, I want `app-router-shape.ts` (or equivalent) to keep asserting procedure keys, so that a renamed key fails typecheck.

### Product regression (behaviour unchanged)

54. As a User, I want Games hub My Groups and public pickup to list the same Games as today, including Soft-archived Club Group Games on My Groups and excluded from pickup.

55. As an organizer, I want Friendly Game create with Venue and optional Court to behave as today, including three Set shells.

56. As an organizer, I want Americano and Friendly tournament create to remain a branch of the same `create` procedure.

57. As a User, I want Game home (`byId`) to assemble the same read-model as today.

58. As a User, I want self-register, seat pick, partner register, Team register, leave, Waitlist, and kick to still go through Game admit and Waitlist as today.

59. As an organizer, I want close/reopen registration, cancel Game/Match, window/caps, price per player, Game Level range, Courts, Sets, and complete Match to behave as today.

60. As a User, I want Lookup invite and Invite link mint/list/revoke/preview/accept on Game, Group, Community, and Team to still call Invite doors, including Soft-archive freeze and Game Position-on-accept.

61. As a User, I want Club Group Public/Private and Loose Group Public/Private create, join, leave, and empty delete to behave as today.

62. As an Owner or Admin, I want Community create, Members, roles, Soft-archive/unarchive, leave, sports, join requests, Team link, and Venue link to behave as today.

63. As a User, I want Team create, mine, incomplete-seat invites, Community link, unlink, and dissolve to behave as today, including display-name.

64. As an Operator, I want Venue catalog, Courts, logos, Soft-archive, and Venue link decide to behave as today, including identity and Court uniqueness messages.

65. As a User, I want Home metrics, upcoming Games, and Group standing from `users.home` to stay the same payload.

66. As a User, I want Ratings me / self-declare untouched in product behaviour.

67. As a User of the shipped App, I want copy, status codes, and JSON shapes unchanged.

## Implementation Decisions

### Cut and placement

- File-cut lives under App tRPC routers: one procedure per file, index composes only. This reverses `.scratch/split-domain-router-files/spec.md` on placement. Domain folders are not the home of endpoint-only verbs.
- No new Workspace Package (ADR-0002). No schema migrations. No product copy changes. Public tRPC paths and payloads do not change.
- Preferred flow in each procedure file: validate input → check authorization → execute business rules → query/update database → return response.
- Do not introduce a parallel service/repository/use-case tree. Do not clone glossary modules under routers.
- A helper used by only one endpoint is inlined into that file. A helper used by two or more endpoints may remain where it already lives. Do not create new helper folders for cleanliness.
- Types the UI needs should be `RouterOutputs` / `RouterInputs` aliases. Named types still needed by shared server modules live next to those modules (admit types with Game admit, seat types with seats, hub row types with hub-list). Do not recreate domain `utils/` as a dumping ground.
- Procedure files may export the db-taking function the procedure calls so PGLite tests keep importing a function. Tests of shared glossary modules stay on those modules.
- Do not reopen Soft-archive, Game admit, Community membership, Invite doors, or Friendly Game create policy (TEM-94…TEM-101).
- Demo `hello` / `getSecretMessage` stay one-liners. Ratings/Glicko-2 internals are not reshuffled. Game `byId` moves as a door; do not deepen the read-model. Americano / Friendly tournament stay a branch inside `create`; Friendly still calls `createFriendlyGame`.
- No new CONTEXT terms or ADR for “endpoint file.” The convention lives in this spec and in `.cursor/rules/api-one-endpoint-per-file.mdc` (always applied). Agents must not revive the thin-assembler + domain-verb placement.

Convention (decision-rich; keys stay as today):

```
api/routers/
  games/
    index.ts
    listMyGames.ts
    listPublicPickup.ts
    byId.ts
    create.ts
    register.ts
    …
  communities/
    index.ts
    create.ts
    byId.ts
    …
  groups/   index.ts + one file per procedure
  teams/    index.ts + one file per procedure
  venues/   index.ts + one file per procedure
  ratings/  index.ts + me.ts + selfDeclare.ts
  users/    index.ts + home.ts
```

`index.ts` only combines/exports procedures. Filenames default to the procedure key; `createGame.ts` exporting `create` is allowed.

Cannot have `api/routers/games.ts` beside `api/routers/games/`. Convert file → folder in the same change. During a serial Game chain, remaining unmoved procedures may temporarily live in `games/index.ts`.

Non-router server code (home, Invite doors, `/g/{code}`) must not import procedure files. If a function is needed by a procedure and by another host, it stays under the existing App server module.

### What stays shared vs what moves

Move into the matching procedure file (then delete the endpoint-only twin):

- Endpoint verb files that exist only to serve one tRPC procedure (Game `create`, `byId`, `register`, organize/Set/Level-range/Invite adapter files, Community/Group/Team/Venue verb files, Ratings `me` query body and `selfDeclareRating`, `users.home` / `server/home/home.ts`).
- Single-caller helpers listed in the planning handoff (Community home mappers, Group Game list filters that only Group `byId` uses, home match-stats, kick internals only `kick` uses, `listVenuesForGameCreate` only `listCreateVenues` uses).

Keep as shared modules (procedure files call them):

- Soft-archive (`consult` / `commit` + adapter).
- Game admit (`admit`).
- Community membership (`admit` / `leave` + adapter).
- Invite doors (mint/list/revoke/preview/accept, consult, adapter) and Invite search-lookup, tokens, Game invite open-graph.
- Friendly Game create (`createFriendlyGame` and Set-shell backfill).
- Ratings/Glicko-2 (`glicko2`, `level`, `idle`, `apply-rated-match`, `has-rated-match`).
- Storage Venue logos; auth `resolveAppUser` / `requireOperator`.
- Game `access`, `seats`, Waitlist internals used by more than one door, Game invite admit helpers used by Invite doors, Level-range allowance, hub-list mapping, `listMyGamesHubRows` (hub + Home), home upcoming-Game filters, standing compare.
- Existing ≥2-caller helpers (require-Community / staff / membership / live Community; create Club Group / create Loose Group; Team display-name / require-Team; Venue identity / Court uniqueness / pending Venue link request; Game user-already-on-game / waitlisted / throw-if-admit-refused / create-venue context; etc.).
- Do not merge the duplicate Game vs Group `requireGroup` copies in this program; do not add a third. Do not move `isStaffRole` out of Game `access` into a new module.

Invite doors are already one public verb per file. This program does not reshuffle that folder. Host adapters become procedure files that call Invite doors.

### Ticket slicing (wide refactor)

Expand: convention ticket converts Ratings into the target folder shape and is the pattern later batches copy.

Migrate batches (CI green batch-to-batch because old routers still exist until each router’s convert-to-folder change):

- After convention: Users, Game list/create/`byId`, Group, Community home, Team, and Venue may proceed in parallel.
- Games stays serial because of the shared Game folder: list/create/`byId` → register/seats/Waitlist → organize/Sets/Level range → Game Invite adapters.
- Community stays serial: home/Members/Soft-archive adapters → join/Team link/Venue link/Invite adapters.

Contract: UI aliases `RouterOutputs`; integrate-and-verify deletes leftover twins, unused barrels, unused single-caller helpers, and leftover fat router files. Green leftover deletion is promised only on the final ticket.

## Testing Decisions

### What a good test is

Assert observable behaviour: existing domain suites still pass; `AppRouter` top-level and procedure keys unchanged; UI typecheck against `RouterOutputs` (or storage MIME) instead of deleted barrel types; payloads and refuse messages unchanged. Do **not** assert folder names, barrel paths, or component trees. Do not add tests whose only purpose is “the function lives in its own file.”

### Test seams

If you implement this spec, you implement these seams (approved):

1. **Existing Vitest + PGLite suites** — Soft-archive, Game admit, Community membership, Invite doors, Friendly Game create, Game create Level range, hub-list rows, home upcoming Games, ratings Level. They must stay green after each batch. Update imports when a db-taking function colocates with a procedure. Do not rewrite suites to assert the new folders.
2. **`AppRouter` shape** — existing `app-router-shape.ts` (or equivalent) stays the key lock: top-level `communities`, `games`, `groups`, `ratings`, `teams`, `users`, `venues` and today’s procedure names.
3. **UI typecheck** — components that today import domain barrel types compile via `RouterOutputs` / `RouterInputs` (or storage MIME). App typecheck is green.

Manual App flows are not required to prove the file-cut. If a batch changes a handler body (not just location), re-run that domain’s existing suite.

### Prior art

- `app-router-shape.ts` compile-time key lock.
- Ratings router already mixes a thin `selfDeclare` adapter with inline `me` query logic — first exemplar.
- Hub pages already using `RouterOutputs` aliases.
- Deepen-domain-modules (TEM-94…TEM-101): product rules and Vitest + PGLite harness — leverage, do not reopen.
- PGLite tests that import `createGame` / `admit` / `listMyGamesHubRows` as functions.

## Out of Scope

- New product features
- New Workspace Packages or a second App (ADR-0002)
- Reopening Soft-archive, Game admit, Community membership, Invite doors, or Friendly create policy (TEM-94…TEM-101)
- Deepening Game `byId` read-model or Americano / Friendly tournament create
- Rewriting throw-vs-outcome at remaining doors for their own sake
- Replacing Glicko-2 or reshaping the ratings module beyond splitting `me` / `selfDeclare` procedure files (ADR-0009)
- Moving shadcn / presentational / badge-label / Game summary CTA types into routers or domain
- Tests that assert folder names or private helper file names
- Operator / Clerk auth redesign
- Schema migrations
- Merging the two `requireGroup` copies
- A new CONTEXT term or ADR for the folder convention
- Silently closing TEM-106…TEM-118
- Recreating the previous spec’s domain `helpers/` / `utils/` convention as the home of endpoint logic

## Further Notes

- Settled from `/planner` with a binding architecture decision: one endpoint per file under `api/routers/`; business logic lives in the endpoint file; shared glossary modules stay; locality over abstraction.
- Binding agent rule: `.cursor/rules/api-one-endpoint-per-file.mdc` (always applied). Also pointed from `AGENTS.md`, `project-standard.mdc`, and the planner / implementer / reviewer / orchestrator agents so this placement is not re-planned.
- `.scratch/split-domain-router-files/spec.md` is superseded for placement. That file-cut appears already implemented in the tree (thin routers + one-verb domain files). This program is not “finish TEM-106.”
- Glossary and ADRs unchanged. No CONTEXT term for the folder convention. No ADR conflict (ADR-0002, ADR-0005, ADR-0008, ADR-0009 untouched).
- Tickets published: TEM-134 … TEM-146 (see header). Frontier: TEM-134.
- After TEM-134, parallel work: TEM-135, TEM-136, TEM-140, TEM-141, TEM-143, TEM-144. Games stays TEM-136 → TEM-137 → TEM-138 → TEM-139. Community stays TEM-141 → TEM-142.
- Linear TEM-106…TEM-118: commented superseded by this spec; not closed from this program.
- Risks: Games serial batches; `games.ts` vs `games/` collision; barrels cycling if shared modules import routers; accidental reimplementation of Game admit / Invite doors / Soft-archive; UI typecheck after barrel type imports die; test import updates.
