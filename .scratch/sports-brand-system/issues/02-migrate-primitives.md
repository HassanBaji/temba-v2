Spec: `.scratch/sports-brand-system/spec.md`

Linear: [TEM-122](https://linear.app/temba-app/issue/TEM-122/migrate-primitives-to-the-sports-brand)

# 02: Migrate primitives to the sports brand

**What to build:** Shared components speak the sports language: lime only via `Button variant="brand"` with black text; cards are 16px outlined white with little or no shadow; badges are quiet and not pill-washed; Level bands use a monochrome D/C/B/A ramp; Soft-archive is monochrome icon plus copy; the viewer Standing row is a quiet fill with a small lime left bar and a You label.

**Blocked by:** [TEM-121](https://linear.app/temba-app/issue/TEM-121/expand-sports-tokens-primary-black-volt-lime-beside-surfaces-and)

**Status:** ready-for-agent

- [ ] `Button variant="brand"` is volt fill + black text + volt-hover; default stays black
- [ ] Card default/outlined/elevated: white, hairline `#E5E5E2`, ~16px radius, no medium shadow on cards
- [ ] Badge ~8px radius; default follows black primary; typed badges stay outline/secondary (not volt)
- [ ] LevelBandBadge uses D/C/B/A monochrome ramp on real band strings (D3–A)
- [ ] SoftArchiveBanner is muted + icon + copy (no amber)
- [ ] Input/checkbox/calendar focus is dark; checked/selected stay primary black
- [ ] LeaderboardRow viewer: quiet fill + volt left bar + You label (not a brand-subtle wash)
- [ ] No new libraries or primitives beyond the Button variant
