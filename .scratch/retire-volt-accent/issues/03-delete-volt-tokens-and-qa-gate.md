Spec: `.scratch/retire-volt-accent/spec.md`

Linear: [TEM-153](https://linear.app/temba-app/issue/TEM-153/delete-volt-tokens-and-close-the-lime-grep-gate)

# 03: Delete Volt tokens and close the lime grep gate

**What to build:** Volt tokens no longer exist. Future charts would be gray/black. A signed-in User can travel Home, Games, Group Standing, You, and login with zero lime. Grep under the App is clean.

**Blocked by:** [TEM-151](https://linear.app/temba-app/issue/TEM-151/remap-chrome-and-state-fills-off-volt) Remap chrome and state fills off Volt; [TEM-152](https://linear.app/temba-app/issue/TEM-152/migrate-brand-buttons-to-default-and-delete-the-variant) Migrate brand buttons to default and delete the variant.

**Status:** ready-for-agent

- [ ] `--color-volt`, `--color-volt-hover`, `--color-volt-soft`, `--color-volt-foreground` deleted (not aliased)
- [ ] `--chart-1` is black/gray in light and `.dark`; not `var(--color-volt)`
- [ ] Token comments do not mention Volt Lime
- [ ] Grep under `apps/temba`: no `volt`, `bg-volt`, `border-l-volt`, `--color-volt`, `#c8f135`, `#C8F135`, `variant="brand"`
- [ ] `#0000FF` does not return
- [ ] Destructive red and Soft-archive gray still present on sampled surfaces
- [ ] `.scratch/sports-brand-system/spec.md` has a short banner that Volt Lime is superseded by this spec
- [ ] QA notes recorded at `.scratch/retire-volt-accent/qa-gate.md`
