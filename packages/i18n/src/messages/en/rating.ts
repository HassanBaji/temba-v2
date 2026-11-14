import { plural } from "../../plural";

/** `points` is the count as shown: grouped, and signed when it is a move. */
function pointsCount(points: string, count: number) {
  return plural("en", count, {
    one: `${points} point`,
    other: `${points} points`,
  });
}

export const rating = {
  bands: {
    shark: "Shark",
    hamour: "Hamour",
    kanaad: "Kanaad",
    safi: "Safi",
  },
  provisional: "Provisional",
  inYourGroups: {
    title: "In your groups",
    noTierPadel: "no tier in padel",
    seasonRecord: (won: number, lost: number) =>
      `${won} won, ${lost} lost this season`,
    seasonRecordWithDrawn: (won: number, drawn: number, lost: number) =>
      `${won} won, ${drawn} drawn, ${lost} lost this season`,
    record: (won: number, lost: number) => `${won} won, ${lost} lost`,
    recordWithDrawn: (won: number, drawn: number, lost: number) =>
      `${won} won, ${drawn} drawn, ${lost} lost`,
    place: (position: number, of: number) => `#${position} of ${of}`,
    unranked: "Unranked",
    spoken: (name: string, place: string, record: string) =>
      `${name}, ${place}, ${record}`,
    padelNote:
      "Pairs rotate, so one honest Level does the balancing. Group games count for won, lost and the group’s season only.",
  },
  screen: {
    title: "Ratings",
    sport: "Sport",
    open: {
      title: "Ratings",
      football: "Temba Level, group tier and official rank",
      padel: "Temba Level and official rank",
    },
    loadFailed: "Couldn’t load your ratings",
    level: {
      title: "Temba Level",
      confirmed: "Confirmed",
      provisional: "Provisional",
      number: "Level",
      lastCount: (n: number) => `last ${n}`,
      changeSpoken: (delta: string, n: number) =>
        plural("en", n, {
          one: `${delta} over the last match`,
          other: `${delta} over the last {n} matches`,
        }),
      nextBand: "Next band",
      ofTheWay: (percent: number) => `, ${percent}% of the way`,
      topBand: "Top band",
      toConfirm: "To confirm",
      confirmCount: (done: number, total: number) =>
        plural("en", total, {
          one: `${done} of 1 match`,
          other: `${done} of {n} matches`,
        }),
      noLevel: "No level yet",
      noLevelFootball: "Play a game that counts for Temba Level to get an OVR.",
      noLevelPadel: "Play a match that counts for Temba Level to get a Level.",
      noteFootball:
        "How good you are, on verified matches only. OVR runs 40 to 99 and never resets.",
      notePadel:
        "The 1.0 to 7.0 scale padel players already know. Moves on verified matches, weighing your partner and opponents.",
      spoken: (band: string, level: string, status: string) =>
        `Temba Level ${level}, band ${band}. ${status}`,
      spokenOvr: (level: string, status: string) =>
        `Temba Level ${level}. ${status}`,
      startingFromSignUp: "Starting level, from sign-up",
      startingLevel: "Starting level",
      lastMatch: "Last match",
      lastResult: {
        won: (score: string | null) => (score ? `Won ${score}` : "Won"),
        drawn: (score: string | null) => (score ? `Drew ${score}` : "Drew"),
        lost: (score: string | null) => (score ? `Lost ${score}` : "Lost"),
      },
      noLastMatch: "None yet",
    },
    tier: {
      title: "Group tier",
      count: (n: number) =>
        plural("en", n, { one: "1 group", other: "{n} groups" }),
      bandPlace: (band: string, place: string) => `${band}, ${place}`,
      note: "Where you stand in each group. Set by that group’s own games and its organizers; it never touches your Level.",
    },
    verifiedGroups: "verified, no tier",
    official: {
      title: "Official rank",
      coming: "Coming with official tournaments",
      note: "What you’ve won, officially. Tournament and division results only; nobody can edit it.",
    },
  },
  profileTier: {
    shared: (n: number) =>
      plural("en", n, {
        one: "1 shared group",
        other: "{n} shared groups",
      }),
    note: (name: string) =>
      `Where ${name} stands in the groups you’re both in. Set by each group’s own games and its organizers; it never touches their Level.`,
  },
  matchHistory: {
    ovr: (delta: string) => `OVR ${delta}`,
    level: (delta: string) => `Level ${delta}`,
  },
  ovrImpact: {
    title: "What moved your OVR",
    move: (before: string, after: string) => `${before} to ${after}`,
    result: (percent: number) => `Result ${percent}%`,
    outcome: {
      won: (average: string) => `Won, against a side averaging ${average}`,
      drew: (average: string) => `Drew, against a side averaging ${average}`,
      lost: (average: string) => `Lost, against a side averaging ${average}`,
    },
    spoken: (title: string, delta: string) => `${title}, ${delta} OVR`,
    ratings: (percent: number) => `Player ratings ${percent}%`,
    ratingFrom: (rating: string, ballots: number) =>
      plural("en", ballots, {
        one: `${rating} from 1 teammate or opponent`,
        other: `${rating} from {n} teammates and opponents`,
      }),
    noRating: (min: number) =>
      plural("en", min, {
        one: "Fewer than 1 rating this time, so this part is 0",
        other: "Fewer than {n} ratings this time, so this part is 0",
      }),
    goals: (percent: number) => `Goals ${percent}%`,
    goalsLine: (scored: number, conceded: number) =>
      `${scored} scored, ${conceded} conceded while you played. Conceded weighs more at the back`,
    mvp: (percent: number) => `MVP ${percent}%`,
    mvpYou: "Voted MVP by the players",
    mvpOther: "Not this time. Other marks don’t move OVR",
    mvpNone: "No MVP was voted. Only a voted MVP moves OVR",
    heldAt: (bound: string) => `Held at ${bound}`,
    heldFloor: (bound: string) =>
      `OVR does not go below ${bound}, so the rest of this drop was not taken`,
    heldCeiling: (bound: string) =>
      `OVR does not go above ${bound}, so the rest of this rise was not added`,
    honest:
      "Keeping ratings honest: no rating yourself, highest and lowest dropped, hidden until the 24-hour window closes, verified games only.",
  },
  scope: {
    temba: "Counts for Temba Level",
    tembaNote: "Moves every player’s OVR. A verified group has no group tier.",
    group: "Counts for group tier",
    groupNote:
      "Moves tier points in this group only. Temba levels move in verified groups.",
  },
  tier: {
    columnTier: "Tier",
    columnPlayer: "Player",
    columnPoints: "Points",
    theShark: "The Shark",
    points: pointsCount,
    sharkFor: (points: string, count: number, weeks: number) =>
      plural("en", weeks, {
        one: `${pointsCount(points, count)}, top for 1 week`,
        other: `${pointsCount(points, count)}, top for {n} weeks`,
      }),
    place: (place: number) => `#${place}`,
    provisionalGames: (games: number, of: number) =>
      plural("en", of, {
        one: `Provisional, ${games} of 1 game`,
        other: `Provisional, ${games} of {n} games`,
      }),
    noTier: "no tier",
    withOrganizer: (label: string) => `${label}, organizer`,
    stillProvisional: (n: number) =>
      plural("en", n, {
        one: "1 still provisional",
        other: "{n} still provisional",
      }),
    pointsSpoken: (points: string, count: number) =>
      plural("en", count, {
        one: `${points} tier point`,
        other: `${points} tier points`,
      }),
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
      plural("en", of, {
        one: `provisional, ${games} of 1 game`,
        other: `provisional, ${games} of {n} games`,
      }),
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
        `Now ${placeOf}. No fish until two players are ranked.`,
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
      noTier:
        "This group has no tier. Tiers are for football groups that aren’t verified.",
      notMember: "That player isn’t in this group.",
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
    deltaSpoken: pointsCount,
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
  ratingHistory: {
    title: "Rating history",
    open: "Rating history",
    filter: "Show",
    ladders: {
      all: "All",
      level: "Level",
      tier: "Tier",
      rank: "Rank",
    },
    thisWeek: "This week",
    monthOfYear: (month: string, year: number) => `${month} ${year}`,
    separator: ", ",
    level: {
      title: "Level, verified match",
      detail: (result: string, venue: string) => `${result}, ${venue}`,
      withParts: (detail: string, parts: string) => `${detail}. ${parts}`,
      result: "Result",
      ratings: (rating: string) => `ratings ${rating}`,
      goals: (n: number) =>
        plural("en", n, { one: "1 goal", other: "{n} goals" }),
      mvp: "MVP",
    },
    override: {
      title: {
        verifier: "Level calibrated by a verifier",
        operator: "Level set by an operator",
        level_setter: "Level changed by a level setter",
      },
      detail: (sport: string, from: string, to: string) =>
        `${sport}, ${from} to ${to}`,
      atVenue: (name: string, venue: string) => `${name} (${venue})`,
      someone: "Someone",
    },
    tier: {
      title: (group: string) => `Tier points, ${group}`,
      adjustmentTitle: "Tier points set by an organizer",
      adjustmentDetail: (group: string, from: string, to: string) =>
        `${group}, ${from} to ${to}`,
      upTo: (band: string) => `Up to ${band}`,
      downTo: (band: string) => `Down to ${band}`,
      nowA: (band: string) => `Now a ${band}`,
      noLonger: (band: string) => `No longer a ${band}`,
      bandDetail: (group: string, placeOf: string) =>
        `${group}, now ${placeOf}`,
      bandDelta: "tier",
    },
    confirmed: {
      title: "Level confirmed",
      fifth: "Fifth verified match. The track is no longer hatched",
      afterMatches: (n: number) =>
        plural("en", n, {
          one: "After 1 verified match. The track is no longer hatched",
          other: "After {n} verified matches. The track is no longer hatched",
        }),
      set: "set",
      spoken: (level: string) => `Confirmed at ${level}`,
    },
    deltaSpoken: (delta: string, after: string) => `${delta}, now ${after}`,
    empty: {
      all: "Nothing has moved your ratings yet.",
      level: "Nothing has moved your Level yet. It moves on verified matches.",
      tier: "No tier points have moved yet. They move after each game in a football group.",
      tierPadel: "Padel has no group tier. Padel groups keep their standings.",
    },
    footnote:
      "Anything a person changed by hand carries their name and reason, and you see it the moment it happens.",
    loadFailed: "Couldn’t load your rating history",
  },
  ovr: {
    label: "OVR",
    value: (ovr: string) => `OVR ${ovr}`,
    valueProvisional: (ovr: string) => `OVR ${ovr}, still Provisional`,
    startsAt: (description: string, ovr: string) =>
      `${description} Starts at OVR ${ovr}.`,
    member: (band: string, ovr: string) => `${band}, OVR ${ovr}`,
    avg: (ovr: string) => `avg OVR ${ovr}`,
    span: (min: string, max: string) => `${min}–${max}`,
    heroSpoken: (ovr: string, placement: string | null) =>
      placement ? `OVR ${ovr}. ${placement}` : `OVR ${ovr}`,
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
        plural("en", raters, {
          one: `Nobody sees who gave what. 1 of ${players} has rated so far`,
          other: `Nobody sees who gave what. {n} of ${players} have rated so far`,
        }),
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
    result: {
      pending: {
        title: "Your rating is on its way",
        everyone: (closes: string) =>
          `${closes}. Then you see your rating and what it did to your tier points.`,
        everyoneOvr: (closes: string) =>
          `${closes}. Then you see your rating and what moved your OVR.`,
        organizer: (closes: string) =>
          `The organizer rates everyone. You see your rating and what it did to your tier points once they submit, by ${closes} at the latest.`,
      },
      game: "Your game",
      gameOn: (day: string) => `Your game, ${day}`,
      score: (slot1: string, score: string, slot2: string) =>
        `${slot1} ${score} ${slot2}`,
      rating: {
        ofTen: "of 10",
        spoken: (rating: string) => `Rated ${rating} of 10`,
        from: (n: number) =>
          plural("en", n, {
            one: "From 1 rating.",
            other: "From {n} ratings.",
          }),
        trimmed: "The highest and lowest were dropped.",
        double: "The organizer’s counted double.",
        trimmedAndDouble:
          "The highest and lowest were dropped; the organizer’s counted double.",
        average: (rating: string) => `The game’s average was ${rating}.`,
      },
      outcome: {
        won: (score: string) => `Won ${score}`,
        drew: (score: string) => `Drew ${score}`,
        lost: (score: string) => `Lost ${score}`,
        played: "Played",
        againstStronger: (outcome: string) =>
          `${outcome} against the stronger side on paper`,
        againstWeaker: (outcome: string) =>
          `${outcome} against the weaker side on paper`,
        againstEven: (outcome: string) =>
          `${outcome} against an even side on paper`,
      },
      points: {
        title: "What it did to your points",
        result: "The result",
        performance: "How you played",
        againstUsual: (rating: string, usual: string) =>
          `${rating} against your usual ${usual}`,
        rated: (rating: string) => `Rated ${rating}`,
        total: (before: string, after: string) => `${before} to ${after}`,
        weight: (weight: number) =>
          `Performance counts for ${weight}% in this group`,
        spoken: (title: string, delta: string, count: number) =>
          `${title}, ${pointsCount(delta, count)}`,
      },
      noRating: {
        organizerRated:
          "You rated this game, so yours moved on the result alone.",
        organizerDidNotRate:
          "The organizer didn’t rate you, so yours moved on the result alone.",
        nobody: (min: number) =>
          `Nobody rated you, and it takes ${min}. Yours moved on the result alone.`,
        tooFew: (n: number, min: number) =>
          plural("en", n, {
            one: `Only 1 player rated you, and it takes ${min}. Yours moved on the result alone.`,
            other: `Only {n} players rated you, and it takes ${min}. Yours moved on the result alone.`,
          }),
      },
      tier: {
        title: "Your tier",
        upFrom: (placeOf: string, before: number) =>
          `${placeOf}, up from #${before}`,
        downFrom: (placeOf: string, before: number) =>
          `${placeOf}, down from #${before}`,
        still: (band: string) => `Still ${band}.`,
        upTo: (band: string) => `Up to ${band}.`,
        downTo: (band: string) => `Down to ${band}.`,
        nowA: (band: string) => `Now a ${band}.`,
        toNext: (points: string, count: number, band: string) =>
          `${pointsCount(points, count)} to ${band}.`,
        noFish: "No fish until two players are ranked.",
        provisional:
          "Your place and fish come after five group games, or sooner if an organizer sets your points.",
      },
      mvp: {
        title: (name: string) => `MVP: ${name}`,
        you: "You",
        votes: (votes: number, cast: number) =>
          plural("en", cast, {
            one: `${votes} of 1 vote`,
            other: `${votes} of {n} votes`,
          }),
        picked: "Picked by the organizer",
        tieBreak: "Picked by the organizer after a tied vote",
        rated: (how: string, rating: string) => `${how}, rated ${rating}`,
      },
      footnote:
        "A group game. It moved your tier points here and nothing else: not your Temba Level, not any Rank.",
    },
    summary: {
      title: "Ratings are in",
      entry: {
        title: "Ratings are in",
        description:
          "Each player’s rating and points move, and who changed tier.",
        cta: "See",
      },
      pending: {
        title: "Ratings are still open",
        description: (closes: string) =>
          `${closes}. Then each player’s rating and points move are here.`,
      },
      line: (rated: string, closed: string) =>
        `${rated}. Window closed ${closed}`,
      organizerRated: "Rated by the organizer",
      organizerDidNotRate: "The organizer didn’t rate",
      columns: "rating, points",
      more: (n: number) => `${n} more`,
      row: {
        mvp: "MVP",
        upTo: (band: string) => `Up to ${band}`,
        downTo: (band: string) => `Down to ${band}`,
        nowA: (band: string) => `Now a ${band}`,
        ratings: (n: number) =>
          plural("en", n, { one: "1 rating", other: "{n} ratings" }),
        notRated: "Not rated",
        ratedSpoken: (rating: string) => `rated ${rating}`,
        notRatedSpoken: "no rating",
        pointsSpoken: pointsCount,
        spokenSeparator: ", ",
      },
      outliers: {
        title: (n: number) =>
          plural("en", n, {
            one: "One rater counted for less",
            other: "{n} raters counted for less",
          }),
        description:
          "Their ratings were far from everyone else’s for the third game running. Names stay private, even from you.",
      },
      footer: {
        title: "Something look wrong?",
        description: "Adjust a player from Members, Manage",
        cta: "Members",
      },
      loadFailed: "Couldn’t load the ratings summary",
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
      summaryOrganizerOnly:
        "Only an organizer of this game sees the ratings summary.",
    },
  },
  verifier: {
    kinds: {
      club_staff: "Club staff",
      referee: "Referee",
      coach: "Coach",
    },
    calibrate: {
      action: "Calibrate level",
      title: (sport: string) => `Calibrate ${sport} level`,
      description:
        "As a verifier. The player sees your name, your venue and your reason.",
      saved: (name: string, level: string) =>
        `${name}’s level is calibrated to ${level}`,
      notAllowed: {
        title: "You can’t calibrate this player",
        description:
          "A verifier calibrates a player who played at their venue or belongs to one of its club groups.",
      },
    },
    stamp: {
      action: "Stamp the score",
      note: "As a verifier of this venue. Your stamp is final and completes the match.",
      stamped: "Score stamped",
      stampedBy: (name: string) => `Stamped by ${name}`,
      stampedFinal: (name: string) =>
        `Stamped by ${name}. Nothing else needed.`,
      errors: {
        notVerifier: "Only a verifier of this game’s venue stamps its matches.",
        seated: "You played in this match, so you can’t stamp it.",
        cancelled: "A cancelled match can’t be stamped.",
      },
    },
    toStamp: {
      title: "Matches to stamp",
      note: "Scores entered at your venue, waiting to be agreed. Open one to stamp it.",
      line: (venue: string, day: string | null) =>
        day ? `${venue}, ${day}` : venue,
    },
  },
  dispute: {
    action: "Dispute this result",
    hint: "Think the result is wrong? Tell Temba, and an operator decides.",
    sheetTitle: "Dispute this result",
    sheetDescription: (days: number) =>
      plural("en", days, {
        one: "For a result that counted for Temba Level, within 1 day of the game. If an operator agrees, the score opens again and its Level moves are taken back.",
        other:
          "For a result that counted for Temba Level, within {n} days of the game. If an operator agrees, the score opens again and its Level moves are taken back.",
      }),
    noteLabel: "What’s wrong",
    notePlaceholder: "The score was 6–4, 3–6, 6–2",
    submit: "Send to Temba",
    sent: "Dispute sent. Temba will decide.",
    openByViewer: "You disputed this result. Temba will decide.",
    openByOther: "A player disputed this result. Temba will decide.",
    errors: {
      notCounted: "Only a result that counted for Temba Level can be disputed.",
      notSeated: "Only a player of this match can dispute it.",
      notCompleted: "Only a finished match can be disputed.",
      tooLate: (days: number) =>
        plural("en", days, {
          one: "A result can be disputed for 1 day after the game.",
          other: "A result can be disputed for {n} days after the game.",
        }),
      alreadyOpen: "This result is already disputed. Temba will decide.",
      note: "Say what’s wrong, in 280 characters or fewer.",
      notFound: "Dispute not found.",
      decided: "This dispute is already decided.",
    },
    operator: {
      title: "Disputes",
      description:
        "Results players say are wrong. Upholding opens the score again and takes back its Level moves.",
      settingsSubtitle: "Results players say are wrong",
      errorTitle: "Couldn’t load disputes",
      empty: {
        title: "No open disputes",
        description:
          "When a player disputes a result that counted for Temba Level, it shows here.",
      },
      raisedBy: (name: string, when: string) => `${name} · ${when}`,
      openGame: "Open game",
      uphold: "Uphold",
      dismiss: "Dismiss",
      upholdTitle: "Uphold this dispute?",
      upholdDescription:
        "The score opens again and its Level moves are taken back. The players enter the right score.",
      dismissTitle: "Dismiss this dispute?",
      dismissDescription:
        "The result stands. The player and the game’s organizers are told.",
      upheld: "Dispute upheld. The score is open again.",
      dismissed: "Dispute dismissed. The result stands.",
      notCompleted: "The score is already open again.",
    },
  },
  publicGame: {
    label: "Public game",
    createNote:
      "No group needed. Anyone inside its Level range can join, at a partner venue.",
    createAction: "Create a public game",
    levelRangeNote: "Recommended",
    levelRangeHint:
      "Strangers join a public game. A Level range keeps it even.",
    noPartnerVenues: "No partner venues yet, so a public game can’t be made.",
    noPartnerPitches:
      "No partner venues with a football pitch yet, so a public football game can’t be made.",
    sport: "Sport",
    countsNote:
      "Both sides confirm the score within 24 hours. If not, it stands and doesn’t count.",
    confirmWindow: {
      hours: (n: number) =>
        plural("en", n, { one: "1 hour", other: "{n} hours" }),
      minutes: (n: number) =>
        plural("en", n, { one: "1 minute", other: "{n} minutes" }),
      yours: (left: string) =>
        `${left} left to confirm. If your side doesn’t, the score stands and doesn’t count for Temba Level.`,
      theirs: (left: string) =>
        `${left} left for the other side to confirm. If they don’t, the score stands and doesn’t count for Temba Level.`,
    },
    stood: "Not confirmed in time. It did not count.",
    notInTime: "Not in time",
    hub: {
      emptyTitle: "No public games right now",
      emptyLine:
        "Public games at partner venues show here. Make one and anyone in its Level range can join.",
      emptySportLine: (sport: string) =>
        `${sport} public games at partner venues show here. Make one and anyone in its Level range can join.`,
    },
  },
};
