import { plural } from "../../plural";

export const rating = {
  bands: {
    shark: "Shark",
    hamour: "Hamour",
    kanaad: "Kanaad",
    safi: "Safi",
  },
  provisional: "Provisional",
  scope: {
    group: "Counts for group tier",
    groupNote:
      "Moves tier points in this group only. Temba levels move in verified groups.",
  },
  tier: {
    columnTier: "Tier",
    columnPlayer: "Player",
    columnPoints: "Points",
    theShark: "The Shark",
    points: (points: string) => `${points} points`,
    sharkFor: (points: string, weeks: number) =>
      plural("en", weeks, {
        one: `${points} points, top for 1 week`,
        other: `${points} points, top for {n} weeks`,
      }),
    place: (place: number) => `#${place}`,
    provisionalGames: (games: number, of: number) =>
      `Provisional, ${games} of ${of} games`,
    noTier: "no tier",
    withOrganizer: (label: string) => `${label}, organizer`,
    stillProvisional: (n: number) =>
      plural("en", n, {
        one: "1 still provisional",
        other: "{n} still provisional",
      }),
    pointsSpoken: (points: string) => `${points} tier points`,
    footnote:
      "Tier and points are this group’s own: Hamour is the top 15% after the Shark, Kanaad the next 35%, Safi everyone else. Points come from this group’s games only.",
  },
  settingsLine: {
    resultsOnly: "Results only: tier points move on wins, draws and losses.",
    organizer: (weight: number) =>
      `After each game the organizer rates every player, and that is ${weight}% of the move.`,
    everyone: (weight: number) =>
      `After each game everyone rates, and the average is ${weight}% of the move.`,
    everyoneDouble: (weight: number) =>
      `After each game everyone rates, and the average is ${weight}% of the move, with the organizer counted twice.`,
  },
  settings: {
    title: "Rating settings",
    menuRow: "Rating settings",
    summary: {
      off: "Off, only the result moves points",
      organizer: (weight: string) =>
        `The organizer rates after a game, ${weight} weight`,
      everyone: (weight: string) =>
        `Everyone rates after a game, ${weight} weight`,
    },
    afterEachGame: "After each game",
    performanceRatings: "performance ratings",
    modes: {
      off: {
        title: "Off",
        description: "Only the result moves points.",
      },
      organizer: {
        title: "The organizer rates",
        description: "One person scores everyone 1 to 10 after the game.",
      },
      everyone: {
        title: "Everyone rates",
        description:
          "Each player scores teammates and opponents. Hidden for 24 hours.",
      },
    },
    howMuch: "How much it counts",
    weights: {
      light: "Light",
      standard: "Standard",
      heavy: "Heavy",
    },
    weightName: {
      light: "light",
      standard: "standard",
      heavy: "heavy",
    },
    resultShare: "the result",
    performanceShare: "how you played",
    percent: (value: number) => `${value}%`,
    splitSpoken: (result: number, performance: number) =>
      `${result}% the result, ${performance}% how you played`,
    weightNote: {
      light:
        "A nudge. A great game on the losing side softens the loss a little.",
      standard:
        "The default. A great game on the losing side can cancel most of the loss.",
      heavy:
        "Half and half. Playing well matters as much as winning; best with honest raters.",
    },
    fairness: "Keeping it fair",
    countsDouble: "Organizer’s rating counts double",
    countsDoubleHint: "The one person who watched the whole game",
    alwaysOn:
      "Always on: nobody rates themselves, the highest and lowest rating are dropped, ratings stay hidden for 24 hours, and a rater who is always far from the rest counts for less.",
    manualChanges: "Manual changes",
    whoCanAdjust: "Who can adjust",
    organizersOnly: "Organizers only",
    reason: "Reason",
    alwaysRequired: "Always required",
    shownToPlayer: "Shown to the player",
    inTheirHistory: "Yes, in their history",
    appliesFromNextGame: (line: string) =>
      `${line} Changes apply from the next game.`,
    save: "Save",
    savedToast: "Rating settings saved",
    loadFailed: "Couldn’t load rating settings",
    readOnly: "Only the group’s organizers change rating settings.",
    errors: {
      organizerOnly: "Only this group’s organizers change rating settings.",
      noTier:
        "This group has no tiers, so it has no rating settings. Tiers are for football groups that are not verified.",
      notMember: "Only members of this group see its rating settings.",
      weight: "Pick a weight of 20, 30 or 50%.",
    },
  },
  adjust: {
    menuRow: "Adjust rating",
    menuHint: "Move their tier points by hand, with a reason they can see",
    title: "Adjust rating",
    subtitle: (group: string) =>
      `${group}. A manual change, on top of what the games did.`,
    placeOf: (place: number, of: number) => `#${place} of ${of}`,
    now: (points: string, standing: string) => `Now ${points}, ${standing}`,
    nowRanked: (band: string, placeOf: string) => `${band}, ${placeOf}`,
    nowProvisional: (games: number, of: number) =>
      `provisional, ${games} of ${of} games`,
    newPoints: "New points",
    noChange: "no change",
    place: "Place",
    noFish: "No fish yet",
    step: (delta: string) => `Change by ${delta}`,
    orJump: "or jump:",
    into: (band: string) => `into ${band}`,
    reset: "Reset",
    suggested: (points: string) => `Suggested from Temba Level: ${points}`,
    tierAfter: "Tier after the change",
    effect: {
      none: "No change yet. Tiers are places in the group, so when one player moves, someone moves the other way.",
      stays: (band: string, placeOf: string) =>
        `Still a ${band}, now ${placeOf}.`,
      nobodyElse: "Nobody else changes tier.",
      ranked: (name: string, band: string, placeOf: string) =>
        `${name} is ranked ${placeOf}, a ${band}.`,
      rankedNoFish: (name: string, placeOf: string) =>
        `${name} is ranked ${placeOf}.`,
      passes: (name: string, names: string, band: string) =>
        `${name} passes ${names} and takes a ${band} place.`,
      dropsBelow: (name: string, names: string, band: string) =>
        `${name} drops below ${names} into ${band}.`,
      movesUp: (name: string, band: string) => `${name} moves up to ${band}.`,
      movesDown: (name: string, band: string) => `${name} drops to ${band}.`,
      noFish: (placeOf: string) =>
        `Now ${placeOf}. No fish until four players are ranked.`,
      otherUp: (name: string, band: string) => `${name} moves up to ${band}.`,
      otherBecomes: (name: string, band: string) =>
        `${name} becomes a ${band}.`,
      andMore: (n: number) =>
        plural("en", n, {
          one: "1 more player changes tier.",
          other: "{n} more players change tier.",
        }),
      twoNames: (first: string, last: string) => `${first} and ${last}`,
      nameSeparator: ", ",
    },
    why: (name: string) => `Why? ${name} will see this.`,
    reasons: {
      new_to_group: "New here, known level",
      back_from_injury: "Back from a break",
      plays_above_results: "Playing above this",
      plays_below_results: "Playing below this",
      correcting_a_mistake: "Fixing a mistake",
    },
    notePlaceholder: "Add a note (optional)",
    noteLabel: "Note",
    saveMoveFirst: "Move the points first",
    savePickReason: "Pick a reason to save",
    save: (delta: string) => `Save ${delta} and log it`,
    saved: (name: string) => `Saved and logged in ${name}’s history`,
    errors: {
      organizerOnly: "Only an organizer of this group can adjust tier points.",
      notYourOwn: "You can’t adjust your own tier points.",
      noTier:
        "This group has no tier. Tiers are for football groups that aren’t verified.",
      notMember: "That player isn’t in this group.",
      reasonRequired: "Pick a reason. The player will see it.",
      noChange: "Move the points first.",
      tooFar: (max: number) =>
        `An adjustment can move tier points by at most ${max}.`,
      belowZero: "Tier points can’t go below zero.",
    },
  },
  history: {
    title: "Points and history",
    menuRow: "Points and history",
    menuHint: "What moved their tier points, game by game",
    groupGames: (n: number) =>
      plural("en", n, {
        one: "1 group game",
        other: "{n} group games",
      }),
    toNextBand: (points: string, band: string) => `${points} to ${band}`,
    whatMovedIt: "What moved it",
    lastCount: (n: number) => `last ${n}`,
    empty:
      "Nothing has moved these points yet. They move after each group game.",
    deltaSpoken: (delta: string) => `${delta} points`,
    game: {
      won: (score: string) => `Won ${score}`,
      drew: (score: string) => `Drew ${score}`,
      lost: (score: string) => `Lost ${score}`,
      played: "Group game",
      rated: (title: string, rating: string) => `${title}, rated ${rating}`,
      parts: (date: string, result: string, performance: string) =>
        `${date}. Result ${result}, performance ${performance}`,
      resultOnly: (date: string, result: string) => `${date}. Result ${result}`,
    },
    adjustment: {
      title: "Set by an organizer",
      detail: (date: string, from: string, to: string) =>
        `${date}, ${from} to ${to}`,
      byline: (name: string, reason: string) => `${name}, ${reason}`,
      bylineNote: (name: string, reason: string, note: string) =>
        `${name}, ${reason}: “${note}”`,
      quote: (name: string, note: string) => `${name}: “${note}”`,
      you: "You",
      someone: "An organizer",
    },
    footnote: {
      other: (name: string) =>
        `${name} sees this same list. Nothing here changes a Temba Level.`,
      self: "Your group’s organizers see this same list. Nothing here changes your Temba Level.",
    },
    unnamed: "Player",
    loadFailed: "Couldn’t load points and history",
    errors: {
      forbidden:
        "Only the player and this group’s organizers can see these points.",
    },
  },
  performance: {
    title: "Rate the game",
    entry: {
      title: "Rate the game",
      organizer: (closes: string) =>
        `Score everyone 1 to 10. Closes ${closes}, then points move on the result alone.`,
      everyone: (closes: string) =>
        `Score your teammates and, if you want, opponents. Nobody sees who gave what. Closes ${closes}.`,
      cta: "Rate",
    },
    hero: {
      final: "Final",
      score: (slot1: number, slot2: number) => `${slot1}–${slot2}`,
      line: (place: string, who: string) => `${place}. ${who}`,
      placeSeparator: ", ",
      youOrganized: "You organized",
      youPlayedIn: (side: string) => `You played in ${side}`,
    },
    heading: "How did they play?",
    side: {
      won: "won",
      lost: "lost",
      drew: "drew",
      ratedOf: (rated: number, of: number) => `${rated} of ${of} rated`,
      notRatedYet: (n: number) =>
        plural("en", n, {
          one: "1 player, not rated yet",
          other: "{n} players, not rated yet",
        }),
      show: (side: string) => `Show ${side}`,
      hide: (side: string) => `Hide ${side}`,
    },
    you: "You",
    keeper: "Keeper",
    selfNote: "You don’t rate yourself. Yours moves on the result",
    notRated: "–",
    cellSpoken: (name: string, value: number) => `${name}, ${value} of 10`,
    valueSpoken: (name: string, value: number) =>
      `${name}, rated ${value} of 10`,
    notRatedSpoken: (name: string) => `${name}, not rated yet`,
    mvpSpoken: (name: string) => `Make ${name} the MVP`,
    footnote: (weight: number) =>
      `6 is an ordinary game. In this group your ratings are the performance part of everyone’s points, ${weight}% of the move.`,
    footnoteStar: "The star is the MVP.",
    footer: {
      ratedOf: (rated: number, of: number) => `${rated} of ${of} rated`,
      mvp: (name: string) => `MVP: ${name}`,
      noMvp: "No MVP yet",
      submit: "Submit",
    },
    submitted: "Ratings sent. Everyone’s points have moved.",
    everyone: {
      heading: "Your teammates",
      closesToday: (clock: string) => `Closes today, ${clock}`,
      closesTomorrow: (clock: string) => `Closes tomorrow, ${clock}`,
      closesOn: (day: string, clock: string) => `Closes ${day}, ${clock}`,
      privacy: (raters: number, players: number) =>
        `Nobody sees who gave what. ${raters} of ${players} have rated so far`,
      yourSide: "your side",
      optional: "optional",
      opponentsOptional: (n: number) =>
        plural("en", n, {
          one: "1 opponent, optional",
          other: "{n} opponents, optional",
        }),
      selfNote: "You can’t rate yourself",
      footnote:
        "Rate who you saw; leave the rest blank. A blank is not a zero.",
      footer: {
        nothingYet: "Nothing rated yet",
        hiddenUntil: (rated: number, until: string) =>
          `${rated} rated, hidden until ${until}`,
        untilTomorrow: "tomorrow",
        change: "You can change them until it closes",
        send: "Send",
      },
      submitted: "Ratings sent. You can change them until it closes.",
    },
    closed: {
      title: "Ratings are closed",
      description:
        "This game’s ratings are in, and its points have moved. Nothing more to rate.",
    },
    suspended: {
      title: "Ratings are paused",
      description:
        "The score is being corrected. Ratings open again for 24 hours once it is final, and yours are kept.",
    },
    loadFailed: "Couldn’t load the ratings",
    errors: {
      noWindow: "This game has no performance ratings.",
      closed: "Ratings for this game are closed.",
      organizerOnly: "In this group only an organizer of the game rates.",
      seatedOnly: "Only the players of this game rate it.",
      self: "You can’t rate yourself.",
      notPlayer: "Rate only the players of this game.",
      value: "A rating is a whole number from 1 to 10.",
      duplicate: "Rate each player once.",
    },
  },
};
