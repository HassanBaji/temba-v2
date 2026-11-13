# Rating redesign: decisions

Spec: `.scratch/rating-redesign/spec.md`. Design: `.scratch/design/ratings/`. Dated 2026-11-11.

## 1. Answered by the owner

| # | Question | Answer |
| --- | --- | --- |
| U1 | What does this step deliver? | Spec, ADRs and tickets. No product code. |
| U2 | Padel has a Group Level today; the design gives padel no Group Tier. | Retire it. Padel Groups keep only Standing; old rows stay for history. |
| U3 | The design shows "admin" and "organizer" as two Group roles. | No new role. The Group owner and every Appointed Organizer are the "admin". |
| U4 | Official Rank needs official tournaments and a football league that do not exist. | A later phase with its own spec. Reserve the slot. |
| U5 | What does a football Game on a Verified Group move? | The Temba Level only. Verified Groups have no Group Tier. |
| U6 | The diagram says the tier resets with the Group's season; the prototype says it carries. | It carries. Standing restarts. |
| U7 | No Friendly game can be public today. What counts for Temba Level? | Add Public Games now, with both sides confirming within 24 hours and the optional Verifier stamp. |
| U8 | What happens to the tickets? | Publish to Linear when the spec is written. |

## 2. Where the design's words meet the glossary

- **D1. "Admin" is Organizer.** The design's "group admin" is anyone `mayOrganizeGroupGames` accepts (U3). Copy says "organizer"; screen 2c's "Make organizer" row is the existing Appointed Organizer door. "Admin" stays on the Avoid lists; Temba staff are Operators. **ADR: no.**
- **D2. "Man of the match" is the MVP.** Same entity (`games.mvp_mode`, the vote, the gold coin), already shipped under that name. Screens 4a, 4c and 5a use "MVP". **ADR: no.**
- **D3. "Verified match" is copy, not an entity.** The entity stays Rated Match: a completed Match on a Game whose Rating scope is `temba`. The tag on the Game reads "Counts for Temba Level". "Verify" stays off Match result confirmation. **ADR: no.**
- **D4. "Group Elo" is Tier points; "fish badge" is Tier band.** "Elo" and "badge" stay avoided ("badge" belongs to nothing; a Mark is a coin). **ADR: yes, 0065** (lifts the bans on "tier" and "rank").
- **D5. Official Rank keeps the word "rank".** It is the one thing in Temba called a rank. A Standing is still never a rank. **ADR: yes, 0065.**

## 3. Group Tier

