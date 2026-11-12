import { playedDateLine, playedVenueLine } from "@repo/domain/played-game";
import type { TournamentDetails } from "@repo/domain/tournament-details";

import { GameAlbumSections } from "../game-album/game-album-sections";
import { useGameAlbum } from "../game-album/use-game-album";
import { useLocale } from "../i18n/locale-provider";

/** One Album and Notes for the whole day, open once a Match is final. */
export function TournamentAlbum({
  game,
  openAdd,
}: {
  game: TournamentDetails;
  openAdd: boolean;
}) {
  const locale = useLocale();
  const album = useGameAlbum(game.id, game.drawPostedAt != null);
  return (
    <GameAlbumSections
      album={album}
      place={playedVenueLine({ ...game, courtName: null }, locale) ?? ""}
      context={playedDateLine(game.windowStart, locale)}
      openAdd={openAdd}
    />
  );
}
