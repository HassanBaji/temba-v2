Status: ready-for-agent

## Problem Statement

Communities are social orgs (people, Club Groups, Teams). They have no physical place: no addressable site, no Courts, no logo. Players still need to know *where* a Community plays. Today’s leftover courts row is venue-shaped (name, geo, country, logo URL) and Games, coaches, and coaching sessions already point at it, but the App has no catalog, no named playing surfaces, and no way for a Community to claim a place.

Staff also need a curated list of real-world sites. Anyone creating a Community must not invent a place. Linking a Community to a place must wait for Temba staff (**Operator**) approval.

## Solution

Add **Venue** as a physical facility in the DB Package and App: one addressable site (name, city, country, optional lat/lng, optional logo) with child **Courts** (name only). Evolve the existing courts table into Venue (same id space). Games, coaches, and coaching sessions keep pointing at that Venue row. Named Courts are a new child table. Do not retarget Game create in this slice.

**Operator** (Clerk `publicMetadata`, not a Community role) curates the catalog: create/edit Venues and Courts, upload logos to Supabase Storage, Soft-archive/unarchive Venues, and approve or reject **Venue link requests**. Community **Owner** or **Admin** of a live Community search live Venues and request a link; after approve, the Community has at most one live **Venue link**; they may unlink when the Community is live. **Members** see the linked Venue on Community home. Many Communities may share one Venue. Sharing a Venue does not reveal other Communities.

Approving this spec approves the Test seams in Testing Decisions. Glossary and ADRs 0006–0007 ship with this planning commit.

## User Stories

1. As an Operator, I want a Venues area in the App that only Operators can open, so that catalog work is not mixed into Community staff screens.

2. As a User who is not an Operator, I want that Venues area to be hidden and its writes refused, so that Community Admin cannot curate the catalog.

3. As an Operator, I want to create a Venue with name, city, and country, so that a real-world site exists before any Community claims it.

4. As an Operator creating a Venue, I want lat/lng to be optional, so that I can catalog a site before a map pin exists.

5. As an Operator, I want city and country to be required trimmed free text, so that the catalog can be searched without an ISO picker.

6. As an Operator, I want creating a second Venue with the same trimmed case-insensitive (name, city, country) to be refused even if the first is Soft-archived, so that the same site is not entered twice.

7. As an Operator, I want two Venues named the same in different cities to be allowed, so that a common trade name can exist in Lisbon and Porto.

8. As an Operator, I want a new Venue to start with zero Courts, so that I can save the place before naming surfaces.

9. As an Operator, I want to add a Court with a name on a Venue, so that the site has a named playing surface.

10. As an Operator, I want adding a Court whose name matches another Court on that Venue after trim and case-fold to be refused, so that “Court 1” and “court 1” are the same surface.

11. As an Operator, I want Court names to be unique only per Venue, so that every Venue may have a “Court 1”.

12. As an Operator, I want to rename a Court, so that “Court 1” can become “Central”, still unique per Venue.

13. As an Operator, I want to delete a named Court in this slice, so that a mistyped surface does not linger. Games do not point at named Courts yet.

14. As an Operator, I want no cap on how many Courts a Venue has, so that large sites are not blocked.

15. As an Operator, I want to upload one JPEG, PNG, or WebP logo of at most 2 MB to a Venue, so that the catalog has a picture without a pasted URL.

16. As an Operator, I want a Venue to exist with no logo, so that logo is optional.

17. As an Operator, I want replacing a logo to overwrite the previous object and persist the new public URL, so that there is only one logo per Venue.

18. As an Operator, I want to clear a logo and have the object and field removed, so that a wrong image does not stay public.

19. As an Operator, I want uploads that are the wrong type or larger than 2 MB to be refused, so that the bucket does not store garbage.

20. As an Owner, Admin, or Member, I want logo upload to be refused, so that only Operators put files in Storage.

21. As an Operator, I want to edit a Venue’s name, city, country, lat/lng, logo, and Courts, so that the catalog stays accurate.

22. As an Operator, I want to Soft-archive a live Venue, so that it leaves the Community request catalog without deleting it.

23. As an Operator, I want Soft-archive of a Venue to refuse new Venue link requests and refuse decide on pending ones, so that archived sites do not gain new claims.

24. As an Operator, I want live Venue links to stay when I Soft-archive a Venue, so that Communities are not silently unlinked.

25. As an Operator, I want to still edit a Soft-archived Venue (fields, Courts, logo), so that archive hides the picker, not the record.

26. As an Operator, I want to unarchive a Venue, so that it returns to the request catalog and request/decide work again.

27. As an Operator, I want hard-delete of a Venue to be refused in this slice, so that Games and coaches that still point at the Venue row cannot be cascade-deleted.

28. As an Operator, I want to list live and Soft-archived Venues, so that I can maintain the full catalog.

