# User profile image — settled decisions

Status: spec published — `.scratch/user-profile-image/spec.md` (ready-for-agent). Linear: [TEM-128](https://linear.app/temba-app/issue/TEM-128/you-addedit-profile-image-via-clerk) (frontier) blocks [TEM-129](https://linear.app/temba-app/issue/TEM-129/show-stored-user-image-on-existing-avatar-surfaces).

Autonomous planner: no live user. Forks locked from existing architecture and the request. Prefer Clerk as identity image owner + existing webhook + You as the edit surface.

## Grill (round 1) — locked

1. **Source of truth is Clerk.** Temba `user.image` is a synced copy. Reject a Temba-owned Supabase User blob pipeline (do not extend ADR-0006 to Users).
2. **“From the beginning” means live Clerk on You.** `hasImage` + `imageUrl`. Lists use DB `user.image` only. No live-Clerk overlay on list rows for other Users.
3. **Edit lives on You’s identity avatar → Clerk UserProfile.** `UserButton` stays. Not a custom settings page. Reject a Temba `<input type="file">` and reject calling Clerk `setProfileImage` without Clerk’s crop UI. Reject a UserProfile *page*.
4. **Remove is allowed; restore-OAuth is not.** Persist null when `has_image` is false. Do not persist Clerk generated defaults as photos.
5. **File types / size / crop = Clerk**, not Venue logo validation.
6. **Who may edit: only the signed-in User, themselves.** No App tRPC mutation for User image.
7. **Webhook:** `image = has_image ? image_url : null`. No schema change. No backfill.
8. **No glossary term.** Image is an attribute of User.
9. **No ADR.** Clerk-as-owner is current architecture. ADR-0006 stays Venue-only.

## Grill (round 2) — locked

10. **Discoverability:** the You identity avatar is a named, keyboard-accessible add/edit control. `AvatarBadge` is allowed. Copy: **Add profile photo** when Clerk `hasImage` is false; **Edit profile photo** when true. No Settings section.
11. **Other surfaces:** a second vertical slice so other people see the stored photo on existing `UserAvatar` / `AvatarStack` call sites.
12. **Team stacks** must use real member `{ name, image }`, not `displayName` splits. Lookup picker avatars are out of this spec.
13. **Full Clerk UserProfile modal** (not photo-only) is accepted. It is the same manager `UserButton` already owns. Compatible with the redesign rule that Clerk owns account management and no custom settings surface is invented — as long as implementers open UserProfile and do not copy the Venue logo file input onto You.

## Out of this slice

- Temba-hosted User blobs; new columns; URL backfill
- Staff photo admin; public User profile
- Cropper library; App-side MIME/size validation
- Venue / monogram / Coach / Level / Game-rule changes
- `user.deleted`
- Lookup picker avatars
- Duplicate sidebar `UserButton`
- Invite-link accept shells that monogram entities, not Users
- Open Graph images
