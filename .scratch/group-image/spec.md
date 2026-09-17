# Group image

Status: ready-for-agent

Tickets (Linear, `ready-for-agent`), in dependency order:

- [TEM-233](https://linear.app/temba-app/issue/TEM-233/add-optional-group-image-at-create-and-show-it-on-the-groups-hub) Add optional Group image at create and show it on the Groups hub — no blockers
- [TEM-234](https://linear.app/temba-app/issue/TEM-234/let-a-group-approver-replace-or-remove-the-group-image) Let a Group approver replace or remove the Group image — blocked by TEM-233

Settled grilling: `.scratch/group-image/decisions.md`.

Owners this spec defers to, where they disagree:

- Groups list / Group home chrome facts (name, meta, next Game, form, header): `.scratch/groups-redesign/spec.md`
- User photos: `.scratch/user-profile-image/spec.md` (Clerk; do not extend to Groups)
- Venue logos: ADR-0006 (Venue bucket stays Venue-only)
- tRPC placement: `.cursor/rules/api-one-endpoint-per-file.mdc`

## Problem Statement

A User creating a **Group** can set a name, sport, Public/Private, and Require approval, but cannot give the Group a picture. The Groups hub (`/dashboard/groups`) then shows only typography — name, member/rank meta, next Game, form — so squads that play together are harder to recognise than a **Venue** with a logo. Club Group create on Community home has the same gap. There is no Group settings page to add a picture later.

## Solution

Treat image as an optional attribute of Group (Club Group and Loose Group). At create, the existing forms gain an optional file control. After the Group row exists, the App uploads JPEG/PNG/WebP (≤ 2 MB) to a public-read Supabase bucket and stores the public URL on the Group (`imageUrl`), using the same blob shape as Venue logos (ADR-0006) without sharing the Venue bucket or Clerk.

`/dashboard/groups` Mine and Public rows show that image in a leading `EntityMonogram`; if there is no URL or the file fails to load, initials from the Group name. A second slice lets a **Group approver** replace or remove the image from Group home overflow so a wrong or skipped upload is not permanent.

Approving this spec approves the Test seams in Testing Decisions. No new `CONTEXT.md` term. ADR-0006 stays Venue-only; add sibling ADR-0015. Keep **Group**, **Club Group**, **Loose Group**, **Public Groups list**, **Group approver**, **User**, **App**, **Operator**, **Venue**, **Community**.

## User Stories

1. As a User with create access on Create Group, I want an optional Add image control, so that a Loose Group can have a picture without a second settings page.

2. As a User creating a Loose Group Public, I want to submit name, type, Require approval, and an optional image in one Create Group action, so that I do not upload before the Group exists.

3. As a User creating a Loose Group Private, I want the same optional image control, so that Private squads can have a picture too.

4. As a User who skips the file, I want Create Group to succeed with no image, so that image is never required.

5. As an Owner or Admin with create access creating a Club Group Public, I want an optional Add image control on Create Club Group, so that a Community squad can have a picture at create.

6. As an Owner or Admin creating a Club Group Private, I want the same optional image control, so that both Club Group types match Loose Group.

7. As a User without Clerk create access, I want Create Group and Create Club Group to stay hidden, so that the image field does not become a new create door.

8. As a Member who is not Owner or Admin, I want no Club Group create image control, so that the flag does not widen who creates Club Groups.

9. As a User choosing a file, I want JPEG, PNG, or WebP at most 2 MB, so that Group files match Venue logo rules I already know.

10. As a User choosing a GIF, SVG, AVIF, or oversized file, I want an inline error before submit (“Image must be a JPEG, PNG, or WebP image” / “Image must be at most 2 MB”), so that I am not sent to Storage with a rejected type.

11. As a User who picked a file, I want to see which file is attached (name and/or local thumbnail) and to clear the pick before submit, so that I can fix a mis-click without creating the Group.

12. As a User, I want no cropper on Group create, so that the App does not invent a second image editor beside Clerk’s User photo crop.

13. As a User after a successful create with an image, I want to land on Group home as today, and then see that image on `/dashboard/groups` Mine, so that the Groups section shows what I just added.

14. As a User after a successful create without an image, I want the Mine row to show initials from the Group name, so that rows without a picture still have entity chrome.

15. As a User viewing Mine, I want each Group row to keep name, member/rank meta, next Game, and form, with the image only as a leading monogram, so that Groups redesign facts are not restyled.

16. As a User on the Public tab, I want listed Public Groups I am not in to show the same image or initials, so that the Groups section is consistent when I am browsing to join.

17. As a User on Public, I want Join / Request to join to behave as today, so that an image is not a new admit rule.

18. As a User viewing a row whose `imageUrl` is null, empty, or fails to load, I want initials, so that a broken CDN URL does not leave a blank tile.

19. As a User of a Group named with one word, two words, or empty/Untitled, I want initials to follow the existing `initials` helper, so that Group chrome matches other entity monograms.

20. As a User, I want the leading monogram decorative (`aria-hidden`) because the Group name is the row title, so that the image is not an extra unlabelled tab stop.

21. As a User whose image upload fails after the Group row exists (Storage down, placeholder keys), I want a toast that the Group was created but the image was not saved, and I want to be taken to that Group rather than stuck on create, so that retrying Create Group does not duplicate the Group.

22. As a Group approver after a failed or skipped upload, I want Change image on Group home overflow (second slice), so that I can attach a picture without deleting the Group.

23. As a Group approver, I want Change image to replace the stored file and URL, so that a wrong picture is not permanent.

24. As a Group approver when an image is present, I want Remove image, so that the Group can return to initials.

25. As a Loose Group creator, I want to be the Group approver for image writes, so that image follows Require approval’s writer set.

26. As a Community Owner or Admin on a Club Group, I want to change or remove that Group’s image, so that staff can fix Club Group chrome.

27. As a Club Group creator who is still a Community Member, I want to change or remove the image, so that the person who created the squad can fix it without being Owner.

28. As a Club Group creator who left the Community, I want image writes refused, so that Group approver stays the existing membership rule.

29. As a User who is only a Group member, I want no Change/Remove image, so that members cannot overwrite squad chrome.

30. As an Operator who is not a Group approver on that Group, I want no Group image control, so that Operator stays Venue work.

31. As a Group approver of a Club Group whose Community is Soft-archived, I want upload and clear refused, so that host-freeze matches Require approval.

32. As a member of a Soft-archived Club Group, I still want to see the stored image on Mine if I can already see that Group, so that Soft-archive does not strip chrome.

33. As a User deleting an empty Group I am allowed to delete, I want delete to succeed even if Storage object removal fails, so that a down bucket does not trap an empty Group.

34. As a maintainer, I want empty-Group delete to attempt to remove the Storage object, so that most deletes do not leave orphans.

35. As a User, I want create name, sport (padel), Public/Private, Require approval, and community rules unchanged, so that image is only an extra optional file.

36. As a User, I want join, request, Lookup invite, Invite link, leave, and empty delete rules unchanged aside from best-effort object removal on delete.

37. As a User on Invitations, Community Groups, nested Community-hub Group rows, Group home header, or `/gr/{code}`, I want those surfaces unchanged this spec, so that we do not redesign every Group name into a poster.

38. As a User, I want Football create to stay hatched and non-interactive, so that image does not unlock a second sport.

39. As a Cloud Agent or local App without real Supabase keys, I want the App to boot with a placeholder `SUPABASE_GROUP_IMAGES_BUCKET`, so that `/login` still renders; live Group image upload needs real keys like Venue logos.

40. As a User, I want Venue logos, Clerk User photos, Coach `imageUrl`, and Community monograms unchanged, so that this slice is only Group image.

41. As a User activating Change image, I want a named, keyboard-accessible control, so that overflow is not colour-only.

42. As a User who uploads twice quickly, I want the last successful upsert to win at `{groupId}/image`, so that Temba does not invent merge rules.

43. As a User, I want product copy to say image, not logo or player photo, so that language stays with Group and not Venue or User.

## Implementation Decisions

- **Attribute, not entity.** Nullable `groups.imageUrl`. Null/empty means no image. No glossary term. No `has_image` column.

- **Schema.** DB Package migration adding `image_url` varchar(255) on `groups`. Do not rewrite old migrations. Existing Groups stay null (initials).

- **Storage.** `~/server/storage/group-images.ts`: decode base64, 2 MB cap, detect/assert JPEG/PNG/WebP magic bytes, upload upsert, `getPublicUrl`, remove. Bucket `env.SUPABASE_GROUP_IMAGES_BUCKET`. Path `{groupId}/image`. Do not import Venue helpers by Venue name. Do not put objects in `SUPABASE_VENUE_LOGOS_BUCKET`. Env: `env.js`, `.env.example`, Cloud `install.sh` placeholder when unset.

- **ADR.** New `docs/adr/0015-supabase-storage-group-images.md`. ADR-0006 unchanged.

- **tRPC.** `groups.uploadImage` and `groups.clearImage` (ticket 02) as their own procedure files under `api/routers/groups/`. `index.ts` composes only. Input shape mirrors Venue: `groupId`, `contentType` enum, `dataBase64`. Return `{ id, imageUrl }`. `protectedProcedure` + `resolveAppUser` + `requireGroup` + `assertGroupApprover` + Soft-archive `refuseIfFrozen` on Club Group host (same messages family as `setRequiresApproval`). Then decode/assert, Storage, update `imageUrl`. Extract only the storage module (used by upload, clear, and delete). Do not add `server/groups/upload-image.ts`. Do not change create procedure Zod inputs.

- **Create UI.** Loose `/dashboard/groups/new` and `CommunityCreateGroupDialog`: optional file field, `accept="image/jpeg,image/png,image/webp"`, client size/type checks copied from Venue detail (`fileToBase64` may be copied; a tiny shared helper is allowed if both Group create surfaces would duplicate it — do not refactor Venue detail). On success of create: if a file is selected, `uploadImage`; then existing invalidate + navigate/toast. If upload fails: toast that the Group was created without an image; still navigate/close. `CreateAccessGate` unchanged.

- **Read-models.** `groups.mine` and `groups.listPublic` add `imageUrl: string | null`. Ticket 02: `groups.byId` adds `imageUrl` and `canManageImage` (true iff `isGroupApprover`). Do not add image to `mineLoose`, Community `byId.groups`, `communities.mine` nested groups, or `previewInviteLink` this spec.

- **Groups hub UI.** Mine `GroupRowCard` and Public `PublicGroupRows`: leading `EntityMonogram` (`name`, `image={imageUrl}`, size `lg`). Keep the rest of the redesigned row. Invitations card unchanged. Loading skeleton may add a square placeholder if it still reads as the same card; do not bring back `ListPageSkeleton`.

- **Replace/clear UI (ticket 02).** Group home overflow items `change_image` / `remove_image` when `canManageImage` (remove only when `imageUrl` present). Hidden file input for change; confirm dialog for remove (match Venue clear confirm). Do not add header monogram; do not add a Logo-style settings section.

- **Delete.** Existing `deleteGroup` transaction: after auth/empty checks, best-effort remove Storage object when `imageUrl` is set (ignore Storage errors), then existing invite-link cleanup and row delete.

- **Permissions/visibility.** Who *sees* an image is who already sees that Group on that list. This spec does not add a public Group gallery or signed-out Groups hub.

- **Copy.** Add image / Change image / Remove image. Errors: “Image must be a JPEG, PNG, or WebP image”; “Image must be at most 2 MB”; “Image file is empty”; “Failed to upload Group image”; “Failed to clear Group image”. Do not say logo.

- **Unchanged.** Join/admit/invite; Require approval semantics; create staff/sport/archive checks; Groups-redesign W-L/form/next Game; Group home header; padel-only gate; Clerk User photos; Venue upload/clear.

## Testing Decisions

### What a good test is

Test external behaviour: optional skip; client-rejected type/size; approver vs member vs frozen Community; Mine/Public payload `imageUrl`; list initials vs URL; create still succeeds when upload is not called; delete still succeeds if remove throws. Do not assert CSS class names, folder names, or live Supabase in CI. Prefer Vitest + PGLite. Do not add Playwright or a new runner.

### Test seams

Highest seam (two, matching the tickets): (1) create a Group with or without an image pick, persist URL via `uploadImage`, see it on `groups.mine` / `listPublic` and the Groups hub; (2) Group approver replaces/clears from Group home overflow; members and frozen Club Groups cannot.

If you implement this spec, you implement these seams:

- Create Loose Public/Private and Club Public/Private still succeed with no file
- Create UIs expose optional Add image; skipping does not send `uploadImage`
- Client rejects non-JPEG/PNG/WebP and > 2 MB before mutate
- After create with a file, UI calls `uploadImage` with that Group id
- `uploadImage` FORBIDDEN for a non-approver; BAD_REQUEST for empty/oversize/wrong magic bytes (throws before Storage)
- `uploadImage` refused on host-frozen Club Group
- PGLite: `mine` / `listPublic` return a stored `imageUrl` when the column is set (insert URL; no bucket)
- PGLite: null `imageUrl` is returned as null
- `deleteGroup` still deletes when Storage remove fails
- Ticket 02: `clearImage` nulls URL after successful remove; FORBIDDEN/frozen same as upload; overflow Change/Remove only if `canManageImage`
- `app-router-shape` includes `uploadImage` and (after ticket 02) `clearImage`
- Existing `mine.test.ts`, `listPublic.test.ts`, join-request, and create-helper suites stay green
- Venue logo procedures and Clerk User image behaviour unchanged
- Manual (real Supabase keys): create with image, see Mine and Public; skip image, see initials; failed keys toast-and-navigate

Approving this spec approves these seams.

### Prior art

- Venue `uploadLogo` / `clearLogo` + `~/server/storage/venue-logos.ts` (no PGLite bucket tests)
- `groups/mine.test.ts`, `listPublic.test.ts`, create helpers in those suites
- `assertGroupApprover` / `setRequiresApproval` freeze behaviour
- `EntityMonogram` image + initials (Community home Venue logo)
- `app-router-shape.ts`

## Out of Scope

- Community logos or Community `EntityMonogram` photos
- Clerk / Temba User photos; extending ADR-0006 to Users
- Storing Group images on Clerk
- Open Graph or Invite-link `/gr/{code}` images
- Cropper library
- URL-paste without upload
- GIF, SVG, AVIF, or files over 2 MB
- Required image at create
- Changing who may create a Group
- Changing join, request, Lookup invite, Invite link, leave, or empty-delete *rules* (object cleanup on delete is in scope)
- Redesigning Groups list beyond the leading monogram
- Group home header image; Members tab is still User avatars
- Invitations card images; Community Groups lists; `mineLoose`
- Directory; football create
- A generic multi-entity Storage Package
- Janitor for orphan objects
- Signed URLs / private bucket

## Further Notes

- Settled grilling: `.scratch/group-image/decisions.md`.
- Feature slug `group-image` (not `group-logo`).
- Amends `.scratch/groups-redesign/spec.md` §1.1: rows gain a leading `EntityMonogram`. Do not reopen W-L, form, next Game, or Invitations.
- Ticket 01 is demoable on `/dashboard/groups` after create. Ticket 02 is blocked by 01 because overflow calls the same `uploadImage` and the column/bucket must exist.
- Shared create helpers stay shared; they do not learn Storage.
- `EntityMonogram` already accepts `image`; Groups hub simply starts passing it.
- Live upload needs real `SUPABASE_*` keys; Cloud placeholders boot the App but Storage calls fail (story 21).

## Implementation tickets

Published to Linear. Frontier is [TEM-233](https://linear.app/temba-app/issue/TEM-233/add-optional-group-image-at-create-and-show-it-on-the-groups-hub).

1. [TEM-233](https://linear.app/temba-app/issue/TEM-233/add-optional-group-image-at-create-and-show-it-on-the-groups-hub) Add optional Group image at create and show it on the Groups hub — unblocked.
2. [TEM-234](https://linear.app/temba-app/issue/TEM-234/let-a-group-approver-replace-or-remove-the-group-image) Let a Group approver replace or remove the Group image — blocked by TEM-233.
