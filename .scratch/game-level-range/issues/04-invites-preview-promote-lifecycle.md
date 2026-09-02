# 04: Lookup waiver, Invite link gate, preview, promote grandfather, lifecycle

**Linear:** [TEM-133](https://linear.app/temba-app/issue/TEM-133/lookup-waiver-invite-link-gate-preview-promote-grandfather-lifecycle)

**Spec:** `.scratch/game-level-range/spec.md`

**What to build:** Sending a Game Lookup invite upserts an approved waiver for that User so accept/waitlist does not need a separate request. Invite link remains gated unless a waiver exists; preview shows the range and Request to play (including `inviteToken` for groupless Games). Waitlist auto-promote does not re-check Level. Soft-archive, cancel, and close behave as specced for new requests.

**Blocked by:** [TEM-131](https://linear.app/temba-app/issue/TEM-131/gate-individual-game-admit-requestapprovereject-game-home-ui) Gate individual Game admit + request/approve/reject + Game home UI

**Status:** ready-for-agent

- [ ] Successful Lookup send upserts `approved` for each invited User (`decidedBy` = sender); out-of-range is not a send refusal; revoke unused invite does not remove the waiver
- [ ] Lookup accept Game admits or waitlists an out-of-range invitee who was waived
- [ ] Invite link accept still refuses out-of-range Users without a waiver; preview shows the formatted range when set and Request to play instead of seat-pick; `requestLevelRange` accepts optional `inviteToken`
- [ ] Team-only Invite link: each clicker must pass or be waived; Team admit still requires both members to pass
- [ ] Open Graph description appends the Game Level range when set and never includes a User’s Level
- [ ] Waitlist auto-promote does not re-apply the Level helper (grandfather); leave then re-register does re-apply
- [ ] Tightening the range does not kick registered Users or skip waitlisted ones
- [ ] Join-frozen / cancelled Games refuse new requests and decisions; register/waitlist/invite doors stay frozen as shipped
- [ ] Tests cover Lookup waiver at send, Invite link still gated, promote after tighten, and preview token request
