# Challenges: settled decisions

Status: drafted by the planner on 2026-11-08 for product-owner review; **revised 2026-11-08** after the owner's two rules ("I want the max team to be 20 players, and I want the owner to select the squad after the challenge is accepted, with a max of 3 reserve") and the v2b mockup. Revised decisions are marked. Each decision names the choice, the reason, and whether it needs an ADR. The open questions in `spec.md` section 15 are the ones where the owner may well overrule; the default there is what the tickets assume.

## 1. Where the mockup and the glossary disagree

**D1. Captain is the Team creator; no new role column.**
The glossary says a football Team "has a creator and no captain" (ADR-0038). The mockup speaks of a captain who posts, confirms and names the squad. Choice: *Captain* becomes the product name for `teams.created_by`. On a padel Team both members act for the Team (today either may dissolve, and the mockup's "Proposed by You, Seef Smashers" is a non-creator); on a football Team the Captain acts, plus the tagged Group's Organizers (D2). Why: no migration, no transfer door, no second permission model; the existing creator rules (creator dissolves, others leave) are exactly the captain rules. Transfer of captaincy is a non-goal. **ADR: yes** (amends ADR-0038's "no captain role").

**D2. Group tag is a nullable reference the Group does not own.**
The glossary says a Team "belongs to no Group". The mockup tags a Team as "Gooz of Arad's team": it shows on the Group page, organizers can post challenges for it, members are picked from the Group. Choice: `teams.group_id` nullable, `on delete set null`, same sport required, set or cleared by the Captain together with the Group's Organizers (creator and Appointed Organizers). The Group gains nothing else: no ownership, no cascade, no counters. Group Organizers may use the Team's Challenge doors (naming the squad included), not its Roster doors (open question Q5). Why: the mockup's own line is "Teams are yours, not a group's"; a reference keeps that true. **ADR: yes** (same ADR as D1).

**D3 (revised 2026-11-08). Football Roster is two to twenty, flat; "complete" is per Format.**
First draft: two to seven, complete at five, because a Challenge Game seated the whole squad. The owner's rule is a Roster of up to 20 with the Matchday squad named afterwards, so the cap no longer has to fit a pitch. Choice: `teamRosterRule("football") = { min 2, max 20, completeAt 5, pairIsUnique false }`. `completeAt 5` keeps `teamIsComplete` meaning "can post some Format" (5-a-side is the smallest); the gate for one Format is `rosterCount >= sideSize` (`teamCanPostFormat`), and the detail lists the Formats the Roster can post ("Plays 5, 6 and 7-a-side"). Existing Teams between 21 and 25 members (the old max; none seeded, none expected in production) keep their members; join, invite and add doors refuse at 20 and the detail shows "22 of 20". Why: the owner's number; a flat Roster independent of Format is what the v2b mockup draws. **ADR: yes** (amends ADR-0038; folded into the squad ADR, D24).

**D4. Teams get the phone door, mirroring Groups.**
Today Team membership is Users via Lookup invite or Invite link. Mockup: add by phone; a number on Temba gets an invite, a number not on Temba joins the Roster by name. Choice: `teams.previewPlayerByPhone` and `teams.addPlayerByPhone`, Captain only. Account holder → Lookup invite (consent, as `groups.addPlayerByPhone` does, because Team membership is standing). Unclaimed or new → `team_members` row directly, through the shared `unclaimed-players/*` modules (one row per phone, starting Level picked by the Captain as on Games). A football role picked for a *new* Unclaimed player is written to that User's `preferred_football_role/position`, which is what the squad seat will read; no role column on `team_members`. `teams.removeUnclaimedPlayer` for mistakes, as on Groups. **ADR: no** (ADR-0042 already says Unclaimed players hang off every membership table; `CONTEXT.md` Team entry edit).

**D5. A Team's detail is readable by any signed-in User.**
`.scratch/padel-teams/spec.md` rule 25 kept a Loose Team's home members-only. The Challenge detail shows the opposing Team's record, Roster and Levels to whoever opens it, so the Team page cannot stay private. Choice: `teams.byId` opens to any signed-in User; invites, masked phones and actions stay member-only via `viewerActsForTeam`. **ADR: note in the D1/D2 ADR** (supersedes the padel-teams rule).

**D6 (revised 2026-11-08). A Challenge Game is a groupless Friendly game with both Game teams bound to Teams; football sides start empty.**
Choice: `games.challenge_id` nullable; format `friendly_game`; `group_id` null (like a Booking Game); `is_public` false; `registration_closed_at` set at create; both `game_teams.team_id` set. **Padel**: both members seated at confirm (Positions from Preferred Position, either → left then right), through the shared Friendly Game create module. **Football**: `createFootballGame` with `side_size` from the Challenge and `players_allowed = 2 × (side_size + 3)` (20 at most, under the 40 cap), then two `game_teams` with `side_index`, `team_id`, bibs black and white and **no players**, the one Match with both slots set and its Score Set shell, all written inline in `confirmProposal`. No `game_players` rows until a Captain names a squad. Why: the owner wants the squad picked after confirmation, and `footballSides`/`footballMatch`/`saveFootballScore` already read "sides and one Match" without caring who is on them. First-draft idea of extracting the `publishFootballTeams` lineup core is dropped: nothing publishes sides on a Challenge Game, so that door is simply refused. **ADR: yes** (the Challenge ADR; amends `Game`'s "must belong to a Group except a Booking Game" and ADR-0039's "the Organizer publishes the two sides, which creates the Match").

**D7. Padel Challenge Games are Rated at the groupless weight; football stays Unrated.**
ADR-0035 says Rated Games need a Verified Group, to stop made-up Groups moving Levels. A Challenge Game has two independent Teams who each confirm, which is a stronger check than one Group's word. `apply-rated-match.ts` already has `LOOSE_OR_GROUPLESS_RATING_WEIGHT = 0.5`. Choice: `rated = true` for padel, weight 0.5 by the existing rule; `group_rated = false`; football `rated = false` (ADR-0039/0040). Open question Q2. **ADR: yes** (amends ADR-0035).

**D8. Expiry is checked on read and stamped by a scheduled job.**
Nothing in the Workspace runs on a timer except Graphile Worker jobs (`settleMvpJob`, `expireHoldJob`), and Invite links expire on read. Choice: both. A pure `challenge-clock` predicate is consulted by every read and door; a job per Challenge and per Proposal, enqueued at `expires_at` with `mode: "replace"`, stamps the status and sends the expiry Notifications. A Challenge cannot expire while a Proposal is pending. **ADR: part of the Challenge ADR.**

**D9. Level wanted reuses Game Level range storage and pickers; the Team Level is a Roster mean.**
`level_min_tenths/level_max_tenths` on the Challenge, written from the assignable display bands through `parseLevelBandSelectTenths`. Team Level = mean displayed tenths of rated Roster members (not the squad, which does not exist at post time); a Team with no rated member has no Team Level and is outside any set range. No request or waiver path. Open question Q11.

**D10 (revised 2026-11-08). Proposal rules: time and venue, nothing else.**
One pending Proposal per Team per Challenge. Venue required, Court optional (Q9), price per player optional (Q15). `starts_at` at least an hour ahead and within 30 days (Q10). Change proposal edits in place and resets the 48-hour clock. Decline frees the Team to propose again; confirm passes every other pending Proposal over. A Team cannot propose on its own Challenge or on one posted by a Team sharing a member. Eligibility is the Team's: same sport, Roster at least the Challenge format's side (padel: two), Team Level in range. Nothing about who will play: the mockup's "Accepting is time and venue, nothing else".

**D11 (revised 2026-11-08). Organizers of a Challenge Game are the people who act for either Team; captains fill, nobody joins.**
`isGameOrganizer` and `gameAdminUserIds` gain a branch on `challenge_id`; `canViewGame` admits any Roster member of either Team so the unnamed can see the Game. Admit, Waitlist, Invite doors, add player, add Group members, leave, kick and publish sides are refused on a Challenge Game ("Teams are set by the challenge; captains name the squads"). The first draft's `games.swapChallengePlayer` is replaced by `games.nameChallengeSquad` (D24): a swap is editing the named list. Shape edits (caps, Level range, Season) are refused; window, name and price stay editable by either Team's acting Users.

**D12. Records, Rivals and head-to-head are derived from Matches; `draws` is added.**
Move the derivation into `teams/team-record.ts` (four readers), add draws, derive Rivals as opponents with two or more completed Matches and head-to-head from the same rows. Form is the last ten results; no Season lens. Because only named players hold `game_players` rows, "only the squad gets W–L, marks and head-to-head" falls out of the existing readers; the Team record reads `game_teams.team_id` and is unaffected by who was named.

**D13. Placement: a Challenges tab on mobile, a Challenges nav item on the web.**
Challenges takes mobile's third slot; Book leaves the bar and is reached from Home and Profile › Bookings; `book/*` routes stay. Teams move under Challenges › Teams; `profile/teams/*` redirects. Web: the sidebar's Teams item becomes Challenges at `/dashboard/challenges` with Open / Mine / Teams segments; `/dashboard/teams/*` stays. Open question Q1.

**D14 (revised 2026-11-08). Ten Notification kinds, one new column.**
`notifications.challenge_id`; types in spec section 10. Added this revision: `challenge_squad_named` (to each newly named player; the Captain naming themself is excluded) and `challenge_squad_due` (24 hours before kick-off to the acting Users of a side still short, one job per Game; Q14). `challenge_proposal_confirmed` on football goes to acting Users only, since nobody else is seated yet. A Team Lookup invite stays the actionable item; `team_invite_received` points at Challenges › Teams. No Notification on removal from a squad (non-goal).

**D15. Area is the preferred Venues' city.** `venues.city` exists; nothing else carries an area. Free text deferred (Q6).

**D16. Days, timings and slots.** `days weekday[]`, `timings challenge_timing[]` (same cuts as Play windows), `exact_slots timestamp[]`; empty means "any"; `duration_minutes` defaults 90 padel / 60 football and becomes the Game window. The Accept sheet suggests slots from days × timings over 14 days plus exact slots.

**D17 (revised 2026-11-08). The Challenge format (football side size) lives on the Challenge; the posting gate is Roster ≥ side.**
5, 6 or 7-a-side, picked in the post form's new Format field with help text; copied to the Game's `side_size`. Both Teams need a Roster of at least `side_size` at post, propose and confirm. The Matchday squad is `side_size + 3` seats. Why: the card says "6-a-side" and the review says "Squads of up to 9 named after confirmation"; the Format is a property of the Game being asked for, not of the Team, which "Plays 5, 6 and 7-a-side".

**D18 (revised 2026-11-08). Rematch is a pre-filled post with a nudge to any Team you have played.**
`post` takes `nudgeTeamId`; the target must be a Team the poster has completed at least one Match against. The v2b mockup's wording ("a team you've played") settles the first draft's open question 8.

**D19. One open Challenge per Team.** Partial unique index. Open question Q4.

**D20. Create team does everything in one transaction.** `teams.create` gains optional `groupId`, `inviteUserIds[]` and `phonePlayers[]`; `teams.listGroupMembersToAdd` feeds "From a group". The screens say "Football roster up to 20" and "5 needed for 5-a-side, 7 for 7-a-side, 20 max".

**D21. A cancelled Challenge Game leaves the Challenge confirmed.** No un-confirm.

**D22. The open board is visible to every signed-in User.** Cards grey when the viewer has no eligible Team (no Team of the sport, Roster short of the Format, or Team Level outside the range), with a line saying why.

**D23. API is additive. No procedure paths change.**

**D24 (new 2026-11-08). The Matchday squad is the side's seated players, named by the Captain, side plus up to three Reserves, flat, no stored flags.**
Choice: `games.nameChallengeSquad({ gameId, teamId, userIds[] })` replaces that side's `game_players` + `game_team_players` rows from the Team's Roster: 0 to `side_size + 3` names (partial saves allowed, matching the mockup's "4 + 5 to name"); a side is *named* at `>= side_size`; `saveFootballScore` is refused until both sides are named; the list locks once the Score is entered and reopens if a wrong-score report clears it (Q13). Reserves are display: the first `side_size` named are the side, the rest Reserves; empty seats are hatched and the last three are labelled Reserve so an empty Reserve never reads as a missing player. **A named Reserve is a seated player**: same `game_players` row, so the same Match result, Marks, MVP vote, Last 10 and head-to-head (Q12). Why this is the simplest rule: every reader that answers "who played" already reads `game_players`/`game_team_players`; a `reserve` or `played` flag would need Last 10, All time, Match result confirmation, Marks eligibility and the result card to learn a second notion of "seated but did not play", for a distinction the mockup itself does not draw ("Only named players get the result"). If the owner later wants un-used Reserves excluded, a boolean on `game_team_players` is additive. Padel needs no sheet: both members are the squad and are seated at confirm; the door is refused on padel. **ADR: yes** ("A football Roster is up to twenty and a Matchday squad is named per Game"; amends ADR-0038 and ADR-0039).

## 2. Things deliberately not done

- No `captain` column, no captain transfer, no `team_member_role`.
- No `area` column anywhere.
- No counter columns on Teams; no `team_rivals` table.
- No `matchday_squads` table, no `reserve` or `played` flag (D24).
- No extraction of `publishFootballTeams`; it is refused on Challenge Games.
- No separate `challenge_slots` table.
- No service layer: each procedure file owns its rules; the shared modules listed in spec section 8 exist because two or more doors call them.
- No change to Game admit or seats internals beyond the `challenge_id` refusal and the Organizer and view branches.

## 3. Risks

- **R1. Rating integrity.** Two colluding padel Teams can move Levels at half weight. Mitigation: both Teams confirm, wrong-score report exists, weight is 0.5. Q2 lets the owner pick Unrated.
- **R2 (revised). Legacy Rosters over 20.** None expected (max was 25 and football Teams barely exist); doors refuse adds at 20, nothing shrinks a Team. A squad is at most `side + 3`, so a large Roster never breaks the 40-player Game cap.
- **R3. Clock drift between read-time and job.** Confirm re-reads the row in its transaction with `for update` and refuses if not pending.
- **R4. Tab bar change** affects booking discoverability. Q1.
- **R5. Expo deep link** `profile/teams/[id]` is the Team Invite link landing path; the redirect must land before the route moves.
- **R6 (new). Kick-off with an unnamed side.** Nothing forces a Captain to name; the Score is refused until both do, and `challenge_squad_due` nags once. A Game nobody names stays unscored like any football Game without a Score; it leaves My Games after the existing 14-day window.
- **R7 (new). Readers that assume a football Match implies published sides with players.** `footballSides` returns the two empty sides; `games.byId`'s football board renders zero players. CH-7 adds a fixture test for the empty state on every football reader (`footballBoard`, `byId`, hub rows, result card).
