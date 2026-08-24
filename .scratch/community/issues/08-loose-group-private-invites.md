# 08: Loose Group Private Email invite and Invite link

**What to build:** The creator of a Loose Group Private sends Email invites and copies one reusable Invite link, with the same Clerk, email-match, rotate, and revoke rules as Community Private. Anyone else is refused.

**Blocked by:** 04: Admit to Community Private (Email invite + Invite link); 06: Loose Group Public: create and join via URL

**Status:** ready-for-agent

**Parent:** #1 Community: clubs, Groups, sports, and Private invites

- [ ] The creator can make a Loose Group Private (no Community parent)
- [ ] Only the creator can send Email invites and mint, rotate, or revoke the Invite link
- [ ] Email invite: unknown address OK; Clerk then email must match; mismatch does not consume; unused can be revoked
- [ ] Invite link: one reusable door; unlimited uses; no expiry; any authenticated User may consume a live link; rotate/revoke work
- [ ] Anyone who is not the creator is refused when creating invites or links
- [ ] Invite-accept URLs work signed-out via Clerk; Temba does not log anyone in itself
