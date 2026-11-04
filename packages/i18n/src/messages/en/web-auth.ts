import { plural } from "../../plural";

export const webAuth = {
  screen: {
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
  },
  welcome: {
    headline: "Find a game,\nfill the court,\nkeep the score.",
    tagline:
      "Open padel and football games near you, your regular Groups, and a Level that follows your results.",
    sportsLabel: "Sports",
    continueWithPhone: "Continue with phone",
  },
  termsNote: {
    consent: (age: number) =>
      `By continuing you confirm you are ${age} or older and agree to the {terms} and {privacy}.`,
    termsLink: "Terms",
    privacyLink: "Privacy Policy",
    smsRates: "Standard SMS rates may apply.",
  },
  oauth: {
    or: "OR",
    continueWithGoogle: "Continue with Google",
  },
  sso: {
    finishingSignIn: "Finishing sign in…",
    signingIn: "Signing in",
    creatingAccount: "Creating account",
  },
  phoneField: {
    countryCode: (country: string, code: string) =>
      `Country calling code, currently ${country} +${code}`,
  },
  password: {
    show: "Show password",
    hide: "Hide password",
    strength: (label: string) => `Password strength: ${label}`,
    placeholder: (min: number) => `At least ${min} characters`,
  },
  resend: {
    newCodeSent: "New code sent",
  },
  verify: {
    sentTo: (destination: string) => `Sent to ${destination}.`,
    verify: "Verify",
    verifying: "Verifying…",
    helper: "Button unlocks at six digits",
  },
  phoneAuth: {
    noPasswordUseGoogle:
      "This account has no password. Sign in with Google instead.",
    preview: "Preview",
    yourName: "Your name",
    forNumber: (phone: string) => `For ${phone}.`,
    passwordLabel: "Password",
    enterPassword: "Enter your password",
    signingIn: "Signing in…",
    forgotPassword: "Forgot password?",
    changeNumber: "Change number",
    toResetPassword: "To reset your password.",
    codesExpire: {
      number:
        "Codes expire after a short time. Too many wrong tries will lock this number.",
      email:
        "Codes expire after a short time. Too many wrong tries will lock this email.",
      account:
        "Codes expire after a short time. Too many wrong tries will lock this account.",
    },
    forNumberSignsOutOthers: (phone: string) =>
      `For ${phone}. Other devices will be signed out.`,
    newPasswordLabel: "New password",
    saveAndSignIn: "Save and sign in",
    firstName: "First name",
    lastName: "Last name",
    addLaterFromProfile:
      "Photo, email, sports and level can be added later from Profile.",
    newPasswordDescription: "For signing in on a new phone.",
    creatingAccount: "Creating account…",
    createAccount: "Create account",
    changeLaterFromSettings: "You can change it later from Settings.",
    phoneDescription:
      "Known numbers sign in with a password. If the number is new to us, we text a six digit code and create your account.",
    invitedToGroup: "Invited to a Group?",
    openInviteLink: "Open your invite link.",
    mobileNumber: "Mobile number",
    checking: "Checking…",
  },
  signUpContinue: {
    almostThere: "Almost there",
    finishOrStart: "Finish creating your account, or start from the beginning.",
    startFrom: "Start from {phone} or continue with Google.",
    yourPhoneNumber: "your phone number",
    yourEmail: "your email",
    yourNumber: "your number",
    enterTheCode: "Enter the code",
    changeEmail: "Change email",
    detailsNeeded: "A few details are still needed to finish your account.",
    email: "Email",
    continuing: "Continuing…",
  },
  secondFactor: {
    checkYourPhone: "Check your phone",
    startFromSignIn: "Start from sign in to continue.",
    differentAccount: "Sign in with a different account",
  },
  onboarding: {
    eyebrow: {
      sports: (step: number, total: number) =>
        `Profile / Sports ${step} of ${total}`,
      name: "Profile / Name",
      photo: "Profile / Photo",
      email: "Profile / Email",
    },
    levelAlreadySet: {
      padel:
        "Your padel Level is already set, so this step only saves the rest.",
      football:
        "Your football Level is already set, so this step only saves the rest.",
    },
    saveSports: "Save sports",
    sports: {
      metaTitle: "Pick your sports",
      title: "What do you play?",
      description:
        "Pick one or both. Each sport keeps its own Level and its own Games list.",
      separateNote: "Groups and bookings stay separate per sport.",
    },
    padel: {
      title: "Where would you place yourself?",
      description: "A starting point only. Rated matches confirm it.",
      levelLabel: "Padel Level",
      preferredSide: "Preferred side",
      preferenceHint: "a preference, not a promise",
      pickALevel: "Pick a Level",
    },
    football: {
      title: "How do you line up?",
      description:
        "Organizers use this to balance teams. You can change it per Game.",
      usuallyJoinAs: "Usually join as",
      roleLabel: "Football role",
      keeperSeatsNote:
        "Keeper seats are limited to two a Game, one for each side.",
      preferredPosition: "Preferred position",
      positionLabel: "Preferred football position",
      yourLevel: "Your level",
      levelLabel: "Football level",
      selfPlacedNote:
        "Self-placed for now. It balances teams until football results are rated.",
    },
    name: {
      title: "Add your name",
      description: "Shown to organizers and the people you play with.",
      saveName: "Save name",
    },
    photo: {
      title: "Add a photo",
      description:
        "A clear face shot helps organizers spot you at the court. Shown to Group members and people in your Games.",
      chosenAlt: "Your chosen photo",
      currentAlt: "Your current profile photo",
      placeholder: "Profile photo",
      untilThenShownAs: "Until then you show as {initials}.",
      chooseDifferent: "Choose a different photo",
      choose: "Choose a photo",
      saving: "Saving photo…",
      save: "Save photo",
    },
    email: {
      benefits: {
        receipts: {
          lead: "Receipts.",
          rest: "Every booking and seat payment, in your inbox.",
        },
        recovery: {
          lead: "Recovery.",
          rest: "Sign in by email if your number changes.",
        },
        private: {
          lead: "Private.",
          rest: "Never shown to other members.",
        },
      },
      enterYourEmail: "Enter your email",
      checkYourInbox: "Check your inbox",
      unverifiedNote: "Until verified, the email is saved but unused.",
      verifyEmail: "Verify email",
      spamHelper: "Check spam if nothing arrives in a minute.",
      title: "Add your email",
      description:
        "For booking receipts, and a way back into your account if you change number. We send a six digit code to confirm it.",
      emailLabel: "Email",
      sendingCode: "Sending code…",
      sendCode: "Send code",
    },
    checklist: {
      skip: "Skip",
      profile: "Profile",
      tasksLabel: "Profile tasks",
      completeProfile: "Complete profile",
      laterShowGames: "Later, show me games",
      nameLabel: "Name",
      mobileNumberLabel: "Mobile number",
      countDone: (count: string) => `${count} done`,
      title: "Complete your profile",
      doneAtSignUp: "Done at sign up",
      tasks: "Tasks",
    },
    gate: {
      loadFailed: "Setup could not be loaded",
      stalledTitle: "Setup is taking longer than usual",
      stalledMessage:
        "Your Temba account is still being created. Try again, or sign out and come back later.",
      signingOut: "Signing out…",
      settingUp: "Setting up your account",
      creatingNote:
        "Your Temba account is still being created. This only takes a moment after sign-up, and the page opens on its own.",
    },
    notNow: "Not now",
  },
  home: {
    upNext: "Up next",
    nothingThisWeek: "Nothing this week",
    thisWeekCount: (n: number) => `${n} this week`,
    onNow: "on now",
    inMinutes: (minutes: number) => `in ${minutes} min`,
    inHours: (hours: number) => `in ${hours} h`,
    inHoursMinutes: (hours: number, minutes: number) =>
      `in ${hours} h ${minutes} min`,
    rosterOf: (registered: number, allowed: number) =>
      `${registered} of ${allowed}`,
    rosterPlayers: (registered: number, allowed: number) =>
      `${registered} of ${allowed} players`,
    kind: {
      game: "Game",
      tournament: "Tournament",
    },
    toTime: (time: string) => `to ${time}`,
    nextUpSpoken: (title: string, day: string, time: string) =>
      `Next up, ${title}, ${day} ${time}`,
    nextUpSpokenAt: (title: string, day: string, time: string, place: string) =>
      `Next up, ${title}, ${day} ${time}, ${place}`,
    details: "Details",
    allGames: "All games",
    empty: {
      thisWeek: "This week",
      free: "Free",
      headline: "Your week\nis open.",
      description: "Join an open game, or start one with your group.",
      findAGame: "Find a game",
    },
    noLevel: {
      padel: "Play a rated padel game and your padel Level appears.",
      football: "Play a rated football game and your football Level appears.",
    },
    levelBandSpoken: "Level band",
    groupsCount: (n: number) =>
      plural("en", n, { one: "1 group", other: "{n} groups" }),
    standing: "Standing",
    recentForm: {
      title: "Recent form",
      lastTen: "Last 10 matches",
      record: "Record",
      played: "Played",
      won: "Won",
      lost: "Lost",
      slot: {
        notPlayed: "Not played",
        won: "Won",
        lost: "Lost",
        drawn: "Drawn",
      },
    },
    couldNotLoad: (title: string) => `${title} could not be loaded`,
    declare: {
      levelSaved: "Level saved",
      title: "Declare your Level",
      description: {
        padel:
          "Place yourself on the padel ladder. You can do this once, before you have a Rated Match.",
        football:
          "Place yourself on the football ladder. You can do this once, before you have a Rated Match.",
      },
      button: "Declare Level",
    },
    checklist: {
      shortName: {
        name: "Name",
        photo: "Photo",
        email: "Email",
        sports: "Sports",
      },
      label: "Profile checklist",
      profile: "Profile",
      show: "Show",
      title: "Complete your profile",
      skipForNow: "Skip for now",
    },
  },
  invites: {
    previewFailed: "Couldn't load this invite",
    checkConnection: "Check your connection and try again.",
    invitations: "Invitations",
    invitationsFailed: "Invitations could not be loaded",
    invitedBy: (name: string) => `Invited by ${name}`,
    acceptInviteTo: (title: string) => `Accept the invite to ${title}`,
    accepting: "Accepting…",
    signInToJoin: (name: string) =>
      `Sign in or create an account to join ${name}.`,
    couldNotJoin: "Could not join",
    joining: (name: string) => `Joining ${name}…`,
    joiningShort: "Joining…",
    request: {
      approve: (name: string) => `Approve ${name}'s request`,
      reject: (name: string) => `Reject ${name}'s request`,
      approving: "Approving…",
      approveLabel: "Approve",
      rejecting: "Rejecting…",
      rejectLabel: "Reject",
      rejectConfirm: (name: string) => `Reject ${name}'s request?`,
      canAskAgain: "They can ask again later.",
    },
    lookup: {
      searchUsers: "Search Users",
      searching: "Searching…",
      noMatch: "No Users match.",
    },
    requestSent: "Request sent",
    football: {
      pickRole: "Pick player or keeper, and the position you prefer.",
      chooseHowYouPlay: "Choose how you play",
      teamsSet: "Set",
      teamsByOrganizer: "Made by the organizer",
    },
    seatsOpen: (n: number) =>
      plural("en", n, { one: "1 seat open.", other: "{n} seats open." }),
    door: {
      cancelInviteFor: (name: string) => `Cancel invite for ${name}`,
      invite: (name: string) => `Invite ${name}`,
      searchPlaceholder: "Name or phone number",
      searchLabel: "Search players",
      phoneNumber: "Phone number",
      copyLink: "Copy link",
      shareLink: "Share link",
      messages: "Messages",
      userFallback: "User",
      description: "Invite players to join.",
    },
  },
  you: {
    recentFormFailed: "Recent form could not be loaded",
    declareDialog: {
      description: {
        padel:
          "Place yourself on the padel ladder once. Pick a Level band, or I don’t know if you are unsure.",
        football:
          "Place yourself on the football ladder once. Pick how you play; it balances teams until football results are rated.",
      },
      howYouPlay: "How you play",
      levelBand: "Level band",
      saveLevel: "Save Level",
    },
    allTime: {
      matches: "matches",
      percentWon: (percent: number) => `${percent}% won`,
      longestStreak: "Longest streak",
      failed: "All time could not be loaded",
    },
    identity: {
      editPhoto: "Edit profile photo",
      addPhoto: "Add profile photo",
    },
    level: {
      bandLevelSpoken: (band: string, level: string) =>
        `${band}, Level ${level}`,
      lastMatch: "last match",
      failed: "Level could not be loaded",
    },
  },
  settings: {
    preferredPosition: {
      title: "Preferred Position",
      description: "Your default side when you pick a Game seat",
    },
    language: {
      title: "App Language",
      description: "Menus, messages and dates follow this language",
    },
    signingOut: "Signing out…",
  },
  legal: {
    englishGoverns: "The English text governs.",
    termsTitle: "Terms and Conditions",
    lastUpdated: (date: string) => `Last updated ${date}`,
    termsDescription:
      "What you agree to when you create an account or use Temba.",
    privacyTitle: "Privacy Policy",
    privacyFinalising: "We're finalising this page. Check back soon.",
  },
  errors: {
    pageFailedTitle: "This page could not be loaded",
    pageFailedMessage: "Try again, or go back to the previous page.",
    globalMessage: "Temba could not load. Try again in a moment.",
    globalTitle: "Something went wrong · Temba",
  },
  notFound: {
    description: "This page does not exist or is no longer available.",
    goToTemba: "Go to Temba",
  },
};
