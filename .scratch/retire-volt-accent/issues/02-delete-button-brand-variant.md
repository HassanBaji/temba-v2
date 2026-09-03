Spec: `.scratch/retire-volt-accent/spec.md`

Linear: [TEM-152](https://linear.app/temba-app/issue/TEM-152/migrate-brand-buttons-to-default-and-delete-the-variant)

# 02: Migrate brand buttons to default and delete the variant

**What to build:** Every primary action that was the lime `brand` button is the standard black button with white text. The extra Button variant is gone, so a future screen cannot reintroduce lime through `variant="brand"`.

**Blocked by:** None (can start immediately; parallel with 01).

**Status:** ready-for-agent

- [ ] Every former `variant="brand"` call site uses `default` (or omits variant)
- [ ] Button primitive no longer lists `brand`
- [ ] Create Game / Group / Community / Team, Join, Register, Accept, Join waitlist, Declare Level, Request to join, Complete Match, and level-range request render as black fill / white text
- [ ] Outline / ghost / destructive secondaries are unchanged in role
- [ ] Primary CTAs are not gray-on-gray
- [ ] Join / Create / Register behaviour is unchanged; colour only
