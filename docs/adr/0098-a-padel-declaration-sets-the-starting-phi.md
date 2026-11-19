# A padel declaration sets the starting φ

**Status:** accepted. Amends [ADR-0009](./0009-glicko-2-user-ratings.md) (every Rating started at φ₀ 350).

A padel player who declared a Level band started at the band's midpoint with φ 350, the same uncertainty as a player who said "I don't know". The declaration set the starting Level and carried no confidence, so one even win moved a D declarer 0.35 Level, half a band, for a result that only confirmed what they declared. The owner asked that a declaration be trusted by band: the low bands almost like a confirmed Level, C and above less, since a player who overstates is more likely to declare high.

## Decision

- **The Declared band is kept on the Rating** (`ratings.declared_band`, nullable, typed `rating_level_band`). It is written once, when the Level is declared, by the one writer of a declaration (`selfDeclareRating`), in both sports. A Match and a Level override never change it. "I don't know" stores none.
- **On padel it sets the starting φ**: D and D+ (stored D3, D2 and D1) start at 150, C- (C3) at 200, C and above at 250. "I don't know" starts at μ 1500, φ 350, as before. μ is the band's midpoint, as before.
- **"Not sure" in the Onboarding questionnaire is a declared D+**: φ 150 and a Declared band. It already arrived as D+, so no client changes.
- **A band an Organizer picks for an Unclaimed player is a Declared band.** It goes through the same writer and is the only placement that Level has.
- **Football is unchanged.** Every football self-placement starts at φ 350, because a football φ carries Provisional (ADR-0069): a lower start would read as confirmed. `initialRatingFromChoice` takes the sport, so every caller chooses.
- **A padel Provisional still reads from Rated Matches in a Verified Group** (ADR-0080), whatever the φ. `ratings.selfDeclare` now returns the same view every other surface reads, so a D declarer at φ 150 reads Provisional with none of five played.
- **No existing Rating changes.** New declarations get the new φ from this deploy; existing players are brought in line by the Level recalculation, which replays their history from their Declared band.

Through the real Glicko-2 step at weight 1, against settled players at the same Level, an even win now moves a new D declarer about 0.11 Level, a C- declarer about 0.17 and a C declarer about 0.23, against 0.35 before.

**Considered Options**: one flat φ 250 for every declared band (it trusts a D declaration no more than a B one, and the low bands are the ones the owner trusts); keeping φ 350 and damping the first Matches some other way (a second rule beside φ for what φ already says); reading the band back from the starting μ when it is needed (it holds only until the first ledger row, and a later rule needs it after); a lower start φ on football too (a football φ decides Provisional, so the player would read confirmed at once).

## Consequences

- A wrong low declaration corrects more slowly than before: a D declarer who plays at C needs more wins to get there. The Level override stays the fix.
- Between this deploy and the Level recalculation, new declarers and existing players start from different φ tables.
- The Declared band is stored on football Ratings too, though nothing reads it there.
- A Rating created by a Rated Match, a Level override or a football Match before any declaration has no Declared band.