29. As an Operator, I want a pending Venue link request queue showing Community name, requester, Venue, and time, so that I can decide claims.

30. As an Operator, I want to approve a pending Venue link request, so that that Community’s live pointer is set to that Venue.

31. As an Operator, I want approve to never admit Users or change Community membership, so that Venue claim is not a join door.

32. As an Operator, I want to reject a pending Venue link request with no note, so that the Community stays unlinked and may request again.

33. As an Operator, I want two Communities to be live-linked to the same Venue, so that two social orgs can share one site.

34. As an Operator on a Venue home, I want to see Communities that currently have a live link to that Venue, so that I know who claimed it. This list is Operator-only.

35. As an Owner or Admin of a live Community with no Venue link, I want to search live Venues by name, city, or country contains, so that I can pick an existing site.

36. As an Owner or Admin, I want that catalog not to name other Communities, so that Community Private identity is not leaked from a shared Venue.

37. As an Owner or Admin, I want Soft-archived Venues hidden from that picker, so that I cannot claim a closed site.

38. As an Owner or Admin, I want to submit a Venue link request for one existing Venue, so that an Operator can approve the claim.

39. As an Owner or Admin, I want a second pending request to be refused, so that the Community has at most one pending Venue link request.

40. As an Owner or Admin, I want a new request refused while a live Venue link exists, so that I must unlink before changing place.

41. As an Owner or Admin of a live Community with a live Venue link, I want to unlink immediately without an Operator, so that the Community returns to zero Venues.

42. As an Owner or Admin, after unlink I want to request again (same or other Venue) as a new request row, so that history stays append-only.

43. As an Owner or Admin, after a silent reject I want to request again as a new row, so that retry does not overwrite the rejected audit.

44. As an Owner or Admin, I want unlink not to write a request row, so that dropping a place is not a queue item.

45. As an Owner or Admin, I want to see pending or last rejected status on Community home, so that I know whether to wait or retry.

46. As a Member who is not Owner or Admin, I want creating a Venue link request, unlinking, and seeing the Operator queue to be refused, so that only staff claim a place.

47. As a Community Member, I want Community home to show the linked Venue (name, city, country, logo, Courts) when a live pointer exists, so that I know where we play.

48. As a Community Member, I want not to see lat/lng, so that v1 has no map pin for Members.

49. As a Community Member, I want not to see other Communities on that Venue, so that sharing a site is not a directory of orgs.

50. As a Community Member, I want not to see pending or rejected Venue link requests, so that claim status is staff-only.

51. As a Member of a Soft-archived Community that still has a Venue link, I want to still see that Venue on Community home, so that archive is not data loss.

52. As a Member, I want a Venue Soft-archived badge on that block only when the *Venue* is Soft-archived, so that Community archive and Venue archive are distinguishable.

53. As an Owner or Admin, I want Venue link request, decide, and unlink refused while the Community is Soft-archived, so that history-only Communities do not change place.

54. As an Operator, I want decide refused while the Community is Soft-archived, even if a pending row exists, so that archive pauses the queue for that Community.

55. As an authenticated User who is not Owner or Admin of a live Community, I want the live-Venue request catalog to be refused, so that the catalog is not a public Directory.

56. As an unauthenticated person, I want no Venue browse, so that Directory of places is not shipped.

57. As a new Owner, I want Create Community to stay name and type only with zero Venue, so that claiming a place is a later staff request.

58. As an Owner or Admin of Community Public or Community Private, I want the same request path, so that type does not change how a place is claimed.

59. As a developer of a later Game-create slice, I want Games, coaches, and coaching sessions to keep their required reference to the Venue row, so that this feature does not retarget named Courts.

60. As a User of the App, I want no Game create or Game display in this feature, so that Venue catalog is not a match product.

61. As an Operator, I want Clerk `publicMetadata.operator` to be the source of truth, so that bootstrap and revoke happen in the Clerk dashboard with no in-app grant.

62. As a User with Operator metadata who is also a Community Owner, I want both hats to work, so that staff who belong to a Community can still request a link as Owner.

63. As an Operator searching the catalog, I want contains match on name, city, and country, so that I can find a site without exact title.

64. As a Member, I want Courts on Community home in created order, so that there is a stable list without a sort editor.

65. As an Operator, I want existing unused columns on the evolved Venue row (phone, website) left in the database but off the product surface, so that this slice does not ship deferred fields.

66. As a reader of CONTEXT.md, I want Venue, Court, Operator, Venue link, and Venue link request defined, and Soft-archive extended, so that “club” still means Community and never Venue.

## Implementation Decisions

- Schema, migrations, and kit live in the DB Package. Follow existing Drizzle style: uuid primary keys, Postgres enums plus TypeScript enums where needed, created/updated timestamps. New tables use the same unprefixed naming style as Group, Game, and Team. Kit table filter includes new tables.

