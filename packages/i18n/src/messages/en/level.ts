export const level = {
  negative: "Level cannot be negative",
  oneDecimal: "Use one decimal place",
  invalid: "Enter a valid Level",
  between: "Level must be between 0.0 and 7.0",
  rangeFieldDescription:
    "Optional. Inclusive Level bands. None means no bound. Both None means no Level range. Users without a Level must request to play when a range is set.",
  rangeInverted: "Minimum Level cannot be greater than Maximum Level",
  rangeOutside: "Your Level is outside this Game's range",
  rangeOutsideParty: "A User's Level is outside this Game's range",
  rangePartner: "That User's Level is outside this Game's range",
  rangeTeam: "A Team partner's Level is outside this Game's range",
  andUp: (band: string) => `${band} and up`,
  andUnder: (band: string) => `${band} and under`,
  prose: (label: string) => `Level ${label}`,
  gateNoLevel:
    "You don't have a Level yet. Declare one on You, or request to play.",
  gate: (range: string, band: string) =>
    `This Game is for ${range}. Your Level is ${band}.`,
  gateRangeFallback: "this Game's range",
  request: {
    title: "Request to play",
    sent: "Request sent",
    again: "Request again",
    pending: "Pending",
    rejected: "Rejected",
    noLevel: "No Level",
    provisional: "Provisional",
  },
  overrideReason: {
    newToGroup: "New to the Group",
    playsAboveResults: "Plays above results",
    playsBelowResults: "Plays below results",
    backFromInjury: "Back from injury",
    correctingAMistake: "Correcting a mistake",
  },
  overrideCaption: (who: string, when: string) => `Set by ${who}, ${when}`,
  overrideByYou: "you",
};
