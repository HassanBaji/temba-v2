import { plural } from "../../plural";

/** The Venue console's frame: sign-in, the rail, navigation and shared states. */
export const consoleShell = {
  metaTitle: "Venue console · Temba",
  metaTitleTemplate: (page: string) => `${page} · Venue console · Temba`,
  metaDescription:
    "Run your Venue on Temba: schedule, Bookings, Courts and pricing.",
  login: {
    intro: "Venue console. Sign in with the Temba account you play with.",
  },
  nav: {
    label: "Venue sections",
    schedule: "Schedule",
    bookings: "Bookings",
    courts: "Courts & pricing",
    hours: "Hours & closures",
    customers: "Customers",
    staff: "Staff & roles",
    reports: "Reports",
    payouts: "Payouts",
    photos: "Photos",
    groups: "Groups",
    details: "Venue details",
  },
  venueSwitcher: {
    label: "Switch Venue",
    yourVenues: "Your Venues",
    courtCount: (count: number) =>
      plural("en", count, { one: "1 court", other: "{n} courts" }),
    courtsAndCity: (courts: string, city: string) => `${courts}, ${city}`,
  },
  account: {
    label: "Account",
    fallbackName: "You",
    operator: "Operator",
    manager: "Manager",
    backToTemba: "Back to Temba",
    signOut: "Sign out",
    language: "Language",
  },
  noVenues: {
    title: "No Venues to manage",
    description:
      "An Operator can make you a Venue manager. Until then there is nothing to run here.",
    backToTemba: "Back to Temba",
  },
  venueLoadError: "Venue could not be loaded",
  venuesLoadError: "Venues could not be loaded",
  notFound: {
    title: "Not found",
    description: "That Venue or page does not exist, or you do not manage it.",
    yourVenues: "Your Venues",
  },
  errors: {
    title: "Something went wrong",
    generic: "Something went wrong. Try again.",
    tryAgain: "Try again",
    titleWithStop: (title: string) => `${title}.`,
  },
  confirm: {
    pending: (label: string) => `${label}…`,
  },
  moreActions: "More actions",
  close: "Close",
  payouts: {
    title: "Payouts",
    description:
      "In-app payments settle through Tap. Desk and phone bookings are not in these numbers.",
    emptyTitle: "No payouts yet",
    emptyDescription:
      "Payouts arrive once provider settlement reporting is wired; in-app payments settle through Tap.",
  },
  reports: {
    title: "Reports",
    description:
      "Occupancy and revenue, with the Temba effect broken out: how many hours came from open and group games.",
    emptyTitle: "No reports yet",
    emptyDescription: "Reports arrive with the Venue reports ticket (TEM-369).",
  },
  clock: {
    am: "AM",
    pm: "PM",
    range: (start: string, end: string) => `${start} to ${end}`,
    nextDay: (clock: string) => `${clock} (next day)`,
  },
  weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  weekdaysLong: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ],
};
