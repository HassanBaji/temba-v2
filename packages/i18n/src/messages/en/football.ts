import { plural } from "../../plural";

export const football = {
  status: {
    cancelled: "Cancelled",
    played: "Played",
    playedScoreMissing: "Played, score missing",
    teamsSet: "Teams set",
    teamsSetOn: (weekday: string) => `Teams set, ${weekday}`,
    upcoming: "Upcoming",
    upcomingOn: (weekday: string) => `Upcoming, ${weekday}`,
  },
  positionCode: {
    gk: "GK",
    def: "DEF",
    mid: "MID",
    fwd: "FWD",
  },
  lineup: {
    positions: {
      def: "Defender",
      mid: "Midfield",
      fwd: "Forward",
    },
    keeperSeatsTaken: "both keeper seats taken",
    keeperSeatsOpen: (left: number, total: number) =>
      `${left} of ${total} keeper seats open`,
    keepersIn: (n: number) => `${n} keepers in`,
    oneKeeperOneMoreNeeded: "1 keeper, one more needed",
    noKeeperYet: "no keeper yet",
    positionCountsLine: (def: number, mid: number, fwd: number, gk: number) =>
      `In so far: ${def} DEF, ${mid} MID, ${fwd} FWD, ${gk} GK.`,
    bibs: {
      black: "Black",
      white: "White",
      red: "Red",
      navy: "Dark blue",
      sky: "Light blue",
      green: "Green",
      yellow: "Yellow",
      orange: "Orange",
      purple: "Purple",
      pink: "Pink",
      grey: "Grey",
    },
    teamsMethod: {
      manual: "Set by organizer",
      level: "Balanced by level",
      captain_pick: "Captain pick",
    },
    nobodyInYet: "Nobody is in yet.",
    stillToPlace: (n: number) => `${n} still to place.`,
    bothTeamsNeedPlayers: "Both teams need players.",
    sideHasExtra: (team: string, extra: number) =>
      `${team} has ${extra} extra. Move one across before publishing.`,
    draw: "Draw.",
    winBy: (team: string, margin: number) => `${team} win by ${margin}.`,
    scorersExceed: (team: string, score: number) =>
      `${team} scorers add up to more than ${score}.`,
  },
  board: {
    tileName: (first: string, initial: string) => `${first} ${initial}.`,
    outfieldLine: (inCount: number, seats: number) =>
      `${inCount} of ${seats} in`,
    keeperNoteClaimed: (perGame: number, name: string) =>
      `One keeper per team, so ${perGame} per game. ${name} has the first.`,
    keeperNoteUnclaimed: (perGame: number) =>
      `One keeper per team, so ${perGame} per game. Nobody has claimed one yet.`,
    keeperSeatsBothTaken: "both taken",
    keeperSeatsLeft: (n: number) =>
      plural("en", n, { one: "1 seat left", other: "{n} seats left" }),
    seatKeeper: "Keeper",
    seatPlayerPrefers: (code: string) => `Player, prefers ${code}`,
    joinAsKeeper: "Join as keeper",
    joinAsPosition: (code: string) => `Join as ${code}`,
    joinWithPrice: (lead: string, price: string) => `${lead}, ${price}`,
    seatsOpen: (n: number) =>
      plural("en", n, { one: "1 seat open", other: "{n} seats open" }),
    everyonePlaced: (
      team1: string,
      average1: string,
      team2: string,
      average2: string,
    ) => `Everyone placed. ${team1} avg ${average1}, ${team2} avg ${average2}.`,
    keeperCount: (n: number) =>
      plural("en", n, { one: "1 keeper", other: "{n} keepers" }),
    goalsNote:
      "Goals count toward player form, not rating. Skip if nobody kept track.",
    goalsNamed: (
      named1: number,
      score1: number,
      team1: string,
      named2: number,
      score2: number,
      team2: string,
    ) =>
      `${named1} of ${score1} ${team1} goals and ${named2} of ${score2} ${team2} goals named.`,
    bothSidesConfirmed: "Both sides confirmed.",
    confirmedByOrganizer: "Confirmed by the Organizer.",
    waitingOrganizerFor: (team: string) =>
      `the Organizer to confirm for ${team}`,
    waitingPlayerFrom: (team: string) => `one player from ${team} to confirm`,
    waitingFor: (who: string) => `Waiting for ${who}.`,
    waitingForBoth: (first: string, second: string) =>
      `Waiting for ${first} and ${second}.`,
    waitingOrganizerBoth:
      "Waiting for the Organizer to confirm for both sides.",
    waitingEachSide: "Waiting for one player from each side to confirm.",
    youPlayInAs: (team: string, code: string) =>
      `You play in ${team} as ${code}.`,
    youPlayIn: (team: string) => `You play in ${team}.`,
  },
  details: {
    priceLabel: "Price",
    durationLabel: "Duration",
    minutesShort: (n: number) => `${n}m`,
    waitlistedTitle: "You're on the Waitlist",
    registeredTitle: "You're in",
    joinTitle: "Join this Game",
    fullTitle: "This Game is full",
    joinWaitlistAction: "Join waitlist",
    fallbackTitle: "Game",
  },
  hub: {
    sections: {
      result: {
        title: "Needs your confirmation",
        meta: "score in or missing",
      },
      open: { title: "Seats open", meta: "teams not set" },
      teams: { title: "Teams set", meta: "see your team" },
      full: { title: "Full", meta: "waitlist open" },
    },
    card: {
      waitingForPlayers: "Waiting for players",
      playersOf: (taken: number, seats: number) =>
        plural("en", seats, {
          one: `${taken} of 1 player`,
          other: `${taken} of {n} players`,
        }),
      openSpots: (n: number) =>
        plural("en", n, {
          one: ", 1 open spot",
          other: ", {n} open spots",
        }),
    },
  },
  selfPlacement: {
    beginner: {
      label: "Beginner",
      description: "Still finding your feet. Now and then.",
    },
    casual: {
      label: "Casual",
      description: "Pick-up games, holds a position. 1–2× a week.",
    },
    competitive: {
      label: "Competitive",
      description:
        "Plays local tournaments, lasts the full match. 2–3× a week.",
    },
    pro: {
      label: "Pro",
      description:
        "Club or academy background, dictates the game. Several times a week.",
    },
  },
  sizeLine: (sideSize: string, players: number) =>
    `${sideSize} · ${players} players`,
  draft: {
    status: "Draft, not published",
    statusCaptain: (team: string) => `Draft, you captain ${team}`,
    tag: "DRAFT",
    title: "Draft line-up",
    savedAt: (day: string, time: string) => `saved ${day} ${time}`,
    readyToPublish: "Everyone is placed. Publish when you're ready.",
    visibleToGroupAdmins:
      "Players don't see these teams yet. Only you and the group's admins do.",
    visibleToYou: "Players don't see these teams yet. Only you do.",
    visibleToGroupAdminsAndCaptains:
      "Players don't see these teams yet. Only you, the group's admins and the captains do.",
    visibleToYouAndCaptains:
      "Players don't see these teams yet. Only you and the captains do.",
    noCaptainsGroup:
      "No captains picked, so only you and the group's admins can see this draft.",
    noCaptainsYou: "No captains picked, so only you can see this draft.",
    captainApproved:
      "The captain approved their team. Publish when you're ready.",
    bothCaptainsApproved:
      "Both captains approved their team. Publish when you're ready.",
    captainsApprovedOf: (approved: number, total: number) =>
      plural("en", total, {
        one: `${approved} of 1 captain has approved. You can publish without waiting.`,
        other: `${approved} of {n} captains have approved. You can publish without waiting.`,
      }),
    publishAnyTime:
      "You can publish without waiting. Moving a player in or out of a team after its captain approved asks that captain again.",
    answer: {
      approved: "Approved",
      change_asked: "Change asked",
      waiting: "Waiting",
      none: "nobody to ask",
    },
    note: (note: string) => `“${note}”`,
    captainView: {
      from: (name: string) => `A draft from ${name}.`,
      bothCaptainsAndOrganizers:
        "Only the two captains and the organizers can see it.",
      bothCaptainsAndOrganizer:
        "Only the two captains and the organizer can see it.",
      youAndOrganizers: "Only you and the organizers can see it.",
      youAndOrganizer: "Only you and the organizer can see it.",
    },
    captainPanel: {
      yourTeam: (team: string) => `Your team, ${team}`,
      playersAvg: (n: number, avg: string) =>
        plural("en", n, {
          one: `1 player, avg ${avg}`,
          other: `{n} players, avg ${avg}`,
        }),
      ask: (organizer: string) =>
        `Happy with this team? Approve and ${organizer} knows your team is good to go. Nothing is final until it is published.`,
      approve: "Approve my team",
      askChange: "Ask for a change",
      approvedTitle: (team: string) => `You approved ${team}`,
      approvedBody: (organizer: string) => `${organizer} publishes when ready`,
      changeTitle: "You asked for a change",
      changeBody: (organizer: string) =>
        `${organizer} sees your note on the draft`,
      undo: "Undo",
      otherTeam: (team: string, captain: string | null) =>
        captain ? `${team}, captain ${captain}` : `${team}, no captain`,
      ownTeamOnly: (other: string) =>
        `You approve your own team only. You can see ${other}, but its captain answers for it.`,
      noteSheet: {
        title: "Ask for a change",
        body: (organizer: string) =>
          `${organizer} sees your note on the draft. Your team stays as it is until they change it.`,
        label: "Your note",
        placeholder: "Who should swap, and why?",
        send: "Send",
        cancel: "Cancel",
      },
    },
    notPublished: {
      title: "Teams aren't published yet",
      body: "The organizer is making them. You'll see your team and bib colour here as soon as they are published.",
      value: "Not published",
    },
  },
  captains: {
    title: "Captains",
    optional: "optional, one per team",
    add: "Add a captain",
    sheetBody:
      "A captain sees the draft and can approve their team before you publish. They still pick the starters on the day.",
    noCaptainFor: (team: string) => `No captain for ${team}`,
    noneOnTeam:
      "Nobody on this team can be a captain yet. Guest players and players without an account can't.",
    done: "Done",
    badge: "C",
    spoken: "Captain",
    chipSpoken: (team: string, captain: string | null) =>
      captain ? `Captain for ${team}: ${captain}` : `Add a captain for ${team}`,
    named: (name: string) => `Captain ${name}`,
    none: "No captain picked",
  },
  pick: {
    setup: {
      intro:
        "Two captains build the teams themselves, one pick at a time, in a room they share.",
      captainsTitle: "Captains",
      captainsHint: "one for each side",
      captainChip: (name: string, team: string) => `${name}, ${team}`,
      addCaptain: (team: string) => `Captain for ${team}`,
      chipSpoken: (team: string, captain: string | null) =>
        captain
          ? `Captain for ${team}: ${captain}`
          : `Pick a captain for ${team}`,
      sheetBody:
        "The two captains pick the teams in turn. Anyone on the roster with an account can be one.",
      noneOnRoster:
        "Nobody here can be a captain yet. Guest players and players without an account can't.",
      firstPickTitle: "First pick",
      toss: "Toss",
      tossNote:
        "The toss happens in the room once both captains are in. After that they take one pick each, in turn.",
      sideNote: (team: string) =>
        `${team} picks first. After that they take one pick each, in turn.`,
      toBePicked: "To be picked",
      open: "Open the pick room",
      told: (first: string, second: string) =>
        `${first} and ${second} are told. The pick starts when both are in.`,
      needsCaptains:
        "Pick a captain for each side. They are told when the room opens.",
      replaceTitle: "Replace the saved draft?",
      replaceBody:
        "Opening the pick room replaces the draft saved for this game. The captains pick the teams from the start.",
      replaceConfirm: "Open the pick room",
      cancel: "Cancel",
    },
    title: "Captain pick",
    introCaptain: (other: string) =>
      `You and ${other} pick the teams between you. It starts when you are both in the room.`,
    introOrganizer: (first: string, second: string) =>
      `${first} and ${second} pick the teams between them. It starts when both are in the room, or when you start it.`,
    inRoom: "In the room",
    notHereYet: "Not here yet",
    presenceSpoken: (team: string, name: string, presence: string) =>
      `${team}, ${name}: ${presence}`,
    firstPickLabel: "First pick",
    tossedWhenBothIn: "Tossed when both are in",
    wonTheToss: (team: string) => `${team} won the toss`,
    picksFirst: (team: string) => `${team} picks first`,
    orderLabel: "Order",
    orderValue: "One each, in turn",
    toPickLabel: "To pick",
    poolEach: (n: number, each: number) =>
      `${plural("en", n, { one: "1 player", other: "{n} players" })}, ${each} each`,
    poolSplit: (n: number, more: number, fewer: number) =>
      `${plural("en", n, { one: "1 player", other: "{n} players" })}, ${more} and ${fewer}`,
    progress: (next: number, total: number) => `Pick ${next} of ${total}`,
    poolTitle: "Pool",
    poolHead: (n: number) => `${n}, best level first`,
    andMore: (n: number) =>
      plural("en", n, { one: "and 1 more", other: "and {n} more" }),
    waitingFor: (name: string) => `Waiting for ${name}`,
    waitingForBoth: "Waiting for both captains",
    remind: (name: string) => `Remind ${name}`,
    reminded: (name: string) => `${name} is reminded`,
    remindedRecently: (name: string) =>
      `${name} was reminded in the last 5 minutes`,
    startNow: "Start the pick now",
    startNowHint:
      "Start without waiting. You can pick for a captain who isn't here.",
    stop: "Stop the pick",
    stopHint: "Keep what is picked and finish the teams yourself",
    liveTitle: "The pick has started",
    doneTitle: "Teams are picked",
    doneBody:
      "They go to the organizer as a draft, with both captains already agreed.",
    seeTheDraft: "See the draft",
    stopped: "The organizer stopped the pick",
    closedTitle: "This pick room is closed",
    closedBody:
      "Only the two captains and the organizers can open it, and only while the pick runs.",
    backToGame: "Back to the game",
    loading: "Loading the pick room",
    loadError: "The pick room could not be loaded",
    inProgress: {
      title: "Captain pick in progress",
      waiting: "The room is open. The pick starts when both captains are in.",
      live: "The captains are picking the teams now.",
      open: "Open the pick room",
    },
  },
  draftShare: {
    title: "Share draft",
    bothTeams: "Both teams",
    typeLine: (sideSize: string | null) =>
      sideSize ? `DRAFT / FOOTBALL / ${sideSize}` : "DRAFT / FOOTBALL",
    captain: (name: string) => `CAPTAIN ${name}`,
    noCaptain: "NO CAPTAIN",
    players: (n: number) =>
      plural("en", n, { one: "1 PLAYER", other: "{n} PLAYERS" }),
    sideLine: (captain: string, players: string) => `${captain} / ${players}`,
    teamLabel: (team: string) => `TEAM ${team}`,
    against: (other: string, sideSize: number | null) =>
      sideSize
        ? `against ${other}, ${plural("en", sideSize, { one: "1 starts", other: "{n} start" })}, the captain picks them`
        : `against ${other}`,
    andMore: (n: number) =>
      plural("en", n, { one: "and 1 more", other: "and {n} more" }),
    stamp: "DRAFT, NOT FINAL",
    noteBothGroup:
      "Both teams on one image, stamped as a draft. In Temba only organizers, admins and captains see it; an image goes wherever you send it.",
    noteBoth:
      "Both teams on one image, stamped as a draft. In Temba only organizers and captains see it; an image goes wherever you send it.",
    noteOne: (team: string) =>
      `Only ${team}, for that team's chat. Stamped as a draft; an image goes wherever you send it.`,
    message: (game: string | null, when: string | null) => {
      const subject = [game, when].filter(Boolean).join(", ");
      return subject
        ? `Draft teams for ${subject}. Not final.`
        : "Draft teams. Not final.";
    },
    loading: "Loading the draft",
    loadError: "The draft could not be loaded",
    empty: {
      title: "No draft to share",
      body: "Only the organizers and the captains can share a draft, and only until the teams are published.",
    },
  },
  errors: {
    notFootball: "Only a football Game has teams and a Score",
    roleOnFootball: "Only a football Game takes a role and position",
    friendlyOnly: "Football Games are Friendly games",
    noLevelRange:
      "Only a football Game that counts for Temba Level has a Level range",
    keeperSeatsTaken: "Both keeper seats are taken",
    oneTeamOnly: "A player can be on one team only",
    registeredOnly: "Only registered players can be placed on a team",
    differentBibs: "Pick two different bib colours",
    teamsFixed: "The score is in, so the teams are fixed",
    publishTeamsFirst: "Publish the teams before entering a score",
    scoreLocked: "This score is confirmed; it can no longer change",
    scoreOpensAtKickOff: "The score opens at kick-off",
    scoreOrganizerOrPlayers:
      "Only the organizer or players on the teams can enter the score",
    scorerOnce: "Name each scorer once",
    scorersOnTeams: "Scorers must be on one of the teams",
    draftNeedsPlayer: "Place at least one player to save a draft",
    draftChanged: "The draft changed. Open it again.",
    draftTeamsPublished:
      "The teams are published, so there is no draft to save",
    captainOnSide: "A captain must be a player on their team",
    captainNeedsAccount:
      "A guest player or a player without an account can't be a captain",
    draftNotCaptain: "Only a team's captain can answer for it",
    draftNoteLength: (max: number) => `Write a note of 1 to ${max} characters`,
    pickNeedsPlayers: (min: number) =>
      `Captain pick needs at least ${min} players`,
    pickNeedsCaptains: "Pick a captain for each side",
    pickCaptainsDiffer: "Pick two different captains",
    pickRunning: "A captain pick is in progress. Stop it first.",
    pickNotWaiting: "The pick has already started",
    pickNotRunning: "No captain pick is running",
    pickRemindOtherSide: "You can remind the other captain only",
  },
};
