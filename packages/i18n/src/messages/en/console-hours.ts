import { plural } from "../../plural";

/** The Venue console's Hours & closures page. */
export const consoleHours = {
  pageTitle: "Hours & closures",
  pageDescription:
    "Opening hours set what players can book. Closures block courts without touching the hours.",
  weekly: {
    title: "Weekly hours",
    closed: "Closed",
    addWindow: "Add window",
    none: "—",
    opens: (day: string, n: number) => `${day} window ${n} opens`,
    closes: (day: string, n: number) => `${day} window ${n} closes`,
    remove: (day: string, n: number, range: string) =>
      `Remove ${day} window ${n} (${range})`,
    copyLabel: (day: string) => `Copy ${day} to every day`,
    copy: "Copy to every day",
    footer: "Changes apply to new bookings only.",
    save: "Save hours",
    savedToast: "Hours saved",
    openHours: (hours: string) => `${hours}h`,
    closeAfterOpen: "Closing time must be after opening time",
    offGrid: (n: number) => `Times must fall on the ${n}-minute grid`,
    overlap: "Opening windows on the same day must not overlap",
  },
  closures: {
    title: "Closures",
    add: "Add closure",
    adding: "Adding…",
    addedToast: "Closure added",
    removedToast: "Closure removed",
    chooseTimes: "Choose when the Closure starts and ends",
    none: "No Closures in the next 90 days.",
    active: "Active",
    scheduled: "Scheduled",
    actions: (closure: string) => `${closure} actions`,
    remove: "Remove closure",
    conflicts: (count: number) =>
      plural("en", count, {
        one: "1 Booking falls inside this Closure",
        other: "{n} Bookings fall inside this Closure",
      }),
    conflictsHelp:
      "They stay confirmed until you cancel them from the Bookings page.",
    bookingRef: (ref: string) => `Booking ${ref}`,
    dismiss: "Dismiss",
    newClosure: "New closure",
    appliesTo: "Closure applies to",
    reason: "Reason",
    from: "From",
    to: "To",
    timezoneNote:
      "Times are in Bahrain time. Existing bookings inside the window are listed once the closure is added; they stay confirmed until you cancel them from the Bookings page.",
    removeTitle: "Remove this closure?",
    removeDescription: (closure: string, when: string) =>
      `${closure}, ${when}. The time becomes bookable again.`,
    withReason: (scope: string, reason: string) => `${scope}, ${reason}`,
    today: "Today",
    tomorrow: "Tomorrow",
    allDay: "all day",
    dayAndDate: (weekday: string, day: number) => `${weekday} ${day}`,
    window: (days: string, times: string) => `${days}, ${times}`,
    dayRange: (from: string, to: string) => `${from} to ${to}`,
  },
};
