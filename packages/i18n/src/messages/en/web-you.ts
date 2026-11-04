import { plural } from "../../plural";

/** webYou: copy only the web You page and Settings use. Shared copy lives in `you`. */
export const webYou = {
  sportsLabel: "Your sports",
  scopesLabel: "Level scope",
  scaleLabel: "Group levels against your general level",
  noData: "—",
  outcome: {
    won: "Won",
    lost: "Lost",
    draw: "Drawn",
  },
  football: {
    goals: "goals",
    goalsPerGame: "goals a game",
    goalsTotal: (n: number) =>
      plural("en", n, { one: "1 goal", other: "{n} goals" }),
    sameAsYours: "Same as yours",
    same: "Same",
  },
  settings: {
    changePassword: "Change your password",
    setPassword: "Set a password",
    currentPassword: "Current password",
    newPassword: "New password",
    passwordSaved: "Password changed",
    savePassword: "Save password",
    deleting: "Deleting…",
    sportAdded: (sport: string) => `${sport} added to your profile`,
    sportRemoved: (sport: string) => `${sport} removed from your profile`,
    levelPlaced: "Level saved",
  },
};
