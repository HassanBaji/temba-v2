# A Game's players may mint its Invite link

**Status:** accepted. Amends ADR-0057 (a Game link asks about the Group first) and story 22 of `.scratch/game-invite-share-preview/spec.md`.

Only the Game's Organizer could mint its Invite link. Every other viewer's Share sent the Game page (`/dashboard/games/{id}`) under the same "Join:" message. That page asks for a Temba account, so a chat previews it as "Sign in", and on a private Game it is "Not found" for anyone who is not already on the Game or in its Group. A player who shared their Game to find a fourth sent a dead link.

## Decision

- **The Organizer and every player registered on the Game may mint its Invite link**, while its invite doors are open (registration not closed, the Game not cancelled or ended). `games.createInviteLink` refuses anyone else with `FORBIDDEN`. A Waitlist entry is not a registration. A Challenge Game still has no Invite door.
- **Share sends the Invite link whenever the viewer may mint one**, on the Friendly game, a Social and the web football Game. `gameCanShareInviteLink` in `@repo/domain/friendly-game-cta` decides for both Apps. Everyone else still shares the Game page, which opens for whoever may already see the Game.
- **A player's link is the same door as the Organizer's.** It seats on the Game, and on a Group Game it opens the Group as ADR-0057 describes: a non-member joins a Group that lets anyone with the link in, and sends a Group join request where Organizers approve. The link row records who minted it, the link's page names them as the sharer, and the Group's Organizers are told when someone joins.
- **Everything else on the invite panel stays with the Organizer**: reading the newest link (`games.getInviteLink`), Lookup invites, adding players.

**Considered options**: reusing the Organizer's newest link for a player's share (nothing to send until the Organizer has copied one); a player's link that seats a guest without the Group (a private Game seats no guest today, and it would be a second kind of link); keeping the Game page and telling an outsider the Game is private (a player still could not bring anyone in).

## Consequences

- A member of a private Group can bring a non-member into it by sharing a Game they are on. Where that is not wanted, the Group is a Public Group with Require approval on, and the link only sends a request.
- No schema or procedure shape changes: `games.createInviteLink` keeps its input and output.
- The mobile football Game screen has no Share for a player yet; its Organizer still invites from the invite sheet.
- Game page links already pasted in chats are unchanged: they still open only for whoever may see the Game.
