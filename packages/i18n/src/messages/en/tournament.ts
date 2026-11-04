import { plural } from "../../plural";

const COLLAPSE_COUNT_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
] as const;

function teamsWord(n: number) {
  return plural("en", n, { one: "1 team", other: "{n} teams" });
}

function gameTeamsWord(n: number) {
  return plural("en", n, { one: "1 Game team", other: "{n} Game teams" });
}

function byesWord(n: number) {
  return plural("en", n, { one: "1 bye", other: "{n} byes" });
}

export const tournament = {
  gameTeam: "Game team",
  position: {
    left: "Left",
    right: "Right",
    leftLower: "left",
    rightLower: "right",
  },
  listSeparator: ", ",
  listAnd: (first: string, second: string) => `${first} and ${second}`,
  knockout: {
    final: "Final",
    semiFinals: "Semi-finals",
    quarterFinals: "Quarter-finals",
    roundOf: (teamsLeft: number) => `Round of ${teamsLeft}`,
    semiFinal: "Semi-final",
    quarterFinal: "Quarter-final",
    startFinal: "the final",
    startSemis: "semis",
    startQuarters: "quarters",
    startRoundOf: (teamsLeft: number) => `the round of ${teamsLeft}`,
    label: {
      final: "Final",
      semi: (position: number) => `S${position}`,
      quarter: (position: number) => `Q${position}`,
      round: (teamsLeft: number, position: number) =>
        `R${teamsLeft}-${position}`,
    },
    short: {
      final: "Final",
      semi: (position: number) => `S${position}`,
      quarter: (position: number) => `Q${position}`,
      round: (teamsLeft: number, position: number) =>
        `R${teamsLeft}-${position}`,
    },
    winnerOf: (label: string) => `Winner of ${label}`,
    byeCount: (n: number) => byesWord(n),
    onward: (roundName: string) => `${roundName} onward`,
    onwardWithByes: (roundName: string, byeCount: number) =>
      `${roundName} onward. ${byesWord(byeCount)}`,
    throughFromEachGroup: "Through from each group",
    qualifierUnit: (n: number) =>
      plural("en", n, { one: "team", other: "teams" }),
    intoKnockout: (teamCount: number) =>
      `${teamsWord(teamCount)} into the knockout.`,
    intoKnockoutWithByes: (teamCount: number, byeCount: number) =>
      `${teamsWord(teamCount)} into the knockout, ${byesWord(byeCount)}.`,
    topTeam: "Top team",
    topTwo: "Top two",
    topThree: "Top three",
    topFour: "Top four",
    topN: (n: number) => `Top ${n}`,
    inEachGroup: (who: string) => `${who} in each group`,
    stageFinal: "final",
    stageSemis: "semis, then the final",
    stageQuarters: "quarters onward",
    stageRoundOf: (teamsLeft: number) => `round of ${teamsLeft} onward`,
    reviewValue: (who: string, stage: string) => `${who}, ${stage}`,
    reviewValueWithByes: (who: string, stage: string, byeCount: number) =>
      `${who}, ${stage}. ${byesWord(byeCount)}`,
  },
  knockoutView: {
    bye: "Bye",
    decidingSet: "Add a deciding Set",
    wonTag: "won",
    walkover: "Walkover",
    champion: "Champion",
    nowAt: (roundName: string) => `Now at the ${roundName}`,
    chooseThrough:
      "Choose which team goes through. The Match is shown as a Walkover and no Rating changes.",
    teamGoesThrough: (team: string) =>
      `${team} goes through. The Match is shown as a Walkover and no Rating changes.`,
    nobodyThrough: "Nobody goes through. This cannot be undone.",
    championLine: (name: string) => `Champion: ${name}`,
    toBeDecided: "To be decided",
    heading: "Knockout",
    notThrough:
      "Your team did not go through. The tournament is over for your team.",
  },
  poolDraw: {
    poolLabel: (letter: string) => `group ${letter}`,
    notHappened: "The group draw has not happened yet.",
    opponentsUnknown: "Your opponents are not yet known.",
    random: "The group draw is random. Nobody is seeded.",
    drawPools: "Draw the groups",
    drawAgain: "Draw again",
    post: "Post the group draw",
    undo: "Undo the group draw",
    undoConfirmTitle: "Undo the group draw?",
    undoConfirmCopy:
      "Teams leave their groups and every group Match is deleted.",
    undoConfirmLabel: "Undo draw",
    drawerTitle: "The draw",
    entryTitle: "The group draw",
    entryDraftedTitle: "The groups are drafted",
    entryAction: "Open the draw",
    emptyDraft: "Draw the groups to see which Game teams land in which group.",
    postFooter: "Posting creates every group Match and closes the seats.",
    knockoutRandom: "The draw is random. Nobody is seeded.",
    drawKnockout: "Draw the knockout",
    postKnockout: "Post the draw",
    knockoutEntryTitle: "The knockout draw",
    knockoutEntryDraftedTitle: "The knockout is drafted",
    knockoutEmptyDraft:
      "Draw the knockout to see who plays whom in the first round.",
    postKnockoutFooter:
      "Posting creates every knockout Match and closes the seats.",
    undoKnockout: "Undo the draw",
    undoKnockoutConfirmTitle: "Undo the draw?",
    undoKnockoutConfirmCopy:
      "Every knockout Match is deleted and the draw is cleared.",
    entryStateLine: (completeTeams: number, teamCount: number) =>
      plural("en", teamCount, {
        one: `${completeTeams} of 1 Game team is complete.`,
        other: `${completeTeams} of {n} Game teams are complete.`,
      }),
    drawerLead: (teamCount: number) =>
      `${gameTeamsWord(teamCount)}. The group draw is random. Nobody is seeded.`,
    knockoutDrawerLead: (completeTeams: number) =>
      plural("en", completeTeams, {
        one: "1 complete Game team goes into the draw. The draw is random. Nobody is seeded.",
        other:
          "{n} complete Game teams go into the draw. The draw is random. Nobody is seeded.",
      }),
  },
  poolTable: {
    heading: "group table",
    winner: "group winner",
    finished: "This tournament is finished.",
    yourRounds: "Your Rounds",
    results: "group results",
  },
  rounds: {
    poolRoundLabel: (roundNumber: number, roundCount: number) =>
      `R${roundNumber} of ${roundCount}`,
    roundsPlayed: (played: number, roundCount: number) =>
      `Round ${played} of ${roundCount} played`,
  },
  sizing: {
    oneDayOverrun:
      "This runs past your finish time. Add a Court, cut Rounds, or take fewer Game teams.",
    createHeadingLead: "New tournament,",
    createHeadingTrail: "several Rounds",
    createHeading: "New tournament, several Rounds",
    createSubline:
      "Same as setting up a Friendly game, only it runs a few Rounds.",
    createFooter:
      "It shows up in Games like any other Game. You draw once the seats are full.",
    unevenPools:
      "Groups are uneven. Some Game teams play one more Match than others.",
    poolMatchesRow: "group Matches",
    matchesPerTeamRow: "Matches per Game team",
    eachMatchRow: "Each Match",
    courtsRow: "Courts",
    oneDayCallout: "The day",
    createPrimaryAction: "Create tournament",
    howLongItRuns: "How long it runs",
    oneDay: "One day",
    fewWeeks: "A few weeks",
    whoCanTakeASeat: "Who can take a seat",
    thisGroupOnly: "This Group only",
    anyoneWithTheLink: "Anyone with the link",
    howPeopleJoin: "How people join",
    aloneOrWithPartner: "Alone or with a partner",
    withPartnerOnly: "With a partner only",
    lastMatchFinish: (clock: string) =>
      `The last Match would finish at ${clock}.`,
    poolSizeClause: (count: number, size: number) =>
      plural("en", count, {
        one: `1 group of ${size}`,
        other: `{n} groups of ${size}`,
      }),
    eachTeamPlays: (matches: number) =>
      plural("en", matches, {
        one: "Each Game team plays 1 Match",
        other: "Each Game team plays {n} Matches",
      }),
    eachTeamPlaysRange: (min: number, max: number) =>
      `Each Game team plays ${min} to ${max} Matches`,
    unevenMatchesPerTeam: (max: number, min: number) =>
      `Game teams in a larger group play ${max} Matches; Game teams in a smaller group play ${min} Matches`,
    playersInPairs: (players: number) =>
      `${players} players in pairs. Two seats per team.`,
    courtCount: (n: number) =>
      plural("en", n, { one: "1 Court", other: "{n} Courts" }),
    roundMeets: {
      once: "Everyone meets once",
      partial: "Not everyone meets",
      twice: "Everyone meets twice",
      somePartialSecond: "Some meet twice",
    },
    roundsLabel: "Rounds",
    suggestedTag: "Suggested",
    useSuggested: (suggested: number) => `Use suggested (${suggested})`,
    roundCount: (n: number) =>
      plural("en", n, { one: "1 Round", other: "{n} Rounds" }),
    roundCountSuggested: (n: number) =>
      plural("en", n, {
        one: "1 Round · suggested",
        other: "{n} Rounds · suggested",
      }),
  },
  home: {
    eyebrowPrefix: "Friendly tournament",
    eyebrowKnockout: "Friendly tournament, knockout",
    eyebrowRounds: (n: number) =>
      plural("en", n, {
        one: "Friendly tournament, 1 Round",
        other: "Friendly tournament, {n} Rounds",
      }),
    yourTeam: "Your team",
    leftSeat: "Left seat",
    rightSeat: "Right seat",
    leftSeatOpen: "Left seat open",
    rightSeatOpen: "Right seat open",
    openPositionSr: "Open Position",
    youAreIn: "You are in.",
    drawRandomClause: "and it is random.",
    drawWhenFull: "The draw happens once they are full",
    drawsPoolsWhenFull: "draws the groups once they are full",
    drawsKnockoutWhenFull: "draws the knockout once they are full",
    closingLine:
      "Every Round is an ordinary Match. Scores are entered the usual way and the other team confirms.",
    organizerRow: "Organizer",
    groupRow: "Group",
    priceRow: "Price",
    countsForRating: "Counts for rating",
    youOweRow: "You owe",
    youOweAfterEachMatch: "after each Match",
    inviteAction: "Invite",
    inviteFromGroup: "Invite from a group",
    pricePerMatch: "per Match",
    teamsHeading: "Teams",
    takeSeat: "Take seat",
    yourTeamTag: "your team",
    seatsHeading: "Seats",
    leaveTheSeat: "Leave the seat",
    yourRoundsPredrawCaption: "Opponents after the draw",
    notDrawn: "Not drawn",
    standingsHeading: "Standings",
    endsCopy: "Each group has a winner. There is no overall champion.",
    knockoutOnlyLead: "Lose once and you are done for the day.",
    groupsThenKnockoutLead: "The best in each group carry on to the knockout.",
    poolsSegment: "groups",
    openTeamRow: "Open",
    fullCount: (full: number) => `${full} full`,
    withPositionOpen: (open: number) =>
      plural("en", open, {
        one: "1 with a Position open",
        other: "{n} with a Position open",
      }),
    fullAndOpen: (full: number, open: number) =>
      plural("en", open, {
        one: `${full} full, 1 with a Position open`,
        other: `${full} full, {n} with a Position open`,
      }),
    moreFullTeams: (count: number) =>
      plural("en", count, {
        one: "One more full team",
        other: `${COLLAPSE_COUNT_WORDS[count] ?? String(count)} more full teams`,
      }),
    seatsTaken: (taken: number, total: number) => `${taken} of ${total}`,
    seatsTakenSr: (taken: number, total: number) =>
      `${taken} of ${total} seats taken`,
    sizeLine: (teamCount: number, poolClause: string) =>
      `${gameTeamsWord(teamCount)}, ${poolClause}`,
    sizeLineThen: (teamCount: number, poolClause: string, start: string) =>
      `${gameTeamsWord(teamCount)}, ${poolClause}, then ${start}`,
    knockoutSizeLine: (teamCount: number, roundName: string) =>
      `${gameTeamsWord(teamCount)}, knockout from the ${roundName}`,
    youAreInDrawRandom: "You are in. The draw is random.",
    youAreInGroupDrawRandom: "You are in. The group draw is random.",
    youAreInDrawWhenFull: (teamCount: number) =>
      plural("en", teamCount, {
        one: "You are in. The draw happens once 1 Game team is full, and it is random.",
        other:
          "You are in. The draw happens once {n} Game teams are full, and it is random.",
      }),
    unseatedStatus: (
      seatsLeft: number,
      organizerFirstName: string | null,
      knockoutOnly: boolean,
    ) => {
      const seats =
        seatsLeft <= 0
          ? "No seats left."
          : plural("en", seatsLeft, {
              one: "1 seat left.",
              other: "{n} seats left.",
            });
      const drawer = organizerFirstName
        ? `${organizerFirstName} draws the ${knockoutOnly ? "knockout" : "groups"} once they are full`
        : "The draw happens once they are full";
      return `${seats} ${drawer}, and it is random.`;
    },
    startsAt: (day: string, venue: string) => `Starts ${day}, ${venue}`,
    starts: (day: string) => `Starts ${day}`,
    matchesPlayed: (n: number) =>
      plural("en", n, { one: "1 Match played", other: "{n} Matches played" }),
    roundResults: "Round results",
    roundNResults: (roundNumber: number) => `Round ${roundNumber} results`,
  },
  join: {
    takeASeatTitle: "Take a seat",
    sitWithSomeone: "Sit with someone",
    startATeam: "Start a team on your own",
    startATeamSubline:
      "Someone takes the other Position, or the Organizer pairs you",
    yourSeat: "Your seat",
    taken: "taken",
    roundsRow: "Rounds",
    drawRow: "Draw",
    drawRandom: "Random",
    pricePerPlayer: "per player",
    pricePerPlayerValue: (price: string) => `${price} per player`,
    introSuffix: "Same as joining a game, you just pick who you play with.",
    headerWithLead: (lead: string) =>
      `${lead}. Same as joining a game, you just pick who you play with.`,
    nameRoundsFrom: (name: string, rounds: string, day: string) =>
      `${name}, ${rounds} from ${day}`,
    nameRounds: (name: string, rounds: string) => `${name}, ${rounds}`,
    roundsFrom: (rounds: string, day: string) => `${rounds} from ${day}`,
    leaveSeatUntilPoolDraw: "You can leave the seat up until the group draw.",
    leaveSeatUntilKnockoutDraw: "You can leave the seat up until the draw.",
    leaveSpotConfirm: "Your spot can open for someone else.",
    partnerUnseatedConfirm: "Your partner is unseated too.",
    partnerVacantSideRace:
      "That side was taken while you were registering. Pick another partner if a side is still fully open.",
    partnerInviteLanding:
      "This tournament is with a partner only. Continue to pick a partner.",
    pickAPartner: "Pick a partner",
    sitWithCount: (halfOpen: number) =>
      plural("en", halfOpen, {
        one: "1 Game team with a Position open",
        other: "{n} Game teams with a Position open",
      }),
    playsLeft: "Plays left",
    playsRight: "Plays right",
    takeTheLeftSeat: "Take the Left seat",
    takeTheRightSeat: "Take the Right seat",
    seatExplanationOccupied: (
      occupant: string,
      occupiedSeat: string,
      freeSeat: string,
      roundCount: number | null,
    ) =>
      roundCount == null
        ? `${occupant} has the ${occupiedSeat} seat, so you take the ${freeSeat}.`
        : plural("en", roundCount, {
            one: `${occupant} has the ${occupiedSeat} seat, so you take the ${freeSeat} for all 1 Round.`,
            other: `${occupant} has the ${occupiedSeat} seat, so you take the ${freeSeat} for all {n} Rounds.`,
          }),
    seatExplanationOpen: (roundCount: number | null) =>
      roundCount == null
        ? "Both Positions are open. You pick Left or Right."
        : plural("en", roundCount, {
            one: "Both Positions are open. You pick Left or Right for all 1 Round.",
            other:
              "Both Positions are open. You pick Left or Right for all {n} Rounds.",
          }),
  },
  halfTeams: {
    organizerEyebrow: "ORGANIZER",
    mergeCompletesField: "Merging them completes the field.",
    takesEffect:
      "Takes effect immediately. Either of them can leave until the group draw.",
    takesEffectKnockout:
      "Takes effect immediately. Either of them can leave until the draw.",
    bannerTitle: "Two Game teams have one Position each",
    bannerAction: "Fix the seats",
    drawerTitle: "Two Half teams",
    previewLabel: "One Game team instead of two",
    primaryAction: "Put them in one Game team",
    dismissAction: "Leave both Positions open",
    swap: "Swap",
    mergeSeats: "Merge seats",
    manyTitle: "Game teams have one Position each",
    samePosition: "Both Users would play the same Position",
    openPositionSr: "Open Position",
    teamEyebrow: (index: string) => `TEAM ${index}`,
    occupantSubline: (seat: string, level: string) => `${seat}, ${level}`,
    leftOpen: "Left open",
    rightOpen: "Right open",
    openLeft: "Open left",
    openRight: "Open right",
    putTogether: (first: string, second: string) =>
      `Put ${first} and ${second} together.`,
    putTogetherFull: (first: string, second: string, teamCount: number) =>
      `Put ${first} and ${second} together and the ${teamCount} Game teams are full.`,
    putTogetherCompletes: (first: string, second: string) =>
      `Put ${first} and ${second} together. Merging them completes the field.`,
    drawerLead: (first: string, second: string) =>
      `${first} and ${second} each took a seat on their own. Put them together into one Game team.`,
    drawerLeadFull: (first: string, second: string, teamCount: number) =>
      `${first} and ${second} each took a seat on their own. Put them together and the ${teamCount} Game teams are full.`,
    drawerLeadCompletes: (first: string, second: string) =>
      `${first} and ${second} each took a seat on their own. Merging them completes the field.`,
    swapHint: (name: string, seat: string) =>
      `${name} keeps the ${seat} seat instead`,
    manyHalfTeams: (halfTeamCount: number) =>
      `${halfTeamCount} Game teams have one Position each.`,
  },
  card: {
    bandLabel: "Friendly tournament",
    matchBandLabel: "Your tournament",
    noTeamsYet: "No teams yet",
    knockoutBandMeta: "Knockout",
    fromDay: (day: string) => `From ${day}`,
    dayRange: (start: string, end: string) => `${start} to ${end}`,
    dayWithHours: (day: string, start: string, end: string) =>
      `${day}, ${start} – ${end}`,
    roundsThenKnockout: (rounds: string) => `${rounds}, then knockout`,
    openCount: (openTeams: number) => `${openTeams} open`,
    full: "Full",
    teamsKnockout: (teamCount: number) => `${teamsWord(teamCount)}, knockout`,
    teamsGroups: (teamCount: number, groupCount: number) =>
      `${teamsWord(teamCount)}, ${plural("en", groupCount, { one: "1 group", other: "{n} groups" })}`,
    teamsGroupsThen: (teamCount: number, groupCount: number, start: string) =>
      `${teamsWord(teamCount)}, ${plural("en", groupCount, { one: "1 group", other: "{n} groups" })}, then ${start}`,
    teamsIn: (registered: number, allowed: number) =>
      `${registered} of ${allowed} teams in`,
    teamsCount: (n: number) => teamsWord(n),
    joinAction: "Join tournament",
    joinWaitlistAction: "Join waitlist",
    invitePartnerAction: "Invite a partner",
    viewAction: "View tournament",
    openSeat: "open seat",
    pair: (first: string, second: string) => `${first} and ${second}`,
    roundN: (roundNumber: number) => `Round ${roundNumber}`,
    groupLower: (label: string) => `group ${label}`,
    group: (label: string) => `Group ${label}`,
    roundGroup: (roundNumber: number, label: string) =>
      `Round ${roundNumber}, group ${label}`,
    ordinalInGroup: (ordinal: string, label: string) =>
      `${ordinal} in group ${label}`,
    groupTeams: (label: string, teamCount: number) =>
      `Group ${label}, ${teamsWord(teamCount)}`,
    roundShort: (roundNumber: number) => `R${roundNumber}`,
    roundCancelled: (round: string) => `${round} cancelled`,
    drewRound: (round: string) => `Drew ${round}`,
    wonRound: (round: string) => `Won ${round}`,
    wonRoundScore: (round: string, score: string) => `Won ${round}, ${score}`,
    lostRound: (round: string) => `Lost ${round}`,
    lostRoundScore: (round: string, score: string) => `Lost ${round}, ${score}`,
    standingDrew: (round: string) => `drew ${round}`,
    standingWon: (round: string) => `won ${round}`,
    standingWonScore: (round: string, score: string) => `won ${round} ${score}`,
    standingLost: (round: string) => `lost ${round}`,
    standingLostScore: (round: string, score: string) =>
      `lost ${round} ${score}`,
    headline: (roundNumber: number, day: string) =>
      `Round ${roundNumber}, ${day}`,
    knockoutHeadline: (roundName: string, day: string) =>
      `${roundName}, ${day}`,
    winnerIsChampion: "Winner is Champion",
    winnerPlays: (roundName: string) => `Winner plays the ${roundName}`,
    thenKnockout: "Then the knockout",
    lastRound: "Last round",
    thenMoreRounds: (left: number) =>
      plural("en", left, {
        one: "Then 1 more round",
        other: "Then {n} more rounds",
      }),
    playingNow: "Playing now",
    addResults: "Add results",
    viewKnockout: "View knockout",
    viewGroup: "View group",
  },
  details: {
    fallbackName: "Tournament",
    minutes: (n: number) => `${n} min`,
    pricePerMatchValue: (price: string) => `${price} per Match`,
    youOweValue: (amount: string) => `${amount}, after each Match`,
    notPlayed: "Not played",
    open: "Open",
    round: "Round",
    roundN: (roundNumber: number) => `Round ${roundNumber}`,
    roundDay: (round: string, day: string) => `${round}, ${day}`,
    takeSeatOn: (seat: string, team: string) =>
      `Take the ${seat} seat on ${team}`,
    openSeatOn: (seat: string, team: string) => `Open ${seat} seat on ${team}`,
  },
};
