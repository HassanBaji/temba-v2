Spec: `.scratch/sports-brand-system/spec.md`

Linear: [TEM-127](https://linear.app/temba-app/issue/TEM-127/contract-leftover-blue-and-visual-qa-gate)

# 07: Contract leftover blue and visual QA gate

**What to build:** Blue brand tokens are gone. Volt Lime occupancy is about 5–10% on sampled screens. Contrast and “one brand CTA per screen” hold. A TEM-72-style QA note is recorded for this spec.

**Blocked by:** [TEM-124](https://linear.app/temba-app/issue/TEM-124/restyle-home-and-you-to-the-sports-brand), [TEM-125](https://linear.app/temba-app/issue/TEM-125/restyle-games-surfaces-to-the-sports-brand), [TEM-126](https://linear.app/temba-app/issue/TEM-126/restyle-groups-standing-communities-venues-teams-and-invites)

**Status:** ready-for-agent

- [ ] Grep under the App source has no `#0000FF` / `#0000ff` / hue-264 brand steps / `text-brand` / `bg-brand-subtle` / `bg-brand-on-dark` except comments pointing at retired names
- [ ] Unused `--color-brand*` removed from the token file
- [ ] Sampled screens: at most one `variant="brand"`; volt not used as a large fill
- [ ] Contrast notes: lime+black CTA; no lime-on-white text; 12–13px meta uses gray-700
- [ ] QA note at `.scratch/sports-brand-system/qa-gate.md` (screenshots if Clerk session allows)
- [ ] Unit tests green
