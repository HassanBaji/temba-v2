/**
 * Line-up seats and Friendly tournament player names open Player profiles
 * only for viewers on the Game or in its Group. Waitlisted viewers, public
 * browsers and Organizers outside the Group see plain names.
 */
export function gamePlayersLink(game: {
  isRegistered: boolean;
  isGroupMember: boolean;
}) {
  return game.isRegistered || game.isGroupMember;
}

export type GameTeamPlayer = { id: string; name: string; image: string | null };

/** A Game team's players, or none for an unknown or empty Game team. */
export function gameTeamPlayers(
  gameTeams: readonly {
    id: string;
    members: readonly GameTeamPlayer[];
  }[],
  gameTeamId: string,
): GameTeamPlayer[] {
  const members =
    gameTeams.find((team) => team.id === gameTeamId)?.members ?? [];
  return members.map(({ id, name, image }) => ({ id, name, image }));
}
