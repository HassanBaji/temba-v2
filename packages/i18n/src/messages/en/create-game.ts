import { plural } from "../../plural";

export const createGame = {
  court: {
    count: (n: number) =>
      plural("en", n, { one: "1 court", other: "{n} courts" }),
    pitchCount: (n: number) =>
      plural("en", n, { one: "1 pitch", other: "{n} pitches" }),
    venueCount: (n: number) =>
      plural("en", n, { one: "1 Court", other: "{n} Courts" }),
  },
  typeCards: {
    countsNote: "Friendly, but it counts toward your Level.",
    friendlyGame: {
      title: "Friendly game",
      description: "One Match. Temba fills the open seats.",
      rating: "Counts for your rating",
    },
    friendlyTournament: {
      title: "Friendly tournament",
      description: "Several Game teams over one day.",
      rating: "Counts for your rating",
    },
  },
  steps: {
    where: "Where",
    when: "When",
    levelAndPrice: "Level and price",
    whereAndSize: "Where and size",
    formatAndDay: "Format and day",
    entryAndReview: "Entry and review",
    sizeAndPrice: "Size and price",
  },
  openSeats: "4 open seats",
  tournamentFormat: "Format",
  knockout: "Knockout",
  knockoutOnly: "Knockout only",
  groupsThenKnockout: "Groups, then knockout",
  shapes: {
    groupsOnly: {
      title: "Groups only",
      description: "Everyone plays the same number of games",
    },
    knockoutOnly: {
      title: "Knockout only",
      description: "Lose once and you are done for the day",
    },
    groupsThenKnockout: {
      title: "Groups, then knockout",
      description: "The best in each group carry on",
    },
  },
  unevenGroups:
    "Groups are uneven. Some Game teams play one more Match than others.",
  matchMinutes: "Match length must be from 10 to 120 minutes, in steps of 5",
  validation: {
    pickGroup: "Pick a Group",
    pickVenue: "Pick a Venue",
    pickDay: "Pick a day",
    pickStartTime: "Pick a start time",
    pickFinishTime: "Pick a finish time",
    finishAfterStart: "Finish time must be at or after start time",
    nameTournament: "Name the tournament",
    pickSideSize: "Pick a side size",
    playersAllowedBetween: (min: number, max: number) =>
      `Players allowed must be between ${min} and ${max}`,
    pickGroupsCount: "Pick a groups count",
  },
  venue: {
    courtsOptional: "Courts are optional.",
    pitchOptional: "Pitch is optional.",
    courtOptional: "Court is optional.",
    skipCourts: "Skip Courts.",
    skipPitch: "Skip pitch.",
    skipCourt: "Skip Court.",
    lockedArchived: (skip: string) =>
      `This Group’s Venue is Soft-archived. You can still create this Game here. ${skip}`,
    lockedLinked: (optional: string) =>
      `Venue is this Group’s linked Venue and cannot be changed. ${optional}`,
    pick: (optional: string) => `Pick a Venue. ${optional}`,
    cardMeta: (courts: string, city: string) => `${courts} · ${city}`,
  },
  price: {
    currency: "BD",
    fieldDescription:
      "Optional. Amounts are in BD. Up to three decimal places. Leave blank if unset. Zero means free. Temba does not collect payment.",
    negative: "Price per player cannot be negative",
    tooManyDecimals: "Use up to three decimal places",
    invalid: "Enter a valid amount",
    tooLarge: "Price per player is too large",
    free: "Free",
    amount: (major: string) => `${major} BD`,
    perPlayer: (amount: string) => `${amount} / player`,
    teamOfTwo: (amount: string) => `${amount} a Game team of two`,
  },
  mvp: {
    title: "MVP",
    decidedAfterGame: "Decided after the game",
    marks: "Marks",
    lockedNote:
      "The score is confirmed, so how the MVP is decided can’t change.",
  },
  tournament: {
    defaultName: (day: string) => `Friendly tournament · ${day}`,
    defaultNameNoDay: "Friendly tournament",
    groups: (n: number) =>
      plural("en", n, { one: "1 group", other: "{n} groups" }),
    groupsThenKnockout: (groups: string) => `${groups}, then knockout`,
    knockoutMatches: (n: number) =>
      plural("en", n, {
        one: "1 knockout Match",
        other: "{n} knockout Matches",
      }),
    groupMatches: (n: number) =>
      plural("en", n, { one: "1 group Match", other: "{n} group Matches" }),
    scheduleLine: (matches: string, clock: string) =>
      `${matches}, last Match finishes at ${clock}`,
    scheduleLineBoth: (pool: string, knockout: string, clock: string) =>
      `${pool} and ${knockout}, last Match finishes at ${clock}`,
  },
  format: {
    friendlyGame: "Friendly game",
    americano: "Americano",
    friendlyTournament: "Friendly tournament",
  },
  side: {
    letter: (n: number): string | undefined =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[n - 1],
    team: (label: string) => `Team ${label}`,
    gameTeam: "Game team",
  },
  share: {
    open: "Open",
    team: (n: number) => `👕 Team ${n}`,
    left: (name: string) => `- Left: ${name}`,
    right: (name: string) => `- Right: ${name}`,
    join: "🔗 Join:",
    players: "👕 Players",
    keepers: "🧤 Keepers",
    level: (range: string) => `📊 Level: ${range}`,
    waitlist: "⏳ Waiting list",
  },
  openGraph: {
    genericTitle: "Temba - the future of competitive sports",
    genericDescription: "Temba - the future of competitive sport",
    dayTimeSitting: (day: string, timeWindow: string, occupied: number) =>
      `${day}, ${timeWindow}, ${occupied}/4 sitting`,
    dayTime: (day: string, timeWindow: string) => `${day}, ${timeWindow}`,
    withLevelRange: (description: string, range: string) =>
      `${description}, ${range}`,
    atVenue: (venue: string, details: string) => `${venue} · ${details}`,
  },
  image: {
    help: "Optional. JPEG, PNG, or WebP, at most 2 MB.",
    groupCreatedWithoutImage: "Group created without an image",
    imageType: "Image must be a JPEG, PNG, or WebP image",
    imageTooLarge: "Image must be at most 2 MB",
    logoType: "Logo must be a JPEG, PNG, or WebP image",
    logoTooLarge: "Logo must be at most 2 MB",
  },
  rosterNoSeats: "This Game has no seats; register as yourself",
  sideSize: (n: number) => `${n}-a-side`,
  edit: {
    title: "Edit game",
    saveChanges: "Save changes",
    changes: "Changes",
    noChanges: "None yet",
    changesSaved: "Changes saved",
    nameHint:
      "Shown on the game and at the top of the invite. Empty uses the day and time.",
    whenHint:
      "Today or later, 30-minute steps. For today only upcoming times are listed.",
    playersAndPriceHint:
      "Dropping players below the number joined moves the latest joiners to the waiting list and lets them know. They get a spot back if someone leaves. Price changes apply to players who join from now on.",
    everyoneKeepsSpot: "Everyone who joined keeps their spot.",
    venueLocked: (place: string) => `${place}. Venue can't change.`,
    venueLockedNoPlace: "Venue can't change.",
    court: {
      title: "Court",
      none: "No Court",
      loading: "Loading Courts…",
      hint: "Courts at this Venue only.",
    },
    pitch: {
      title: "Pitch",
      none: "No Pitch",
      loading: "Loading Pitches…",
      hint: "Pitches at this Venue only.",
    },
    windowIncomplete: "Pick a day, a start time and a finish time",
    change: {
      name: "name",
      dayMoved: "day moved",
      timeChanged: "time changed",
      court: "court changed",
      pitch: "pitch changed",
      players: "players",
      aside: "a-side",
      price: "price",
      levelRange: "level range",
      rounds: "rounds",
      seasonUnlinked: "season unlinked",
      seasonLinked: "season linked",
      seasonChanged: "season changed",
      mvp: "MVP",
    },
    listSeparator: ", ",
    seasonNeedsFix: "Season needs a fix.",
    withSeasonFix: (sentence: string) => `${sentence}. Season needs a fix.`,
    joined: (n: number) => `${n} joined`,
    footballNote: (side: string, onPitch: number) =>
      `${side}, ${onPitch} on the pitch`,
    footballNoteWithSubs: (side: string, onPitch: number, subs: number) =>
      plural("en", subs, {
        one: `${side}, ${onPitch} on the pitch, 1 sub`,
        other: `${side}, ${onPitch} on the pitch, {n} subs`,
      }),
    capWait: (moving: number, joined: number) =>
      `${moving} of the ${joined} joined move to the waiting list, latest to join first.`,
  },
  season: {
    none: "No season",
    friendly: "Friendly",
    noneNote: "Result won't count in any standing.",
    linkRowTitle: "Link to a season",
    sectionFriendlyNote:
      "Without a season the game is a friendly. It still updates levels, just not a standing.",
    pickerLockNote:
      "Only a confirmed final score counts in the standing. You can unlink until the score is confirmed.",
    countsLine: "Counts in the standing",
    needsFixTag: "Needs a fix",
    lockedNote: "The score is confirmed, so the season can't change.",
    keepFriendly: "Keep as a friendly",
    unlink: "Unlink season",
    change: "Change",
    badge: {
      upcoming: "UPCOMING",
      active: "ACTIVE",
      closed: "CLOSED",
    },
    closedAndLocked: "Closed and locked.",
    fallsInside: (day: string) => `${day} falls inside this window.`,
    startsAfter: "Starts after the game day.",
    endedBefore: "Ended before the game day.",
    rowNote: (groupName: string, openCount: number, day: string) =>
      openCount === 0
        ? `${groupName} has no season open for ${day}.`
        : plural("en", openCount, {
            one: `${groupName} has 1 season open for ${day}.`,
            other: `${groupName} has {n} seasons open for ${day}.`,
          }),
    pickerSubtitle: (groupName: string, day: string) =>
      `${groupName}. The game day, ${day}, decides which seasons fit.`,
    link: (name: string) => `Link ${name}`,
    linkedNote: (name: string) =>
      `Players see “${name}” on the game and in the invite. Unlink any time before the score is confirmed.`,
    starts: (edge: string) => `starts ${edge}`,
    ends: (edge: string) => `ends ${edge}`,
    outsideCovered: (day: string, linked: string, replacement: string) =>
      `${day} is outside ${linked}. ${replacement} covers that day.`,
    outsideNone: (day: string, linked: string) =>
      `${day} is outside ${linked}. No season covers that day.`,
    keepForward: (edge: string, linked: string) =>
      `Or move the day forward to ${edge} or later to keep ${linked}.`,
    keepBack: (edge: string, linked: string) =>
      `Or move the day back to ${edge} or earlier to keep ${linked}.`,
    moveTo: (name: string) => `Move to ${name}`,
    notInGroup: "Pick a season of this Game's Group",
    closed: "That season is closed",
    scoreConfirmed: "The score is confirmed, so the season can't change",
    noGroup: "Only a Group Game can link to a season",
    outsideDay: (day: string, name: string) => `${day} is outside ${name}`,
  },
};
