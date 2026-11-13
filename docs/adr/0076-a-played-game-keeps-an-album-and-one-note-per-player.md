# A played Game keeps an Album and one note per player

**Status:** accepted.

Players wanted to keep the photos from a game and a line about how it went. The design ("Game album
and notes") puts both on the played Game, under the result and above Share, and collects a player's
notes into their own journal on the profile.

## Decision

- **The Album holds six photos per Game**, between all of its players. Rows live in `game_photos`
  (who added it, when); the bytes live in the bucket under `game-photos/<gameId>/<photoId>`, signed on
  the way out like every other media path (ADR-0034). The cap is checked before the upload and again
  under the Game row lock; a photo that loses the race is deleted from the bucket.
- **A Game note is one per player per Game** (`game_notes`, unique on Game and author), at most 300
  characters, and either **public** or **private**. Public is read by the players of that Game and
  nobody else; private is read by its author alone. It is not a comment thread: no replies, no likes.
- **Players are the roster's account holders.** Only they add photos and write notes. Whoever added a
  photo removes it; an Organizer removes any. An Organizer who did not play sees the Album, to remove
  a photo, but not the Notes.
- **Nothing opens until a score is final**: the Game is not cancelled and at least one of its Matches
  is completed. A window that ran out without a score does not count, unlike a Played game's freeze.
  A social or tournament gets one Album for the whole day.
- **Notes close thirty days after the Game** (its window end, else its start). Until then a player
  writes, rewrites and changes who reads their note; they may delete it at any time.
- **Another player's private note never leaves the server.** `gameAlbum.forGame` lists the other
  players without a public note as `silentPlayers`, whether or not they kept one private, so no client
  can tell a private note exists.
- **Your notes** (`gameAlbum.myNotes`) lists every note the viewer wrote with its Game for context:
  their side's outcome, the Sets read us-first, and their partners.
- **The Played list** (`games.listMyMatchHistory`) gains an additive `album` field per row: up to six
  thumbnail paths, the photo count, and the notes the viewer can read.
- **Clients shrink a photo before upload** to a 2048 px long edge and under the 2 MB cap (ADR-0016):
  the browser through a canvas, the Mobile App through `expo-image-manipulator`. Each photo is its own
  request, so a batch never meets the API's body limit.

## Consequences

- Photos are private to the players: there is no feed and no Group wall. A presigned URL still works
  for anyone it is handed to until it expires.
- The Mobile App gains `expo-image-manipulator` and `expo-file-system` (Save and Share download the
  photo first), so it needs a new development build.
- A User merge moves photos to the survivor and keeps the survivor's note where both wrote one.