- **D6. A tier Group is a football Group that is not Verified.** One Game feeds one ladder (U5), so Rating scope stays the exclusive three: `temba`, `group`, `unrated`. `games.group_rated` is reused as "moves Tier points". Contradicts ADR-0053 (every Group Game rates a Group Level), worth reopening because the owner retired the padel Group Level and football gets Tier points instead. **ADR: yes, 0066.**
- **D7. Padel on a Group that is not Verified becomes Unrated.** It follows from U2: with no Group Level there is nothing left for the `group` scope to move on padel. Default taken (spec 20.1). **ADR: yes, 0066.**
- **D8. Tier points are an additive ledger, not a Glicko-2 Rating.** The owner's screens show a signed whole number per game, split into a result part and a performance part, and an adjustment "on top of what the games did". A second Glicko state cannot be explained that way. Contradicts ADR-0045's declined option (no per-Group rating), worth reopening because a Standing answers "who won most this season" and Make teams needs "how strong in this Group". **ADR: yes, 0067.**
- **D9. A Tier band is a place.** One Shark, then 15% and 35% of the rest, counted over ranked members only. The prototype's `tierOf` (place 1, up to 3, up to 7 of 11) is exactly this. A threshold on points was rejected: points drift and the owner's sheet says "the fish follows from the place". **ADR: yes, 0067.**
- **D10. Provisional tier.** Five Group Games or an Organizer's adjustment, whichever is first. No fish, a hatched slot, points not shown to other members. **ADR: no.**
- **D11. Fish need four ranked members.** Below that, percent bands are noise. Default taken (spec 20.9). **ADR: no.**
- **D12. A Tier adjustment moves points, never the fish.** Reason required, from the existing five `level_override_reason` values (they are the prototype's five chips), plus an optional note of 140 characters. Never your own. It confirms a Provisional tier, as a Level override clears Provisional (ADR-0023). **ADR: yes, 0073.**
- **D13. Hints flow down as a suggestion only.** A new member's Temba Level gives a start hint the Organizer sees in the adjust sheet. Nothing is written without an Organizer; an unadjusted member starts at 1,200. **ADR: no.**
- **D14. Tier points carry across Seasons** (U6) and are cleared when a member leaves or is removed; the events stay. **ADR: no.**
- **D15. Make teams balances on a strength number.** Tier points in a tier Group, OVR in a Verified Group or groupless Game, the hint for a member with no points. `balanceFootballSides` keeps its keepers-first snake draft. **ADR: no.**
- **D16. Additive ladders reverse by subtraction.** A tier or OVR event is removed by subtracting its delta, whatever happened later. Contradicts ADR-0011 (reversal only when no later Rated Match), worth reopening for additive ladders only: Glicko-2 states depend on order, deltas do not. **ADR: yes, 0067.**

## 4. Performance ratings

- **D17. One ballot set, two uses.** A 1 to 10 rating between seated players of a football Match. On a tier Group it is the performance part of Tier points; on a Game that counts for Temba Level it is OVR's 30%. **ADR: yes, 0068.**
- **D18. Three modes and three weights, per tier Group.** Off, Organizer rates, Everyone rates; 20, 30 or 50%; optional "an Organizer counts double". Snapshotted on the Match's Rating window at completion, so a change applies from the next Game. On a Game that counts for Temba Level the mode is always Everyone and the weight is fixed. **ADR: yes, 0068.**
- **D19. Fairness is computed, not stored.** No self-rating; highest and lowest dropped from five ballots; hidden for 24 hours; three ballots minimum; an outlier rater's weight halves; a blank is not a zero. The outlier weight is derived from stored ballots each time, so there is no "bad rater" record and nobody is ever shown who. **ADR: yes, 0068.**
- **D20. "Compared with the player's own usual", and centred on the game.** The performance part uses the rating minus the player's usual, minus the Match's mean of that difference. Without the centring a generous rating day would add points to everyone. **ADR: no.**
- **D21. One clock.** Moves that depend on ratings are written when the 24-hour Rating window closes, and the MVP vote closes with it on those Matches. Marks stay at 48 hours. Contradicts the Marks window definition (the MVP settles in 48 hours), worth reopening because OVR's MVP part must be known when the window closes. Default taken (spec 20.8). **ADR: yes, 0068.**

## 5. Temba Level

- **D22. OVR is a face of the existing Rating row.** `ovr = 40 + 59 × level / 7` on the stored μ. Team Level, Game Level range, Level wanted, bands and overrides keep working, and no row is rewritten. A separate football table was rejected: it would fork every reader. **ADR: yes, 0069.**
- **D23. The football step is four additive parts, not Glicko-2.** Contradicts ADR-0009 (Glicko-2 for every sport Rating), worth reopening because the owner's screen explains each game as four signed parts and a count of five Matches to confirm, which one Glicko outcome cannot carry. Each part is zero-sum across the Match. **ADR: yes, 0069.**
- **D24. Goals feed OVR.** Contradicts ADR-0040 and the Scorer entry ("not a rating input"), worth reopening because the owner gives goals 20%. With no minutes recorded, "while you played" is the whole Match (spec 20.7), and a changed Scorer list must clear confirmations. **ADR: yes, 0069.**
- **D25. Football Games on a Verified Group, Public Games and Challenge Games count.** Contradicts ADR-0039 (a football Game is Unrated) and ADR-0061 (a football Challenge Game is Unrated), worth reopening because the only reason was the missing football step. **ADR: yes, 0069.**
- **D26. Padel weighs the partner and reads from 1.0 with two decimals.** Contradicts ADR-0009 (partner ignored), worth reopening because a weak player beside a strong partner is over-rewarded when the expectation uses only their own μ. The 1.0 floor is display only. **ADR: yes, 0070.**

## 6. Public Games, Verifier, history

- **D27. A Public Game is a groupless Friendly game at a partner Venue.** Contradicts ADR-0035 (rated and public need a Verified Group), ADR-0029 (a groupless Game is unrated and private) and ADR-0014 (the Public tab was hidden), worth reopening because the owner wants a way to earn a Level without belonging to a Verified Group (U7). The partner Venue is a stored Operator fact, as `groups.verified_at` is, never inferred. **ADR: yes, 0071.**
- **D28. On a Public Game one player from each side confirms, within 24 hours, and the creator's confirmation is not final.** Contradicts ADR-0044 (an Organizer's confirmation is final) for this kind only, worth reopening because the creator is a stranger to the other side and could otherwise move Levels alone. An unanswered score stands and moves nothing. **ADR: yes, 0071.**
- **D29. A Verifier is a per-Venue table role.** Follows ADR-0025 (Venue manager). Contradicts ADR-0046 (only an Operator sets a football Level) and ADR-0023's rejection of more setter roles, worth reopening because the design names club staff, referees and coaches. A Clerk flag was rejected: the role is about one Venue. Level setter is left alone. **ADR: yes, 0072.**
- **D30. Rating history is a union read, and every manual change carries who and why.** `rating_events`, `level_overrides` and `group_tier_events` already hold everything; `level_overrides` gains a note and the setter's role. No new audit table. **ADR: yes, 0073.**

## 7. After the owner's review

- **D31. A padel Level is confirmed after five Rated Matches in a Verified Group.** The owner: "fix it to be after 5 matches in a verified group". Under ADR-0009 a padel Level left Provisional only when φ fell to 200, which took 8 to 16 Matches or more. Now it is the fifth Rated Match on a Game on a Group (stored rated only on a Verified Group, ADR-0035), read from `rating_events`, so Public Games do not count and a reversed Match drops out. A Level override still confirms. φ, weights and idle inflation are unchanged; φ no longer decides padel Provisional, so idle time never makes a confirmed padel Level Provisional again. Football keeps its fifth counting Match. **ADR: yes, 0074.**
