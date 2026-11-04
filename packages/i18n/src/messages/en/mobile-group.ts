import { plural } from "../../plural";

export const mobileGroup = {
  unnamedMember: "Member",
  unnamedUser: "User",
  theVenue: "the Venue",
  photoFallbackName: "Group",
  opensPlayerProfile: "Opens their Player profile",
  copyFailed: "Could not copy",
  imageUnreadable: "That image could not be read. Try another one.",
  loadFailed: {
    groups: "Groups could not be loaded",
    publicGroups: "Public Groups could not be loaded",
    group: "Group could not be loaded",
    standing: "Standing could not be loaded",
    level: "Level could not be loaded",
    moreGames: "More Games could not be loaded.",
  },
  list: {
    tabs: { mine: "Mine", public: "Public" },
    loading: "Loading Groups",
    nextGame: "Next Game",
    yourFormHere: "your form here",
    filterBySport: "Filter by sport",
    rowNextGame: (name: string, meta: string, weekday: string) =>
      `${name}, ${meta}, next Game ${weekday}`,
    rowNoGame: (name: string, meta: string) =>
      `${name}, ${meta}, no Game scheduled`,
    empty: {
      standing: "Standing",
      browsePublic: "Browse public Groups",
      publicGroups: "Public Groups",
      noneOpen: "None open",
    },
  },
  home: {
    tabs: { standing: "Standing", games: "Games", members: "Members" },
    notFound: {
      title: "Group not found",
      description: "It may have been removed, or you may not have access.",
    },
    declineVenueRequest: (venue: string) => `Decline the request from ${venue}`,
    reviewVenueRequest: (venue: string) => `Review the request from ${venue}`,
  },
  standing: {
    columns: {
      position: "#",
      player: "Player",
      played: "P",
      wins: "W",
      draws: "D",
      losses: "L",
      points: "PTS",
    },
    unranked: "Unranked",
    nameNotOnTemba: (name: string) => `${name}, Not on Temba yet`,
    rankedRow: (
      position: number,
      name: string,
      played: number,
      record: string,
      points: number,
    ) =>
      `${position}. ${name}. ${played} played, ${record} won drawn lost, ${points} points.`,
    unrankedRow: (
      name: string,
      played: number,
      record: string,
      points: number,
    ) =>
      `Unranked. ${name}. ${played} played, ${record} won drawn lost, ${points} points.`,
    stats: { gamesPlayed: "games played", awaitingScore: "awaiting score" },
    statLabel: (value: number, label: string) => `${value} ${label}`,
    notMember: {
      title: "Join to see your Standing",
      description: "Join this Group to get a Standing among its members.",
    },
    noResultsTitle: "Standings appear after the first result",
    podium: "Final top three",
    pointsSuffix: " pts",
    final: "Final",
    seasonProgress: "Season progress",
    openSeat: "Open seat",
    invite: "Invite",
    createFirstGame: "Create the first Game",
  },
  games: {
    emptyTitle: "No Games yet",
    nextGame: "Next Game",
    notScheduled: "Not scheduled",
    when: "When",
    where: "Where",
    cancelled: "Cancelled",
    enter: "Enter",
    noScoreYet: "No score yet, enter it",
    scheduled: "Scheduled",
    played: "Played",
    scheduledEmpty: "No upcoming Games scheduled for this Group.",
    playedEmpty: "No Game history yet.",
    loadMore: "Load more",
    row: (mark: string, title: string, subtitle: string, trailing: string) =>
      `${mark}. ${title}. ${subtitle}. ${trailing}`,
    filtersLabel: "Filter played Games",
    filters: {
      finished: "Finished",
      needs_score: "Needs score",
      cancelled: "Cancelled",
      all: "All",
    },
    filterSpoken: (label: string, n: number) =>
      `${label}, ${plural("en", n, { one: "1 Game", other: "{n} Games" })}`,
    filterEmpty: {
      finished: "No finished games yet.",
      needs_score: "Every game has a score.",
      cancelled: "No cancelled games.",
      all: "No games yet.",
    },
    showAll: "Show all games",
    enterScore: "Enter score",
    you: "You",
    versus: (first: string, second: string) => `${first} vs ${second}`,
    pair: (first: string, second: string) => `${first} & ${second}`,
    record: (wins: number, draws: number | null, losses: number) =>
      draws == null ? `W${wins} L${losses}` : `W${wins} D${draws} L${losses}`,
    recordSpoken: (wins: number, draws: number | null, losses: number) =>
      draws == null
        ? `${wins} won, ${losses} lost`
        : `${wins} won, ${draws} drawn, ${losses} lost`,
    monthCount: (n: number) =>
      plural("en", n, { one: "1 GAME", other: "{n} GAMES" }),
    joined: (joined: number, allowed: number) =>
      `${joined} of ${allowed} joined`,
    joinedOpen: (joined: number) => `${joined} joined`,
    sideSpoken: (name: string, score: string) => `${name} ${score}`,
    card: (parts: string[]) => parts.join(". "),
  },
  members: {
    empty: {
      title: "No members yet",
      description: "People who join this Group will show up here.",
    },
    youMark: "YOU",
    manage: "Manage",
    manageName: (name: string) => `Manage ${name}`,
    columnMember: "Member",
    columnLevel: "LVL",
    searchPlaceholder: "Search members",
    pendingInvites: (title: string, names: string) => `${title}. ${names}`,
    rowYou: (name: string) => `${name}, you`,
    levelSpoken: (label: string) => `Level ${label}`,
    levelSpokenProvisional: (label: string) =>
      `Level ${label}, still Provisional`,
    levelStillProvisional: "Level still Provisional",
    noLevelYet: "No Level yet",
    ratedMatches: (n: number) =>
      plural("en", n, { one: "1 Rated Match", other: "{n} Rated Matches" }),
    provisionalNote: (firstName: string) =>
      `This Level is still Provisional. Set it by hand if you know ${firstName} plays at a different Level.`,
    latestSetWithReason: (caption: string, reason: string) =>
      `${caption}. ${reason}`,
    latestSet: (text: string) => `Latest Level set: ${text}`,
    sheet: {
      viewProfile: "View profile",
      setLevel: "Set Level",
      stillProvisional: "Still Provisional",
      noLevelMark: "–",
    },
  },
  requests: {
    review: "Review join requests",
    changeWhoCanJoin: "Change who can join",
    row: (name: string, meta: string) => `${name}. ${meta}`,
    quotedNote: (note: string) => `“${note}”`,
    approve: "Approve",
    approveName: (name: string) => `Approve ${name}`,
    reject: "Reject",
    rejectName: (name: string) => `Reject ${name}`,
    pending: (label: string) => `${label}…`,
  },
  edit: {
    notFound: {
      title: "Group not found",
      description:
        "It may have been deleted, or you may not be able to edit it.",
    },
    forbidden: {
      title: "Only the owner can edit this Group",
      description: "Ask the Group owner to change its settings.",
    },
  },
  form: {
    changePhoto: "Change photo",
    addPhoto: "Add photo",
    nameCounter: (count: number, max: number) =>
      `${count} of ${max} characters`,
    sportChoice: (sport: string, sublabel: string) => `${sport}, ${sublabel}`,
    lockedSport: (sport: string, help: string) => `Sport ${sport}. ${help}`,
    sportNotSet: "not set",
    radio: (title: string, description: string) => `${title}, ${description}`,
  },
  setLevel: {
    notFound: {
      title: "Member not found",
      description:
        "They may have left the Group, or you may not be able to set their Level.",
    },
    title: (name: string) => `Set Level for ${name}`,
    newLevel: "New Level",
    readout: (band: string, level: string, delta: string) =>
      `New Level ${band} ${level}, ${delta}`,
    toNext: (distance: string, label: string) => `${distance} to ${label}`,
    topOfScale: "Top of the scale",
    throughRung: (percent: number, rung: string) =>
      `${percent}% through ${rung}`,
    nowMarker: (label: string) => `Now ${label}`,
    decrease: "Decrease Level by 0.1",
    increase: "Increase Level by 0.1",
    reset: "Reset",
    reason: "Reason",
    note: "A Level you set counts as confirmed. Rated Matches keep moving it from here.",
    noteProvisional: (firstName: string) =>
      `${firstName} will no longer be Provisional, and setting again will not change that.`,
    was: (label: string) => `was ${label}`,
    noLevelYet: "no Level yet",
    confirm: (label: string) => `Set to ${label}`,
    savedHeadline: (name: string, label: string) => `${name} set to ${label}.`,
    savedReason: (reason: string) => `Reason: ${reason}.`,
    dismiss: "Dismiss",
  },
};
