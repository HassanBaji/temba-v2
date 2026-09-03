# Split App server routers into one-function domain files

Status: superseded (placement only) by `.scratch/one-endpoint-per-file-routers/spec.md`. Do not implement TEM-106…TEM-118 as written. Product behaviour and glossary modules in this spec are unchanged.

Tickets (Linear, `ready-for-agent`): [TEM-106](https://linear.app/temba-app/issue/TEM-106/establish-app-server-domain-file-convention) Establish App server domain file convention → then parallel [TEM-107](https://linear.app/temba-app/issue/TEM-107/split-invite-doors-to-one-verb-per-file) Split Invite doors to one verb per file ∥ [TEM-108](https://linear.app/temba-app/issue/TEM-108/split-game-list-create-and-byid-into-domain-files) Split Game list, create, and byId into domain files ∥ [TEM-111](https://linear.app/temba-app/issue/TEM-111/split-group-router-into-domain-files) Split Group router into domain files ∥ [TEM-112](https://linear.app/temba-app/issue/TEM-112/split-community-home-members-and-soft-archive-adapters-into-domain) Split Community home, members, and Soft-archive adapters into domain files ∥ [TEM-114](https://linear.app/temba-app/issue/TEM-114/split-team-router-into-domain-files) Split Team router into domain files ∥ [TEM-115](https://linear.app/temba-app/issue/TEM-115/split-venue-operator-router-into-domain-files) Split Venue Operator router into domain files ∥ [TEM-116](https://linear.app/temba-app/issue/TEM-116/move-user-home-into-the-home-domain) Move User home into the home domain; Game chain [TEM-108](https://linear.app/temba-app/issue/TEM-108/split-game-list-create-and-byid-into-domain-files) → [TEM-109](https://linear.app/temba-app/issue/TEM-109/split-game-register-seats-and-waitlist-into-domain-files) Split Game register, seats, and Waitlist into domain files → [TEM-110](https://linear.app/temba-app/issue/TEM-110/split-game-organize-sets-and-invite-adapters-into-domain-files) Split Game organize, Sets, and Invite adapters into domain files (also blocked by TEM-107); Community chain [TEM-112](https://linear.app/temba-app/issue/TEM-112/split-community-home-members-and-soft-archive-adapters-into-domain) → [TEM-113](https://linear.app/temba-app/issue/TEM-113/split-community-join-team-link-venue-link-and-invite-adapters-into) Split Community join, Team link, Venue link, and Invite adapters into domain files; then [TEM-117](https://linear.app/temba-app/issue/TEM-117/import-domain-types-in-ui-components) Import domain types in UI components → [TEM-118](https://linear.app/temba-app/issue/TEM-118/integrate-and-verify-domain-router-file-cut) Integrate and verify domain router file-cut.

Approving this spec approves the Test seams in Testing Decisions and the Implementation Decisions below.

## Problem Statement

tRPC routers still own too much. Game, Group, Community, Team, and Venue procedures live as giant assembler files: one procedure next to dozens of others, plus private helpers that only that router knows. Agents and humans bounce through a 2,000-line Game router to change one door. Shared helpers are file-private, so Club Group staff checks and Invite adapters get copied. Read-model types are declared again in UI components (`Member`, `LookupInvite`, `GameSummarySide`, `LiveVenue`, …) instead of coming from the domain that already returns those shapes.

Deepened modules (Soft-archive, Game admit, Community membership, Invite doors, Friendly Game create) already sit beside the routers, but they do not yet follow one function per file, and they still export types from a folder-root `types` module. The file-cut is inconsistent, so the next change still starts in the fat router.

Users of the shipped App should see no product change. Maintainers should be able to open one domain file per verb, import types from that domain, and keep tRPC as a thin adapter.

## Solution

Keep each domain function in its own file inside that domain’s App server folder. Shared helpers used by two or more functions live in a `helpers` folder inside the same domain. Types the UI or other domains import live in a `utils` folder inside the same domain. Each domain exposes a public barrel.

tRPC routers become thin assemblers: Zod on the procedure, one domain function call, map domain outcomes to transport errors where that already happens. Public procedure names and payloads stay the same.

UI components stop declaring domain and read-model types. They import the named type from the domain `utils` (or a `RouterOutputs` alias of that same shape). Presentational types that are not domain shapes stay in components and `lib`.

This is a wide expand–contract file-cut. Product behaviour, Invite doors policy, Game admit, Soft-archive, and Community membership rules are not reopened.

## User Stories

### Maintainers and agents

1. As a maintainer, I want each tRPC procedure’s work to live in one domain file, so that I do not scroll a fat Game or Community router to change one door.

2. As an agent, I want a shared helper used by two or more functions in the same domain to live in that domain’s `helpers` folder, so that I do not duplicate require-Group or staff checks.

3. As an agent, I want a helper used by only one function to stay in that function’s file, so that `helpers` does not become a junk drawer.

4. As a maintainer, I want types the UI or other domains import to live in that domain’s `utils` folder, so that components do not invent a second `Member` or `LookupInvite`.

5. As a maintainer, I want each domain to expose a public barrel, so that tRPC adapters and UI import from one place per domain.

6. As a maintainer, I want tRPC routers to only assemble procedures, so that transport (auth, Zod, TRPCError mapping) stays at the edge.

7. As a maintainer, I want the file-cut under App server domain folders, not a new routers-tree clone, so that Game admit, seats, and create stay co-located with Game procedures.

8. As a maintainer, I want no new Workspace Package for this cut, so that ADR-0002 (one App) still holds.

9. As a maintainer, I want existing folder-root `types` modules expanded into `utils` and then contracted, so that current imports keep compiling while callers migrate.

10. As a maintainer, I want Invite doors public verbs each in their own file, so that mint, list, revoke, preview, and accept are not buried in lookup/link dumps.

11. As a maintainer, I want Game list, create, and Game home (`byId`) as Game domain functions, so that hub rows and Friendly create are not trapped in the router.

12. As a maintainer, I want Game register, seats, Waitlist leave, and kick as Game domain functions, so that occupancy stays next to Game admit without a fourth writer in the router.

13. As a maintainer, I want Game organize, Sets, and Game Invite adapters as Game domain functions, so that the Game router can finish as a thin assembler.

14. As a maintainer, I want Club Group and Loose Group create, mine, byId, join, leave, delete, and Group Invite adapters under the Group domain, so that Group doors are not Community code and not Invite doors copies.

15. As a maintainer, I want Community create, byId, Members, roles, Soft-archive adapters, leave, sports, and mine under a Community domain folder, so that Community home is not a 2,000-line router.

16. As a maintainer, I want Community join requests, Team link decide, Venue link, live-Venue search, and Community Invite adapters under the same Community domain, so that Community host doors share one folder.

17. As a maintainer, I want Community membership and Soft-archive to stay their own modules, so that Community does not swallow `admit` / `leave` / `consult` / `commit`.

18. As a maintainer, I want a Team domain folder for create, mine, byId, incomplete-seat Invite adapters, Community link, unlink, and dissolve, so that Team display-name and seat rules are Team-owned.

19. As a maintainer, I want a Venue domain folder for Operator catalog, Courts, logos, Soft-archive adapters, and Venue link decide, so that Operator work is not mixed into Community files.

20. As a maintainer, I want Venue logo byte upload to stay in storage, so that Venue domain may re-export the content-type union without owning the bucket.

21. As a maintainer, I want `users.home` to live in the existing home domain, so that there is no extra `users` domain folder for one procedure.

22. As a maintainer, I want Ratings left as the already-thin router plus ratings module, so that Glicko-2 is not reshuffled for file-cut’s sake.

23. As an agent, I want demo `hello` and `getSecretMessage` to stay one-liners on the Game router, so that they are not promoted into domain verbs.

24. As a maintainer, I want host Invite procedures to call Invite doors only, so that Game, Group, Community, and Team do not grow a second mint/accept.

### UI consumers

25. As a UI author, I want Game summary occupant and side types to come from the Game domain, so that hub cards and Game home share one occupant shape (including `image: string | null`).

26. As a UI author, I want Game seat-grid side type (`sideIndex`, `gameTeamId`, left/right) to come from the Game domain, so that the seat grid does not re-declare occupancy.

27. As a UI author, I want Group Game list types to come from the Group domain, so that Group home upcoming and history do not declare a private `GroupGame`.

28. As a UI author, I want Community Member, Club Group, Club Team, Venue, Venue link request, join request, and Team link request read-model types to come from the Community domain, so that Community tabs stop declaring those shapes.

29. As a UI author, I want live-Venue catalog type to come from Community or Venue `utils`, so that the link-Venue dialog does not declare `LiveVenue`.

30. As a UI author, I want Lookup invite list-row and Lookup user option types to come from Invite doors / search-lookup, so that Community, Group, and Team invite panels share one `LookupInvite`.

31. As a UI author, I want accept-invite host kind to come from Invite doors, so that the accept flow does not keep a local `"community" | "group" | "team"` union.

32. As a UI author, I want Community create and Loose Group create pages to use the domain type enums (or router input types) for public vs private, so that they do not keep a local `"public" | "private"` union.

33. As an Operator UI author, I want Venue logo MIME types to come from storage / Venue `utils`, so that the Venue detail page does not re-declare JPEG/PNG/WebP.

34. As a UI author, I want presentational types (`StatStripItem`, `AvatarStackPerson`, `AppNavItem`, shadcn sidebar context, Game summary CTA, badge label maps) to stay in components and `lib`, so that the domain is not a dumping ground for chrome.

35. As a UI author, I want pages that already alias `RouterOutputs` for hub and Home upcoming Games to keep that alias when it names the domain shape, so that we do not invent a third name for the same row.

### Product regression (behaviour unchanged)

36. As a User, I want Games hub My Groups and public pickup to list the same Games as today, so that the file-cut does not hide Soft-archived Club Group Games from My Groups or show them on pickup.

37. As an organizer, I want Friendly Game create with Venue and optional Court to behave as today, so that Soft-archive Venue rules and three Set shells stay.

38. As an organizer, I want Americano and Friendly tournament create to remain a branch of the same `create` procedure, so that this program does not invent new create modules.

39. As a User, I want Game home (`byId`) to assemble the same read-model as today, so that seats, Sets, Waitlist, and invites still render.

40. As a User, I want self-register, seat pick, partner register, Team register, leave, Waitlist, and kick to still go through Game admit and Waitlist as today, so that occupancy is not reimplemented in the new files.

41. As an organizer, I want close/reopen registration, cancel Game/Match, window/caps, Courts, Sets, and complete Match to behave as today.

42. As a User, I want Lookup invite and Invite link mint/list/revoke/preview/accept on Game, Group, Community, and Team to still call Invite doors, so that Soft-archive freeze and Game Position-on-accept stay.

43. As a User, I want Club Group Public/Private and Loose Group Public/Private create, join, leave, and empty delete to behave as today.

44. As a User, I want Soft-archived Club Group Games still listed on Group home and excluded from public pickup.

45. As an Owner or Admin, I want Community create, Members, roles, Soft-archive/unarchive, leave, sports, join requests, Team link, and Venue link to behave as today.

46. As a User, I want Community membership admit/leave and Soft-archive consult/commit to remain the only writers of those rules.

47. As a User, I want Team create, mine, incomplete-seat invites, Community link, unlink, and dissolve to behave as today, including display-name.

48. As an Operator, I want Venue catalog, Courts, logos, Soft-archive, and Venue link decide to behave as today, including identity and Court uniqueness messages.

49. As a User, I want Home metrics, upcoming Games, and Group standing from `users.home` to stay the same payload.

50. As a User, I want Ratings me / self-declare untouched.

51. As a maintainer, I want `AppRouter` top-level keys and procedure names unchanged, so that existing clients keep compiling.

52. As a User of the shipped App, I want copy, status codes, and JSON shapes unchanged, so that this program is not a product redesign.

## Implementation Decisions

### Cut and placement

- File-cut lives under App server domain folders. tRPC routers stay thin assemblers. Do not clone the tree under `api/routers/<domain>/`. No new Workspace Package (ADR-0002).
- One file = one tRPC procedure handler **or** one already-public domain verb (Game admit, `createFriendlyGame`, Soft-archive `consult`/`commit`, Community membership `admit`/`leave`, Invite doors mint/list/revoke/preview/accept).
- A helper used by only one function stays in that file. A helper used by two or more functions in the same domain goes in that domain’s `helpers` folder.
- Types the UI or other domains import go in that domain’s `utils` folder. Private types stay in the function file.
- Each domain exposes a public barrel of functions and types. tRPC adapters and UI import from the barrel (or from `utils` via the barrel). Barrels must not create import cycles (utils must not import verbs).
- Existing folder-root `types` modules expand–contract: re-export from `utils`, migrate callers, then delete the shim.
- Zod input schemas stay on the thin tRPC procedure. Domain functions take already-parsed values.
- Public tRPC paths and payloads do not change. No schema migrations. No product copy changes.
- Do not reopen Soft-archive, Game admit, Community membership, Invite doors, or Friendly Game create policy (TEM-94…TEM-101). Relocate files to the convention only as needed.
- Game `byId` moves as a function; do not deepen or redesign the read-model.
- Americano / Friendly tournament stay a branch inside the same Game `create` function. Friendly still calls `createFriendlyGame`.
- Demo `hello` / `getSecretMessage` stay one-liners on the Game router.
- Ratings module and router are not in this program.
- No new CONTEXT terms or ADR for “helpers folder” / “utils folder”. The convention lives in this spec.

### Homing

- **Game** → existing Game domain. List/create/`byId`; register/seats/Waitlist; organize/Sets/Invite adapters. Split supporting multi-export modules (access, venue, courts, hub-list-rows, seats, Waitlist, organize, Sets) to one-file-per-function only when a file still exports several public verbs.
- **Group** → existing Group domain. Club Group / Loose Group create, mine, byId, join, leave, delete, Invite adapters. Shared require-Group / empty-delete / Club vs Loose create go in `helpers`. Group Game list types go in `utils`. Do not add a third `isStaffRole` copy; reuse the existing Community staff check.
- **Community procedures** → new Community domain folder. Do **not** fold Community membership or Soft-archive into it. Soft-archive still `commit`; leave still Community membership `leave`.
- **Community membership** and **Soft-archive** stay their own folders; apply one-verb-per-file and `utils` for types.
- **Team** → new Team domain folder. Display-name helper is Team-owned (Community may import it).
- **Venue** → new Venue domain folder. Logo bytes stay in storage; Venue may re-export the content-type union. Soft-archive Venue still `commit`.
- **User home** → existing home domain. No new `users` folder. Thin the users router.
- **Invite doors** → existing Invite doors folder, one public verb per file. Consult and adapter stay. Search-lookup stays a sibling. Hosts (Game, Group, Community, Team) keep thin adapters that only call Invite doors.
- **Auth, storage, standing, db, test** — out of this file-cut unless a type must be re-exported for UI (Venue logo MIME).

Prototype layout (decision-rich; not a working dump):

```
server/<domain>/
  <verb>.ts          # one exported function
  helpers/           # shared by ≥2 functions in this domain
  utils/             # types the UI or other domains import
  index.ts           # public barrel
```

tRPC: `createTRPCRouter({ byId: protectedProcedure.input(…).query(({ ctx, input }) => domainById(ctx.db, …)) })`.

### UI types

- Domain/read-model types currently declared in components move to the owning domain `utils` and are imported by the UI.
- Occupant shape used by Game summary cards must include `image: string | null` (unify with hub-list occupant). This is type-only; do not add JSON fields the payload does not already return.
- Create Community / Loose Group pages must not keep a local `"public" | "private"` domain union; use the Community/Group type enum or router input type.
- Pages may keep `RouterOutputs["…"]` aliases when that alias **is** the domain shape (Home upcoming Games, hub Games).
- **Stay in UI / `lib`:** `StatStripItem`, `AvatarStackPerson`, `AppNavItem`, shadcn sidebar context, Game summary CTA, badge label maps (`SportValue`, `RoleValue`, `GameStatusValue`, `CommunityTypeValue`).

### Ticket slicing (wide refactor)

This is a wide refactor: expand–contract, then per-domain batches, then UI types, then contract shims. Games stays a linear chain (shared fat router / Game folder). After the convention ticket, Invite doors, Game list/create/`byId`, Group, Community home, Team, Venue, and User home may proceed in parallel.

## Testing Decisions

### What a good test is

Assert observable behaviour: existing domain suites still pass; `AppRouter` top-level and procedure keys unchanged; UI typechecks against moved types; payloads and refuse messages unchanged. Do **not** assert folder names, barrel file paths, or component trees. Do not add tests whose only purpose is “the function lives in its own file.”

### Test seams

If you implement this spec, you implement these seams (approved):

1. **Existing domain Vitest suites** — Soft-archive, Game admit, Community membership, Invite doors, Friendly Game create, home upcoming Games. They must stay green after each batch. Do not rewrite them to assert the new folders.
2. **`AppRouter` shape** — top-level keys (`communities`, `games`, `groups`, `ratings`, `teams`, `users`, `venues`) and procedure names match the pre-refactor router. Assert via typecheck / a small key list if useful; not via file-structure tests.
3. **UI typecheck** — components import domain types (or `RouterOutputs` aliases of those shapes) and the App typecheck is green. No leftover domain `type`/`interface` in the listed Game, Group, Community, and invite components.

Manual App flows are not required to prove the file-cut. If a batch changes a handler body (not just location), re-run that domain’s existing suite.

### Prior art

- Ratings: already-thin router + domain module (pattern for the assembler).
- Deepen-domain-modules (TEM-94…TEM-101): product rules and Vitest + PGLite harness — leverage, do not reopen.
- Hub pages already using `RouterOutputs` aliases.

## Out of Scope

- New product features
- New Workspace Packages or a second App (ADR-0002)
- Reopening Soft-archive, Game admit, Community membership, Invite doors, or Friendly create policy (TEM-94…TEM-101)
- Deepening Game `byId` read-model or Americano / Friendly tournament create
- Rewriting throw-vs-outcome at remaining router doors for their own sake
- Replacing Glicko-2 or splitting Ratings (ADR-0009)
- Moving shadcn / presentational / badge-label / Game summary CTA types into domain
- Tests that assert folder names or private helper file names
- Operator / Clerk auth redesign
- Schema migrations

## Further Notes

- Settled from `/planner`: domain folders (not routers-tree clone); one function per file; `helpers` for shared helpers; `utils` for type exports; UI domain types move into the owning domain; product behaviour unchanged.
- Glossary and ADRs unchanged. No CONTEXT term for the folder convention.
- Tickets published: TEM-106 … TEM-118 (see header). Frontier: TEM-106.
- After TEM-106, parallel work: TEM-107, TEM-108, TEM-111, TEM-112, TEM-114, TEM-115, TEM-116. Games stays TEM-108 → TEM-109 → TEM-110. Community stays TEM-112 → TEM-113.
- Risks: Game batches must stay serial; barrels can cycle if `utils` import verbs; occupant `image` unification is type-only.
