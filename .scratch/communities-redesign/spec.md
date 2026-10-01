# Communities list, Community home, and Community create redesign

Status: ready-for-agent

Tickets (Linear, `ready-for-agent`), in dependency order:

- [TEM-284](https://linear.app/temba-app/issue/TEM-284/redesign-the-communities-list) Redesign the Communities list — no blockers
- [TEM-285](https://linear.app/temba-app/issue/TEM-285/redesign-the-create-community-page) Redesign the Create Community page — no blockers
- [TEM-286](https://linear.app/temba-app/issue/TEM-286/rebuild-community-home-chrome-and-the-groups-tab) Rebuild Community home chrome and the Groups tab — blocked by TEM-284
- [TEM-287](https://linear.app/temba-app/issue/TEM-287/redesign-community-home-teams-members-and-requests-tabs) Redesign Community home Teams, Members, and Requests tabs — blocked by TEM-286
- [TEM-288](https://linear.app/temba-app/issue/TEM-288/redesign-the-community-dialogs) Redesign the Community dialogs — blocked by TEM-285

Design source: there is no Community screen on the design canvas (`Temba.dc.html` stops at Groups 05 / 06a–c and Tournaments 07–08). This spec redesigns by analogy to the shipped Groups redesign. Where this spec says "as Groups", the reference is the shipped code, not a mock:

- Groups list: `apps/temba/src/app/dashboard/groups/page.tsx`
- Group home chrome: `apps/temba/src/components/groups/group-home-chrome.tsx`
- Group Members tab: `apps/temba/src/components/groups/group-members-tab.tsx`
- Group invites dialog: `apps/temba/src/components/groups/group-invites-dialog.tsx`

Owners this spec defers to, where they disagree:

- Which Users see the Communities destination, and back-link targets: `.scratch/hide-communities-hub/spec.md`
- Nested Club Group tree on the list, Community name as its own link: `.scratch/groups-communities-nav/spec.md`
- Visual language: `.scratch/groups-redesign/spec.md`
- Group image: `.scratch/group-image/spec.md`
- tRPC placement: `.cursor/rules/api-one-endpoint-per-file.mdc`

## Problem Statement

The Groups list and Group home were rebuilt on the Temba design canvas: `border-rule rounded-[14px]` cards with hairline rows, a plain meta line instead of badges, 40px action boxes, a segmented ink tab control, `font-expanded` figures, ink primary buttons.

The Community surfaces were not. They are still the Tier-1 shell:

- `/dashboard/communities` is a `Card variant="raised"` per Community with `CommunityTypeBadge` / `RoleBadge` chips and `RowList` + `ListRow` Club Group rows carrying `GroupTypeBadge` / `SportBadge`. Rows show initials only and no member count.
- `/dashboard/communities/[id]` is a `width="wide"` two-column page: a badge-row header, `variant="line"` tabs, and a sticky aside of raised cards (Venue, member count, staff actions). Tab state is not in the URL.
- `/dashboard/communities/new` is a `Card variant="outlined"` with a `Select`.
- The three Community dialogs use `RowList`, `text-lead` rows, and (for Create Club Group) two stacked forms.

A flagged User moving between Groups and Communities sees two different products.

## Solution

Rebuild the three Community pages and three Community dialogs on the existing tokens and the patterns Groups already ships. Widen `communities.mine` and `communities.byId` with member counts and Club Group images so rows carry the same facts as Group rows. No schema change, no new procedure, no new design system.

### Decisions taken

| # | Decision | Rationale |
|---|---|---|
| D1 | Scope is the list, Community home (all four tabs), the create page, and the three Community dialogs | Chosen by the user. |
| D2 | Community home becomes single column. The aside is removed | Chosen by the user. Matches Group home. `DashboardShell` loses `width="wide"` on this page. |
| D3 | Widen `communities.mine` and `communities.byId` with counts and Club Group images. No next game, no form strip | Chosen by the user. Full Groups parity would turn `communities.mine` into a Games and Matches read across every Club Group. |
| D4 | Badges become a meta line. `CommunityTypeBadge`, `RoleBadge`, `GroupTypeBadge`, `SportBadge` are no longer used on these surfaces | That is what Groups did. The components stay; other screens use them. |
| D5 | State that is not a plain fact stays a badge: `Soft-archived`, `Join request pending`, `Join request rejected` | They are status, not description, and must not be buried in a comma list. |
| D6 | Club Group rows on Community home stay navigation only. No inline Join or Request button | `communities.byId` carries no `joinMode`. Adding it is a behaviour change, not a restyle. Join stays on Group home. |
| D7 | The Community list keeps the nested tree: one card per Community, Club Groups nested, Community name its own link | Locked by `groups-communities-nav`. Only the surface changes. |
| D8 | Community tab state moves into `?tab=` | Group home does this (`groupHomeTabFromQuery`). Needed so the header action box can depend on the tab and so a tab survives reload. |
| D9 | Create Club Group becomes one form with a Public / Private choice, replacing two stacked forms | The page still calls `groups.createClubPublic` or `groups.createClubPrivate`; only the dialog's shape changes. Two near-identical forms in one dialog is the layout the redesign removes elsewhere. |
| D10 | `ChoiceChip` moves from `app/dashboard/games/new/choice-chip.tsx` to `~/components/temba/choice-chip.tsx` | It gains callers outside the Game create flow (create page, Create Club Group dialog). No visual change to the Game create flow. |
| D11 | `communities.byId` returns `memberCount` to every viewer who can open the Community, not only Members | Group home shows its count to non-members. Today the count is derived client-side from `listMembers`, which is Members only. A bare number exposes no identities. |
| D12 | The Members tab keeps showing each member's email | It does today. Removing it is a product decision outside a restyle. |
| D13 | `RequestRow` is not changed | It is shared with Invites and Group home, and the redesigned Group home still uses it as is. Only its wrapper changes here. |

## 1. Communities list — `/dashboard/communities`

The Clerk gate, the skeleton-until-loaded rule, and the lock empty state (`Communities list is limited`) are unchanged.

### 1.1 Header

`DashboardShell title="Communities"` with no description. The action is a ghost icon button, `plus`, `aria-label="Create Community"`, linking to `/dashboard/communities/new`. Same as the Groups list header.

### 1.2 Community cards

A column of cards, `gap-[26px]`. Each Community is one `border-rule overflow-hidden rounded-[14px] border` card.

**Community row** (the card's first row, its own link to `/dashboard/communities/{id}`, `p-5`):

- `EntityMonogram` size `lg`, image = the linked Venue's logo when there is one, initials otherwise.
- Name, 18px semibold, `break-words`.
- Meta, `text-meta text-muted-foreground`: `"{Public|Private}, {n} members, you are {Owner|Admin|Member}"`. Pluralise `member`.
- `Soft-archived` outline badge under the meta when `archivedAt` is set (D5).

**Club Group rows** (below, each `border-rule border-t`, `px-5 py-[18px]`, each its own link to `/dashboard/groups/{id}`):

- `EntityMonogram` size `lg` with the Group image URL, initials fallback.
- Name, `text-body`, `break-words`. `Untitled Group` when null.
- Meta: `"{Public|Private}, {n} members"`.
- Trailing `Joined` in `text-eyebrow text-muted-foreground` when `isMember`. Nothing otherwise.

A Community with no Club Groups shows one `No Groups yet` row in `text-meta text-muted-foreground`, as today.

The Community row link must not wrap the Club Group rows.

### 1.3 Start a Community

Below the cards, a `border-rule rounded-[14px] border p-5` block mirroring `StartAGroupCard`: heading `Start a Community`, supporting line `Communities organise Club Groups around a Venue.`, and one full-width ink button `Create Community` (`bg-ink text-paper hover:bg-dimrule h-11 rounded-[10px] font-semibold`) linking to `/dashboard/communities/new`.

This page is only reachable with create access, so the block always renders once the list has loaded without error.

### 1.4 States

- **Loading**: two skeleton cards shaped like 1.2 (one Community row, two nested rows), `border-rule rounded-[14px]`.
- **Error**: `ErrorState`, unchanged copy.
- **Empty**: no cards. The Start a Community block is the empty state; the separate `EmptyState` is removed.

## 2. Community home chrome — `/dashboard/communities/[id]`

`DashboardShell` is called with `hidePageHeader hideMobileTopBar hidePageTitle` and no `width`, as Group home does. One `Tabs` root wraps the chrome and the tab bodies.

A new `CommunityHomeChrome` replaces `CommunityHomeHeader`. It is rendered once, outside `TabsContent`. Structure, top to bottom, above a full-bleed hairline:

1. **Action row.** Left: a 40×40 back box (`ChevronLeft`). With create access it links to `/dashboard/communities`, `aria-label="Back to Communities"`. Without it, `/dashboard`, `aria-label="Back to Home"` (per `hide-communities-hub`). Right, in order:
   - `user-plus` box opening the invites dialog, when the viewer can manage Lookup invites or Invite links, on every tab except Groups.
   - `plus` box opening the Create Club Group dialog, when `hasCreateAccess && canCreateClubGroup`, on the Groups tab only.
   - The overflow `ActionMenu`, unchanged items and conditions: All Communities, Manage invites, Unarchive, Leave Community, Soft-archive.
2. **Identity.** `EntityMonogram` size `lg` (Venue logo, initials fallback) beside the name at `text-h1 font-bold tracking-[-0.01em]` and a meta line.
3. **Meta line**, `text-meta text-muted-foreground`: `"{Public|Private}, {Sport list}, {n} members, {Owner|Admin|Member}"`. Sports are labelled and joined with ` and ` (`Padel and Football`). Parts with no value are dropped; the role is dropped for a non-member.
4. **Status badges** (D5), only when they apply: `Soft-archived`, `Join request pending`, `Join request rejected`.
5. **Segmented tab control**, the Group home `TabsList` styling and `TAB_SEGMENT`. Segments in order: Groups, Teams (Members only), Members (Members only), Requests (staff with `canManageJoinRequests || canManageTeamLinks`). The Requests segment keeps its count badge. When only Groups is available (a non-member), the control is not rendered.

`ACTION_BOX` and `HEADER_BLEED` are exported from `group-home-chrome.tsx` next to the existing `TAB_SEGMENT` export and imported here. Do not copy the class strings.

**Tab query.** New `~/lib/community-home-tab.ts`: `communityHomeTabFromQuery(tab, available)` returns the requested tab when it is in `available`, otherwise `groups`; `communityHomeTabQuery(tab)` returns `""` for `groups` and `?tab={tab}` otherwise. The page wires it with `router.replace(..., { scroll: false })` as Group home does.

**Below the hairline**, in a `space-y-6 pt-6` stack:

- Soft-archive banners: unchanged copy and conditions.
- `Request to join`: a full-width `min-h-11` button, same conditions as today (`canRequestJoin`), same pending label. It moves out of the header.
- The tab bodies.

`CommunityHomeSkeleton` is rebuilt to this shape (action row, name, meta, segmented control, then a five-row `rounded-[14px]` card), following `GroupHomeSkeleton`.

Removed from the page: the `lg:grid-cols-[minmax(0,1fr)_17.5rem]` grid, the aside, the member count card, the staff Actions card, the `stickyAsideClass` import. Every action those cards held remains reachable: Create Club Group via the header box and section 3.3, Manage invites via the header box, the overflow menu, and section 5.

## 3. Groups tab

A `flex flex-col gap-[26px]` stack.

### 3.1 Venue card

Members only, as today. `CommunityVenueBlock` becomes a `border-rule rounded-[14px] border p-5` card:

- A `Venue` label in the mono eyebrow style used by `SettingsSection` (`font-mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground`), with the existing `Venue actions` menu (Unlink Venue) on the right when `canUnlinkVenue`.
- Linked: `EntityMonogram` with the Venue logo, name at `text-body font-semibold`, `{city}, {country}` meta, `Venue Soft-archived` outline badge when archived, then Courts as `border-rule rounded-[10px] border px-2.5 py-1 text-meta` chips, or `No Courts.`
- Not linked: `This Community is not linked to a Venue.`
- Pending and rejected Venue link request lines: unchanged copy and conditions.
- `Link a Venue`: full-width ink button, same condition.

### 3.2 Club Group rows

One `border-rule rounded-[14px]` card. Rows are the Club Group rows from 1.2 with the name at 18px semibold: image, name, `"{Public|Private}, {n} members"`, trailing `Joined`. Each row links to Group home (D6).

The `Section` title and its description paragraph are removed.

### 3.3 Start a Club Group

When `hasCreateAccess && canCreateClubGroup`: a bordered block as 1.3. Heading `Start a Club Group`, line `Club Groups stay inside this Community.`, full-width ink button `Create Club Group` opening the dialog.

### 3.4 Empty

No Club Groups: the rows card is replaced by `EmptyState` (`No Groups yet`, `This Community has no Groups yet.`) with no action; 3.3 carries the action for staff.

## 4. Teams tab

One bordered card, hairline rows (`px-5 py-[18px]`), each linking to `/dashboard/teams/{id}`: `AvatarStack` (with the open-seat placeholder as today), display name at `text-body`, sport label as meta. Empty state unchanged.

## 5. Members tab

A `flex flex-col gap-[26px]` stack:

1. The two leave-blocked notices, unchanged copy and conditions.
2. A search input when there are more than 8 members, reusing `groupHomeShowsMemberSearch` and `filterGroupMembersByName`. `No members match that name.` when the filter empties the list.
3. One bordered card, one row per member (`px-5 py-[18px]`, `gap-3.5`):
   - `UserAvatar` size `lg` with the Group Members tile treatment: `rounded-[10px]`, the viewer's tile `bg-ink text-paper`, others outlined.
   - Name at 15px. The viewer reads **You**, semibold.
   - Email as the caption in `text-eyebrow text-muted-foreground` (D12).
   - Trailing: for a viewer with `canManageRoles`, the existing role `<select>` with the same options, `aria-label`, and disabled-while-pending behaviour, restyled `border-rule bg-paper h-10 rounded-[10px] px-3 text-sm`; its visible `Role` label becomes `sr-only`. For everyone else, the role as plain `text-meta text-muted-foreground` text.
4. When the viewer can manage invites: the invite block from `GroupMembersTab` (`Invite players`, full-width ink `Share invite link`), opening `CommunityInvitesDialog`. Supporting line: `Invite players to this Community and its Club Groups.`

Loading, error, and empty states keep their copy. The loading skeleton becomes a three-row bordered card.

## 6. Requests tab

Same sections, same conditions, same `RequestRow` (D13). Each section's `Section` + `RowList` wrapper is replaced by a bordered card with a header rule, as `InvitationsCard` on the Groups list: an `h2` in `text-meta text-muted-foreground border-rule border-b px-5 py-4` (`Join requests`, `Team link requests`), then the rows, hairline-divided.

The two long section descriptions are removed. Loading, error, and the combined empty state are unchanged.

## 7. Create Community — `/dashboard/communities/new`

`CreateAccessGate` and its deny copy are unchanged. The mutation, input, success toast, invalidation, redirect, and error handling (`FormErrorSummary`, `focusFormFailure`, field errors) are unchanged.

Presentation:

- `DashboardShell title="Create Community"` with description `You become the Owner. Groups are optional.`
- The form sits in a `border-rule rounded-[14px] border p-5` block, replacing `Card variant="outlined"`.
- **Name**: unchanged field.
- **Type**: the `Select` is replaced by a two-option `ChoiceChip` radio group (`role="radiogroup"`, each chip `role="radio"`), labels `Public` and `Private`, equal width. The existing `FieldDescription` copy under it still switches with the choice.
- **Actions**: a full-width ink submit (`bg-ink text-paper hover:bg-dimrule h-[46px] rounded-[12px] font-semibold`, `Create Community` / `Creating…`), then `Cancel` as a full-width outline button linking to `/dashboard/communities`.

## 8. Dialogs

All three keep `ResponsiveDialog`, their props, and every mutation and query the page wires into them.

### 8.1 Manage invites

`CommunityInvitesDialog` takes the `GroupInvitesDialog` structure: title `Invite`, a `sr-only` description, then `Lookup invite` and `Invite link` sections each under a `text-title font-semibold` heading with `space-y-6` between them. The Lookup description copy is unchanged.

### 8.2 Link a Venue

The result list becomes a bordered card with hairline rows (`px-5 py-[18px]`): `EntityMonogram` (initials), Venue name at `text-body font-semibold`, `{city}, {country}` meta, and a trailing 40px outline `Request link` button (`border-ink h-10 rounded-[10px] font-semibold`), matching the Invitations `Join` button. The error line and no-match line are unchanged.

### 8.3 Create Club Group (D9)

One form:

- **Name** (`id="club-group-name"`).
- **Type**: `ChoiceChip` radio group, `Public` / `Private`, default Public. The description under it switches between the two existing paragraphs.
- **Require approval**: the existing checkbox and description, shown only for Public; reset to off when Private is chosen (as the Group create page does).
- **Image**: one `GroupImageField`.
- Submit: full-width ink button, `Create Club Group` / `Creating…`.

On submit the dialog calls `onCreatePublic(name, requiresApproval, image)` or `onCreatePrivate(name, image)` by type. The dialog's props are otherwise unchanged, so the page's two mutations, image upload, toasts, and invalidation are untouched. The error summary and name field error read from `publicError` or `privateError` by the chosen type. State resets on close as today.

## 9. Data

No schema change. No new procedure. Logic stays in the procedure files.

### 9.1 `communities.mine`

Adds, per Community:

- `memberCount`: Community membership count.
- `logoImageUrl`: the linked Venue's `logoImageUrl`, `null` when there is no Venue link.

Adds, per nested Club Group:

- `memberCount`: Group membership count.
- `imageUrl`: `groups.imageUrl ?? null`.

All four are batched: one `community_members` read over all Community ids, one `venues` read over the linked Venue ids, one `group_members` read over all Club Group ids. Not one query per Community or per Group.

### 9.2 `communities.byId`

Adds `memberCount` at the top level (D11), and `memberCount` and `imageUrl` on each entry of `groups`.

### 9.3 Shared helper

Counting Group members by Group id is now needed by two endpoints (`mine`, `byId`), so it is one helper under `~/server/communities/helpers/`, returning a `Map<groupId, number>` from a single query. `groups.listPublic` keeps its own inline count; do not refactor it here.

## 10. Components

| Component | Status |
|---|---|
| `CommunityHomeChrome` (`~/components/communities/community-home-chrome.tsx`) | **New**, section 2 |
| `CommunityHomeHeader` | **Delete** |
| `CommunityHomeSkeleton` | **Rebuild** |
| `CommunityGroupsTab`, `CommunityTeamsTab`, `CommunityMembersTab`, `CommunityRequestsTab`, `CommunityVenueBlock` | **Restyle** in place |
| `CommunityInvitesDialog`, `CommunityLinkVenueDialog`, `CommunityCreateGroupDialog` | **Restyle** in place |
| `ChoiceChip` | **Move** to `~/components/temba/choice-chip.tsx` (D10) |
| `~/lib/community-home-tab.ts` | **New**, section 2 |
| `~/lib/community-chrome.ts` | **New**: the list meta line, the home meta line, the Club Group row meta line, as pure functions |
| `RequestRow`, `RowList`, `ListRow`, the typed badges | **Unchanged**; no longer imported by Community surfaces except `RequestRow` |

## Unchanged behaviour

- Every permission flag and what it gates.
- Every mutation, its toast, and its invalidation.
- The Clerk `groupCreator` gate on the nav, the list, and the create page.
- Soft-archive banners and rules.
- `notFound()` on a missing Community, and the error states.
- Who may see Venue, Teams, and Members (Members only).
- Confirm dialogs for Leave, Soft-archive, and Unlink Venue.

## Non-goals

- No inline Join or Request on Club Group rows (D6).
- No next game, form strip, standing, or Level on any Community surface (D3).
- No Community image upload. The monogram stays the Venue logo or initials.
- No change to `/dashboard/groups/new`, which keeps its current form.
- No change to `RequestRow`, `LookupInvitePanel`, `InviteLinkPanel`, or `GroupImageField`.
- No change to the invite accept pages under `/invites/community`.
- No Directory.
- No server enforcement of `groupCreator`.
- No service, repository, or `server/communities/<verb>.ts` twin for these endpoints.
- No `CONTEXT.md` or ADR edit.

## Risks

1. **Lost affordances when the aside goes.** Create Club Group and Manage invites each lose a permanent desktop button. Mitigated by the header boxes, 3.3, and section 5's invite block; the manual pass must confirm each is reachable for Owner and Admin on every tab.
2. **Tab query and viewer rights.** A shared `?tab=requests` link opened by a Member must land on Groups, not an empty body. `communityHomeTabFromQuery` takes the available set for this reason.
3. **Single-tab viewers.** A non-member of a Community Public sees only Groups. The segmented control must be omitted, not rendered with one segment.
4. **Create Club Group regression.** Collapsing two forms into one changes which error object feeds the summary. A failed Public create followed by switching to Private must not show the stale Public error.
5. **`communities.mine` has a second caller.** The Team link picker (`teams/[id]/page.tsx`) reads it. The change is additive; the picker must be checked after the widen.
6. **Long names.** Community and Group names up to 255 characters must wrap, not overflow, at 360px. Use `break-words` and `min-w-0` as the Groups rows do.

## Testing Decisions

- `communities.mine` and `communities.byId` have no endpoint tests today. Add pglite suites next to them (`mine.test.ts`, `byId.test.ts`), following `groups/mine.test.ts` and `groups/byId.test.ts`, covering: Community member count, Club Group member count including zero, `imageUrl` present and absent, `logoImageUrl` with and without a Venue link, and `byId.memberCount` for a non-member of a Community Public.
- `~/lib/community-home-tab.ts` and `~/lib/community-chrome.ts` are pure and unit-tested: tab fallback when the requested tab is not available, singular and plural members, role omitted for a non-member, two sports joined with `and`, no sports.
- No component harness and no snapshot tests, matching the Groups redesign.
- Manual pass at 360px, 390px, and 1440px, as Owner, Admin, Member, and a non-member of a Community Public, with and without the Clerk flag: list, each Community home tab, Request to join, both header action boxes, overflow menu, Soft-archived Community, create page, and each dialog including a failed Create Club Group.
