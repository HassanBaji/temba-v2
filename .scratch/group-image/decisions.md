# Group image — settled decisions

Status: spec published — `.scratch/group-image/spec.md` (ready-for-agent). Linear: [TEM-233](https://linear.app/temba-app/issue/TEM-233/add-optional-group-image-at-create-and-show-it-on-the-groups-hub) (frontier) blocks [TEM-234](https://linear.app/temba-app/issue/TEM-234/let-a-group-approver-replace-or-remove-the-group-image).

Autonomous planner: no live user. Forks locked from existing architecture and the request. Prefer Venue-shaped Supabase Storage as a **sibling** of ADR-0006, image as an attribute of Group (no new glossary term), Groups hub as the display surface named in the request.

## Grill (round 1) — locked

1. **Optional at create, never required.** Skipping yields `imageUrl` null. Reject required-on-create (breaks today’s one-field-name create). Reject URL-paste (ADR-0006 already rejected that for Venue).

2. **Club Group and Loose Group, Public and Private — all four create doors.** “Creating a Group” is all of them. Reject Loose-only (Club create is a real door on Community home). Reject Public-only.

3. **Who may set at create: whoever may already create.** Loose: Clerk `groupCreator` UI gate + existing procedures. Club: Owner/Admin (`requireStaff`) and the UI flag. Do not change create gates. Reject Operator-as-uploader (Operator is Venue). Reject any Member.

4. **Storage is Temba-owned Supabase, not Clerk.** Group is not a Clerk user. Reject putting Group images on Clerk (user-profile-image explicitly does not extend ADR-0006 to Users; this is the inverse: do not extend Clerk to Groups).

5. **Sibling bucket and module, not the Venue logos bucket.** New env `SUPABASE_GROUP_IMAGES_BUCKET` (example default `group-images`). Sibling `~/server/storage/group-images.ts` copying Venue’s MIME/size/magic-byte/public-URL/upsert pattern with Group copy (“Image must be…”). Path `{groupId}/image`. Same `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Reject prefix-in-`venue-logos` (bucket is named for Operator catalog logos). Reject generalizing `venue-logos.ts` into a multi-entity blob service. Reject Vercel Blob. Do not refactor Venue in this feature (duplicate the ~byte checks; a third entity can extract later).

6. **File types / size / crop = Venue, not Clerk.** JPEG/PNG/WebP, ≤ 2 MB, magic-byte check, no cropper library. Reject GIF/SVG/AVIF. Reject inventing a cropper.

7. **No new glossary term.** Image is an optional attribute of Group. Product copy: **Add image** / **Change image** / **Remove image**. Not “logo” (that is Venue). Not “avatar” as a domain entity. `EntityMonogram` is UI chrome.

8. **Column `groups.imageUrl` (`image_url`, varchar 255, nullable).** Null means no image. No `has_image` column. Match Venue/coach URL-on-entity, not User `image` (Clerk). 255 matches Venue; typical Supabase public URLs fit.

9. **ADR-0006 stays Venue-only.** Sibling **ADR-0015** records Group images. Do not amend 0006 into generic “entity images” (User stays Clerk; Community has no logo).

## Grill (round 2) — locked

10. **Blob door is `groups.uploadImage`, not bytes on the four create inputs.** Create procedures stay name/sport/visibility/community. Create UIs: optional file → create mutation → if a file was chosen, `uploadImage` → then navigate/close. One submit in the UI. Matches Venue (entity id exists before `{id}/image`). `uploadImage` is the shared rule for create and later replace (two doors / a procedure plus create UIs — storage module is the extract, not a `server/groups/upload.ts` twin). Reject stuffing `dataBase64` into four create Zod inputs. Reject a second create-only upload path.

11. **`uploadImage` authorization is Group approver** (`assertGroupApprover`: Loose creator; Club Community Owner/Admin, or creator while still a Community Member; nobody while the Club Group’s Community is Soft-archived / host-frozen). At create time the creator is that approver. Reject “any member”. Reject Operator-only.

12. **Replace/clear is in this spec, second slice.** Create-only would leave a wrong or failed upload stuck (there is no Group edit page). `uploadImage` upserts (replace). `groups.clearImage` is ticket 02. UI for later change: Group home overflow **Change image** / **Remove image** for `canManageImage`, not a settings page, not a Groups-redesign header restyle. Reject inventing Group settings. Reject adding a leading image to Group home header this spec (redesign §2 is name + meta).

13. **Display in scope: `/dashboard/groups` Mine and Public rows.** That is the Groups section. Leading `EntityMonogram` with `image={imageUrl}`, initials fallback, `aria-hidden` (name is the row title). Do not otherwise restyle the redesigned row. `groups.mine` and `groups.listPublic` return `imageUrl`. This **amends** groups-redesign §1.1 (rows were specified without a leading image).

14. **Fallback is initials, not hatch.** Hatch on this screen means empty next Game / Provisional elsewhere. `EntityMonogram` + `initials(name)` already exists; Radix `AvatarFallback` covers failed loads. Untitled Group uses `initials("Untitled Group")`. Reject empty circle. Reject sport-icon fallback.

15. **Surfaces deferred:** Group home header; Community Groups tab; Communities-hub nested Club Group rows; Invitations card; `/gr/{code}` / `previewInviteLink`; Open Graph; Game cards; `groups.mineLoose`. Same URL is stored; those UIs just do not read it yet.

16. **Create-then-upload failure:** Group row is kept. Toast that the Group was created and the image failed; still navigate/close (retrying create would duplicate). Ticket 02 is the retry. Leftover object if Storage succeeded and DB URL update failed: next upsert overwrites `{groupId}/image` (same as Venue). Do not roll back the Group. Do not delete leftover objects with a janitor this spec.

17. **Empty-Group delete:** best-effort `removeGroupImageObject`, then existing DB delete. Storage failure must not block delete (orphan object allowed). Soft-archive does not delete objects or null the URL (reversible hide).

18. **tRPC:** logic in `uploadImage.ts` / `clearImage.ts`; `index.ts` composes only. Call `~/server/storage/group-images.ts` and `assertGroupApprover`. Do not put bucket code under `api/routers/`. Do not add `server/groups/upload-image.ts`. Create helpers unchanged. `app-router-shape.ts` gains `uploadImage` / `clearImage`.

19. **Tests:** PGLite for persist/auth/read-models (set `imageUrl` without live Supabase; FORBIDDEN/frozen/validation that throw before Storage). Unit-test magic-byte helpers. Do not require a real bucket in CI. Manual signed-in create+list needs real Supabase keys (same as Venue). Prior art: `groups/mine.test.ts`, `listPublic.test.ts`, create helpers used by those suites; Venue logo has **no** PGLite suite.

20. **Cloud env:** `install.sh` / `.env.example` / `env.js` gain `SUPABASE_GROUP_IMAGES_BUCKET` with a syntactically valid placeholder when unset (mirror Venue). Live upload needs real keys. App boot without real keys still works.

## Out of this program

- Community logos; User photos; folding into Venue logos or Clerk
- Open Graph / Invite-link social images
- Cropper; GIF/SVG/AVIF; URL paste
- Changing join/admit/invite, create gates, or create fields other than the optional file
- Redesigning Groups list beyond the leading image
- Public Groups list *behavior* (join/request) — only the leading image
- Directory, football create (still hatched)
