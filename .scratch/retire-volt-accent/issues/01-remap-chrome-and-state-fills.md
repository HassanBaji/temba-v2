Spec: `.scratch/retire-volt-accent/spec.md`

Linear: [TEM-151](https://linear.app/temba-app/issue/TEM-151/remap-chrome-and-state-fills-off-volt)

# 01: Remap chrome and state fills off Volt

**What to build:** Selected desktop rail and mobile bottom nav keep their bars and weight, now white on the dark rail and black on the light bar. Login’s geometric square is a white mark on black. Clerk’s primary button is black with white text. Joinable vacant seats, occupancy “open”, the Level-range tile, the viewer Standing row, and positive Level movement still mean the same thing, without lime.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] AppRail selected = white label + weight + 3px **white** left bar (bar remains; not colour-only)
- [ ] BottomNav selected = black filled icon + weight + 2px **black** top bar; five slots; no Create
- [ ] AuthShell geometric square is white on the dark panel
- [ ] Clerk `colorPrimary` `#0A0A0A` and `colorPrimaryForeground` `#FFFFFF`; no commented `#C8F135` in App source
- [ ] Joinable vacant seats: black hairline + muted fill + Open copy (seat grid and Game card roster)
- [ ] Occupancy “open” bar is black on the muted track; filling/full unchanged
- [ ] Level-range detail tile uses the neutral icon well; `volt` tile tone is gone
- [ ] Viewer Standing row: muted fill + black left bar + You label
- [ ] Positive Level movement is black outline or black type plus ↑, not lime and not leftover brand green
- [ ] No product-behaviour change to Join / Create / Register
