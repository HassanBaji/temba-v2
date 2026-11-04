import { plural } from "../../plural";

/** mobileYou: copy only the mobile You page and Settings use. Shared copy lives in `you`. */
export const mobileYou = {
  names: (names: string[]) => names.join(" & "),
  same: "SAME",
  goals: "goals",
  goalsAGame: "goals a game",
  goalsInMatch: (n: number) =>
    plural("en", n, { one: "1 goal", other: "{n} goals" }),
  curveSpoken: (from: string, to: string) => `Rating from ${from} to ${to}`,
  scaleSpoken: (name: string, band: string, level: string) =>
    `${name}, ${band} ${level}`,
  leftName: "your name",
  sportAdded: (sport: string) => `${sport} added to your profile`,
  sportRemoved: (sport: string) => `${sport} removed from your profile`,
  footballPrefsLocked:
    "Role and position come from sign up and cannot be changed here yet.",
  pickFromList: (label: string) => `${label}, choose from a list`,
  password: {
    current: "Current password",
    save: "Save password",
    saved: "Password changed",
  },
};