- The App keeps its database re-export of the DB Package. tRPC registers on the existing app router. No new Package, no second App, no mail Package.

- **Evolve the existing courts table into Venue** (ADR-0007). Same id space. Games, coaches, and coaching sessions keep their required foreign keys to that row; do not change those targets or on-delete behavior in this slice. Product fields on Venue: required name, city, country (city becomes required for new writes; trim); optional latitude and longitude; optional logo public URL (or bucket + path resolved to a public URL); `archivedAt` nullable like Community; timestamps. Phone and website columns may remain unused by the App. Do not add sport on Venue.

- **Uniqueness:** one trimmed case-insensitive unique constraint on (name, city, country), including Soft-archived rows.

- **Court** (new child table): id; Venue id not null (restrict or cascade only for child rows if a Venue were deleted later — never cascade Games); required name; created/updated timestamps. Unique per Venue on trimmed case-insensitive name. No sport, no geo, no sort column (list by created time). Operator may delete a Court row in this slice; do not copy ON DELETE CASCADE onto Games.

- **Live pointer:** nullable Venue id on Community. At most one live Venue per Community. Restrict on Venue delete (no hard-delete of Venue in this slice). Clear on unlink. Do not clear on Community or Venue Soft-archive.

- **Venue link requests** (new table, append-only): follow the shipped **Team link request** shape, not Community join-request row reuse. Community id; Venue id; requester User id; status pending | approved | rejected; optional decider User id; timestamps. Partial unique: at most one pending row per Community. Refuse insert while the Community already has a live Venue id. Approve (transaction): set Community Venue id; mark the row approved; store decider. **Do not auto-admit anyone** (unlike Team link approve). Reject: mark rejected; store decider; no note column. Unlink: clear Community Venue id only; do not insert a request row; do not rewrite the approved row. After reject or unlink, a later request is a new row.

- **Operator:** Clerk session `publicMetadata.operator === true` (boolean). Temba reads it when authorizing Operator procedures. No platform role column on User. No in-app grant/revoke. Community Owner/Admin/Member unchanged.

- **Supabase Storage (ADR-0006):** App env validation requires the Supabase URL, a server key that can write the bucket, and the public bucket name. Workspace turbo `globalEnv` lists those keys the same way it lists Clerk. One public-read bucket (or public object paths). Operator-only upload/replace/clear. JPEG/PNG/WebP, max 2 MB, one logo per Venue. Persist the public URL on Venue. Replace overwrites the previous object. Clear deletes the object and nulls the field. Members never receive signed upload tokens.

- **Authorization (product):**
  - Operator: full catalog including archived; create/edit/logo/Courts; Soft-archive/unarchive Venue; list pending requests; approve/reject; see live-linked Communities on Venue home; lat/lng read/write.
  - Owner or Admin of a *live* Community: list/search *live* Venues (name, city, country, logo, Courts — not other Communities, not lat/lng); create a request if unlinked; see own pending or last rejected; unlink if linked.
  - Member (any role) of a Community with a live pointer: read Venue name, city, country, logo, Courts on Community home, including while the Community is Soft-archived; Venue Soft-archived badge only if the Venue is archived.
  - Everyone else: no catalog, no request, no Operator queue.
  - Community Soft-archive: refuse new Venue link requests, refuse Operator decide on that Community’s pending rows, refuse unlink. Live pointer stays.
  - Venue Soft-archive: hide from Owner/Admin picker; refuse new requests to that Venue; refuse decide for that Venue; live pointers stay; Operator may still edit.

- **tRPC:** Operator catalog and queue procedures; Community-scoped request, unlink, and read of the live Venue; search live Venues for staff pickers. Reuse existing protected-procedure and staff-role helpers for Community Owner/Admin. Operator checks are metadata, not Community role. Create Community stays name + type + padel Community sports; no Venue id input.

- **UI:** Operator Venues area (list live and archived, create/edit, Courts, logo, archive/unarchive, pending queue, Venue home with live-linked Communities). Sidebar item only if the User is Operator. Community home Venue block: Members read-only when linked; Owner/Admin of a live Community get picker/request/pending/rejected/unlink. Reuse existing dashboard primitives and the Community home staff-queue pattern (join requests and Team link requests). No Directory of Venues. No Create Community Venue field.

- **Search:** contains on name, city, country. No cap on Courts. Queue columns: Community name, requester, Venue, time.

- Clerk remains the only identity provider. Soft-archive of Community itself is unchanged except the Venue rules above (ADR-0005 still holds for Groups/Games/joins/Teams).

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): An Operator can curate Venues (including Courts and logo) and decide Community Venue link requests, and an Owner or Admin of a live Community can request / see status / unlink, while Members see a linked Venue on Community home, Soft-archive on Community and Venue behaves as locked, and Games/coaches keep pointing at the Venue row — without Directory, without Game create, and without Temba granting Operator in-app.

