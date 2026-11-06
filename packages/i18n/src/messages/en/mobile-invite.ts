import { plural } from "../../plural";

export const mobileInvite = {
  share: {
    venueFallback: "Venue",
  },
  subtitle: {
    when: (day: string, time: string) => `${day} ${time}`,
    separator: ", ",
    sentence: (place: string) => `${place}.`,
    seatsOpen: (n: number) =>
      plural("en", n, { one: "1 seat open.", other: "{n} seats open." }),
  },
  sheet: {
    searchPlaceholder: "Name or phone number",
    searchA11y: "Search players",
    inviteA11y: (name: string) => `Invite ${name}`,
    cancelInviteA11y: (name: string) => `Cancel invite for ${name}`,
    refusedLine: (name: string, message: string) => `${name}: ${message}`,
    phoneLabel: "Phone number",
    copyLinkA11y: "Copy link",
    shareLink: "Share link",
    whatsApp: "WhatsApp",
    messages: "Messages",
  },
  link: {
    title: "Invite",
    incompleteTitle: "Couldn't open this invite",
    incompleteDescription:
      "The link is incomplete. Go back and paste it again.",
    loadingA11y: "Loading invite",
    loadErrorTitle: "Couldn't load this invite",
    loadErrorDescription: "Check your connection and try again.",
    chooseHowYouPlay: "Choose how you play",
    teamsSet: "Set",
    teamsByOrganizer: "Made by the organizer",
  },
  inbox: {
    description: "Invites sent to you. Accept one to join.",
    loadingA11y: "Loading invites",
    acceptInviteA11y: (title: string) => `Accept the invite to ${title}`,
    joinWaitlistA11y: (title: string) => `Join waitlist for ${title}`,
    declineRequestA11y: (venue: string) => `Decline the request from ${venue}`,
    reviewRequestA11y: (venue: string) => `Review the request from ${venue}`,
    linkSectionTitle: "Have an Invite link?",
    linkLabel: "Invite link",
    linkPlaceholder: "Paste the link you were sent",
    paste: "Paste",
    openLink: "Open link",
    pasteEmpty: "Copy the invite link first, then paste.",
    pasteInvalid:
      "That is not a Temba invite link. Paste the whole link you were sent.",
  },
  seatChoice: {
    occupiedA11y: (side: string, seat: string, name: string) =>
      `${side} ${seat}, ${name}`,
    sitLeft: "Sit left",
    sitRight: "Sit right",
  },
};
