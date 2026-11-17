# Alone-only Socials take a player list until the Organizer posts the teams

**Status:** accepted.

Groups run Socials where everyone signs up alone and the organizer pairs them, usually by level,
then announces the teams. The design ("Social alone mode") adds **Alone only, you make the teams**
as a sign-up choice on a padel Social, a Make teams sheet, posting the teams, and sharing them.
Spec: `.scratch/social-alone-only/spec.md`.

## Decision

- **A sign-up choice, not a Format or a registration mode.** `games.organizer_makes_teams` sits
  beside `allow_solo_register` and is fixed at create. `registration_mode` stays `individual`. Any
  Tournament shape but Americano can carry it, because by the draw there are Game teams.
- **A Roster registration until the teams are posted.** While the flag is on and
  `games.teams_posted_at` is null, `isRosterRegistrationGame` is true: a player signs up through
  `games.register` with no Game team and no Position, as on an Americano, and every seat door
  refuses. The optional side a player asks for is stored on `game_players.preferred_side`. Reusing
  the Roster path gives the Waitlist, leave, kick and the Organizer's add for free.
- **Posting writes ordinary Game teams.** `games.postTeams` turns the pairs into Game teams on sides
  1 to n with Left and Right Positions and sets `teams_posted_at`. From then on the Social is an
  individual-seat Social: leaving frees one Position, the Waitlist fills it, Edit teams and the draw
  work unchanged. Posting again replaces the Game teams until the draw is posted; before the draw
  there are no Matches to break.
- **Partner registration is refused at every stage.** Every seat is one player, so pairs never enter
  together, even into an open side after posting.
- **The balance is a suggestion the Organizer can change.** `@repo/domain/alone-teams` pairs the
  strongest with the weakest and a left with a right where it can. The server checks only that the
  posted pairs use every player once, leave out at most one odd player and fit the Social.

## Considered options

- Seating sign-ups on placeholder Game teams and letting Edit teams pair them. Rejected: players
  would see teams that are not teams, and every leave would leave a Half team to clean up.
- Un-posting the teams when a player leaves. Rejected for a Half team the Organizer can fix: the
  other fifteen players keep their partner.
- Resizing the Social to the pairs posted. Not done: the remaining sides stay open and fill as on
  any Social, and the draw refuses Half teams as it does today.

## Consequences

- Clients branch on `organizerMakesTeams` and `teamsPostedAt` from `games.byId`: the players list
  before, the Teams list after.
- `game_teams_posted` is a new Notification type, for players only.
