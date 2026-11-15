# Three ladders that never share a shape

**Status:** accepted. Spec: `.scratch/rating-redesign/spec.md`. Lifts the glossary's bans on "tier" and "rank" for two named terms.

Temba used one idea, a Level, for three questions: how good a player is, where they stand in their group, and what they have won. Padel showed a Temba Level and a Group Level with the same band letters, and players could not tell them apart. Football had neither. The owner's design names three ladders and gives each its own shape, feed and controller.

## Decision

- **Group Tier is your group.** Football only, inside one Group. Shown as a fish (the Tier band) with Tier points. Fed by that Group's Games. Controlled by the Group's Organizers.
- **Temba Level is you.** One per player and sport. Shown as a number with a Level band: OVR 40 to 99 on football, 1.0 to 7.0 on padel. Fed only by Games that count for Temba Level. Controlled by Operators, Level setters and Verifiers through Level overrides.
- **Official Rank is earned.** Football Teams and padel players. Shown as a #position with points. Fed only by official tournament and division results. Nobody can edit it. Reserved: this decision keeps its slot and its shape, and a later spec designs it.
- **One Game feeds exactly one ladder.** A Game's Rating scope is fixed at create and is one of `temba`, `group` or `unrated`.
- **Points never flow up.** A Group's Games never move a Level or a Rank. A Level never moves a Rank.
- **Hints flow down.** A Temba Level may suggest a new member's starting Tier points; only an Organizer writes them.
- **Three shapes, never alike.** A fish is never shown for a Level, a band letter never for a tier, a #position with points only for a Standing's place in its own table and for Official Rank.
- **Vocabulary.** "Group Tier", "Tier points", "Tier band" and "Official Rank" enter the glossary. "tier" stays avoided for a Giver group and "rank" for a Standing, a Level and a Level band. "Elo" and "badge" stay avoided.

**Considered Options**: keeping one Level with a per-Group variant (ADR-0053; the two letters were indistinguishable and football had no engine for either); a single ladder with a "group" filter (a friendly group could then inflate a Level); letting a Verified Group's Game move both a tier and a Level (the owner chose one ladder per Game, so the diagram's "points never flow up" has no exception).

## Consequences

- Every rating surface names its ladder. A screen that shows two ladders shows two shapes.
- A football Group has either a Group Tier or Games that count for Temba Level, never both ([ADR-0066](./0066-a-football-group-that-is-not-verified-has-a-group-tier.md)).
- Official Rank's slot on the Ratings screen is hatched ("not yet") until its own spec lands.
