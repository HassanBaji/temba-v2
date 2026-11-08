import { plural } from "../../plural";

export const challenge = {
  segments: {
    label: "Challenges sections",
    open: "Open",
    mine: "Mine",
    teams: "Teams",
    withCount: (segment: string, n: number) => `${segment}, ${n}`,
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
  },
  goToTeams: "See your teams",
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
    wants: (min: string, max: string) => `Wants ${min} to ${max}`,
    wantsOnly: (band: string) => `Wants ${band}`,
    wantsAndUp: (band: string) => `Wants ${band} and up`,
    wantsAndUnder: (band: string) => `Wants ${band} and under`,
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
    title: "Post a challenge",
    description:
      "Tell other Teams what you want: they propose a time and a venue.",
    noTeamsTitle: "None of your Teams can post right now",
    noTeamsCopy:
      "A padel Team needs both players, a football Team five on the Roster, and a Team can have one open challenge at a time.",
    team: "Team",
    format: "Format",
    formatHelp:
      "The size of the game you want. Squads are named after confirmation: the side plus up to three reserves.",
    formatNeeds: (side: string, n: number) =>
      plural("en", n, {
        one: `${side} needs 1 on the Roster`,
        other: `${side} needs {n} on the Roster`,
      }),
    venues: "Venues",
    venuesHint: (max: number) =>
      `Up to ${max} you'd like to play at. Leave empty for any venue.`,
    days: "Days",
    daysHint: "Leave empty for any day.",
    timings: "Timings",
    timingsHint: "Leave empty for any time.",
    timingLine: (timing: string, hint: string) => `${timing}: ${hint}`,
    slots: "Or exact slots",
    slotsHint: (max: number) => `Up to ${max} start times you can already do.`,
    slotDay: "Day",
    slotTime: "Start",
    addSlot: "Add slot",
    removeSlot: (slot: string) => `Remove ${slot}`,
    level: "Level wanted",
    levelHint: "Teams outside it see your challenge greyed.",
    levelMin: "From",
    levelMax: "To",
    levelMinA11y: (band: string) => `From ${band}`,
    levelMaxA11y: (band: string) => `To ${band}`,
    note: "A line about you",
    notePlaceholder: "Friendly, on time, we bring the bibs",
    noteCount: (n: number, max: number) => `${n} of ${max}`,
    review: "Review",
    back: "Back",
    submit: "Post challenge",
    posted: "Challenge posted",
    errorTitle: "Your Teams could not be loaded",
  },
  review: {
    title: "Review your challenge",
    cardTitle: "How it will appear",
    team: (team: string) => `Team ${team}`,
    teamWithRoster: (team: string, n: number) =>
      `Team ${team}, ${n} on the roster`,
    format: (side: string, squad: number) =>
      `Format ${side}. Squads of up to ${squad} named after confirmation`,
    visibility: {
      padel: "Visible to every padel Team on Temba",
      football: "Visible to every football Team on Temba",
    },
    openFor: (days: number) => `Open for ${days} days`,
    proposals: "Proposals: You confirm one; the rest are told",
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
    notOpen: "This challenge is no longer open",
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
    notFound: "Challenge not found",
    errorTitle: "This challenge could not be loaded",
  },
};
