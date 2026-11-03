import { plural } from "../../plural";

export const webDashboard = {
  backToHome: "Back to Home",
  backToGroup: "Back to Group",
  creating: "Creating…",
  meta: {
    player: "Player",
    venues: "Venues",
  },
  error: {
    title: "Error",
    pageTitle: "This page could not be loaded",
    message: "Try again, or use the navigation to open another page.",
  },
  notFound: {
    title: "Not found",
    description: "This page does not exist or is no longer available.",
  },
  home: {
    upNext: "Up next",
    yourSport: "Your sport",
    recentForm: "Recent form",
  },
  communities: {
    limited: {
      title: "Communities list is limited",
      description: "This list is set up by Temba staff.",
    },
    new: {
      name: "Name",
      type: "Type",
    },
  },
  community: {
    actionsLabel: "Community actions",
    allCommunities: "All Communities",
  },
  games: {
    errorTitle: "Games could not be loaded",
    loadMore: "Load more",
    scoreConfirmedToast: "Score confirmed",
    createAction: "Create Game",
    tabs: {
      upcoming: "Upcoming",
      played: "Played",
    },
  },
  group: {
    errorTitle: "Group could not be loaded",
    theVenue: "the Venue",
    urlCopied: "Group URL copied",
    edit: {
      ownerOnly: {
        title: "Only the owner can edit this Group",
        message: "Ask the Group owner to change its settings.",
      },
    },
  },
  groups: {
    errorTitle: "Groups could not be loaded",
    publicErrorTitle: "Public Groups could not be loaded",
    filterBySport: "Filter by sport",
    nextGame: "Next Game",
    yourFormHere: "your form here",
    start: {
      title: "Start a group",
      description:
        "Choose padel or football, invite players, and Temba keeps the standing and history.",
    },
    tabs: {
      mine: "Mine",
      public: "Public",
    },
  },
  setLevel: {
    title: "Set Level",
    backToMembers: "Back to Members",
    cannotSet: {
      title: "Level can't be set",
      description:
        "This person isn't a member whose Level you can set in this Group.",
    },
  },
  seasons: {
    title: "Seasons",
    errorTitle: "Seasons could not be loaded",
    empty: "No seasons yet. The standing counts every game ever played.",
    newSeason: "New season",
    scoring: "Scoring",
    pointsPerGame: "Points per game",
    winDrawLoss: "Win, draw, loss",
    close: {
      ends: "Ends",
      leader: "Leader",
      leaderValue: (name: string, points: number) => `${name}, ${points} pts`,
      nobodyRanked: "Nobody ranked yet",
      levels: "Levels",
      unchanged: "Unchanged",
      confirm: "Close season and lock standing",
      keepOpen: "Keep it open",
    },
    new: {
      title: "New season",
      backToSeasons: "Back to Seasons",
      name: "Name",
      nameRequired: "Give the season a name.",
      starts: "Starts",
      ends: "Ends",
      preview: "Preview",
      create: (name: string) => `Create ${name}`,
      seasonWord: "season",
      ownerOnly: "Only the Group owner can open a season",
    },
  },
  invites: {
    description: "Invites sent to you. Accept one to join.",
    acceptInviteTo: (title: string) => `Accept the invite to ${title}`,
    accepting: "Accepting…",
  },
  notifications: {
    unread: "Unread",
    errorTitle: "Notifications could not be loaded",
    empty: {
      title: "No notifications yet",
      description:
        "When someone joins a Group or Game you run, it shows up here.",
    },
    marking: "Marking…",
    markAllRead: "Mark all as read",
  },
  operator: {
    groups: {
      title: "Verify Groups",
      description:
        "Only a Verified Group can host Rated Games and open a Game to anyone with the link. Removing verification leaves existing Games unchanged.",
      verifiedToast: "Group verified",
      unverifiedToast: "Verification removed",
      searchLabel: "Search Groups",
      searchPlaceholder: "Search by Group name",
      empty: {
        title: "No Groups found",
        tryOther: "Try a different name.",
        none: "Groups will show up here once they are created.",
      },
      clubGroupOf: (community: string) => `Club Group of ${community}`,
      clubGroupOfArchived: (community: string) =>
        `Club Group of ${community} (Soft-archived)`,
      looseGroup: "Loose Group",
      verified: "Verified",
      verifiedByVenue: (venue: string) =>
        `Verified by Venue Community: ${venue}`,
      removeVerification: "Remove verification",
      verify: "Verify",
      removeConfirm: {
        title: (name: string) => `Remove verification from ${name}?`,
        description:
          "Existing Games keep their Rated and public settings. New Games in this Group will be Unrated and private.",
      },
    },
    levels: {
      title: "Player Levels",
      description:
        "Set any player's Level by hand. A Level you set counts as confirmed, and every set is recorded with your name.",
      unclaimedPlayer: "Unclaimed player",
      ratedMatches: (n: number) =>
        plural("en", n, {
          one: "{n} Rated Match",
          other: "{n} Rated Matches",
        }),
      playerFallback: "Player",
      setToast: (name: string, level: string) => `${name} set to ${level}`,
      searchLabel: "Search players",
      searchPlaceholder: "Name, phone or email",
      errorTitle: "Players could not be loaded",
      empty: {
        title: "No players found",
        tryOther: "Try a different name, phone or email.",
        none: "Players will show up here once they sign up.",
      },
      sheetTitle: (sport: string) => `Set ${sport} Level`,
      sheetDescription:
        "Recorded with your name. A mistake is corrected by setting it again.",
    },
  },
  player: {
    lastTenGames: "Last 10 games",
  },
  team: {
    backToTeams: "Back to Teams",
    linkedTo: "Linked to",
    actionsLabel: "Team actions",
    allTeams: "All Teams",
    invitePartner: "Invite partner",
    noCommunityToLink: "No Community to link",
    goToCommunities: "Go to Communities",
    loadingCommunities: "Loading Communities…",
    selectCommunity: "Select a Community",
  },
  venue: {
    title: "Venue",
    errorTitle: "Venue could not be loaded",
    courtFallback: "Court",
    logoReadError: "Logo could not be read",
    unarchiving: "Unarchiving…",
    toast: {
      updated: "Venue updated",
      courtAdded: "Court added",
      courtRenamed: "Court renamed",
      courtSportUpdated: "Court sport updated",
      courtDeleted: "Court deleted",
      logoSaved: "Logo saved",
      logoCleared: "Logo cleared",
      archived: "Venue Soft-archived",
      unarchived: "Venue unarchived",
    },
    archivedBanner: {
      heading: "This Venue is Soft-archived",
      body: "It is hidden from the Community request catalog. You can still edit fields, Courts, and logo. Unarchive to restore it to the live catalog. Live Community links stay.",
    },
    linkedCommunities: {
      title: "Linked Communities",
      description:
        "Communities that currently have a live Venue link. Sharing a Venue does not change membership.",
      empty: "No Communities are live-linked to this Venue.",
    },
    details: {
      title: "Details",
      description:
        "Edit name, city, country, and optional coordinates. Courts are named playing surfaces on this Venue.",
    },
    logo: {
      title: "Logo",
      upload: "Upload logo",
      clear: "Clear logo",
    },
    courts: {
      title: "Courts",
      description: "Each Court on this Venue needs its own name.",
      nameLabel: "Court name",
      add: "Add Court",
      adding: "Adding…",
      empty: "No Courts yet. This Venue can stay empty.",
      courtSport: (court: string) => `${court} sport`,
      renameCourt: (court: string) => `Rename ${court}`,
      renaming: "Renaming…",
      rename: "Rename",
      deleteCourt: (court: string) => `Delete ${court}`,
    },
    deleteCourtConfirm: {
      title: (court: string) => `Delete ${court}?`,
      confirmLabel: "Delete Court",
    },
    clearLogoConfirm: {
      title: (venue: string) => `Clear logo for ${venue}?`,
      description: "The current logo will be removed.",
    },
    archiveConfirm: {
      title: (venue: string) => `Soft-archive ${venue}?`,
      description:
        "It is hidden from the Community request catalog. Live Community links stay.",
      confirmLabel: "Soft-archive Venue",
    },
  },
  venues: {
    description:
      "Every Venue, including Soft-archived ones. Create a Venue before a Community asks to link it.",
    createAction: "Create Venue",
    linkApprovedToast: "Venue link approved",
    linkRejectedToast: "Venue link request rejected",
    forVenue: (venue: string) => `For ${venue}`,
    requests: {
      description:
        "Approve to link the Venue to that Community. If you reject, they can ask again.",
      errorTitle: "Requests could not be loaded",
      emptyDescription:
        "Venue link requests from Communities will show up here.",
    },
    empty: {
      title: "No Venues yet",
      description: "Create a Venue to start the catalog.",
    },
    new: {
      createdToast: "Venue created",
      description:
        "A physical site starts with no Courts. Name, city, and country are required.",
      name: "Name",
      city: "City",
      country: "Country",
      latitude: "Latitude",
      latitudeHelp: "Optional. Between −90 and 90.",
      longitude: "Longitude",
      longitudeHelp: "Optional. Between −180 and 180.",
    },
  },
  settings: {
    backToProfile: "Back to Profile",
    playing: "Playing",
    people: "People",
    invitesSubtitle: "Lookup invites addressed to you",
    pendingInvites: (n: number) =>
      plural("en", n, {
        one: "{n} pending invite",
        other: "{n} pending invites",
      }),
    about: "About",
    terms: "Terms and Conditions",
    termsSubtitle: "What you agree to by using Temba",
    operatorTools: "Operator tools",
    venuesSubtitle: "Venue and Court catalogue",
  },
};