If you implement this spec, you implement these seams:

- Operator-only Venues area; non-Operator cannot create/edit/decide
- Create Venue (name, city, country; optional lat/lng and logo); unique (name, city, country) including archived
- Courts: add/rename/delete; unique per Venue; zero Courts allowed
- Logo: Operator upload/replace/clear; refuse wrong type or > 2 MB; Members cannot upload
- Owner/Admin of live Community search live Venues and request a link; Member cannot; catalog does not list other Communities
- At most one pending; refuse request while live-linked; silent reject then new request; unlink then new request
- Approve sets live pointer; does not change membership; many Communities may share one Venue
- Community home: Members see linked Venue; staff see pending/rejected and unlink when live
- Community Soft-archive: refuse request/decide/unlink; Members still see the Venue
- Venue Soft-archive: hidden from request catalog; refuse request/decide; live links stay; Operator can still edit; unarchive restores
- Create Community still name+type, zero Venue
- Game/coach FKs still on the Venue row; no Game UI; named Court delete does not cascade Games

Manual check: existing Community, Group, Team, home, login, Soft-archive, and Route `/public` still work.

### Modules under that seam

DB Package schema for Venue (evolved courts), Court, Venue link requests, and Community live pointer; App env for Supabase; App tRPC; Operator Venues area; Community home Venue block; Clerk publicMetadata Operator check — only as they affect the flows above.

### Prior art

Community join-request queue on Community home (pending/approved/rejected, Owner/Admin, Soft-archive refuses decide). Shipped Team link requests (append-only rows, partial unique pending, silent reject, live pointer on Team). Community Soft-archive banners. No Operator surface, no storage pipeline, no automated tests.

## Out of Scope

- Retargeting Game, coach, or coaching-session foreign keys at named Court
- Game create or Game display
- Directory of Venues; unauthenticated Venue browse
- In-app grant or revoke of Operator
- Member, Owner, or Admin logo upload
- Hard-delete of Venue
- Street address, phone, website, description, hours, or sport on Venue (product surface)
- Many Venues per Community
- Reject notes
- Revealing other Communities that share a Venue to non-Operators
- ISO country/city pickers; showing lat/lng to Members
- Cap on Courts
- Auto-admit or any membership change on Venue link approve
- Changing Group immutable parent (ADR-0004)
- Football pickers (padel-only UI lock remains)
- CI, test runner, visual redesign beyond Operator Venues and the Community home Venue block
- A second App; using Route `/public` as a product
- Vercel Blob or URL-only logos (ADR-0006 chose Supabase)

## Further Notes

Glossary: apply the Language patch in root CONTEXT.md in the same planning commit as this spec (Venue, Court, Operator, Venue link, Venue link request; Community, Admin, Soft-archive edits). Architecture: ADR-0006 (Supabase Storage for Venue logos), ADR-0007 (evolve courts into Venue). ADR-0005 remains Soft-archive of Community; this spec extends the *term* and the Venue rules, it does not replace Community archive. ADR-0004 is untouched (Group parent stays immutable).

Locked v1 defaults (not a further grill): no Court cap; catalog search contains name/city/country; Operator queue shows Community name, requester, Venue, time; lat/lng Operator-only; Create Community name+type only; city and country trimmed free text; uniqueness (name, city, country) includes archived rows; silent reject.

## Implementation tickets (Linear)

All labelled `ready-for-agent`. Spec: `.scratch/venues/spec.md`.

| # | Ticket | Blocked by |
|---|--------|------------|
| 1 | [TEM-24 Operator can create and edit Venues](https://linear.app/temba-app/issue/TEM-24/operator-can-create-and-edit-venues) | — |
| 2 | [TEM-25 Operator can manage Courts on a Venue](https://linear.app/temba-app/issue/TEM-25/operator-can-manage-courts-on-a-venue) | TEM-24 |
| 3 | [TEM-26 Operator can upload a Venue logo](https://linear.app/temba-app/issue/TEM-26/operator-can-upload-a-venue-logo) | TEM-24 |
| 4 | [TEM-27 Operator can Soft-archive a Venue](https://linear.app/temba-app/issue/TEM-27/operator-can-soft-archive-a-venue) | TEM-24 |
| 5 | [TEM-28 Community can request, link, and unlink a Venue](https://linear.app/temba-app/issue/TEM-28/community-can-request-link-and-unlink-a-venue) | TEM-24, TEM-25, TEM-27 |

Frontier: **TEM-24** only. Do not implement until an implementer / orchestrator is asked to run the tickets in order. TEM-26 is parallel with TEM-25 and TEM-27; it does not block TEM-28.
