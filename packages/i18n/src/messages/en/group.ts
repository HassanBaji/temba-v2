import { plural } from "../../plural";

export const group = {
  untitled: "Untitled Group",
  metaSeparator: ", ",
  memberCount: (n: number) =>
    plural("en", n, { one: "1 member", other: "{n} members" }),
  pastDay: {
    today: "today",
    yesterday: "yesterday",
    daysAgo: (n: number) => `${n} days ago`,
    requested: (when: string) => `Requested ${when}`,
  },
  list: {
    rowMeta: (members: string, rank: number) =>
      `${members}, you are rank ${rank}`,
    mineEmptyTitle: "No Groups yet",
    mineEmptyCopy:
      "Choose padel or football, invite players, and Temba keeps the Standing and history.",
    placeholderTitle: "Your first Group",
    publicEmptyTitle: "No public Groups to join right now",
    publicEmptyLine:
      "Public Groups show up here. Start one and players can find it.",
    publicEmptyLineSport: (sport: string) =>
      `Public ${sport} Groups show up here. Start one and players can find it.`,
  },
  home: {
    since: (month: string) => `since ${month}`,
    backToCommunity: "Back to Community",
    backToGroups: "Back to Groups",
    openSeats: "Open seats",
    playedOpponentLine: (team: string, day: string) => `${team}, ${day}`,
    organizerAction: {
      appoint: "Make Organizer",
      dismiss: "Remove as Organizer",
    },
    organizerHint: {
      appoint: "Can create Games, set teams and add players",
      dismiss: "Loses the right to create Games, set teams and add players",
    },
    organizerToast: {
      appointed: (name: string) => `${name} is now an Organizer.`,
      dismissed: (name: string) => `${name} is no longer an Organizer.`,
    },
  },
  empty: {
    standingAfterFirstResult: "Standings appear after the first result.",
    standingSeatsFilled: (filled: number, total: number) =>
      `${filled} of ${total} seats filled. Standings appear after the first result.`,
    games: "Once a Game is set with a live window or Match, it shows up here.",
    gamesNeedPlayers: (sport: string, needed: number, have: number) =>
      `${sport} needs ${needed}. You have ${have}. Once a Game is set with a live window or Match, it shows up here.`,
    aGame: "A Game",
  },
  join: {
    archiveGamesCopy:
      "Existing Games stay listed here, not on public pickup. Join, waitlist, and Game invites are closed while the Community is Soft-archived.",
    gamesEmptyDescription:
      "When a Game is set with a live window or Match, it will show up here.",
    requiresApprovalMeta: (members: string) => `${members} · Requires approval`,
    label: {
      requested: "Requested",
      requestToJoin: "Request to join",
      requesting: "Requesting…",
      joining: "Joining…",
      joinGroup: "Join Group",
      join: "Join",
    },
    toast: {
      requested: "Requested to join",
      joined: "Joined Group",
      leftClub: "Left Group — you remain in the Community",
      left: "Left Group",
    },
    leaveConfirm: {
      title: (name: string) => `Leave ${name}?`,
      description: "You will leave this Group.",
      confirmLabel: "Leave Group",
    },
    banner: {
      archivedVisitor: {
        heading: "This Club Group's Community is Soft-archived",
        body: "It is not open for join. Members of the Community can still open history and Games. This is not a missing page.",
      },
      archivedMember: {
        heading: "Community Soft-archived",
        body: "This Club Group stays attached to its Community. You can still open it and see history and Games while the Community is archived.",
      },
      approvalJoinsCommunity: (community: string) =>
        `If approved, you also become a Member of ${community}.`,
      thisCommunity: "this Community",
    },
  },
  admin: {
    requireApproval: "Require approval",
    requestsErrorTitle: "Join requests could not be loaded",
    imageSavedToast: "Image saved",
    imageRemovedToast: "Image removed",
    deletedToast: "Group deleted",
    deleteConfirm: {
      title: (name: string) => `Delete ${name}?`,
      description: "This cannot be undone.",
      confirmLabel: "Delete Group",
    },
    removeImageConfirm: {
      title: (name: string) => `Remove image for ${name}?`,
      description: "The current image will be removed.",
      confirmLabel: "Remove image",
    },
    requestMeta: {
      viaInviteLinkFrom: (name: string, when: string) =>
        `Via invite link from ${name}, ${when}`,
      viaInviteLink: (when: string) => `Via invite link, ${when}`,
      foundInCommunity: (community: string, when: string) =>
        `Found the Group in ${community}, ${when}`,
      theCommunity: "the Community",
    },
    requestsBanner: (n: number) =>
      plural("en", n, {
        one: "1 person wants to join",
        other: "{n} people want to join",
      }),
    requestsHeading: (n: number) =>
      plural("en", n, { one: "1 wants to join", other: "{n} want to join" }),
    reviewLabel: "Review",
    changeLabel: "Change",
    policy: {
      approve: "Organizers approve new members",
      open: "Anyone with the link can join",
    },
    requestsSummary: {
      openLine: "Joins instantly, no review",
      waitingTitle: "No requests waiting",
      approvedToday: (n: number) =>
        `Organizers approve new members, ${n} approved today`,
    },
    whoCanJoin: {
      title: "Who can join",
      approve: {
        title: "Organizers approve",
        description: "Requests wait on the Members tab until you decide.",
      },
      open: {
        title: "Anyone with the link",
        description:
          "They join instantly. Pending requests are not admitted automatically.",
      },
      descriptionIn: (community: string) =>
        `Applies to the invite link and to people who find the Group in ${community}.`,
      description:
        "Applies to the invite link and to people who find the Group.",
    },
    reject: {
      title: (name: string) => `Reject ${name}?`,
      description:
        "They are not notified and can request again. Reject and block stops further requests.",
      rejectLabel: "Reject request",
      blockLabel: "Reject and block",
    },
    decided: {
      approved: (name: string) => `${name} added to the Group`,
      rejected: (name: string) => `${name} rejected`,
      blocked: (name: string) => `${name} rejected and blocked`,
    },
    undoLabel: "Undo",
    requestJoinSheet: {
      title: "Request to join",
      description:
        "Organizers approve new members. A short note helps them place you.",
      notePlaceholder: "Add a note (optional)",
      submitLabel: "Send request",
    },
  },
  create: {
    loose: {
      publicLabel: "Public (anyone with the link)",
      privateLabel: "Private (invite only)",
      publicHelp:
        "Anyone with the Group link can join, or ask to join if you require approval.",
      privateHelp: "Only you can invite people.",
      approvalHelp:
        "People ask to join. You approve or reject them on Group home.",
      submit: "Create Group",
    },
    club: {
      publicLabel: "Public (Community Members)",
      privateLabel: "Private (invite only)",
      publicHelp:
        "Any Community Member can join, or ask to join if you require approval.",
      privateHelp:
        "Owners and Admins can invite anyone. The Group's creator and Organizers can invite Community Members.",
      approvalHelp:
        "Community Members ask to join. You approve or reject them on Group home.",
      submit: "Create Club Group",
    },
    looseDescription:
      "A Group of people you play with, outside any Community. You join it as its first member.",
    clubDescription:
      "A Group inside your Community. You join it as its first member.",
    createdToast: "Group created",
    screen: {
      title: "Create Group",
      description: {
        loose:
          "A Group is your regulars: one sport, one standing, as many Games as you like.",
        club: "A Group inside your Community: one sport, one standing, as many Games as you like.",
      },
      photo: "Photo",
      photoHelp: "Optional photo, JPEG or PNG",
      nameLabel: "Group name",
      namePlaceholder: "e.g. Tuesday Padel Crew",
      sportLabel: "Sport",
      sportHelp: "The sport can't change after the first Game.",
      visibilityLabel: "Visibility",
      footnote: "You can change all of this later.",
    },
    submitNamed: (name: string) => `Create ${name}`,
  },
  linkRequest: {
    venueRequestsTitle: "Venue requests",
    rowMeta: "Only you can decide, as the Group creator.",
    acceptLabel: "Accept",
    declineLabel: "Decline",
    declinedToast: "Request declined",
    rowTitle: (venue: string, group: string) =>
      `${venue} wants to add ${group} to its Community`,
    yourGroup: "your Group",
    thisGroup: "this Group",
    bannerText: (venue: string) =>
      `${venue} wants to add this Group to its Community.`,
    acceptedToast: (group: string, venue: string) =>
      `${group} is now part of ${venue}`,
    acceptConfirm: {
      title: (group: string, venue: string) =>
        `Add ${group} to ${venue}’s Community?`,
      description: (group: string) =>
        `${group} becomes a Club Group. Here is what changes.`,
      confirmLabel: "Add Group",
      cancelLabel: "Not now",
      pendingLabel: "Adding…",
      consequences: {
        members: "Everyone in the Group becomes a Community Member.",
        noDirectJoin:
          "New people can’t join directly. They send a request instead.",
        noInviteLinks:
          "You can’t make Invite links any more. You can still invite existing Community Members.",
        gamesHeldAt: (venue: string) => `New Games are held at ${venue}.`,
        verified:
          "The Group is Verified, so it can host Rated Games and Games open to anyone with the link.",
      },
    },
    declineConfirm: {
      title: (venue: string) => `Decline ${venue}'s request?`,
      description: (venue: string) =>
        `${venue} will see that you declined. They can send a new request later.`,
      confirmLabel: "Decline request",
      cancelLabel: "Keep request",
    },
    partOf: (venue: string) => `Part of ${venue}`,
    unlinkLabel: "Unlink",
    leaveVenueLabel: (venue: string) => `Leave ${venue}’s Community`,
    leaveVenueConfirm: {
      title: (venue: string) => `Leave ${venue}’s Community?`,
      description: (group: string) =>
        `${group} becomes a Loose Group again. New Games will be Unrated unless an Operator has verified the Group.`,
      confirmLabel: "Leave Community",
      cancelLabel: "Stay",
      pendingLabel: "Leaving…",
      consequences: {
        historyStays: "Members, past Games and results stay as they are.",
        membersStay:
          "Members stay in the Community until they leave it themselves.",
        anyVenue: "New Games can be held at any Venue.",
        inviteLinks: "You can make Invite links again.",
      },
    },
    leftVenueToast: (venue: string) => `Left ${venue}’s Community`,
    venueUnlinkConfirm: {
      title: (group: string) => `Unlink ${group}?`,
      description: (group: string) =>
        `${group} leaves your Venue's Community and becomes a Loose Group. New Games will be Unrated unless an Operator has verified it. Past Games and members stay as they are.`,
      confirmLabel: "Unlink Group",
      cancelLabel: "Keep linked",
    },
    venueUnlinkedToast: "Group unlinked",
  },
  members: {
    organizer: "Organizer",
    lastPlayed: (day: string) => `Last ${day}`,
    joined: (day: string) => `Joined ${day}`,
    legend: "Hatched Levels are still Provisional.",
    noMatch: "Nobody matches.",
    pendingInvitesTitle: (n: number) =>
      plural("en", n, {
        one: "1 invite pending",
        other: "{n} invites pending",
      }),
    invited: (day: string) => `Invited ${day}`,
  },
  season: {
    settingsIntro:
      "A season scopes the standing to a date window. Levels are never reset by a season.",
    newStandingNote:
      "Standing starts empty for the new season. Levels, W/L history and earlier seasons stay as they are.",
    status: {
      upcoming: "Upcoming",
      active: "Active",
      closed: "Closed",
    },
    progress: (day: number, total: number) => `Day ${day} of ${total}`,
    range: (start: string, end: string) => `${start} – ${end}`,
    startsLine: (weekday: string, day: string) => `Starts ${weekday} ${day}`,
    lockedLine: (day: string) => `Locked at close, ${day}`,
    gamesCounted: (n: number) =>
      plural("en", n, { one: "1 game counted", other: "{n} games counted" }),
    overlapMessage: "Seasons can't overlap.",
    orderMessage: "The season must end after it starts.",
    pickDaysMessage: "Pick a start and an end day.",
    allTime: "All-time",
    suggestedName: (n: number) => `Season ${n}`,
    upcomingName: (name: string) => `${name} (upcoming)`,
    summaryDays: (n: number) =>
      plural("en", n, { one: "1 day.", other: "{n} days." }),
    startsDayAfter: (previous: string) =>
      `Starts the day after ${previous} closes.`,
    startsDaysAfter: (n: number, previous: string) =>
      plural("en", n, {
        one: `Starts 1 day after ${previous} closes.`,
        other: `Starts {n} days after ${previous} closes.`,
      }),
    closeEndsToday: "Today",
    closeEndsEarly: (n: number) =>
      plural("en", n, {
        one: "Today, 1 day early",
        other: "Today, {n} days early",
      }),
    closeTitle: (name: string) => `Close ${name}?`,
    closeAction: (name: string) => `Close ${name} early`,
    closeBodyLead: "The standing locks in its current order.",
    closeBodyCounted: (n: number) =>
      plural("en", n, {
        one: "1 confirmed game counts.",
        other: "{n} confirmed games count.",
      }),
    closeBodyWaiting: (n: number) =>
      plural("en", n, {
        one: "1 game still waiting on a score won't.",
        other: "{n} games still waiting on a score won't.",
      }),
    createdToast: (name: string) => `${name} created`,
    closedToast: (name: string) => `${name} closed`,
  },
  standing: {
    noGamesYet: "No games yet",
    fewerThan: (n: number) => `Fewer than ${n} games`,
    setDifference: "set difference",
    scoreDifference: "score difference",
    rulesLine: (difference: string) =>
      `Every player on the team gets the points. Only games with a confirmed final score count. Ties: wins, then head-to-head, then ${difference}, then fewer games played.`,
    legend: {
      played: "P played",
      won: "W won",
      drawn: "D drawn",
      lost: "L lost",
      points: (win: number) =>
        `A win is ${plural("en", win, { one: "1 point", other: "{n} points" })}.`,
      pointsWithDraw: (win: number, draw: number) =>
        `A win is ${plural("en", win, { one: "1 point", other: "{n} points" })}, a draw ${draw}.`,
    },
    oneGameRanks: "One game ranks you.",
    playGamesToRank: (n: number) => `Play ${n} games to be ranked.`,
  },
  settings: {
    sportSublabel: {
      padel: "2 v 2",
      football: "5 to 11 a side",
    },
    visibility: {
      public: {
        title: "Public",
        descriptionClub: "Shows up in search and on the Community.",
        descriptionLoose: "Shows up in search and on Communities.",
      },
      private: {
        title: "Private",
        description:
          "Hidden from search. Only people with the link can find it.",
      },
    },
    joining: {
      label: "Joining",
      toggle: "Review join requests",
      toggleHelpOff: "Anyone who finds the Group joins right away.",
      toggleHelpOn: "You approve each request before they join.",
      requestsWaiting: (n: number) =>
        plural("en", n, {
          one: "1 request waiting on Group home.",
          other: "{n} requests waiting on Group home.",
        }),
    },
    menu: {
      edit: "Edit Group",
      invite: "Invite players",
      copyLink: "Copy Group link",
      leave: "Leave Group",
      leaveOwnerHint: "Transfer ownership first.",
    },
    role: {
      owner: "You own this Group",
      organizer: "You organize this Group",
      member: "You are a member",
    },
    linkCopiedToast: "Group link copied",
    linkResetToast: "Link reset. Old links stop working.",
    ownerLeave: {
      title: (name: string) => `Hand ${name} to someone first`,
      description:
        "You own this Group. Transfer ownership to another member before you leave, or delete the Group.",
      confirmLabel: "Transfer ownership",
      cancelLabel: "Not now",
    },
    edit: {
      title: "Edit Group",
      nameLabel: "Group name",
      nameHelp: "Members see the new name right away",
      photoChange: "Change",
      photoRemove: "Remove photo",
      sportLabel: "Sport",
      sportLocked: "Locked after the first Game. Standings depend on it.",
      sportOpen: "Locks after the first Game. Standings depend on it.",
      visibilityLabel: "Visibility",
      inviteLinkLabel: "Invite link",
      inviteLinkNone: "No live link yet. Create one to share.",
      inviteLinkCreate: "Create link",
      inviteLinkReset: "Reset link. Old links stop working.",
      ownershipLabel: "Ownership",
      transferTitle: "Transfer ownership",
      transferHint: "Hand the Group to another member.",
      deleteTitle: "Delete Group",
      deleteHint:
        "Removes the standing for everyone and cancels upcoming Games. Played Games stay in each player's history.",
      save: "Save changes",
      discard: "Discard",
      nothingChanged: "Nothing changed yet.",
      unsavedChanges: "Unsaved changes.",
      savedToast: "Changes saved",
    },
    delete: {
      title: (name: string) => `Delete ${name}?`,
      description:
        "The Group, its standing and its members go with it. Played Games stay in each player's history. Nobody is notified. This can't be undone.",
      gamesStat: (n: number) =>
        plural("en", n, { one: "Game", other: "Games" }),
      membersStat: (n: number) =>
        plural("en", n, { one: "member", other: "members" }),
      seasonsStat: (n: number) =>
        plural("en", n, { one: "season", other: "seasons" }),
      confirmPrompt: "Type the Group name to confirm",
      deleteLabel: "Delete Group",
      keepLabel: "Keep Group",
    },
    transfer: {
      title: "Transfer ownership",
      description: (name: string) =>
        `Hand ${name} to another member. They take over the Group. You stay on as an Organizer.`,
      empty:
        "Nobody else can own this Group yet. Invite a player on Temba first.",
      confirmLabel: "Transfer ownership",
      confirmTo: (name: string) => `Transfer to ${name}`,
      transferredToast: (name: string, group: string) =>
        `${name} now owns ${group}`,
      transferredToastUnnamed: (group: string) => `They now own ${group}`,
    },
  },
  addPlayer: {
    action: "Add player",
    notOnTembaYet: "Not on Temba yet",
    nameLabel: "Their name",
    description:
      "Add a player by phone number. They don't need the app to play.",
    menuHint: "By phone number, no app needed",
    addToGame: "Add to game",
    notSure: {
      name: "Not sure",
      detail: (level: string) => `Starts at ${level}.`,
    },
    noSeat: "Every Position is taken.",
    noSide: "Every side is full.",
    footballRole: {
      player: { name: "Player", detail: "outfield" },
      keeper: { name: "Keeper", detail: "in goal" },
    },
    roles: { outfield: "Outfield", keeper: "Goalkeeper" },
    positions: {
      any: "Any",
      def: "Defender",
      mid: "Midfielder",
      fwd: "Forward",
    },
    sideWith: (name: string) => `With ${name}`,
    sideOpen: "Open",
    preview: {
      thisPlayer: "This player",
      alreadyOnGame: (name: string) => `${name} is already on this Game`,
      account: (name: string) => `This is ${name} (has an account)`,
      unclaimed: (name: string) =>
        `Already on Temba as ${name} (no account yet)`,
      new: "Not on Temba yet. Add their name and starting Level.",
      alreadyInGroup: (name: string) => `${name} is already in this Group`,
      accountInvited: (name: string) =>
        `This is ${name} (has an account). They get an invite to accept.`,
    },
    addedToast: (name: string) => `${name} added`,
    groupDescription:
      "Add someone by phone. If they're on Temba, they get an invite to accept.",
    inviteSentToast: (name: string) => `Invite sent to ${name}`,
    removeAction: "Remove from Group",
    removeConfirm: (name: string) =>
      `Remove ${name} from this Group? Their Games stay in history.`,
    removedToast: (name: string) => `${name} removed`,
    renameAction: "Edit name",
    renameDescription:
      "Their phone stays the same. If the number is wrong, remove them and add them again.",
    renamedToast: (name: string) => `Name changed to ${name}`,
    seat: {
      left: "Left",
      right: "Right",
      label: (team: string, side: string) => `${team} · ${side}`,
    },
  },
  userName: {
    firstRequired: "Enter your first name",
    lastRequired: "Enter your last name",
    tooLong: (max: number) => `Keep it under ${max} characters`,
  },
};
