import { plural } from "../../plural";

export const mobileHome = {
  join: {
    labelValue: (label: string, value: string) => `${label} ${value}`,
    parts: (parts: string[]) => parts.join(", "),
    nameWithDetail: (name: string, detail: string) => `${name}, ${detail}`,
  },
  block: {
    couldNotLoad: (title: string) => `${title} could not be loaded`,
  },
  placeholder: {
    comingSoon: "Coming soon.",
  },
  authScreen: {
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
  },
  welcome: {
    headline: "Find a game, fill the court, keep the score.",
    body: "Open padel and football games near you, your regular Groups, and a Level that follows your results.",
    tonightLabel: "Tonight, Karbabad 9:00 PM",
    oneOpen: "1 open",
    continueWithPhone: "Continue with phone",
  },
  oauth: {
    or: "OR",
    continueWithGoogle: "Continue with Google",
  },
  terms: {
    title: "Terms and Conditions",
    lastUpdated: (date: string) => `Last updated ${date}`,
    description: "What you agree to when you create an account or use Temba.",
    agreeAndContinue: "Agree and continue",
    englishGoverns: "The English text governs.",
  },
  termsMicrocopy: {
    before: (age: number) =>
      `By continuing you confirm you are ${age} or older and agree to the `,
    termsLink: "Terms",
    after: " and Privacy Policy.",
  },
  fields: {
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    mobileNumber: "Mobile number",
    password: "Password",
    newPassword: "New password",
    createPassword: "Create a password",
    enterYourPassword: "Enter your password",
    atLeastEightCharacters: "At least 8 characters",
  },
  passwordField: {
    show: "Show password",
    hide: "Hide password",
    strengthHint:
      "At least 8 characters. Mix in a number or symbol to make it strong.",
  },
  phoneField: {
    countryCode: (country: string) => `Country code, ${country}`,
    countryCodeTitle: "Country code",
  },
  code: {
    enterTheCode: "Enter the code",
    sentTo: (destination: string) => `Sent to ${destination}.`,
    codeLabel: "Six digit code",
    verify: "Verify",
    unlocksAtSixDigits: "Button unlocks at six digits",
    newCodeSent: "New code sent",
    changeEmail: "Change email",
    changeNumber: "Change number",
    yourEmail: "your email",
    yourNumber: "your number",
    expiryEmail:
      "Codes expire after a short time. Too many wrong tries will lock this email.",
    expiryNumber:
      "Codes expire after a short time. Too many wrong tries will lock this number.",
    expiryAccount:
      "Codes expire after a short time. Too many wrong tries will lock this account.",
  },
  signIn: {
    whatsYourNumber: "What's your number?",
    numberDescription:
      "Known numbers sign in with a password. If the number is new to us, we text a six digit code and create your account.",
    invitedToGroup: "Invited to a Group? Open your invite link.",
    smsRates: "Standard SMS rates may apply.",
    noPassword: "This account has no password. Sign in with Google instead.",
    enterYourPassword: "Enter your password",
    forPhone: (phone: string) => `For ${phone}.`,
    forgotPassword: "Forgot password?",
    toResetPassword: "To reset your password.",
    pickNewPassword: "Pick a new password",
    forPhoneOtherDevices: (phone: string) =>
      `For ${phone}. Other devices will be signed out.`,
    saveAndSignIn: "Save and sign in",
    yourName: "Your name",
    nameFooter:
      "Photo, email, sports and level can be added later from Profile.",
    preview: "Preview",
    pickPassword: "Pick a password",
    pickPasswordDescription: "For signing in on a new phone.",
    createAccount: "Create account",
    changeLaterFromSettings: "You can change it later from Settings.",
  },
  nameForm: {
    title: "What should we call you?",
  },
  continue: {
    almostThere: "Almost there",
    startOver: "Finish creating your account, or start from the beginning.",
    fewDetails: "A few details are still needed to finish your account.",
  },
  factorTwo: {
    checkYourPhone: "Check your phone",
    startFromSignIn: "Start from sign in to continue.",
    differentAccount: "Sign in with a different account",
  },
  gate: {
    setupCouldNotLoad: "Setup could not be loaded",
    takingLongerTitle: "Setup is taking longer than usual",
    takingLongerBody:
      "Your Temba account is still being created. Try again, or sign out and come back later.",
    settingUpTitle: "Setting up your account",
    settingUpBody:
      "Your Temba account is still being created. This only takes a moment after sign-up.",
  },
  questionnaire: {
    saveSports: "Save sports",
    levelAlreadySet: {
      padel:
        "Your padel Level is already set, so this step only saves the rest.",
      football:
        "Your football Level is already set, so this step only saves the rest.",
    },
    preferenceHint: "a preference, not a promise",
    sports: {
      title: "What do you play?",
      description:
        "Pick one or both. Each sport keeps its own Level and its own Games list.",
      note: "Groups and bookings stay separate per sport.",
    },
    padel: {
      title: "Where would you place yourself?",
      description: "A starting point only. Rated matches confirm it.",
      pickLevel: "Pick a Level",
      levelLabel: "Padel Level",
      preferredSide: "Preferred side",
    },
    football: {
      title: "How do you line up?",
      description:
        "Organizers use this to balance teams. You can change it per Game.",
      usuallyJoinAs: "Usually join as",
      roleLabel: "Football role",
      keeperSeats: "Keeper seats are limited to two a Game, one for each side.",
      preferredPosition: "Preferred position",
      positionLabel: "Preferred football position",
      yourLevel: "Your level",
      selfPlaced:
        "Self-placed for now. It balances teams until football results are rated.",
    },
  },
  header: {
    invitesWaiting: (n: number) =>
      plural("en", n, {
        one: "Invites, 1 waiting",
        other: "Invites, {n} waiting",
      }),
    notificationsUnread: "Notifications, unread",
  },
  notifications: {
    loadFailed: "Notifications could not be loaded",
    empty: {
      title: "No notifications yet",
      description:
        "When someone joins a Group or Game you run, it shows up here.",
    },
    markAllRead: "Mark all as read",
    unread: "Unread",
  },
  upNext: {
    title: "Up next",
    nothingThisWeek: "Nothing this week",
    thisWeek: (n: number) => `${n} this week`,
    kind: {
      booking: "Booking",
      tournament: "Tournament",
    },
    withEmphasis: (emphasis: string) => `, ${emphasis}`,
    bookingDetail: (court: string, minutes: number) =>
      `${court}, ${minutes} min`,
    bookingHeroSpoken: (
      day: string,
      time: string,
      court: string,
      venue: string,
    ) => `Next up, booking, ${day} ${time}, ${court}, ${venue}`,
    heroSpoken: (title: string, day: string, time: string) =>
      `Next up, ${title}, ${day} ${time}`,
    gameHeroSpoken: (title: string, day: string, time: string, place: string) =>
      `Next up, ${title}, ${day} ${time}, ${place}`,
    invite: "Invite",
    details: "Details",
    allBookingsAndGames: "All bookings and games",
    book: {
      padel: "Book padel",
      football: "Book football",
    },
    thisWeekTag: "This week",
    free: "Free",
    weekOpen: "Your week\nis open.",
    emptyBody: "Book a court, join an open game, or start one with your group.",
    findAGame: "Find a game",
  },
  venues: {
    none: "No venues yet",
    nearby: (n: number) =>
      plural("en", n, { one: "1 venue nearby", other: "{n} venues nearby" }),
  },
  standing: {
    title: "Standing",
    groupCount: (n: number) =>
      plural("en", n, { one: "1 group", other: "{n} groups" }),
    rowSpoken: (group: string, rank: string, ofCount: string) =>
      `${group}, ${rank} ${ofCount}`,
  },
  level: {
    noLevel: {
      padel: "Play a rated padel game and your padel Level appears.",
      football: "Play a rated football game and your football Level appears.",
    },
    bandSpoken: (band: string) => `Level band ${band}`,
    bandLevelSpoken: (band: string, level: string) =>
      `Level band ${band}, Level ${level}`,
    changeSpoken: (spoken: string, amount: string, window: string) =>
      `${spoken} ${amount}, ${window}`,
  },
  recentForm: {
    title: "Recent form",
    lastTen: "Last 10 matches",
    played: "Played",
    won: "Won",
    lost: "Lost",
  },
  allTime: {
    matches: (n: number) => plural("en", n, { one: "match", other: "matches" }),
    matchesSpoken: (n: number) =>
      plural("en", n, { one: "1 match", other: "{n} matches" }),
    percentWon: (percent: number) => `${percent}% won`,
    longestStreak: "Longest streak",
  },
  profileHeader: {
    addPhoto: "Add profile photo",
    editPhoto: "Edit profile photo",
  },
  photo: {
    cameraDenied:
      "Allow camera access in Settings to take a photo, or choose one from your library.",
    unreadable: "That photo could not be read. Try another one.",
  },
  settings: {
    preferredPosition: "Preferred Position",
    preferredPositionHint: "Your default side when you pick a Game seat",
    rowSpoken: (title: string, subtitle: string) => `${title}. ${subtitle}`,
    rowSpokenCount: (title: string, count: number, subtitle: string) =>
      `${title}, ${count}. ${subtitle}`,
    completeProfileHint: "Photo, email, sports and level",
    myBookings: "My bookings",
    myBookingsHint: "Upcoming and past court bookings",
    invitesHint: "Lookup invites addressed to you",
    termsHint: "What you agree to by using Temba",
  },
  checklist: {
    title: "Complete your profile",
    taskSpoken: (title: string, description: string) =>
      `${title}. ${description}`,
    chipSpoken: (done: number, total: number) =>
      `Profile ${done} of ${total}. Show the checklist`,
    progressSpoken: (done: number, total: number) =>
      `Profile ${done} of ${total} done`,
    moreSpoken: (more: string) => `${more}. Open the checklist`,
    skipForNow: "Skip for now",
  },
  tasks: {
    short: {
      name: "Name",
      photo: "Photo",
      email: "Email",
      sports: "Sports",
    },
    shortList: (names: string[]) => names.join(", "),
    chipLabel: (done: number, total: number) =>
      `Profile ${done} OF ${total} · Show`,
    sportsMeta: (step: number, total: number) =>
      `Profile / Sports ${step} of ${total}`,
    skip: "Skip",
    completeProfile: "Complete profile",
    laterShowGames: "Later, show me games",
    youAreInBody:
      "Your account works as it is. A fuller profile gets you matched games, a rating and receipts by email.",
    countDone: (count: string) => `${count} done`,
    doneAtSignUp: "Done at sign up",
    heading: "Tasks",
    notNow: "Not now",
  },
  emailTask: {
    meta: "Profile / Email",
    title: "Add your email",
    description:
      "For booking receipts, and a way back into your account if you change number. We send a six digit code to confirm it.",
    sendCode: "Send code",
    enterEmail: "Enter your email",
    checkInbox: "Check your inbox",
    inboxFooter:
      "Until verified, the email is saved but unused. Check spam if nothing arrives in a minute.",
    benefits: {
      receipts: {
        lead: "Receipts.",
        text: "Every booking and seat payment, in your inbox.",
      },
      recovery: {
        lead: "Recovery.",
        text: "Sign in by email if your number changes.",
      },
      private: {
        lead: "Private.",
        text: "Never shown to other members.",
      },
    },
  },
  nameTask: {
    meta: "Profile / Name",
    save: "Save name",
  },
  photoTask: {
    meta: "Profile / Photo",
    title: "Add a photo",
    description:
      "A clear face shot helps organizers spot you at the court. Shown to group members and people in your games.",
    save: "Save photo",
    newPhotoSpoken: "Your new profile photo",
    noPhotoSpoken: "No photo yet",
    placeholder: "Profile photo",
    untilThen: (initials: string) => `Until then you show as ${initials}`,
    takePhoto: "Take a photo",
    chooseFromLibrary: "Choose from library",
  },
};
