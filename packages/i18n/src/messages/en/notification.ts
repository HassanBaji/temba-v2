import { plural } from "../../plural";

/** A title is read in parts so the names can be set in bold. */
export type NotificationTitlePart = { text: string; strong: boolean };

function strong(text: string): NotificationTitlePart {
  return { text, strong: true };
}

function plain(text: string): NotificationTitlePart {
  return { text, strong: false };
}

export const notification = {
  title: {
    pair: (actor: string, partner: string) => [
      strong(actor),
      plain(" and "),
      strong(partner),
    ],
    groupMemberJoined: (actor: string, group: string) => [
      strong(actor),
      plain(" joined "),
      strong(group),
    ],
    gamePlayerJoined: (subject: NotificationTitlePart[], game: string) => [
      ...subject,
      plain(" joined "),
      strong(game),
    ],
    gamePlayerJoinedViaWaitlist: (
      subject: NotificationTitlePart[],
      game: string,
    ) => [...subject, plain(" came off the Waitlist into "), strong(game)],
    gamePlayerLeft: (actor: string, game: string) => [
      strong(actor),
      plain(" left "),
      strong(game),
    ],
    gamePlayerLeftWithPartner: (
      actor: string,
      game: string,
      partner: string,
    ) => [
      strong(actor),
      plain(" left "),
      strong(game),
      plain(". "),
      strong(partner),
      plain(" was removed with them"),
    ],
    gameSeatedByOrganizer: (actor: string, game: string) => [
      strong(actor),
      plain(" added you to "),
      strong(game),
    ],
    historyLinked: (gameCount: number) => [
      plain("We linked "),
      strong(plural("en", gameCount, { one: "1 Game", other: "{n} Games" })),
      plain(" played under your number"),
    ],
    levelSet: (actor: string, level: string) => [
      strong(actor),
      plain(" set your Level to "),
      strong(level),
    ],
    gameFinished: (game: string) => [strong(game), plain(" has finished")],
  },
  subline: {
    everyMatchIn: "Every Match is in.",
    seeYourResults: "See your results.",
  },
  gameNameWithDay: (format: string, day: string) => `${format} · ${day}`,
  metaWithGroup: (time: string, group: string) => `${time} · ${group}`,
  time: {
    justNow: "Just now",
    minutesAgo: (n: number) => `${n} min ago`,
    hoursAgo: (n: number) => `${n} h ago`,
    daysAgo: (n: number) => `${n} days ago`,
  },
  invitesWaiting: (n: number) =>
    plural("en", n, {
      one: "{n} invite waiting",
      other: "{n} invites waiting",
    }),
};
