Spec: `.scratch/sports-brand-system/spec.md`

Linear: [TEM-123](https://linear.app/temba-app/issue/TEM-123/migrate-chrome-rail-bottom-nav-authinvite-shells-clerk)

# 03: Migrate chrome (rail, bottom nav, auth/invite shells, Clerk)

**What to build:** Desktop rail is black sports chrome with white labels and a small lime selected bar. Mobile bottom nav stays white with black active icons, gray inactive icons, and a 2px lime top indicator. Login, signup, and invite shells use the same off-white page and white card. Clerk’s primary button is lime with black text. No new nav destinations and no Create slot on the bottom bar.

**Blocked by:** [TEM-121](https://linear.app/temba-app/issue/TEM-121/expand-sports-tokens-primary-black-volt-lime-beside-surfaces-and)

**Status:** ready-for-agent

- [ ] AppRail uses sidebar tokens; selected = white + weight + 3px left volt bar; not lime fill or lime text
- [ ] BottomNav white, black active icon, gray inactive, 2px volt top bar; still five slots; no Create control
- [ ] MobileTopBar is white against the off-white page
- [ ] AuthShell left panel is `#0A0A0A`, existing geometric square is volt, form column off-white, card white
- [ ] InviteShell matches; no new layout
- [ ] Clerk `colorPrimary` is `#C8F135` and `colorPrimaryForeground` is `#0A0A0A`
- [ ] Focus on rail is a light ring; focus on light chrome is dark
