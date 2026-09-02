Spec: `.scratch/sports-brand-system/spec.md`

Linear: [TEM-121](https://linear.app/temba-app/issue/TEM-121/expand-sports-tokens-primary-black-volt-lime-beside-surfaces-and)

# 01: Expand sports tokens (primary black, Volt Lime beside, surfaces and radius)

**What to build:** The App stops being blue-primary. Page background becomes off-white, default interactive chrome becomes black, focus rings become dark, sidebar tokens become dark sports chrome, and Volt Lime exists as a separate accent that nothing maps `--primary` onto. The App is not yet a finished sports brand — lime CTAs and rail treatment come next.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `--primary` is `#0A0A0A`; `--primary-foreground` is white; `--ring` is dark; `--background` is `#F6F6F3`; `--card` is white; `--surface-raised` is `#FAFAF8`; `--sidebar` is `#0A0A0A`
- [ ] `--color-volt` / `--color-volt-hover` / `--color-volt-soft` / `--color-volt-foreground` exist; `--color-brand` is **not** aliased to volt
- [ ] Leftover `text-brand` / `bg-brand-subtle` no longer resolve to blue or to lime-on-white text; they remap to foreground/muted as a safety
- [ ] Radius calc still yields 8/10/12/16; `--chart-1` is volt; `--chart-2+` are gray
- [ ] `.dark` is retuned coherently; no dark-mode toggle
- [ ] Default Button is black, not blue or lime
- [ ] Existing unit tests stay green
