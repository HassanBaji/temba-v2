# Challenges: implementation tickets

Status: published to Linear on 2026-11-08 (issue ids in the table at the end). First draft 2026-11-08; **revised 2026-11-08** for the Roster / Matchday squad rules (`decisions.md` D3, D6, D10, D11, D14, D17, D18, D24). Changed tickets are marked **(revised)**. Spec: `.scratch/challenges/spec.md`.

Every ticket is a vertical slice: schema, procedure files, domain, both Apps (web and mobile), i18n in `en/` and `ar/`, tests, seed where it helps a hand walk. Each ships green on `pnpm exec turbo run typecheck lint test`. Binding rules for every ticket: one endpoint per file (`.cursor/rules/api-one-endpoint-per-file.mdc`), no thin assemblers, additive API, no renamed procedure paths, every string from `@repo/i18n`, mobile design-system rules in `CLAUDE.md`, new migration per schema change, `CONTEXT.md` and ADR edits in the ticket that changes the behaviour (drafted for owner review, not merged silently).

Order and blocking:

```text
CH-1 ─▶ CH-2 ─▶ CH-3
 │
 └──▶ CH-4 ─▶ CH-5 ─▶ CH-6 ─▶ CH-7 ─▶ CH-8 ─▶ CH-9
          (CH-5 also needs CH-2; CH-9 also needs CH-3)
```

---

## CH-1. A Team has a record with draws, form, Rivals and head-to-head, and anyone signed in can open it

**Outcome.** Team detail on both Apps shows the mockup's hero record (W–L padel, W–D–L football, games count), a ten-slot form line, a Rivals block with head-to-head and last result (Rematch button present but disabled until CH-9), the Roster with Level band and seat/role, and a Games list; any signed-in User can open any Team.

