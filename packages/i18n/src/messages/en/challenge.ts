import { plural } from "../../plural";

export const challenge = {
  segments: {
    label: "Challenges sections",
    open: "Open",
    mine: "Mine",
    teams: "Teams",
    withCount: (segment: string, n: number) => `${segment}, ${n}`,
  },
  tab: {
    vs: "vs",
    filterAll: "All",
    openFootnote:
      "The hatched seats are the opponent that hasn’t been found yet. Accepting proposes a time and venue; the posting team confirms.",
    openFor: (n: number) =>
      plural("en", n, { one: "Open for 1 day", other: "Open for {n} days" }),
    days: {
      weekdays: "Weekday",
      weekends: "Weekend",
      line: (days: string, timings: string) => `${days} ${timings}`,
      timings: {
        morning: "mornings",
        afternoon: "afternoons",
        evening: "evenings",
      },
    },
    sports: {
      padel: "padel",
      football: "football",
    },
    mine: {
      waiting: "Waiting on you",
      expiresIn: (hours: number) => `proposal expires in ${hours}h`,
      expiresWithinHour: "proposal expires within the hour",
      accepted: (team: string) => `${team} accepted your challenge`,
      teamSport: (team: string, sport: string) => `${team}, ${sport}`,
      proposed: "Proposed",
      venue: "Venue",
      postedTitle: "Posted",
      postedHint: "waiting for a team",
      pendingTitle: "Proposed",
      pendingHint: "waiting on them",
      acceptedTitle: "Accepted",
      acceptedHint: "now games",
      postedLine: (when: string, venues: string, wants: string) =>
        `${when}, ${venues}. ${wants}`,
      proposalCount: (n: number) =>
        plural("en", n, { one: "1 proposal", other: "{n} proposals" }),
      versus: (team: string, opponent: string) => `${team} vs ${opponent}`,
      gameLine: (when: string, venue: string) => `${when}, ${venue}`,
      viewGame: "View game",
      viewGameA11y: (title: string) => `View game, ${title}`,
      played: (day: string) => `Played ${day}`,
      playedWith: (day: string, result: string) => `Played ${day}, ${result}`,
      won: (score: string) => `won ${score}`,
      lost: (score: string) => `lost ${score}`,
      drew: (score: string) => `drew ${score}`,
    },
    teams: {
      record: "record",
      you: "You",
      pair: (first: string, second: string) => `${first} and ${second}`,
      rivals: (n: number) =>
        plural("en", n, { one: "1 rival", other: "{n} rivals" }),
      invitedYou: (name: string) => `${name} invited you`,
      seatsOpen: (n: number) =>
        plural("en", n, { one: "1 seat open", other: "{n} seats open" }),
      invitedLine: (invited: string, seats: string) => `${invited}, ${seats}`,
      pending: (n: number) =>
        plural("en", n, { one: "1 pending", other: "{n} pending" }),
      footnote:
        "Teams are yours, not a group’s. A group can have a team, but the team keeps its own record and rivals.",
      emptyTitle: "You don’t have a team yet",
      emptyCopy:
        "A team posts and accepts challenges, keeps a record, and collects rivals. Padel teams are two players; football teams are five to seven.",
      untilThen: "Until then",
      browse:
        "You can browse open challenges. Accepting one asks you to make a team first.",
      invites: "Invites from other players’ teams show up here.",
    },
  },
  open: {
    emptyTitle: "No open challenges yet",
    emptyCopy:
      "Teams post a challenge here when they want an opponent: the level they want, where and when they like to play.",
    untilThen: "Until then, get your Team ready.",
    filteredEmptyTitle: "No challenges match",
    filteredEmptyCopy: "Try another sport, level, area or day.",
    errorTitle: "Challenges could not be loaded",
  },
  mine: {
    emptyTitle: "Nothing waiting on you",
    emptyCopy:
      "Your Teams' challenges, the proposals you send and your Challenge Games show here.",
    untilThen: "Until then, make a Team or fill your Roster.",
    postedTitle: "Your challenges",
    waitingTitle: "Waiting on you",
    pendingTitle: "Your proposals",
    acceptedTitle: "Accepted, now games",
    playedTitle: "Played",
    proposedFor: (team: string) => `Proposed to ${team}`,
    acceptedLine: (team: string, opponent: string) => `${team} v ${opponent}`,
    open: (title: string) => `Open ${title}`,
    nameYourSquad: "Name your squad",
    cancelled: "Game cancelled",
    setScore: (us: number, them: number) => `${us}–${them}`,
    scoreSeparator: ", ",
  },
  goToTeams: "See your teams",
  marker: "Challenge",
  teams: {
    invitedTitle: "Invited to",
    invitedBy: (name: string) => `Invited by ${name}`,
    join: "Join",
    joinA11y: (team: string) => `Join ${team}`,
    createTeam: "Create team",
    emptyTitle: "No team yet",
    emptyCopy:
      "Teams are yours, not a group's. Make one to post challenges and keep a record.",
    createFirst: "Create a team",
    createFromGroup: (group: string) => `Create from ${group}`,
    lineSeparator: ". ",
    record: "W–L",
    recordWithDraws: "W–D–L",
  },
  weekdays: {
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
  },
  weekdayNames: {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  },
  timings: {
    morning: "Mornings",
    afternoon: "Afternoons",
    evening: "Evenings",
  },
  timingHints: {
    morning: "Before noon",
    afternoon: "Noon to 6 PM",
    evening: "After 6 PM",
  },
  when: {
    anyDay: "Any day",
    anyTime: "Any time",
    weekdays: "Weekdays",
    weekends: "Weekends",
    listSeparator: ", ",
    line: (days: string, timings: string) => `${days} · ${timings}`,
    slots: (list: string) => `Or ${list}`,
  },
  card: {
    partSeparator: ", ",
    avg: (level: string) => `avg ${level}`,
    sportLine: (parts: string, wants: string) => `${parts}. ${wants}`,
    wants: (range: string) => `Wants ${range}`,
    anyLevel: "Open to any level",
    anyVenue: "Any venue",
    proposals: (n: number) =>
      n === 0
        ? "No proposals yet"
        : plural("en", n, { one: "1 proposal", other: "{n} proposals" }),
    daysLeft: (n: number) =>
      n === 0
        ? "Last day"
        : plural("en", n, { one: "1 day left", other: "{n} days left" }),
    proposalsLine: (proposals: string, days: string) => `${proposals}, ${days}`,
    opponentSeats: "Opponent wanted",
    open: (team: string) => `Open ${team}'s challenge`,
    nudged: (team: string) =>
      `A rematch, sent straight to ${team}. It's on the open board too.`,
  },
  ineligible: {
    noTeam: {
      padel: "You need a padel Team to propose",
      football: "You need a football Team to propose",
    },
    rosterShort: (side: string) => `Your Roster is short for ${side}`,
    padelIncomplete: "Your padel Team needs both players",
    levelOutside: "Your Team Level is outside the level wanted",
    noLevel: "Your Team has no rated player yet",
    sharesMember: "Your Team shares a player with this one",
    own: "Your Team's challenge",
  },
  filters: {
    label: "Filter challenges",
    sport: "Sport",
    level: "Level",
    area: "Area",
    day: "Day",
    any: "Any",
    clear: "Clear filters",
    chip: (name: string, value: string) => `${name}: ${value}`,
  },
  post: {
    cta: "Post a challenge",
    title: "New challenge",
    noTeamsTitle: "None of your Teams can post right now",
    noTeamsCopy:
      "A padel Team needs both players, a football Team five on the Roster, and a Team can have one open challenge at a time.",
    team: "Team",
    teamHint: "sport comes from the team",
    you: "you",
    teamPair: (first: string, second: string) => `${first} and ${second}`,
    teamFootball: (sportAndLevel: string, roster: string) =>
      `${sportAndLevel}. ${roster}`,
    format: "Format",
    rosterOf: (n: number, max: number) => `roster ${n} of ${max}`,
    formatNeeds: (side: string, n: number) =>
      plural("en", n, {
        one: `${side} needs 1 on the Roster`,
        other: `${side} needs {n} on the Roster`,
      }),
    formatList: (sideSizes: readonly number[]) => {
      const sizes = sideSizes.map(String);
      const last = sizes.pop();
      const list = sizes.length > 0 ? `${sizes.join(", ")} and ${last}` : last;
      return `${list}-a-side`;
    },
    formatRosterAll: (team: string, roster: string) =>
      `${team} has ${roster}, enough for any format.`,
    formatRosterSome: (team: string, roster: string, formats: string) =>
      `${team} has ${roster}, enough for ${formats}.`,
    formatSquad: (side: number, reserves: number) =>
      `Squads of ${side} plus up to ${reserves} reserves are named by both captains after the challenge is confirmed.`,
    formatSquadAny: (reserves: number) =>
      `Squads of the format plus up to ${reserves} reserves are named by both captains after the challenge is confirmed.`,
    venues: "Preferred venues",
    venuesPicked: (n: number) =>
      plural("en", n, { one: "1 picked", other: "{n} picked" }),
    venuesUpTo: (max: number) => `up to ${max}`,
    anywhere: "Anywhere",
    anywhereIn: (area: string) => `Anywhere in ${area}`,
    days: "Days",
    timings: "Timings",
    timingsHint: "or add exact slots",
    timingChips: {
      morning: "Morning",
      afternoon: "Afternoon",
      evening: "Evening",
    },
    slotLabel: (day: string, time: string) => `${day} ${time}`,
    slotTitle: "Add a slot",
    slotDay: "Day",
    slotTime: "Start",
    addSlot: "Add slot",
    removeSlot: (slot: string) => `Remove ${slot}`,
    level: "Level wanted",
    anyLevel: "Any level",
    note: "A line about you",
    noteShown: "Shown on the card",
    noteCount: (n: number, max: number) => `${n} / ${max}`,
    review: "Review",
    edit: "Edit",
    submit: "Post challenge",
    posted: "Challenge posted",
    errorTitle: "Your Teams could not be loaded",
  },
  review: {
    title: "Review",
    cardTitle: "How it looks on the board",
    rows: {
      team: "Team",
      format: "Format",
      visibleTo: "Visible to",
      openFor: "Open for",
      proposals: "Proposals",
    },
    team: (team: string, roster: string) => `${team}, ${roster}`,
    format: (side: string, squad: number) =>
      `${side}. Squads of up to ${squad} named after confirmation`,
    visibleTeams: {
      padel: "Padel teams",
      football: "Football teams",
    },
    visibleEvery: {
      padel: "Every padel team on Temba",
      football: "Every football team on Temba",
    },
    inArea: (area: string) => `in ${area}`,
    openFor: (days: number) =>
      plural("en", days, {
        one: "1 day, then it expires",
        other: "{n} days, then it expires",
      }),
    proposals: "You confirm one; the rest are told",
    nudge: "Also send it straight to a team you've played?",
    nudgeBefore: "Also send it straight to a team you've played? ",
    nudgeAfter: " get a nudge and it stays on the open board.",
    nudgeTeams: "Teams you've played",
  },
  errors: {
    pickTeam: "Pick a Team",
    formatRequired: "Pick a Format: 5, 6 or 7-a-side",
    formatOnPadel: "Padel challenges have no Format",
    formatUnknown: "A Format is 5, 6 or 7-a-side",
    formatRoster: (side: string, count: number) =>
      plural("en", count, {
        one: `${side} needs that many on the Roster. Yours has 1.`,
        other: `${side} needs that many on the Roster. Yours has {n}.`,
      }),
    padelRoster: "A padel Team needs both players to post",
    noteTooLong: (max: number) => `Keep the line to ${max} characters`,
    venueSport: {
      padel: "Pick venues with a padel court",
      football: "Pick venues with a football pitch",
    },
    tooManyVenues: (max: number) => `Pick up to ${max} venues`,
    tooManySlots: (max: number) => `Add up to ${max} slots`,
    slotPast: "Exact slots must be in the future",
    alreadyOpen:
      "This Team already has an open challenge. Withdraw it to post another.",
    notActing: "Only someone who acts for the Team can do that",
    nudgeOwn: "Send it to another Team, not your own",
    nudgeSport: "Send it to a Team of the same sport",
    nudgeNotPlayed: "You can only send it straight to a Team you've played",
    notOpen: "This challenge is no longer open",
    pickVenue: "Pick a venue",
    pickSlot: "Pick a time",
    slotTooSoon: "Pick a time at least an hour ahead",
    slotTooFar: (days: number) => `Pick a time within ${days} days`,
    courtVenue: "That court is not at this venue, or not for this sport",
    alreadyProposed:
      "Your Team already has a pending proposal here. Change it instead.",
    proposalNotFound: "Proposal not found",
    proposalNotPending: "This proposal is no longer pending",
    confirmOwnProposal:
      "You act for both Teams, so the other Team has to confirm this proposal",
    changeLimit: (max: number) =>
      plural("en", max, {
        one: "A proposal can be changed once. Withdraw it and send a new one.",
        other:
          "A proposal can be changed {n} times. Withdraw it and send a new one.",
      }),
    setByChallenge: "Teams are set by the challenge; captains name the squads",
    nameBothSquads: "Name both squads first",
    squad: {
      notFootball: "Only a football Challenge Game has squads to name",
      padel: "Both players are the squad on padel",
      notOnGame: "That Team is not on this Game",
      cancelled: "This Game was cancelled",
      locked: "The squads are locked once the score is entered",
      duplicate: "Name each player once",
      tooMany: (seats: number) =>
        `Name up to ${seats}: the side plus three reserves`,
      notOnRoster: "Everyone named must be on the Team's Roster",
      otherSide: (name: string) =>
        `${name} is already named for the other side`,
    },
    recheck: {
      rosterShort: (team: string, side: string) =>
        `${team}'s Roster is short for ${side}`,
      padelIncomplete: (team: string) => `${team} needs both players`,
      levelOutside: (team: string) =>
        `${team}'s Team Level is outside the level wanted`,
      noLevel: (team: string) => `${team} has no rated player yet`,
      sharesMember: "The two Teams share a player",
      tooSoon: "This proposal starts within the hour. Ask for another time.",
    },
  },
  proposal: {
    sent: (day: string) => `Sent ${day}`,
    expiresIn: (hours: number) => `Expires in ${hours}h`,
    expiresWithinHour: "Expires within the hour",
    expired: "Expired",
    at: (venue: string, court: string) => `${venue}, ${court}`,
    price: (amount: string) => `${amount} each`,
    from: (team: string) => `From ${team}`,
    waitingOn: (team: string) => `Waiting on ${team} to confirm`,
    anotherTime: "Another time",
    anotherTimeA11y: (team: string) => `Another time for ${team}`,
    declineConfirm: {
      title: "Ask for another time?",
      description:
        "The proposal is declined and their Team can send a new one.",
      confirm: "Another time",
    },
    declined: "Proposal declined",
    change: "Change proposal",
    withdraw: "Withdraw proposal",
    withdrawConfirm: {
      title: "Withdraw your proposal?",
      description: "Your Team can propose again while the challenge is open.",
      confirm: "Withdraw",
    },
    withdrawn: "Proposal withdrawn",
    queueTitle: "Proposals",
    pendingTitle: "Your proposal",
    confirm: "Confirm, make it a game",
    confirmA11y: (team: string) => `Confirm ${team}'s proposal`,
    confirmSheet: {
      title: "Make it a game?",
      description:
        "The Game is created with both Teams on it. The other proposals are passed over and told.",
      descriptionFootball:
        "The Game is created with both Teams on it and counts for Temba Level once someone from each Team confirms the score. The other proposals are passed over and told.",
      confirm: "Confirm, make it a game",
    },
    confirmed: "It's a game",
  },
  accept: {
    cta: "Accept",
    ctaA11y: (team: string) => `Accept ${team}'s challenge`,
    title: "Accept the challenge",
    changeTitle: "Change your proposal",
    description: "Accepting is time and venue, nothing else.",
    team: "Your team",
    venue: "Venue",
    preferred: "Preferred",
    preferredVenue: (venue: string) => `${venue}, preferred`,
    court: "Court",
    courtHint: "Optional. Leave empty if you have not booked one.",
    anyCourt: "No court yet",
    day: "Day",
    time: "Start",
    noSlots:
      "No suggested time is left in the next two weeks. Ask the Team to post again.",
    price: "Price per player",
    priceHint: "Optional. Shown on the Game as the cost each.",
    pricePlaceholder: "1.500",
    send: (team: string) => `Send proposal to ${team}`,
    sent: "Proposal sent",
    changed: "Proposal changed",
    footer: "They have 48 hours to confirm.",
    errorTitle: "Your options could not be loaded",
    noTeams: "None of your Teams can propose on this challenge",
  },
  detail: {
    title: "Challenge",
    record: "Record",
    when: "When",
    where: "Where",
    level: "Level wanted",
    note: "From the team",
    postedBy: (name: string, day: string) => `Posted by ${name}, ${day}`,
    proposeWith: (teams: string) => `You can propose with ${teams}`,
    closed: {
      expired: "This challenge expired",
      withdrawn: "This challenge was withdrawn",
      confirmed: "This challenge is confirmed",
    },
    withdraw: "Withdraw challenge",
    withdrawConfirm: {
      title: "Withdraw this challenge?",
      description:
        "It leaves the open board. You can post a new one at any time.",
      confirm: "Withdraw",
    },
    withdrawn: "Challenge withdrawn",
    game: {
      title: "The game",
      when: "Kick-off",
      proposedConfirmed: (proposer: string, confirmer: string) =>
        `Proposed by ${proposer}, confirmed by ${confirmer}`,
      pitch: "Pitch",
      court: "Court",
      place: (venue: string, court: string) => `${venue}, ${court}`,
      bookYourselves: "Book it yourselves",
      cost: "Cost",
      costEach: (amount: string) => `${amount} each, pay at the venue`,
      costSplit: "Split four ways, pay at the venue",
      costAtVenue: "Pay at the venue",
      squads: "Squads",
      open: "Open the game",
      cancelled: "The game was cancelled",
    },
    notFound: "Challenge not found",
    errorTitle: "This challenge could not be loaded",
  },
  squad: {
    side: "Side",
    reserve: "Reserve",
    counterNamed: (
      named: number,
      seats: number,
      side: number,
      reserves: number,
    ) => `${named} of ${seats} named, ${side} + ${reserves} reserves`,
    counterShort: (named: number, toName: number, seats: number) =>
      `${named} + ${toName} to name, ${named} of ${seats}`,
    counterEmpty: (seats: number) => `Nobody named yet, 0 of ${seats}`,
    nameYourSquad: "Name your squad",
    editYourSquad: "Edit your squad",
    nameSquadFor: (team: string) => `Name the squad for ${team}`,
    editSquadFor: (team: string) => `Edit the squad for ${team}`,
    seatEmpty: (label: string) => `${label}, not named yet`,
    seatNamed: (label: string, name: string, role: string) =>
      `${label}: ${name}, ${role}`,
    squadOf: (team: string) => `${team} squad`,
    saved: "Squad saved",
    sheet: {
      title: (day: string) => `Your squad for ${day}`,
      titleUndated: "Your squad",
      help: (format: string, side: number, reserves: number) =>
        `${format}, so ${side} plus up to ${reserves} reserves. Name at least ${side} to confirm.`,
      counter: (named: number, seats: number, roster: number) =>
        `${named} of ${seats} named from ${roster} on the roster`,
      sideCounter: (n: number) => `side, ${n}`,
      reserveCounter: (n: number) => `reserves, up to ${n}`,
      short: (n: number) =>
        plural("en", n, {
          one: "1 more to make the side. You can save and name the rest later.",
          other:
            "{n} more to make the side. You can save and name the rest later.",
        }),
      full: (seats: number) =>
        `The squad is full at ${seats}. Remove someone to add another.`,
      footer:
        "Named players are told and see the game in their Games tab. The rest of the roster sees it but isn't playing. You can change this until the score goes in.",
      confirm: (n: number) => `Confirm squad, ${n} named`,
      captain: "Captain",
      select: (name: string) => `Name ${name}`,
      deselect: (name: string) => `Take ${name} off the squad`,
      rosterLoadFailed: "The Roster could not be loaded",
      namedOf: (named: number, seats: number) => `${named} of ${seats} named`,
      fromRoster: (roster: number) => `from ${roster} on the roster`,
      you: "You",
      youCaptain: "You, captain",
      addedByYou: "Added by you, not on Temba",
      addedByCaptain: "Added by the captain, not on Temba",
      moreOnRoster: (n: number) =>
        plural("en", n, {
          one: "and 1 more on the roster",
          other: "and {n} more on the roster",
        }),
      metaJoin: ", ",
      sentenceJoin: ". ",
      close: "Close",
    },
    open: "Open",
    namedOf: (named: number, seats: number) => `${named} of ${seats} named`,
    sideReserves: (side: number, reserves: number) =>
      `${side} + ${reserves} reserves`,
    toName: (named: number, toName: number) => `${named} + ${toName} to name`,
    ofSeats: (named: number, seats: number) => `${named} of ${seats}`,
    nobodyNamed: "Nobody named yet",
    note: "Squads are named by the captains after confirmation, from the roster, up to the side plus three. Editable until the score goes in. Only named players get the result, marks and head-to-head.",
  },
  gameDetails: {
    versus: "v",
    tag: "Challenge",
    teamVsTeam: (home: string, away: string) => `${home} v ${away}`,
    firstMeeting: "First meeting",
    headToHead: (line: string) => `Head-to-head ${line}`,
    firstMeetingShort: "first meeting",
    headToHeadShort: (line: string) => `head-to-head ${line}`,
    recordYouCaptain: (record: string) => `${record}, you captain`,
    fromChallenge: "From challenge",
    postedBy: (team: string) => `Posted by ${team}`,
    postedByOn: (team: string, day: string) => `Posted by ${team}, ${day}`,
    proposedBy: "Proposed by",
    proposedConfirmed: (team: string, confirmer: string) =>
      `${team}, confirmed by ${confirmer}`,
    you: "you",
    placeBook: (place: string, hint: string) => `${place}. ${hint}`,
    confirmedByBoth: "Confirmed by both teams",
    subLineConfirmed: (line: string) => `${line}. Confirmed by both teams`,
    countsFor: "Counts for",
    countsForLine: {
      padel: "Both teams' records, the players named and rating",
      football: "Both teams' records and the players named",
      footballLevel:
        "Both teams' records, the players named and Temba Level, once each team confirms the score",
    },
    costSplitWays: (n: number) => `Split ${n} ways, pay at the venue`,
    squadsTitle: "Squads",
  },
  detailScreen: {
    status: {
      open: (daysLeft: number) =>
        daysLeft === 0
          ? "Open challenge, last day"
          : plural("en", daysLeft, {
              one: "Open challenge, 1 day left",
              other: "Open challenge, {n} days left",
            }),
      proposalSent: (team: string) => `Proposal sent, waiting for ${team}`,
      confirmed: "Confirmed, now a game",
    },
    versus: "vs",
    opponentName: "Your team?",
    opponentLine: "not yet",
    teamLine: (level: string, rest: string) => `${level}, ${rest}`,
    footballLine: (level: string, roster: string) => `${level}. ${roster}`,
    withSport: (sport: string, line: string) => `${sport}, ${line}`,
    twoNames: (first: string, second: string) => `${first} and ${second}`,
    nameSeparator: ", ",
    you: "you",
    rows: {
      level: "Level wanted",
      venues: "Preferred venues",
      days: "Days",
      timings: "Timings",
      exactTimes: "Exact times",
      record: "Record",
      posted: "Posted",
    },
    level: {
      any: "Any level",
    },
    timingRanges: {
      morning: "before noon",
      afternoon: "noon to 6 PM",
      evening: "after 6 PM",
    },
    timingWithRange: (timing: string, range: string) => `${timing}, ${range}`,
    recordValue: (team: string, record: string) => `${team} ${record}`,
    postedValue: (day: string, name: string) => `${day}, by ${name}`,
    note: "From the team",
    footer: {
      proposals: (n: number) =>
        n === 0
          ? "No proposals yet"
          : plural("en", n, {
              one: "1 proposal so far",
              other: "{n} proposals so far",
            }),
      hint: "They pick one and confirm",
    },
    ago: {
      justNow: "just now",
      minutes: (n: number) => `${n}m ago`,
      hours: (n: number) => `${n}h ago`,
      days: (n: number) =>
        plural("en", n, { one: "1 day ago", other: "{n} days ago" }),
    },
    proposal: {
      waiting: (team: string) => `Your proposal, waiting for ${team}`,
      sent: (ago: string) => `Sent ${ago}.`,
      theyHave: (hours: number) =>
        hours <= 1
          ? "They have under an hour to confirm."
          : `They have ${hours} hours to confirm.`,
      youHave: (hours: number) =>
        hours <= 1
          ? "You have under an hour to confirm."
          : `You have ${hours} hours to confirm.`,
      lines: (sent: string, clock: string) => `${sent} ${clock}`,
      time: "Time",
      venue: "Venue",
      price: "Price",
      change: "Change proposal",
      withdraw: "Withdraw",
      footnote: {
        padel:
          "Nothing is booked yet. The court is on you two once they confirm; Temba doesn’t hold it.",
        football:
          "Nothing is booked yet. The pitch is on you two once they confirm; Temba doesn’t hold it.",
      },
    },
    queue: {
      title: "Proposals",
      empty: "No proposals yet. Teams that fit see it on the open board.",
      hint: "Pick one and confirm. The others are told.",
      confirm: "Confirm",
      another: "Another time",
    },
    confirmed: {
      dayAt: (day: string, venue: string) => `${day}, ${venue}`,
      placeFor: (place: string, duration: string) => `${place}, ${duration}`,
      duration: (minutes: number) => `${minutes} min`,
      viewGame: "View game",
      proposedBy: "Proposed by",
      confirmedBy: "Confirmed by",
      you: "You",
      byTeam: (name: string, team: string) => `${name}, ${team}`,
      byTeamAgo: (name: string, team: string, ago: string) =>
        `${name}, ${team}, ${ago}`,
      bookIt: (place: string) => `Book it: ${place}`,
      closedNote:
        "This challenge is closed. Everything else happens on the game: line-up, score, marks and the result card.",
    },
    accept: {
      subtitle: (team: string) =>
        `Propose a time and venue. ${team} confirm, and it becomes a game.`,
      toldOne: (name: string) =>
        `${name} is told when you propose, and again if they confirm.`,
      toldRoster:
        "Your roster is told when you propose, and again if they confirm.",
      venueHint: "their preferred first",
      theirFirst: "their first",
      theirSecond: "their second",
      theirPick: "their pick",
      youSuggest: "you suggest",
      somewhereElse: "Somewhere else",
      orSeparator: " or ",
      daysTimings: (days: string, timings: string) => `${days} ${timings}`,
      timingsAfterDays: {
        morning: "mornings",
        afternoon: "afternoons",
        evening: "evenings",
      },
      anyTime: "Any day, any time",
      slotDay: (weekday: string, day: string) => `${weekday} ${day}`,
      moreTimes: "More times",
      extras: "Add a court or price",
      propose: (when: string, venue: string) => `Propose ${when} at ${venue}`,
      change: (when: string, venue: string) => `Change to ${when} at ${venue}`,
      proposeIncomplete: "Propose",
      changeIncomplete: "Change proposal",
    },
  },
};
