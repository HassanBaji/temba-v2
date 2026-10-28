# Onboarding asks which sports a User plays

**Status:** accepted. Supersedes the onboarding part of football spec D23.

The mobile Onboarding questionnaire now opens with "What do you play?" and asks padel or football questions only for the sports picked. Football players place themselves as Casual, Competitive or Pro, which declares a starting football Level.

## Decision

- **`user.sports`** (`group_sport[]`, nullable) records the Sports played. Null means the User onboarded before the question, and is read as padel only.
- **`user.preferred_football_role` and `user.preferred_football_position`** hold the football defaults. They prefill the football join sheet. Each registration still keeps its own `game_players` values (ADR-0040).
- **`users.completeOnboarding` takes an optional answers input.** With it, one transaction writes the Sports played, the padel Preferred Position, the football defaults and a self-declared Rating for each picked sport, then marks the User complete. Without it, the door behaves as before, so the web questionnaire and released mobile builds keep working.
- **What completion needs depends on the Sports played.** Padel needs a Preferred Position and a padel Rating. Football needs a Football role and a football Rating.
- **A sport that already has a Rating, or a Rated Match, keeps it.** The one-time declare is skipped rather than refused, so a retry after a partial onboarding still finishes.
- **Football self-placement declares D, C or B.** It is the lower third of each, as for the padel display ladder. A is never self-placed.

**Considered Options**: one door per question, as on web (back navigation would meet the one-time Level declaration half way through); keeping football out of onboarding until football results rate (Make teams already balances on football Ratings and had nothing to balance on).

## Consequences

- Football Ratings now exist before any football Match. Make teams by Level reads them; they stay unchanged until football results rate.
- The web questionnaire still asks padel only. A web User has no Sports played and is read as padel.
- Consent to the Terms is recorded by Clerk (`legalAccepted`) on the username sign-up. Google sign-ups rely on the notice next to the button.
