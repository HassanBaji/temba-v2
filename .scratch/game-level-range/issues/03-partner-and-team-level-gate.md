# 03: Partner and team-only Level gate

**Linear:** [TEM-132](https://linear.app/temba-app/issue/TEM-132/partner-and-team-only-level-gate)

**Spec:** `.scratch/game-level-range/spec.md`

**What to build:** Register-with-partner and team-only Game admit (and their Waitlist enqueue) require every User in the party to pass the Level helper (in range, waived, or Organizer-for-self). One out-of-range partner refuses the pair/Team; the in-range User can still solo seat-register. Eligible Teams on Game home hide partnerships that fail.

**Blocked by:** [TEM-131](https://linear.app/temba-app/issue/TEM-131/gate-individual-game-admit-requestapprovereject-game-home-ui) Gate individual Game admit + request/approve/reject + Game home UI

**Status:** ready-for-agent

- [ ] Register-with-partner refuses if either User fails the Level helper; in-range caller can still seat-register alone
- [ ] When full, partner waitlist enqueue is also refused for a failing User (no Waitlist row for the out-of-range partner)
- [ ] Team-only register and team waitlist enqueue refuse if any member fails; Organizer bypass applies only to the Organizer’s own User id
- [ ] `byId` eligible Teams require both members to pass the helper
- [ ] Partner search picker stays as shipped (not pre-filtered); the refuse happens at register
- [ ] Error copy names the partner/Team failure without raw μ
- [ ] PGLite tests cover mixed in-range/out-of-range partner, both-waived partner success, and incomplete Team still refused as today
