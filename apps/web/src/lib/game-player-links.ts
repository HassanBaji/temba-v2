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
