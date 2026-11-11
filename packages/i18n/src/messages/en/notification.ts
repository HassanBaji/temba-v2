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
    gameSideChanged: (actor: string, game: string) => [
      strong(actor),
      plain(" changed your side on "),
      strong(game),
    ],
    gameMovedToWaitlist: (actor: string, game: string) => [
      strong(actor),
      plain(" lowered the players on "),
      strong(game),
      plain(". You're on the Waitlist and get your spot back when one opens"),
    ],
    matchScoreToConfirm: (actor: string, game: string) => [
      strong(actor),
      plain(" entered your score in "),
      strong(game),
      plain(". Confirm it or correct it"),
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
    tierPointsAdjusted: (actor: string, group: string) => [
      strong(actor),
      plain(" adjusted your tier points in "),
      strong(group),
    ],
    tierBandChanged: (band: string, group: string) => [
      plain("You’re now a "),
      strong(band),
      plain(" in "),
      strong(group),
    ],
    gameFinished: (game: string) => [strong(game), plain(" has finished")],
    markReceived: (actor: string, kind: string, game: string) => [
      strong(actor),
      plain(" gave you "),
      strong(kind),
      plain(" on "),
      strong(game),
    ],
    mvpDecided: (mvp: string, game: string) => [
      strong(mvp),
      plain(" is the MVP of "),
      strong(game),
    ],
    youAreMvp: (game: string) => [plain("You’re the MVP of "), strong(game)],
    mvpTieBreak: (game: string) => [
      plain("Tied vote on "),
      strong(game),
      plain(". Pick the MVP."),
    ],
    groupJoinRequested: (actor: string, group: string) => [
      strong(actor),
      plain(" asked to join "),
      strong(group),
    ],
    groupJoinRequestedWithSeat: (
      actor: string,
      group: string,
      game: string,
    ) => [
      strong(actor),
      plain(" asked to join "),
      strong(group),
      plain(" and hold a seat on "),
      strong(game),
    ],
    groupJoinApproved: (actor: string, group: string) => [
      strong(actor),
      plain(" approved you. You're in "),
      strong(group),
    ],
    groupJoinApprovedWithSeat: (actor: string, group: string, game: string) => [
      strong(actor),
      plain(" approved you. You're in "),
      strong(game),
      plain(" and a member of "),
      strong(group),
    ],
    groupJoinDeclined: (actor: string, group: string) => [
      strong(actor),
      plain(" declined your request to join "),
      strong(group),
    ],
    levelRangeRequested: (actor: string, game: string) => [
      strong(actor),
      plain(" asked to play "),
      strong(game),
      plain(" outside the Level range"),
    ],
    levelRangeApproved: (actor: string, game: string) => [
      strong(actor),
      plain(" approved you for "),
      strong(game),
    ],
    levelRangeDeclined: (actor: string, game: string) => [
      strong(actor),
      plain(" declined your request to play "),
      strong(game),
    ],
    teamInviteReceived: (actor: string, team: string) => [
      strong(actor),
      plain(" invited you to "),
      strong(team),
    ],
    teamInviteReceivedUnnamed: (actor: string) => [
      strong(actor),
      plain(" invited you to their Team"),
    ],
    challengeExpired: (team: string) => [
      plain("The challenge from "),
      strong(team),
      plain(" expired"),
    ],
    challengeExpiredUnnamed: [plain("Your Team's challenge expired")],
    challengeProposalReceived: (team: string) => [
      strong(team),
      plain(" proposed a time for your challenge"),
    ],
    challengeProposalReceivedUnnamed: [
      plain("A Team proposed a time for your challenge"),
    ],
    challengeProposalDeclined: (team: string) => [
      strong(team),
      plain(" asked for another time"),
    ],
    challengeProposalDeclinedUnnamed: [
      plain("Your proposal was declined: another time"),
    ],
    challengeProposalExpired: (team: string) => [
      plain("Your proposal to "),
      strong(team),
      plain(" expired"),
    ],
    challengeProposalExpiredUnnamed: [plain("Your Team's proposal expired")],
    challengeProposalConfirmed: (team: string) => [
      plain("It's a game: you play "),
      strong(team),
    ],
    challengeProposalConfirmedUnnamed: [plain("Your challenge is a game")],
    challengeProposalPassedOver: (team: string) => [
      strong(team),
      plain(" confirmed another proposal"),
    ],
    challengeProposalPassedOverUnnamed: [
      plain("Another proposal was confirmed"),
    ],
    challengeSquadDue: (team: string) => [
      plain("Name your squad for the game against "),
      strong(team),
    ],
    challengeSquadDueUnnamed: [plain("Name your squad for the game")],
    challengeSquadNamed: (team: string) => [
      plain("You're in the squad to play "),
      strong(team),
    ],
    challengeSquadNamedUnnamed: [plain("You're in the squad for a challenge")],
    challengeRematchNudge: (team: string) => [
      strong(team),
      plain(" challenged you to a rematch"),
    ],
    challengeRematchNudgeUnnamed: [
      plain("A Team you've played challenged you to a rematch"),
    ],
  },
  subline: {
    everyMatchIn: "Every Match is in.",
    seeYourResults: "See your results.",
    marksOpen: (when: string) => `Give your marks before ${when}.`,
    decideOnGame: "Approve or decline on the Game.",
    decideOnGroup: "Approve or decline on the Group.",
    takeYourSeat: "You can join the Game now.",
    acceptInTeams: "Accept or decline it in Teams.",
    postAgain: "No proposal came in. Post again from Challenges.",
    confirmOrAnotherTime:
      "Confirm it, or ask for another time, within 48 hours.",
    proposeAgain: "Send a new proposal while the challenge is open.",
    bothPairsSeated: "Both pairs are seated. See the Game.",
    nameYourSquad: "Name your squad from the Roster.",
    findAnother: "Find another challenge on the open board.",
    kickOffTomorrow: "Kick-off is in 24 hours.",
    seeWhoIsNamed: "See the Game and who else is named.",
    acceptRematch: "Accept it to propose a time and a venue.",
    tierAdjusted: (reason: string, from: string, to: string) =>
      `${reason}. ${from} to ${to}.`,
    tierAdjustedWithNote: (
      reason: string,
      note: string,
      from: string,
      to: string,
    ) => `${reason}: “${note}” ${from} to ${to}.`,
    tierPlaces:
      "Tiers are places, so when one player moves, someone moves the other way.",
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
