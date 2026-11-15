import { plural } from "../../plural";

export const mobileBooking = {
  title: "Bookings",
  myBookings: "My bookings",
  upcoming: "Upcoming",
  past: "Past",
  pastBookings: "Past bookings",
  cancellation: "Cancellation",
  status: "Status",
  venue: "Venue",
  finishPayment: "Finish payment",
  openGame: "Open game",
  payAtVenueShort: "Pay at venue",
  payAtTheVenue: "Pay at the venue",
  todayInSentence: "today",
  unavailable: "Unavailable",
  bookTitle: { court: "Book a court", pitch: "Book a pitch" },
  courtStep: { court: "Court", pitch: "Pick a pitch" },
  courtNoun: { court: "Court", pitch: "Pitch" },
  coach: {
    court: "Pick a start time to see which courts are free.",
    pitch: "Pick a start time to see which pitches are free.",
  },
  gameBlurb: {
    football:
      "Turn the booking into a game and Temba handles the roster and invites.",
    padel:
      "Turn the booking into a game and Temba handles seats, invites and the score.",
  },
  timeGroup: { am: "AM", pm: "PM", afterMidnight: "After midnight" },
  shareMessage: (court: string, venue: string, start: string, end: string) =>
    `${court} at ${venue}, ${start} to ${end}`,
  todayDate: (date: string) => `Today, ${date}`,
  tomorrowDate: (date: string) => `Tomorrow, ${date}`,
  whenLine: (day: string, minutes: number) => `${day} / ${minutes} min`,
  slotLine: (day: string, start: string, end: string, minutes: number) =>
    `${day} / ${start} to ${end} / ${minutes} min`,
  placeLine: (day: string, venue: string, court: string) =>
    `${day} / ${venue} / ${court}`,
  untilClock: (clock: string) => `to ${clock}`,
  bookedHeadline: {
    tonight: (court: string) => `${court} is yours tonight.`,
    today: (court: string) => `${court} is yours today.`,
    tomorrow: (court: string) => `${court} is yours tomorrow.`,
    onDay: (court: string, weekday: string) =>
      `${court} is yours on ${weekday}.`,
  },
  payButton: {
    reserveAtVenue: (price: string) => `Reserve, pay ${price} at venue`,
    pay: (price: string) => `Pay ${price}`,
  },
  paymentMethods: {
    card: { title: "Card", detail: "Visa, Mastercard or Amex" },
    benefitDetail: "Bahraini debit card and PIN",
    benefitpayDetail:
      "You will be directed to the BenefitPay app to complete payment",
    applePayDetail: "Stays in the app",
    atVenue: {
      title: "Pay at the venue",
      detail: "Settle at the desk when you arrive",
    },
  },
  clockOnDay: (clock: string, day: string) => `${clock} ${day}`,
  freeCancellationUntil: (deadline: string) =>
    `Free cancellation until ${deadline}.`,
  cancelConsequence: {
    notPaid:
      "You have not paid for this booking, so there is nothing to refund.",
    tooLate: "It is too late for a refund. You will not get any money back.",
    refunded: (amount: string, percent: number) =>
      `You'll be refunded ${amount} (${percent}%).`,
  },
  sort: { label: "Sort", aToZ: "A to Z", cheapest: "Cheapest" },
  midnight: "Midnight",
  am: "AM",
  pm: "PM",
  wallClock: (hour: string, suffix: string) => `${hour} ${suffix}`,
  closed: "Closed",
  hoursWindow: (open: string, close: string) => `${open} to ${close}`,
  hoursSeparator: ", ",
  listSeparator: ", ",
  closedToday: "Closed today",
  openTo: (clock: string) => `Open to ${clock}`,
  venuesEmpty: {
    noMatch: {
      title: "No venue matches",
      description: "Try another area or venue name.",
    },
    noPitches: {
      title: "No pitches to book yet",
      description: "Venues with pitches show here once they open bookings.",
    },
    noVenues: {
      title: "No venues to book yet",
      description: "Venues show here once they open bookings on Temba.",
    },
  },
  pageHints: {
    card: "Enter your card on the payment page, then come back here.",
    benefit:
      "Enter your BENEFIT card and PIN on the payment page, then come back here.",
    benefitpay:
      "Approve in the BenefitPay app or scan the QR code, then come back here.",
    applePay:
      "Confirm with Apple Pay on the payment page, then come back here.",
    generic: "Finish paying on the payment page, then come back here.",
  },
  paymentPageName: "The payment page",
  payment: {
    slow: {
      title: "Still waiting.",
      body: (name: string) =>
        `${name} has not confirmed yet. This can take a minute. Keep this screen open, it updates the moment it lands.`,
      status: "Taking longer than usual",
      hint: "If the payment page showed success but this has not updated, check status. Checking never charges you twice.",
    },
    preparing: {
      title: "Getting the payment page ready.",
      body: "Your court is held while we set up the payment.",
      status: "Preparing",
    },
    open: {
      title: "Finish paying in your browser.",
      body: (hint: string) => `${hint} This screen updates on its own.`,
      statusFor: (name: string) => `Waiting for ${name}`,
      status: "Waiting for payment",
      hint: "Closed the browser by mistake? Open it again below.",
    },
    checking: {
      title: "Checking your payment.",
      body: "This takes a few seconds. Keep this screen open.",
      status: "Confirming",
    },
    failed: {
      title: "Payment did not go through.",
      bodyFor: (name: string) =>
        `Nothing was charged to ${name}. Try again, or pay another way.`,
      body: "Nothing was charged. Try again, or pay another way.",
    },
    expired: {
      title: "Your hold ran out.",
      body: "The court was released so others can book it. Pick a time again.",
    },
  },
  rowTitle: (clock: string, venue: string) => `${clock}, ${venue}`,
  courtMinutes: (court: string, minutes: number) => `${court}, ${minutes} min`,
  badgePlayed: "Played",
  tabWithCount: (label: string, count: string) => `${label}, ${count}`,
  partialCount: (n: number) => `${n}+`,
  bookingsEmpty: {
    upcoming: {
      title: "No upcoming bookings",
      description: "Book a court and it will show here.",
    },
    past: {
      title: "No past bookings",
      description: "Bookings you have played or cancelled show here.",
    },
  },
  startsIn: {
    onNow: "on now",
    minutes: (n: number) => `in ${n} min`,
    hours: (n: number) => `in ${n} h`,
    hoursMinutes: (hours: number, minutes: number) =>
      `in ${hours} h ${minutes} min`,
  },
  count: {
    venues: (n: number) =>
      plural("en", n, { one: "1 venue", other: "{n} venues" }),
    venuesOrMore: (n: number) => `${n}+ venues`,
    bookings: (n: number) =>
      plural("en", n, { one: "1 booking", other: "{n} bookings" }),
    bookingsOrMore: (n: number) => `${n}+ bookings`,
  },
  venues: {
    searchPlaceholder: "Area or venue",
    searchLabel: "Search area or venue",
    sortLabel: "Sort venues",
    loading: "Loading venues",
    loadError: "Venues could not be loaded",
    upcomingLoadError: "Upcoming bookings could not be loaded",
    loadingUpcoming: "Loading upcoming bookings",
    cardLabel: (name: string, city: string, price: string, open: string) =>
      `${name}, ${city}, from ${price} an hour, ${open}`,
    partner: "Partner venue",
    partnerCardLabel: (card: string) => `${card}, partner venue`,
    fromPrefix: "from",
    perHour: "/h",
  },
  venueScreen: {
    notTakingBookings: "This venue is not taking bookings",
    loadError: "The venue could not be loaded",
    day: "Day",
    duration: "Duration",
    startTime: "Start time",
    timesLoadError: "Times could not be loaded",
    nothingOnDay: {
      title: "Nothing to book on this day",
      description:
        "The venue is closed or every time has passed. Pick another day or duration.",
    },
    dayTileLabel: (weekday: string, day: number) => `${weekday} ${day}`,
    timeUnavailable: (clock: string) => `${clock}, unavailable`,
    struckTimesNote: (minutes: number) =>
      `Struck times have no court free for ${minutes} min.`,
    freeAt: (count: string, clock: string) => `${count} free at ${clock}`,
    fullyBookedNote: {
      court: (minutes: number) =>
        `Fully booked courts have no time free for ${minutes} min on this day.`,
      pitch: (minutes: number) =>
        `Fully booked pitches have no time free for ${minutes} min on this day.`,
    },
    goodToKnow: "Good to know",
    venueDetails: "Venue details",
    fullyBooked: "Fully booked",
    taken: "Taken",
    noTimePicked: "No time picked",
    pickStartTime: "Pick a start time",
    footerSlot: (clock: string, minutes: number) => `${clock}, ${minutes} min`,
    footerSlotCourt: (clock: string, minutes: number, court: string) =>
      `${clock}, ${minutes} min, ${court}`,
  },
  checkout: {
    invalidTime: {
      title: "That time is not valid",
      description: "Pick a time again.",
    },
    loadError: "Checkout could not be loaded",
    splitNote: "Split with players after you book.",
    bookingFee: "Booking fee",
    total: "Total",
    notFree: {
      court: "Court not free at this time",
      pitch: "Pitch not free at this time",
    },
    justTaken: (court: string) => `${court} was just taken`,
    notFound: {
      court: "This court was not found",
      pitch: "This pitch was not found",
    },
    notFreeAnyMore: {
      court: (minutes: number) =>
        `It is not free for ${minutes} min at this time any more. Pick another court or time.`,
      pitch: (minutes: number) =>
        `It is not free for ${minutes} min at this time any more. Pick another pitch or time.`,
    },
    pickAgain: "Pick again",
    payWith: "Pay with",
    secureCheckout: "Secure checkout",
  },
  paymentScreen: {
    released: { court: "Court released", pitch: "Pitch released" },
    loadError: "Payment could not be loaded",
    checkError: "Payment could not be checked",
    releaseSlot: "Cancel and release the slot",
    openAgain: (name: string) => `Open ${name} again`,
    openPageAgain: "Open payment page again",
    checkStatusNow: "Check status now",
    paidCheckStatus: "I have paid, check status",
    tryNameAgain: (name: string) => `Try ${name} again`,
    payAnotherWay: "Pay another way",
    pickATime: "Pick a time",
    release: {
      title: { court: "Release this court?", pitch: "Release this pitch?" },
      description: {
        court:
          "Your booking is cancelled and the court goes back on sale for others.",
        pitch:
          "Your booking is cancelled and the pitch goes back on sale for others.",
      },
      confirm: { court: "Release court", pitch: "Release pitch" },
      keepPaying: "Keep paying",
    },
    slotHeldFor: (countdown: string) => `Slot held for ${countdown}`,
    slotHeld: (countdown: string) => `Slot held ${countdown}`,
    payingWith: "Paying with",
    tried: "Tried",
    paymentPage: "Payment page",
    amount: "Amount",
    stillToPay: "Still to pay",
    anotherWay: {
      subtitle: (price: string, countdown: string) =>
        `${price}. Your slot stays held for ${countdown}.`,
      justFailed: "Just failed",
      securePages: "Each way to pay opens its own secure payment page.",
      payWith: (price: string, name: string) => `Pay ${price} with ${name}`,
      pay: "Pay",
    },
  },
  booked: {
    createGame: "Create a game for this booking",
    notNow: "Not now",
    doLater: "You can do this later from your booking.",
    viewBooking: "View booking",
    ref: (ref: string) => `Booked, ref ${ref}`,
    toClockAt: (clock: string, venue: string) => `to ${clock}, ${venue}`,
    pricePaid: (price: string) => `${price} paid.`,
    priceToPayAtVenue: (price: string) => `${price} to pay at the venue.`,
    findUnderBook: "You can find this booking any time under Book.",
    whoIsPlaying: "Who is playing?",
  },
  detail: {
    cancelledToast: "Booking cancelled",
    loadError: "Booking could not be loaded",
    callVenue: "Call venue",
    cancelBooking: "Cancel booking",
    payment: "Payment",
    refundDue: "Refund due",
    cancelSheet: {
      title: "Cancel this booking?",
      released: {
        court: "The court is released for others.",
        pitch: "The pitch is released for others.",
      },
    },
    game: "Game",
    yourGame: "Your game",
    gameCancelled:
      "Your game was cancelled. The court is still yours, so you can set up a new one.",
    holdRanOut: "Your hold ran out",
    heldFor: {
      court: (countdown: string) =>
        `The court is held for you for ${countdown}.`,
      pitch: (countdown: string) =>
        `The pitch is held for you for ${countdown}.`,
    },
    releasedUnpaid: {
      court: "The court was released because payment was not finished.",
      pitch: "The pitch was released because payment was not finished.",
    },
    venueCancelled: "The venue cancelled this booking.",
    youCancelled: "You cancelled this booking.",
    noShow: "Marked as a no-show",
    expired: "This booking expired",
    expiredDescription: "Payment was not finished in time.",
  },
  list: {
    loadError: "Bookings could not be loaded",
    loading: "Loading bookings",
    bookACourt: "Book a court",
    moreLoadError: "More bookings could not be loaded",
    loadMore: "Load more",
  },
  cards: {
    nextBookingLabel: (
      day: string,
      clock: string,
      court: string,
      venue: string,
      badge: string,
    ) => `Next booking, ${day} ${clock}, ${court}, ${venue}, ${badge}`,
    directionsTo: (venue: string) => `Directions to ${venue}`,
    invite: "Invite",
    makeItAGame: "Make it a game",
    rowLabel: (
      weekday: string,
      day: string,
      title: string,
      detail: string,
      badge: string,
    ) => `${weekday} ${day}, ${title}, ${detail}, ${badge}`,
  },
  openingHours: "Opening hours",
  weekdayShort: (weekday: number) =>
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][weekday] ?? "",
};
