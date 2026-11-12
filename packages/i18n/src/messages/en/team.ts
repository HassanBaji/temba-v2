import { plural } from "../../plural";

export const team = {
  title: "Teams",
  description: "Partnerships you play as",
  errorTitle: "Teams could not be loaded",
  empty: {
    title: "No Teams yet",
    description: "A Team is a lasting partnership with one other player.",
  },
  createLabel: "Create Team",
  sportLabel: "Sport",
  toast: {
    created: "Team created",
    joined: "Joined Team",
    left: "You left the Team",
    dissolved: "Team dissolved",
  },
  teamErrorTitle: "Team could not be loaded",
  notFound: {
    title: "Team not found",
    description: "It may have been dissolved, or you may not have access.",
  },
  forbidden: {
    title: "You cannot open this Team",
    description: "Only Team members or a pending invitee can open a Team home.",
  },
  lookupNote: "Pick one person. Invites don't expire.",
  squadLookupNote: "Pick the people to invite. Invites don't expire.",
  squadInviteDescription:
    "Invite players to join the squad, or copy a link to share.",
  squadInviteLabel: "Invite players",
  inviteDescription:
    "Invite a partner for the open seat, or copy a link to share.",
  invitePartnerLabel: "Invite your partner",
  leaveLabel: "Leave Team",
  dissolveLabel: "Dissolve Team",
  image: {
    add: "Add image",
    change: "Change image",
    remove: "Remove image",
    savedToast: "Image saved",
    removedToast: "Image removed",
    uploading: "Uploading image…",
    createdWithoutImage: "Team created without an image",
    removeConfirm: {
      title: (name: string) => `Remove image for ${name}?`,
      description: "The Team goes back to its initials.",
      confirmLabel: "Remove image",
    },
  },
  waitingCopy:
    "Waiting for a partner. This Team is incomplete until a second member joins.",
  noMembers: {
    title: "No members",
    description: "People on this Team will show up here.",
  },
  incompleteLabel: "Incomplete",
  memberFallback: "Member",
  fallbackName: "Team",
  dissolveConfirm: {
    title: (name: string) => `Dissolve ${name}?`,
    description: "This cannot be undone.",
  },
  dissolveBlocked: {
    openChallenge: "Withdraw this Team's open challenge before dissolving it",
    pendingProposal:
      "Withdraw this Team's pending proposals before dissolving it",
    challengeGame:
      "This Team has a challenge game to play. Cancel or finish it before dissolving the Team.",
  },
  leaveConfirm: {
    title: (name: string) => `Leave ${name}?`,
    description: "You can only rejoin if you are invited again.",
  },
  roster: {
    title: "Roster",
    count: (count: number, max: number) => `${count} of ${max}`,
    hero: (count: number, max: number) => `Roster ${count} of ${max}`,
    plays: (sideSizes: readonly number[]) => {
      const sizes = sideSizes.map(String);
      const last = sizes.pop();
      const list = sizes.length > 0 ? `${sizes.join(", ")} and ${last}` : last;
      return `Plays ${list}-a-side`;
    },
    more: (n: number) =>
      plural("en", n, { one: "and 1 more", other: "and {n} more" }),
    addMore: {
      title: "Add more",
      detail: (max: number) => `By phone or on Temba. Up to ${max}`,
      detailWithGroup: (group: string, max: number) =>
        `By phone, on Temba, or from ${group}. Up to ${max}`,
    },
    full: "Full",
    complete: "Complete",
    waitingSquad: (n: number) =>
      plural("en", n, {
        one: "Needs 1 more member to be complete.",
        other: "Needs {n} more members to be complete.",
      }),
  },
  stats: {
    gamesPlayed: "Games played",
    draws: "Draws",
  },
  captainLabel: "Captain",
  draft: {
    countLine: (count: number, max: number) =>
      `${count} of ${max}, you included`,
    added: "Added, not on Temba",
    remove: (name: string) => `Remove ${name}`,
    full: (max: number) => `The Roster is full at ${max}.`,
  },
  addPlayers: {
    title: "Add players",
    description:
      "Add by phone, find someone on Temba, or pick from a Group you organize. People on Temba get an invite to accept.",
    tabs: {
      label: "How to add",
      phone: "By phone",
      temba: "On Temba",
      group: "From a group",
    },
    spotsLeft: (n: number) =>
      plural("en", n, { one: "1 spot left", other: "{n} spots left" }),
    full: "The Roster is full.",
    addToRoster: "Add to roster",
    searchLabel: "Search by name, username, email or phone",
    searchEmpty: "No one on Temba matches.",
    invite: "Invite",
    invitedMark: "Invited",
    preview: {
      alreadyOnTeam: (name: string) => `${name} is already on the Roster`,
      alreadyInvited: (name: string) => `${name} already has an invite`,
      alreadyListed: (name: string) => `${name} is already on the list`,
    },
    groupLabel: "Group",
    noGroups: "Groups you organize show here.",
    groupEmpty: "Everyone in this Group is already on the Roster.",
    memberUnclaimed: "Not on Temba yet. Add them by phone.",
    addCount: (n: number) =>
      plural("en", n, { one: "Add 1 player", other: "Add {n} players" }),
    select: "Select players",
    invitesSent: (n: number) =>
      plural("en", n, { one: "1 invite sent", other: "{n} invites sent" }),
    listed: (name: string) => `${name} is on the list`,
    removeConfirm: {
      title: (name: string) => `Remove ${name}?`,
      description:
        "They are not on Temba yet, so they come off the Roster. Their Games stay in history.",
      confirm: "Remove",
    },
  },
  create: {
    title: "New team",
    fromGroupTitle: "Team from a group",
    nameTitle: "Name",
    nameLabel: "Team name",
    namePlaceholder: "Gooz FC",
    sportTitle: "Sport",
    sportHint: "sets the team size",
    sport: {
      padel: { name: "Padel", detail: "2 players" },
      football: {
        name: "Football",
        detail: (max: number) => `roster up to ${max}`,
      },
    },
    rosterTitle: "Roster",
    stripHelper: "5 needed for 5-a-side, 7 for 7-a-side",
    stripMax: (max: number) => `${max} max`,
    stripSpoken: (taken: number, waiting: number, max: number) =>
      `${taken} of ${max} seats, ${waiting} not confirmed yet`,
    legendIn: "in",
    legendPending: "invited or added, not confirmed yet",
    sources: {
      label: "How to add",
      phone: "By phone",
      temba: "On Temba",
      group: "From a group",
    },
    phoneLabel: "Phone number",
    lookingUp: "Looking up…",
    lookup: {
      found: (tag: string | null, games: number) =>
        [
          "On Temba",
          tag,
          games > 0
            ? plural("en", games, {
                one: "1 game with you",
                other: "{n} games with you",
              })
            : null,
        ]
          .filter(Boolean)
          .join(". "),
      sportLevel: (sport: string, level: string | null) =>
        level ? `${sport} ${level}` : sport,
      invite: "Invite",
      inviteA11y: (name: string) => `Invite ${name}`,
      inviteNote: (name: string) =>
        `${name} gets the invite in the app. The seat shows as waiting until they accept; you can post challenges meanwhile.`,
      newTitle: "Not on Temba yet",
      newLine: "Add them anyway. They don't need the app to be on the team.",
      unclaimedLine: "Not on Temba yet. Already added by phone elsewhere",
      add: "Add",
      addA11y: (name: string) => `Add ${name}`,
      nameLabel: "Name",
      roleLabel: "Position",
      roles: {
        gk: "keeper",
        def: "defence",
        mid: "midfield",
        fwd: "attack",
      },
      addNamed: (name: string) => `Add ${name} to the team`,
      addUnnamed: "Add to the team",
    },
    row: {
      captain: "captain",
      invited: "Invited",
      waiting: "waiting",
      addedByYou: "Added by you",
      notOnTemba: "not on Temba",
      sentence: (parts: readonly string[]) => parts.join(". "),
      invitedByPhone: "Invited by phone",
      invitedOnTemba: "Invited on Temba",
      invitedFromGroup: (group: string) => `Invited from ${group}`,
      remove: (name: string) => `Remove ${name}`,
    },
    addMore: "Add more. By phone, on Temba, or from a group",
    enough: (count: number, side: number) => {
      const words = ["Five", "Six", "Seven", "Eight", "Nine", "Ten"];
      const lead = words[count - 5] ?? String(count);
      return `${lead} is enough to post a ${side}-a-side challenge; the matchday squad is named per game, after it's confirmed.`;
    },
    addedNote:
      "Added players count for the roster and show in challenges by name. If they join Temba with that number later, the seat becomes theirs: history, record and marks included.",
    submit: "Create team",
    submitNamed: (name: string) => `Create ${name}`,
    group: {
      title: "Group",
      organize: (n: number) => `you organize ${n}`,
      meta: (sport: string, members: number, teams: number) =>
        `${sport}, ${plural("en", members, {
          one: "1 member",
          other: "{n} members",
        })}. ${
          teams === 0
            ? "No team yet"
            : plural("en", teams, {
                one: "Has 1 team already",
                other: "Has {n} teams already",
              })
        }`,
      empty: "Groups you organize show here.",
      squadTitle: "Pick the squad",
      squadCount: (picked: number, max: number, sport: string) =>
        `${picked} of ${max}, ${sport}`,
      sportLower: { padel: "padel", football: "football" },
      youCaptain: "You, captain",
      more: (n: number) =>
        plural("en", n, {
          one: "and 1 more member",
          other: "and {n} more members",
        }),
      tag: (group: string) => ({
        before: "Tag as ",
        strong: `${group}'s team`,
        after:
          ". Shows on the group page; organizers can post challenges for it.",
      }),
    },
  },
  groupTag: {
    line: (group: string) => `${group}'s team`,
    tagAs: (group: string) => `Tag as ${group}'s team`,
    remove: "Remove tag",
    tagged: (group: string) => `Tagged as ${group}'s team`,
    removed: "Tag removed",
    captainOnly: "Only the Captain can tag this Team to a Group",
  },
  recordSpoken: (wins: number, losses: number) => `Won ${wins}, lost ${losses}`,
  recordSpokenWithDraws: (wins: number, draws: number, losses: number) =>
    `Won ${wins}, drew ${draws}, lost ${losses}`,
  onRoster: (n: number) =>
    plural("en", n, { one: "1 on the roster", other: "{n} on the roster" }),
  level: {
    member: (band: string, level: string) => `${band}, ${level}`,
    team: (band: string, level: string) => `${band}, avg ${level}`,
  },
  seat: {
    left: "Plays left",
    right: "Plays right",
    either: "Either side",
    keeper: "Keeper",
    outfield: "Outfield",
  },
  form: {
    title: "Form",
    empty: "No results yet. The last ten show here.",
    older: "Older",
    latest: "Latest",
  },
  rivals: {
    title: "Rivals",
    headToHead: (wins: number, losses: number) => `${wins}–${losses}`,
    headToHeadWithDraws: (wins: number, draws: number, losses: number) =>
      `${wins}–${draws}–${losses}`,
    headToHeadSpoken: (wins: number, losses: number) =>
      `Head-to-head: won ${wins}, lost ${losses}`,
    headToHeadSpokenWithDraws: (wins: number, draws: number, losses: number) =>
      `Head-to-head: won ${wins}, drew ${draws}, lost ${losses}`,
    played: (n: number) =>
      plural("en", n, {
        one: "1 Match",
        other: "{n} Matches",
      }),
    last: (result: string, day: string) => `Last: ${result}, ${day}`,
    closest: (name: string) =>
      `Closest: ${name}, played once. One more Match makes them a Rival.`,
    empty: "Play the same Team twice and they become a Rival.",
    rematch: "Rematch",
    rematchA11y: (team: string) => `Rematch ${team}`,
    opponentFallback: "Opponent",
  },
  games: {
    title: "Games",
    empty: "No games played yet.",
  },
  detail: {
    sportLevel: (sport: string, band: string) => `${sport}, ${band}`,
    since: (month: string, year: number) => `Since ${month} ${year}`,
    sentences: (parts: readonly string[]) => parts.join(". "),
    record: {
      label: "Record",
      games: (n: number) =>
        plural("en", n, { one: "1 game", other: "{n} games" }),
      wonDrawnLost: "won, drawn, lost",
    },
    membersSpoken: (names: string) => `Members: ${names}`,
    postChallenge: "Post a challenge",
    share: "Share",
    shareText: (team: string, url: string) => `${team} on Temba: ${url}`,
    shareCopied: "Team link copied",
    openGroup: (group: string) => `Open ${group}`,
    form: {
      allTime: "All time",
    },
    rivals: {
      subtitle: "played 2 or more times",
      none: "none yet",
      result: { won: "won", lost: "lost", draw: "drew" },
      last: (result: string, score: string, day: string) =>
        `Last: ${result} ${score} on ${day}`,
      lastNoScore: (day: string) => `Last: played on ${day}, no score`,
      next: (last: string, day: string) => `${last}. Next ${day}`,
      footnote:
        "Rematch pre-fills a challenge to that team and sends it straight to them.",
      emptyTitle: "No rivals yet",
      emptyBody:
        "Play the same team twice and they show up here with the head-to-head.",
      versus: "vs",
      closest: (name: string) => `Closest: ${name}, played once.`,
      closestNext: (name: string, day: string) =>
        `Closest: ${name}, played once. ${day} makes it two.`,
    },
    members: {
      title: "Members",
      you: "You",
      captain: "Captain",
      youCaptain: "You, captain",
      line: (who: string, seat: string) => `${who}. ${seat}`,
      level: (band: string, level: string) => `${band} ${level}`,
      side: {
        left: "Left side",
        right: "Right side",
        either: "Either side",
      },
    },
    roster: {
      openSeat: "Open seat",
      invite: "Invite",
      partnerDetail: "Find your partner on Temba, or share a link",
      footnote:
        "The roster is who’s on the team. Who plays a given game is the matchday squad, named per game: the side plus up to three reserves. Only they get the result.",
    },
    games: {
      subtitle: "all from challenges",
      versus: (name: string) => `vs ${name}`,
      sets: (sets: readonly string[]) => sets.join(", "),
    },
  },
  errors: {
    full: "This Team is full",
    inviteUnavailable: "Team invite is not available",
    inviteNotFound: "Team invite not found",
    pairTaken: "This pair already has a Team or a pending invite",
    alreadyMember: "You are already a member of this Team",
    userAlreadyMember: "User is already a member of this Team",
    captainImage: "Only the Captain can change the Team image",
    memberDissolves: "Only a Team member can dissolve this Team",
    creatorDissolves: "Only the creator can dissolve this Team",
    creatorDissolvesIncomplete:
      "Only the creator can dissolve an incomplete Team",
    inviteSelf: "You cannot invite yourself",
    revokeUnusedFirst: "Revoke the unused invite before sending a new one",
    memberLeaves: "Only a Team member can leave this Team",
    dissolveInstead: "Dissolve the Team instead",
    creatorCannotLeave: "The creator cannot leave; dissolve the Team instead",
    groupOrganizersAdd: "Only the Group's Organizers can add its members",
    captainAdds: "Only the Captain can add players",
    groupSport: "Pick a Group of the Team's sport",
    creatorListsInvites: "Only the creator can list Team invites",
    captainRemoves: "Only the Captain can remove players",
    notOnRoster: "This player is not on the Roster",
    creatorRevokesInvites: "Only the creator can revoke Team invites",
    acceptedNoRevoke: "Accepted invites cannot be revoked",
    tagRemover:
      "Only the Captain or an Organizer of the tagged Group can remove the tag",
    tagSport: "A Team can only be tagged to a Group of its sport",
    tagCaptainGroup: "A Team can only be tagged to a Group its Captain is in",
    playerAlreadyOnRoster: (name: string) => `${name} is already on the Roster`,
    creatorInvitesPartner:
      "Only the creator can invite a partner while the Team is incomplete",
    creatorInvites: "Only the creator can invite into this Team",
    listedTwice: "Someone is on the list twice",
    numberListedTwice: "A number is on the list twice",
    rosterLimit: (max: number) =>
      plural("en", max, {
        one: "A Team holds up to 1 player, you included. Remove someone first",
        other:
          "A Team holds up to {n} players, you included. Remove someone first",
      }),
    roleOnFootballTeam: "Only a football Team takes a role and position",
  },
};
