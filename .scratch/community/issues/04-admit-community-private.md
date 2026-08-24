# 04: Admit to Community Private (Email invite + Invite link)

**What to build:** Owner or Admin admit people to a Community Private. They send an Email invite (unknown address OK; after Clerk, join only if the account email matches; mismatch or another signed-in User does not consume; unused invites are revocable) and copy one reusable Invite link (rotate or revoke; any authenticated User becomes a Member). Members cannot mint either. Signed-out people open Temba’s invite URL, then sign in or sign up with Clerk — Temba does not log them in itself. Mail vendor may be TBD; the App still produces a URL that can be opened.

**Blocked by:** 02: Create Community and Directory

**Status:** ready-for-agent

**Parent:** #1 Community: clubs, Groups, sports, and Private invites

- [ ] Owner or Admin can send an Email invite to any address; if a User already exists for that email, the invite attaches to them and the email is still sent (or the URL is still produced)
- [ ] One unused Email invite per Community and email; unused invites can be revoked; no time expiry
- [ ] After Clerk sign-in or sign-up, join happens only if the authenticated email matches the invited address (case-insensitive); first successful match auto-joins as Member
- [ ] A mismatched account or another signed-in User opening the Email invite URL does not consume it
- [ ] Owner or Admin can copy one reusable Invite link; unlimited uses; no time expiry; any authenticated User who opens a live link becomes a Member
- [ ] Rotate kills the old Invite link and mints a new one; revoke leaves no active link
- [ ] Members cannot create Email invites or Invite links
- [ ] Community Public still has no Email invite and no Invite link
- [ ] Invite-accept URLs work while signed out, then return through Clerk to the same invite URL; opening an invite URL does not log anyone in without Clerk
- [ ] Temba is not a second identity provider