**What to build**
- Move `loadTeamRecord` and `teamRecordFromMatches` out of `packages/api/src/routers/teams/byId.ts` into `packages/api/src/teams/team-record.ts`; add `draws`; add `loadTeamRivals` (opponent `game_teams.team_id` on the other slot of each completed Match; Rival at two or more; head-to-head from the Team's side; last result and date; "closest" = played once) and `loadTeamForm` (last ten results newest last).
- `teams.byId`: drop the member-only refusal (D5); add `record.draws`, `rivals[]`, `closestRival`, `form[]`, `games[]` (opponent name, date, Venue, score line), `captainUserId`, `viewerIsMember`, `viewerActsForTeam` (for now: padel any member, football creator); member rows gain `levelBand`, `level`, `footballRole`, `footballPosition`, `preferredPosition`. Member-only fields stay gated.
- `teams.mine`: add `record`, `rivalCount`, `rosterCount` for the cards.
- `@repo/domain/team-rivals` (head-to-head line copy, closest copy), `@repo/domain/team-level` (mean displayed tenths, band), `@repo/domain/teams` `teamHomeView` extended (record tiles, form, rivals, members with Level and seat labels, captain label).
- Web `apps/web/src/app/dashboard/teams/[id]/page.tsx` and mobile `apps/mobile/src/teams/team-home-*.tsx` render the new blocks; `FormSlot`/`ResultMark` on mobile.
- i18n: `team.ts` (record, draws, form, rivals, head-to-head, closest, captain, seat labels) in en and ar.
- `CONTEXT.md` draft edits: Team (Captain name), new Rival, head-to-head, Team record, Team Level entries. ADR draft "A Team's Captain is its creator" (D1; the Group-tag half lands in CH-2).

**Acceptance criteria**
- A fixture with two Teams and three completed Matches between them (2–1) shows each as the other's Rival with head-to-head 2–1 and 1–2; a football draw counts in D only; a cancelled Game's Match counts nowhere.
- A Team played once appears as "closest", not as a Rival.
- A non-member opens the Team and sees record, form, rivals, Roster; no invite row, no masked phone, no dissolve.
- A padel member and a football creator get `viewerActsForTeam: true`; a football non-creator member gets false.
- Existing consumers of `teams.byId` still typecheck; no procedure renamed.

**Dependencies.** None.

**Files.** `packages/api/src/teams/team-record.ts` (+test), `packages/api/src/routers/teams/byId.ts`, `mine.ts`, `byId.test.ts`; `packages/domain/src/team-rivals.ts`, `team-level.ts`, `teams.ts` (+tests); `apps/web/src/app/dashboard/teams/[id]/page.tsx`, `apps/web/src/components/teams/*` (new); `apps/mobile/src/teams/team-home-screen.tsx`, `team-home-view.tsx`, `teams-model.ts`; `packages/i18n/src/messages/{en,ar}/team.ts`; `CONTEXT.md`, ADR draft.

---

## CH-2 (revised). Group tag, and a football Roster of up to twenty that plays any Format

**Outcome.** A Team can be tagged as a Group's team: the tag shows on the Team detail ("Gooz of Arad's team") and the Group page lists its tagged Teams; the Group's Organizers act for the Team on Challenge doors (used from CH-5). A football Team's Roster is two to twenty, flat; the detail hero reads "Roster 12 of 20" and "Plays 5, 6 and 7-a-side"; the Roster section ends with "Add more … Up to 20".

**What to build**
- Migration: `teams.group_id uuid null references groups(id) on delete set null`.
- `teams.setGroupTag` (`{ teamId, groupId | null }`): Captain or an Organizer of the target Group (`mayOrganizeGroupGames`); sport must match; clearing by Captain or any Organizer of the tagged Group. `teams.create` accepts optional `groupId` with the same check.
- `packages/api/src/teams/acts-for-team.ts`: `userActsForTeam`, `actingUserIds` (padel: members; football: Captain + tagged Group's Organizers). `teams.byId` uses it; returns `groupTag: { id, name } | null`.
- `@repo/domain/team-roster`: football `{ min 2, max 20, completeAt 5 }`; add `FOOTBALL_CHALLENGE_SIDE_SIZES = [5, 6, 7]`, `teamCanPostFormat(count, side)`, `formatsPlayable(count)`. Review every caller (`openInviteBudget`, `teamInviteSeatsLeft`, `teamRosterView`, invite and accept doors) and tests; Rosters above 20 (legacy, max was 25) keep their members and show "N of 20"; no door removes anyone.
- `teams.byId` adds `roster: { count, max, formatsPlayable[] }`; `groups.byId` gains `teams[]` (tagged Teams with record); Group page on both Apps shows a Teams row for members and a Create team entry for Organizers that pre-fills the tag.
- Team detail on both Apps: tag line, Organizer-facing "Tag as <Group>'s team" / "Remove tag"; football hero "Roster 12 of 20" + "Plays 5, 6 and 7-a-side"; section titled **Roster**, the first six rows then "and N more", the "Add more. By phone, on Temba, or from <Group>. Up to 20" row (doors land in CH-3; until then it opens the existing Lookup invite).
- i18n: `team.ts` (Roster, "N of 20", Plays…, Add more…), `group.ts`, mobile and web group catalogs.
- ADR draft from CH-1 gains the Group-tag half; new ADR draft "A football Roster is up to twenty and a Matchday squad is named per Game" opened here with the Roster half (amends ADR-0038); the squad half is completed in CH-7. `CONTEXT.md`: Team roster rule, Roster, Group tag, Challenge format.

**Acceptance criteria**
- A Group Organizer who is not on the Team can tag the Team to their Group; a member who is neither Captain nor Organizer is refused; a padel Team cannot be tagged to a football Group.
- Deleting the Group clears the tag and the Team keeps its record.
- A football Team with 20 members is full: invite, Invite link accept and (CH-3) add by phone are refused; `teamRosterView` shows "20 of 20".
- `formatsPlayable(4) = []`, `(6) = [5, 6]`, `(7) = [5, 6, 7]`, `(20) = [5, 6, 7]`; `teamIsComplete(5, "football")` stays true and `(4)` false.
- A legacy fixture with 22 members still loads, shows "22 of 20", and refuses a 23rd.
- `groups.byId.teams` lists only tagged Teams of that Group.

**Dependencies.** CH-1.

**Files.** `packages/db/src/schema/teams.ts`, new migration; `packages/api/src/routers/teams/setGroupTag.ts` (+test), `create.ts`, `byId.ts`; `packages/api/src/teams/acts-for-team.ts` (+test); `packages/domain/src/team-roster.ts` (+test), `teams.ts`; `packages/api/src/routers/groups/byId.ts`; `apps/web/src/app/dashboard/groups/[id]/*`, `teams/[id]/page.tsx`; `apps/mobile/src/groups/*`, `apps/mobile/src/teams/*`; i18n catalogs; `CONTEXT.md`; two ADR drafts.

---

## CH-3 (revised). Build a Roster by phone, on Temba, or from a Group

**Outcome.** The New team screens on both Apps match mockup 5a–5d: name, sport ("Padel 2 players / Football roster up to 20", helper "5 needed for 5-a-side, 7 for 7-a-side, 20 max"), a Roster list ("2 of 20, you included") with Invited (waiting) and Added (not on Temba) rows, three add tabs (By phone, On Temba, From a group), the footer "Six is enough to post a 6-a-side challenge; the matchday squad is named per game, after it's confirmed", and one Create button. Team detail's "Add more" row opens the same sheet. A phone on Temba gets a Lookup invite and a `team_invite_received` Notification; a phone not on Temba joins by name.

**What to build**
- `teams.previewPlayerByPhone` (`{ teamId?, countryIso, nationalNumber }` → `kind`, `name`, `alreadyOnTeam`, `alreadyInvited`, `phoneMasked`) and `teams.addPlayerByPhone` (Captain; account → `mintLookup` Team invite within budget; unclaimed/new → `team_members` row, `createUnclaimedPlayer` with starting Level; a new football player's picked role/position written to the User's `preferred_football_role/position`), `teams.removeUnclaimedPlayer` (Captain; refuses account holders). Mirror `routers/groups/previewPlayerByPhone.ts`, `addPlayerByPhone.ts`, `removeUnclaimedPlayer.ts`. All refuse at `max` (20 / 2).
- `teams.listGroupMembersToAdd` (`{ groupId, teamId? }`): members of a Group the viewer organizes, marking on-Roster and invited.
- `teams.create` extended: `inviteUserIds[]` (budget-checked Lookup invites, pair-reservation for padel), `phonePlayers[]`, one transaction; `team_invite_received` per invited User through `notify()` (new type, `team_id` set). The same Notification is written by `teams.inviteInApp`, so the emit sits in a shared `notifications/notify-team-invite.ts`.
- `@repo/domain/team-squad-draft` → renamed `team-roster-draft` (client draft model: Roster count of max, invited vs added rows, "Add more" copy, the 5/7/20 helper, "Six is enough…" footer) with tests.
- Screens: web `dashboard/teams/new/page.tsx` and mobile `src/teams/create-team-*.tsx` rebuilt to the mockup; Team detail "Add more" row opens the sheet. Reuse `add-player-identity-fields`, the auth `PhoneField`, Level choices from `@repo/domain/onboarding-flow`.
- Notification copy for `team_invite_received` in `notification.ts` and `@repo/domain/notification-copy`, linking to Challenges › Teams.

**Acceptance criteria**
- Creating "Gooz FC" with two invites and two phone players in one call yields a Team with three members (Captain + two Unclaimed), two pending Lookup invites, two `team_invite_received` rows; the same call with invites beyond `20 − members − phonePlayers` is refused and writes nothing.
- A phone that belongs to an account holder never creates a member row; the holder sees the invite under Challenges › Teams and accepts as today.
- Adding the same Unclaimed phone twice reuses the row; the Captain sees the masked phone, a non-member does not.
- A new Unclaimed football player added as GK has `preferred_football_role = keeper`.
- Group members list excludes people already on the Roster; a padel Team refuses a second add once two.

**Dependencies.** CH-2.

**Files.** `packages/api/src/routers/teams/previewPlayerByPhone.ts`, `addPlayerByPhone.ts`, `removeUnclaimedPlayer.ts`, `listGroupMembersToAdd.ts`, `create.ts`, `inviteInApp.ts` (+tests); `packages/db/src/schema/notifications.ts` (type value), migration; `packages/api/src/notifications/notify-team-invite.ts`; `packages/domain/src/team-roster-draft.ts`, `notification-copy.ts`; `apps/web/src/app/dashboard/teams/new/page.tsx`, `apps/web/src/components/teams/*`; `apps/mobile/src/teams/create-team-*.tsx`, `team-home-*.tsx`; i18n `team.ts`, `notification.ts`, `mobile-team.ts`, web team catalog.

---

## CH-4. The Challenges tab and the Teams segment

**Outcome.** Mobile gets a Challenges tab (third slot) with three segments; web gets a Challenges nav item at `/dashboard/challenges` with the same segments. Teams move under Challenges › Teams on mobile with the mockup's cards ("Football. 12 on the roster. Gooz of Arad's team") and empty state (1c, 1d); Open and Mine show their empty states until CH-5/CH-6 fill them.

**What to build**
- Mobile: `TabSlot` gains `challenges`, `book` leaves `visibleTabs` (routes stay); icon; `tabBarHidden` rules for nested challenge screens. Route group `app/(app)/challenges/` with `_layout.tsx`, `index.tsx` (segments with counts), `teams/index.tsx`, `teams/[id].tsx`, `teams/new.tsx`, `players/[userId]/*` mirror. `profile/teams/*` become redirects; `invites-model.ts` `inviteLandingPath("team")` points at the new path.
- Web: sidebar `navMain` swaps the Teams item for Challenges; `dashboard/challenges/page.tsx` with `?tab=open|mine|teams`; Teams segment renders the existing Teams list and pending invites, linking into `/dashboard/teams/*`.
- Teams segment cards: initials crest, name, sport line, record tile; Invited-to section with Join; Create team; empty state with Create a team and Create from <Group> for Groups the viewer organizes.
- Segment count badges from `challenges.listMine` (stub returning zeros until CH-5) and `teams.mine`.
- i18n: `common.ts` (Challenges), `mobile-challenge.ts`, `web-challenge.ts`, `challenge.ts` (segment names, empty states, "Until then" copy).

**Acceptance criteria**
- Tab order is Home, Games, Challenges, Groups, Profile; tapping Challenges twice pops to the segments; the Team Invite link still lands on the Team.
- A User with no Team sees the 1d empty state; with Teams sees 1c cards with correct record and Roster count.
- Web sidebar shows Challenges and no Teams item; `/dashboard/teams` still renders.
- Reduce-motion honoured; at most two mount animations on the tab screen.

**Dependencies.** CH-1.

**Files.** `apps/mobile/src/navigation/tab-list.ts` (+test), `app-tabs.tsx`; `apps/mobile/app/(app)/challenges/**`, `app/(app)/profile/teams/*` (redirects); `apps/mobile/src/challenges/*` (new); `apps/mobile/src/invites/invites-model.ts`; `apps/web/src/components/app-sidebar.tsx`; `apps/web/src/app/dashboard/challenges/page.tsx`, `apps/web/src/components/challenges/*`; i18n catalogs.

---

## CH-5 (revised). Post a Challenge, with a Format, and browse the open board

**Outcome.** Someone who acts for a Team posts a Challenge from the mockup's form (3a: Team, Format for football with help text, Venues, Days, Timings or exact slots, Level wanted, a line) and review (3b: the card as it will appear, "Team Gooz FC, 12 on the roster", "Format 6-a-side. Squads of up to 9 named after confirmation", visibility, "Open for 7 days", "Proposals: You confirm one; the rest are told"); it appears on the Open board (1a) with filters Sport / Level / Area / Day, hatched opponent seats, "N proposals, D days left", greyed for Teams that cannot propose; the detail opens in its open state (2a). Challenges expire after seven days and leave quietly.

**What to build**
- Migration: `challenge_status`, `challenge_timing`, `weekday`, `proposal_status` enums; `challenges` (incl. `side_size` check `in (5, 6, 7)` or null), `challenge_venues`, `challenge_proposals` (incl. `price_per_player_fils`, used in CH-6), indexes incl. the one-open-per-Team partial unique; `notifications.challenge_id` and the `challenge_expired` type.
- `challenges.post` (inline validation: note ≤ 140, range not inverted, football Format required and `teamCanPostFormat(rosterCount, side)`, padel Format absent and Roster two, Venues offer the sport, exact slots in the future; acts-for-team; `durationMinutes` default by sport; writes rows and enqueues `challengeExpireJob` at `expires_at`), `challenges.withdraw`, `challenges.listOpen` (filters; viewer eligibility per card via `team-level`, `acts-for-team` and Roster ≥ Format; Area = Venue city), `challenges.byId` (open state; `viewerEligibleTeams`), `challenges.listMine` (posted section only for now), `challenges.listPostOptions` (viewer's Teams that may post with `formatsPlayable`, Venues for the sport, default duration).
- `@repo/domain/challenge-clock`, `challenge-card` (sport line "Football, 6-a-side, avg 2.8, 12 on the roster. Wants C to B−", days/timings label, venues line, proposals/days-left line, greyed reason), `challenge-form` (draft validation incl. Format vs Roster, review view lines), `team-level` reuse.
- Job: `JOB.challengeExpire` + `handlers/challenge.expire.ts`: if open, no pending Proposal and `expires_at` passed → `expired`, notify `challenge_expired`; if a Proposal is pending → re-enqueue at that Proposal's `expires_at`.
- Screens: mobile `challenges/index.tsx` Open segment (feed + filter chips + card), `challenges/new.tsx` + review, `challenges/[id].tsx` open state; web `challenges/page.tsx` Open segment, `challenges/new/page.tsx`, `challenges/[id]/page.tsx`. Cards use `Hatch` for the opponent seats and `InitialsTile` for the poster's first six Roster members.
- Seed: two padel and two football Teams (one with 12 on the Roster), one open Challenge each sport (the football one 6-a-side).
- `CONTEXT.md` drafts: Challenge, Challenge format, Level wanted, Team Level; ADR draft "A Challenge is a request and a Game is the result" (D6–D8, D17, D19; the Game half is completed in CH-7).

**Acceptance criteria**
- A Team with an open Challenge cannot post a second; withdraw then post succeeds.
- A football Team of 5 posting 6-a-side is refused with the Format message; 5-a-side is accepted; a Team of 6 may post 5 or 6 but not 7; posting football without a Format, or padel with one, is refused.
- `listOpen` greys (and `byId` returns no eligible Team) for a viewer whose only Team has a Roster below the Format, a Team Level outside the range, or no rated member; a viewer with one eligible Team sees it.
- The expiry handler on a Challenge at day 8 with no Proposal stamps `expired` and writes one Notification per acting User; run twice it writes nothing more; with a pending Proposal it re-schedules and stamps nothing.
- Filters: Sport by `sport`; Level by range overlap; Area by preferred Venue city (no-Venue Challenges always shown); Day by `days` (empty always shown).
- The review screen's Format line reads "Format 6-a-side. Squads of up to 9 named after confirmation" from the catalog.

**Dependencies.** CH-4, CH-2.

**Files.** `packages/db/src/schema/challenges.ts`, `challenge-venues.ts`, `challenge-proposals.ts`, `challenge-enums.ts`, `notifications.ts`, `index.ts`, migration; `packages/api/src/routers/challenges/{index,post,withdraw,listOpen,byId,listMine,listPostOptions}.ts` (+tests), `packages/api/src/root.ts`; `packages/api/src/jobs/specs.ts`, `handlers/challenge.expire.ts` (+test), `task-list.ts`; `packages/api/src/teams/team-level.ts`; `packages/api/src/notifications/notify-challenge.ts`; `packages/domain/src/challenge-clock.ts`, `challenge-card.ts`, `challenge-form.ts` (+tests), `notification-copy.ts`; mobile `src/challenges/*`, `app/(app)/challenges/{index,new,[id]}.tsx`; web `app/dashboard/challenges/**`, `components/challenges/*`; i18n; `packages/api/scripts/seed.ts`; `CONTEXT.md`, ADR draft.

---

## CH-6. Propose: the Accept sheet, Mine, and the 48-hour clock

**Outcome.** From an open Challenge, someone who acts for an eligible Team opens the Accept sheet (2b): picks the Team, a Venue (preferred first), a slot, and optionally a Court and a price per player, and sends a Proposal. The poster sees "Waiting on you" on black at the top of Mine (1b) with Confirm and Another time; the proposer sees the pending state (2c) with Change proposal and Withdraw; a Proposal expires after 48 hours. Confirm is wired to the door built in CH-7 (the two buttons may ship together in CH-7; implementer's call, recorded in the PR).

**What to build**
- `challenges.propose` (all 6.2 rules; enqueues `proposalExpireJob`; `challenge_proposal_received`), `changeProposal` (in place; resets `expires_at`, re-enqueues with `mode: replace`, re-notifies), `withdrawProposal`, `declineProposal` (poster; frees the Team; `challenge_proposal_declined`), `listProposeOptions` (eligible Teams, Venues preferred-first, Courts per Venue, suggested slots from `@repo/domain/challenge-slots` + exact slots).
- `challenges.byId`: pending state for the proposer; the poster's Proposal queue. `challenges.listMine`: full ordering per spec 8, read-time clocks.
- Job `handlers/proposal.expire.ts`: pending and past → `expired`, notify `challenge_proposal_expired`; then apply the Challenge expiry rule.
- `@repo/domain/challenge-slots`, `challenge-clock` proposal predicates and "expires in 22h" copy.
- Screens: mobile Accept sheet, Mine segment (black Surface for waiting-on-you, Posted, Accepted placeholder), detail pending state; web equivalents.
- Seed: one pending Proposal on the padel Challenge.

**Acceptance criteria**
- A second pending Proposal from the same Team on the same Challenge is refused; after decline a new one is accepted.
- A Team sharing a member with the posting Team is refused; a football Team with a Roster below the Challenge's Format is refused; a Team Level outside the range is refused; a slot 30 minutes ahead is refused; a Court on another Venue is refused.
- Change proposal moves `expires_at` to now + 48 h and the job's `run_at` with it; the poster gets a second `challenge_proposal_received`.
- Proposal expiry at hour 49 stamps `expired`, notifies the proposer's acting Users once, and a Challenge past day 7 with no other pending Proposal is then expired in the same run.
- Mine ordering: waiting-on-you first, then posted, then my pending, then accepted, then played; expired items absent.
- The sheet's CTA reads "Send proposal to <Team>" from the catalog.

**Dependencies.** CH-5.

**Files.** `packages/api/src/routers/challenges/{propose,changeProposal,withdrawProposal,declineProposal,listProposeOptions,byId,listMine}.ts` (+tests); `packages/api/src/jobs/specs.ts`, `handlers/proposal.expire.ts` (+test); `packages/api/src/notifications/notify-challenge.ts`; `packages/domain/src/challenge-slots.ts`, `challenge-clock.ts`, `notification-copy.ts`; mobile `src/challenges/accept-sheet.tsx`, `mine-segment.tsx`, `challenge-detail-*.tsx`, models + tests; web `components/challenges/*`; i18n; seed.

---

## CH-7 (revised). Confirm creates the Challenge Game: padel seated, football with two empty sides

**Outcome.** The poster taps "Confirm, make it a game": the Challenge becomes confirmed (2d), the other Proposals are passed over and told, and a Game exists. Padel: both pairs seated, no open seats. Football: two sides of `side + 3` hatched seats, nobody seated, registration closed; the Game shows in Challenges › Mine under "Accepted, now games" for both Rosters and in Games for seated players; a played one shows its score line. Padel is Rated at the groupless weight; football is Unrated.

**What to build**
- `challenges.confirmProposal`: lock Challenge and Proposal `for update`; re-check every 6.2 rule for both Teams. **Padel** → `createFriendlyGame` (shared module) with `groupId: null`, `rated: true`, window `starts_at`..`+duration`, `courtId` and `pricePerPlayerFils` from the Proposal; insert two `game_teams` with `team_id`, seat both pairs (Positions from Preferred Position, either → left then right), set the Match slots. **Football** → `createFootballGame` with `sideSize` from the Challenge, `playersAllowed = 2 × (sideSize + 3)`; insert two `game_teams` (`side_index` 1/2, `team_id`, bibs black and white, no players), the one Match with both slots and `court_id`, and its Score Set shell (`FOOTBALL_SCORE_SET_NUMBER`). Both: `games.challenge_id`, `registration_closed_at = now`; Challenge `confirmed`, `confirmed_proposal_id`, `game_id`; other pending Proposals → `passed_over`; remove the expiry jobs; football enqueues `challengeSquadDueJob` at kick-off − 24 h; `challenge_proposal_confirmed` (padel: every member of both Teams and acting Group Organizers; football: acting Users only) excluding the confirmer, `challenge_proposal_passed_over` to the others. One transaction. Returns `gameId`.
- `packages/api/src/games/access.ts`: `isGameOrganizer` and `gameAdminUserIds` branch on `challenge_id` → `actingUserIds` of both Teams; `canViewGame` admits Roster members of either Team; `requireNotChallengeGame`. Refusals in: `registerSeat`, `register`, `registerTeam`, `registerWithPartner`, `createInviteLink`, `sendLookupInvite`, `addPlayerByPhone`, `addGroupMembers`, `leave`, `leaveWaitlist`, `kick`, `publishFootballTeams`, `updateCaps`, `updateLevelRange`, `updateSeason`. `updateWindow`, `updateName`, `updatePricePerPlayer` keep working for acting Users of either Team.
- `packages/api/src/games/challenge-squad.ts`: `loadChallengeSides(db, game)` → both sides with `teamId`, named players, `squadState`; `@repo/domain/matchday-squad`: `squadSeatCount`, `squadState`, seat labels and counter copy.
- `saveFootballScore`: on a Challenge Game, refuse until both sides are `named` ("Name both squads first").
- Every football reader handles empty sides: `footballBoard`, `games.byId` football board, hub rows, Mine rows, result card (fixture test with zero players on both sides).
- `challenges.byId` confirmed state (Game summary with squad states, proposed by, confirmed by, Pitch/Court line, cost line); `listMine` "Accepted, now games" (with "Name your squad" when the viewer's side is short) and "Played" sections from `games.challenge_id`.
- Games hub: a Challenge Game row shows a CHALLENGE marker (`hubGameCardPlan` input gains `challenge: boolean`), no join call.
- Jobs: `JOB.challengeSquadDue` + `handlers/challenge.squad-due.ts`: for each side still `empty` or `partial`, `challenge_squad_due` to its acting Users; no-op on a cancelled Game or when both are named.
- Seed: one confirmed upcoming football Challenge Game (sides empty; CH-8 names one) and one played padel Challenge Game with a score.
- ADR drafts completed: the Challenge ADR (Challenge Game, Organizers, rating amendment to ADR-0035) and the Roster/squad ADR's squad half (amends ADR-0039). `CONTEXT.md` drafts: Challenge Game, Matchday squad, Reserve, Proposal, Game and Organizer edits, Game admit and Invite doors avoid-notes.

**Acceptance criteria**
- Padel confirm yields: one Game, `group_id` null, `rated` true, `registration_closed_at` set, two `game_teams` with the two `team_id`s, four `game_players`, four `game_team_players` with distinct Positions per side, one Match with both slots and three Set shells; `teams.byId` for both Teams lists the Game.
- Football confirm at 6-a-side yields `side_size 6`, `players_allowed 18`, two `game_teams` with `team_id`, `side_index` and distinct bibs, **zero** `game_players`, one Match with both slots and one Score Set shell, `rated` false; `footballBoard` and `games.byId` render two empty sides without error; `saveFootballScore` is refused with "Name both squads first".
- A re-check failure (a Roster dropped below the Format between propose and confirm) writes nothing and names the reason.
- Three pending Proposals: confirming one leaves two `passed_over` with one Notification each to their acting Users; the confirmer gets none; on football only acting Users get `challenge_proposal_confirmed`; on padel every member does.
- Every listed admit, invite, kick, publish and shape door refuses with "Teams are set by the challenge; captains name the squads" (catalog); `cancel`, `updateWindow`, `updateName`, `updatePricePerPlayer` work for an acting User of *either* Team and are refused for a stranger; an unnamed Roster member can view the Game and a stranger cannot.
- `challenge_squad_due` fires at kick-off − 24 h for a side with 4 of 6 named and not for a side with 6; nothing fires on a cancelled Game.
- Scoring the padel Game to completion rates all four Users at weight 0.5 and the Team records read 1–0 and 0–1.

**Dependencies.** CH-6.

**Files.** `packages/api/src/routers/challenges/confirmProposal.ts` (+test), `byId.ts`, `listMine.ts`; `packages/api/src/games/access.ts` (+test), `challenge-squad.ts` (+test), `routers/games/saveFootballScore.ts`, the refusing doors listed; `packages/api/src/games/helpers/hub-list.ts`, `packages/domain/src/game-card.ts`, `hub-game-row.ts`, `matchday-squad.ts` (+test); `packages/api/src/jobs/specs.ts`, `handlers/challenge.squad-due.ts` (+test); `packages/db/src/schema/games.ts`, migration (`challenge_id`); mobile `src/challenges/*` (confirmed state, Mine sections), `src/games/*` (marker); web equivalents; i18n; seed; `CONTEXT.md`, ADR drafts.

---

## CH-8 (revised). Game details, Challenge variant, and Name your squad

**Outcome.** The upcoming Challenge Game on both Apps shows mockup 6a: CHALLENGE tag; team-vs-team row with crests, records and head-to-head or "first meeting"; on football, two squads of `side + 3` seats with named tiles (role), hatched empties, the last three labelled Reserve, and the counter lines ("6 of 9 named, 6 + 3 reserves" / "4 + 5 to name, 4 of 9"); an **Edit your squad** / **Name your squad** button for a viewer who acts for that side, opening the 6b sheet; no open-seat, invite, add or make-teams affordances; details rows "From challenge", "Proposed by … confirmed by …", "Pitch … Book it yourselves", "Cost 1.500 BD each, pay at the venue", "Counts for: Both teams' records and the players named". Padel shows both pairs as tiles with no sheet.

**What to build**
- `games.nameChallengeSquad` (`{ gameId, teamId, userIds[] }`): acts for that side's Team; football Challenge Game; not cancelled; side not locked (Score Set empty and Match not completed); every id on the Team's Roster; none seated on the other side; `0 ≤ length ≤ side + 3`. Diff against current `game_players` of that side: insert rows (`football_role/position` from the User's preferences) and `game_team_players` links for the added, delete for the removed; `challenge_squad_named` to the added except the namer. Returns the side's new `squadState`.
- `games.byId`: `challenge: { id, postedByTeamId, postedAt, proposedBy, confirmedBy, sides: [{ teamId, name, initials, record, headToHead, sideSize, reserveSeats: 3, named: [{ userId, name, role, levelBand, unclaimed }], state }], pitch, costLine, viewerCanNameSide } | null`, `isChallengeGame`; join, invite, add-player, make-teams and open-seat flags false. Ordinary Games unchanged (snapshot test).
- `@repo/domain/challenge-game-details` (details rows copy, head-to-head or "first meeting", cost line from price or player count, "Counts for" line by sport) and `matchday-squad` sheet helpers (counters, "Confirm squad, N named", short-side line) with tests.
- Mobile `details-screen.tsx` / `football-details-screen.tsx`: hero tag, `TeamVsTeamRow`, `SquadGrid` per side (seats via `Hatch`, Reserve labels), the squad button, the `NameSquadSheet` (Roster list with select state, Captain pre-selected, role and Level per row, `NotOnTembaMark`, footer copy, confirm button); web `games/[id]/page.tsx`, `friendly-game-details-hero.tsx`, `football-game-details.tsx` with a dialog equivalent; result card unchanged.
- `reportWrongScore` on a Challenge Game reopens the squads by clearing the Score (existing behaviour; add a test that `nameChallengeSquad` is accepted again).
- i18n: `game.ts`, `mobile-game-details.ts`, `web-game.ts`, `challenge.ts` additions.
- Seed: name one side fully (6 + 2) and the other partially (4) on the seeded football Challenge Game.

**Acceptance criteria**
- Naming 6 then 9 then 4 on a 6-a-side side yields states `named`, `named`, `partial` with the matching `game_players` counts; a 10th name is refused; a non-Roster id is refused; a User already named on the other side is refused; the opposing Captain is refused; after `saveFootballScore` the door is refused and after `reportWrongScore` it is accepted again; on a padel Challenge Game it is refused.
- Newly named Users (and only they) get `challenge_squad_named`; the namer naming themself gets none; re-saving the same list writes no Notification.
- A named Reserve (the 8th name) has a `game_players` row, appears in Last 10 after the Score, can vote MVP and receive Marks, exactly like the side.
- On a Challenge Game `byId.challenge` is set and `canJoin`, `canInvite`, `canAddPlayer`, `canMakeTeams` are false; on an ordinary Game `challenge` is null and nothing else changed.
- Head-to-head on the row equals `teams.byId.rivals` for the same pair; a first meeting reads "first meeting".
- The grid shows `side + 3` seats, the last three labelled Reserve even when empty; the counter copy matches the mockup for 6/9 and 4/9.
- Score entry, Match result confirmation, Marks, MVP and result card work unchanged once both sides are named (existing tests pass with a Challenge fixture added).

**Dependencies.** CH-7.

**Files.** `packages/api/src/routers/games/byId.ts`, `nameChallengeSquad.ts` (+test), `index.ts`; `packages/api/src/games/challenge-squad.ts`; `packages/domain/src/challenge-game-details.ts`, `matchday-squad.ts` (+tests); `apps/mobile/src/game-details/*` (+ `team-vs-team-row.tsx`, `squad-grid.tsx`, `name-squad-sheet.tsx`); `apps/web/src/components/games/*`, `app/dashboard/games/[id]/page.tsx`; i18n; seed.

---

## CH-9 (revised wording only). Rematch and the nudge

**Outcome.** Rematch on a Rival, or the review screen's "Also send it straight to a team you've played?", pre-fills a Challenge to that Team and sends its acting Users a nudge Notification; the Challenge still sits on the open board; the nudged Team's view of the Challenge says so and shows Accept.

**What to build**
- `challenges.post` accepts `nudgeTeamId`: same sport, not the poster's Team, a Team the poster has at least one completed Match against; stores `nudge_team_id`; `challenge_rematch_nudge` to its acting Users.
- `challenges.listOpen`/`byId` return `nudgedTeam` and `viewerTeamIsNudged`.
- Team detail: Rematch button (disabled since CH-1) routes to the post form pre-filled (Team, Format from the last Game's side size, Venues from the last Game, Level wanted around the opponent's Team Level, nudge); the review screen's toggle lists Teams the poster has played.
- Notification copy and link for `challenge_rematch_nudge`.
- Seed: a Rival pair.

**Acceptance criteria**
- Nudging a Team never played is refused; nudging a Team played once succeeds.
- The nudged Team's acting Users receive one Notification each; the poster receives none; the Challenge appears on `listOpen` for everyone eligible.
- Pre-fill fields are the opponent's and the form can still be edited before Post.

**Dependencies.** CH-7, CH-3.

**Files.** `packages/api/src/routers/challenges/post.ts`, `listOpen.ts`, `byId.ts` (+tests); `packages/api/src/notifications/notify-challenge.ts`; `packages/domain/src/notification-copy.ts`, `challenge-form.ts` (pre-fill); mobile `src/challenges/*`, `src/teams/team-home-*.tsx`; web equivalents; i18n; seed.

---

## Documentation changes the tickets make (for the owner's review before publish)

| Ticket | `CONTEXT.md` | `docs/adr/` |
| --- | --- | --- |
| CH-1 | Team (Captain), Rival, head-to-head, Team record, Team Level | draft: Captain is the creator (half) |
| CH-2 | Team roster rule (football 2–20), Roster, Group tag, Challenge format, Side size note | Captain + Group tag ADR completed; Roster/squad ADR opened (Roster half, amends ADR-0038) |
| CH-3 | Team edit (phone door), Notification (team invite) | — |
| CH-4 | — | — |
| CH-5 | Challenge, Challenge format, Level wanted, Team Level | draft: A Challenge is a request and a Game is the result (half) |
| CH-6 | Proposal | — |
| CH-7 | Challenge Game, Matchday squad, Reserve, Game, Organizer, Game admit, Invite doors, Notification | Challenge ADR completed incl. rating amendment to ADR-0035; Roster/squad ADR completed (squad half, amends ADR-0039) |
| CH-8 | — | — |
| CH-9 | Rematch | — |

Also: `CLAUDE.md` migration table unchanged (this is a feature, not a phase); `.scratch/padel-teams/spec.md` gets a one-line "superseded by challenges D5" note on rule 25.

## Linear issues (published 2026-11-08)

| Ticket | Linear | Blocked by |
| --- | --- | --- |
| CH-1 | [TEM-430](https://linear.app/temba-app/issue/TEM-430) | — |
| CH-2 | [TEM-431](https://linear.app/temba-app/issue/TEM-431) | TEM-430 |
| CH-3 | [TEM-433](https://linear.app/temba-app/issue/TEM-433) | TEM-431 |
| CH-4 | [TEM-432](https://linear.app/temba-app/issue/TEM-432) | TEM-430 |
| CH-5 | [TEM-434](https://linear.app/temba-app/issue/TEM-434) | TEM-432, TEM-431 |
| CH-6 | [TEM-435](https://linear.app/temba-app/issue/TEM-435) | TEM-434 |
| CH-7 | [TEM-436](https://linear.app/temba-app/issue/TEM-436) | TEM-435 |
| CH-8 | [TEM-437](https://linear.app/temba-app/issue/TEM-437) | TEM-436 |
| CH-9 | [TEM-438](https://linear.app/temba-app/issue/TEM-438) | TEM-436, TEM-433 |

All carry `ready-for-agent` and `Feature`. Every open question in the spec's section 15 was settled with its recommended default on 2026-11-08.
