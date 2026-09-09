Status: ready-for-agent

Tickets (Linear, `ready-for-agent`): [TEM-193](https://linear.app/temba-app/issue/TEM-193/restore-leave-and-move-on-friendly-game-details) Restore leave and move on Friendly game details.

This spec **amends** `.scratch/game-details-redesign/spec.md` stories **4** (Line-up vacant slot is Invite-only) and **26–27** (Leave game is non-organizer only). It **cites** `.scratch/individual-game-seats/spec.md` stories **17–29** and `.scratch/individual-game-seats/decisions.md` items **13–17** (leave/move domain rules). It does not replace either parent spec. Leave/move product rules are not reopened.

Recommended product answers (grilling could not wait): vacant Line-up chip is **move-only** when `canMove`; join stays the CTA sheet; a seated **Organizer** also gets Leave game; surface is Friendly game details only; leave remains allowed in every phase, move stays refused when registration is not open or the Match is completed. If those are overruled, see Further Notes.

## Problem Statement

On an individual Friendly game, a User who has already sat down cannot change Position and, if they are the organizer, cannot leave. The details page Line-up shows vacant spots as hatch plus organizer Invite. Join is a separate bottom CTA. Leave game exists only for non-organizers at the page bottom. Move to a vacant Position used to live on the Players tab and disappeared when that tab was replaced by Line-up.

The doors already work. The User cannot reach them on the page they actually open.

## Solution

On individual Friendly game details only, make a vacant Line-up hatch a **move** control when the viewer is seated and `canMove`. Keep organizer Invite as the row-end button. Keep join on the sticky CTA and join sheet.

Show **Leave game** on the footer for every seated or registered User who `canLeave` and is not waitlisted, including an organizer who also sits. Organizer Edit/Cancel (and the later-phase organizer actions) stay. Leave is not Cancel: it frees that User's Position; the Game remains.

Reuse `games.moveSeat` and `games.leave`. No new door, schema, or permission invention. Waitlist promotion, last-leave deleting the Game team, no occupant swap, and move-while-open stay as already shipped.

## User Stories

1. As a seated User on an individual Friendly game with at least one vacant Position and registration open, I want to tap that vacant Line-up hatch to sit there, so that I can change side or left/right without leaving the Game.

2. As that User, I want the move to occupy only that vacant Position and leave my old one empty, so that nobody else is displaced.

3. As a seated User looking at an occupied Position, I want that row not to be a move target, so that I cannot swap with a partner or another User.

4. As a seated User when the Game is full, closed, cancelled, Soft-archived, or I sit on a completed Match, I want vacant hatches to stay display-only, so that move stays refused the same way the door already refuses it.

5. As a seated organizer on a still-open Game with a vacant Position, I want the hatch to move me and the Invite button to still invite, so that filling the roster and changing my own Position are different actions.

6. As an unseated User who can register, I want join to stay on the sticky CTA and join sheet, so that tapping a Line-up hatch does not silently seat me and does not fight Invite.

7. As a non-organizer who is seated or registered, I want Leave game at the bottom of the page in every phase, so that I can free my Position.

8. As an organizer who is also seated or registered, I want Leave game on that same footer as well as Edit game / Cancel game (or the phase's organizer action), so that leaving my Position is not the same as cancelling the Game.

9. As an organizer who is not seated and not registered, I want no Leave game, so that Leave stays an occupancy action.

10. As a waitlisted User, I want Leave waitlist on the CTA or overflow, not Leave game, so that leaving the line is not confused with vacating a Position.

11. As a User who leaves, I want only my Position freed, my partner to stay, and the first eligible waitlisted User promoted into that Position when the Game is not cancelled, so that shipped leave still holds.

12. As the last User on a Game team who leaves, I want that Game team deleted and its Match slots cleared, with the empty side still shown as a placeholder, so that last-leave still holds.

13. As a keyboard User, I want the vacant move hatch to have a visible focus ring and an accessible name that says I am moving to that side and Position, so that I do not rely on hatch alone.

14. As a User whose move is in flight, I want vacant move hatches disabled, so that double-submit is hard.

15. As a User opening an Americano, Friendly tournament, or team-only Game, I want today's tabbed Players controls unchanged, so that this slice only restores the Friendly chrome path.

16. As a User on Games hub or Home, I want those surfaces unchanged, so that leave and move are not added to cards.

## Implementation Decisions

- **Scope.** Individual-registration Friendly games only (`usesFriendlyChrome`). Amend the redesign Line-up (vacant row is Invite-only display) and footer (Leave is non-organizer-only). Cite seats stories 17–29; do not rewrite them.

- **No API / schema.** `games.moveSeat`, `games.leave`, `leaveRegisteredSeat`, `moveToSeat`, `canMove`, and `canLeave` stay as shipped. Do not add a procedure file, twin domain verb, or service layer. One-endpoint-per-file: existing `moveSeat.ts` and `leave.ts` are the doors.

- **Line-up vacant hatch.** When `canMove`, the hatch is a button that calls the page's existing `moveSeat` mutation with that side index and Position. Accessible name reuses the existing move label helper (Move to {side} {position}). When `canMove` is false, the hatch stays non-interactive. Occupied rows stay display (You tag unchanged). Do not call register from the hatch. Do not open the join sheet from the hatch.

- **Invite coexistence.** Organizer Invite remains on vacant rows when mint is allowed and the phase is not Final. Invite is the outline button; move is the hatch. Invite `onClick` must not fire move.

- **Join unchanged.** Sticky CTA and join sheet remain the join path for unseated Users.

- **Footer Leave.** Gate Leave game on seated or registered, `canLeave`, not waitlisted — drop the `!isOrganizer` exclusion. Organizer actions still render for organizers. Leave uses the existing confirm dialog and `games.leave`. Add the consequence line already used in the confirm copy ("Your spot can open for someone else.") so Leave matches other destructive footer actions. Cancel game copy and door stay unchanged.

- **Phases.** Leave remains available in upcoming, ongoing, needs_results, and final while the occupancy gate holds. Move follows `canMove` only (registration open, vacant Position, not on a completed Match).

- **Tests.** Prefer colocated lib tests if a tiny Line-up vacant-action helper is extracted; otherwise component-level behaviour plus existing door tests. Do not add tests whose only purpose is file moves. Highest seam is the Friendly details page.

- **Preview.** Dev-only `/dashboard/design/game-details` is a fixture dump, not the production Line-up; do not block on restyling it.

## Testing Decisions

### What a good test is

External behaviour: a seated User can move to a vacant Position from Line-up; a seated organizer can leave without cancelling; unseated join and organizer Invite still work; other formats and hub/home are untouched. Do not retest Waitlist FIFO or last-leave unless this slice regresses them. Pure helpers get colocated `*.test.ts` files like `friendly-game-players.test.ts`.

### Test seams

Highest seam: on an individual Friendly game details page, a seated User moves to a vacant Position from Line-up and leaves from the footer (including when they are the organizer), while join stays the CTA sheet and Invite stays the row button, without changing doors or other Game formats.

If you implement this spec, you implement these seams:

- Vacant Line-up hatch is a move control exactly when `canMove`
- Move calls `games.moveSeat` with that side and Position; pending disables the control
- Hatch is not join and not Invite
- Footer Leave game for seated/registered non-waitlisted Users including organizers
- Organizer still sees Edit/Cancel (or phase organizer action) distinct from Leave
- Waitlisted Users still leave the Waitlist from CTA/overflow
- Americano, Friendly tournament, team-only, hub, and Home unchanged

### Prior art

`.scratch/individual-game-seats/spec.md` for door behaviour. `friendly-game-players.ts` vacant-action helper and tests for the old Players-tab join/move split. `friendly-game-actions-footer.tsx` for footer gating. `friendly-game-cta.test.ts` for overflow never listing Leave game.

## Out of Scope

- Reopening leave/move domain rules (occupant swap, organizer drag, Waitlist promotion target, last-leave deleting the Game team)
- New tRPC procedures or schema
- Line-up hatch as join
- Kick from Line-up
- Games hub cards, Home, Group home
- Americano, Friendly tournament, team-only details
- Changing `canMove` / `canLeave` derivation
- Join sheet, Invite mint widening, register-with-partner
- Restyling the design-preview route into production chrome

## Further Notes

Glossary: Root `CONTEXT.md` — **Game**, **Position** (left/right), **Game team**, **Friendly game**, **Waitlist**, **User**, **Organizer**. Player-facing copy may say "spot". Do not call the 2v2 diagram a Court.

If Q1 is overruled (chip-join): vacant hatch also registers an unseated viewer; keep Invite as a separate button. If Q2 is overruled: keep Leave non-organizer-only. If Q3 is overruled: hub/home is a later ticket. If Q4 is overruled: refusing leave after play is a door change, not this UI slice.

## Implementation tickets (Linear)

All labelled `ready-for-agent`. Spec: `.scratch/game-details-leave-and-move/spec.md`.

| # | Ticket | Blocked by |
|---|--------|------------|
| 1 | [TEM-193 Restore leave and move on Friendly game details](https://linear.app/temba-app/issue/TEM-193/restore-leave-and-move-on-friendly-game-details) | — |

Frontier: **TEM-193** only. Do not implement until an implementer / orchestrator is asked to run the ticket.
