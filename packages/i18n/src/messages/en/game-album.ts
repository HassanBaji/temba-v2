import { plural } from "../../plural";

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

function countWord(n: number) {
  return NUMBER_WORDS[n] ?? String(n);
}

function capitalized(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const sentences = (parts: string[]) =>
  parts.map((part) => (/[.!?]$/.test(part) ? part : `${part}.`)).join(" ");

export const gameAlbum = {
  twoNames: (names: string, last: string) => `${names} and ${last}`,
  album: {
    title: "Album",
    count: (n: number, total: number) => `${n} of ${total}`,
    addPhotos: "Add photos",
    addPhoto: "Add a photo",
    emptyCaption: (players: number) =>
      `Six photos for the game, from anyone who played. The ${countWord(players)} of you see them here; nothing is posted anywhere else.`,
    moreFit: (n: number) =>
      plural("en", n, {
        one: "One more fits",
        other: `${capitalized(countWord(n))} more fit`,
      }),
    youAdded: (n: number) => `You added ${countWord(n)}`,
    firstAdded: (name: string, n: number) => `${name} added ${countWord(n)}`,
    alsoAdded: (name: string, n: number) => `${name} ${countWord(n)}`,
    sentences,
    full: "Full.",
    fullRemoveYours: "Full. Remove one of yours to add another.",
    photoBy: (name: string) => `Photo added by ${name}`,
    photoByYou: "Photo you added",
    emptySlot: "Empty slot",
  },
  add: {
    title: "Add to the album",
    subtitle: (room: number, total: number) =>
      plural("en", room, {
        one: `One slot left of ${countWord(total)}. Pick one.`,
        other: `${capitalized(countWord(room))} slots left of ${countWord(total)}. Pick up to ${countWord(room)}.`,
      }),
    takePhoto: "Take a photo",
    library: "Library",
    footnote:
      "Photos stay with the game and are shown to the players only. Anyone can remove their own; the organizer can remove any.",
    submit: (n: number) =>
      plural("en", n, { one: "Add 1 photo", other: "Add {n} photos" }),
    pickFirst: "Pick photos",
    uploading: (done: number, total: number) => `Adding ${done} of ${total}…`,
    added: (n: number) =>
      plural("en", n, { one: "Photo added", other: "{n} photos added" }),
    tooMany: (room: number) =>
      plural("en", room, {
        one: "Only one more fits, so the first was kept",
        other: "Only {n} more fit, so the first {n} were kept",
      }),
    cameraDenied: "Allow camera access in Settings to take a photo",
    unreadable: "That photo couldn’t be read",
    remove: "Remove from the picks",
    close: "Close",
  },
  viewer: {
    counter: (index: number, total: number) => `${index} of ${total}`,
    close: "Close",
    share: "Share",
    save: "Save",
    remove: "Remove",
    youAdded: "You added this",
    added: (name: string) => `${name} added this`,
    meta: (time: string, place: string) => `${time}. ${place}`,
    saved: "Saved to your photos",
    saveDenied: "Allow photo access in Settings to save",
    removeTitle: "Remove this photo?",
    removeBody: "It leaves the album for everyone who played.",
    removeConfirm: "Remove photo",
    cancel: "Cancel",
    removed: "Photo removed",
    previous: "Previous photo",
    next: "Next photo",
    photo: (index: number, total: number) => `Photo ${index} of ${total}`,
  },
  notes: {
    title: "Notes",
    noneYet: "none yet",
    publicCount: (n: number) => `${n} public`,
    onlyYours: "1 yours",
    publicAndYours: (n: number) => `${n} public, 1 yours`,
    writeTitle: "Write your note",
    writeHint: "One per player. For everyone in the game, or just for you.",
    emptyCaption: (players: number) =>
      `A note is how the game felt, what to work on, who to play again. Public notes are read by the ${countWord(players)} of you only. Private ones are yours alone and build your own journal.`,
    you: "You",
    onlyYou: "Only you",
    time: (day: string, clock: string) => `${day}, ${clock}`,
    privateTime: (time: string) => `Only you, ${time}`,
    onlyYouCanRead: "Only you can read the note above",
    everyoneCanRead: "Everyone in the game can read yours",
    edit: "Edit",
    editNote: "Edit your note",
    notShared: (names: string, count: number) =>
      plural("en", count, {
        one: `${names} hasn’t shared a note`,
        other: `${names} haven’t shared a note`,
      }),
    notSharedCount: (n: number) => `${n} players haven’t shared a note`,
    closeAfter: "Notes close 30 days after the game",
    closed: "Notes are closed",
    sentences,
  },
  note: {
    title: "Your note",
    subtitle: "One note per player, edit it any time in the next 30 days.",
    who: "Who reads it",
    everyone: (players: number) => `The ${countWord(players)} of you`,
    everyoneHint: "Shows under the game for everyone who played.",
    onlyMe: "Only me",
    onlyMeHint: "A line in your own journal. Nobody else sees it.",
    fieldLabel: "Your note",
    placeholder: "How it felt, what to work on, who to play again",
    privateHint: "Only you will ever read this",
    publicHint: (names: string) => `${names} will read this`,
    publicNobodyYet: "Everyone who played will read this",
    namesAndOthers: (names: string, others: number) =>
      plural("en", others, {
        one: `${names} and 1 other`,
        other: `${names} and {n} others`,
      }),
    counter: (n: number, max: number) => `${n} of ${max}`,
    savePrivate: "Save to your notes",
    savePublic: (players: number) =>
      `Share with the ${countWord(players)} of you`,
    saved: "Saved to your notes",
    shared: "Note shared",
    delete: "Delete note",
    deleteTitle: "Delete your note?",
    deleteBody:
      "It leaves the game and your notes. You can write a new one while notes are open.",
    deleteConfirm: "Delete note",
    deleted: "Note deleted",
    close: "Close",
  },
  myNotes: {
    title: "Your notes",
    entry: "Your notes",
    entryHint: "Every note you’ve written, private and shared",
    subtitle: (n: number) =>
      plural("en", n, {
        one: "1 note. Only you see this page; the shared ones also sit under their games.",
        other:
          "{n} notes. Only you see this page; the shared ones also sit under their games.",
      }),
    tabs: "Filter notes",
    all: (n: number) => `All ${n}`,
    private: (n: number) => `Only me ${n}`,
    public: (n: number) => `Shared ${n}`,
    onlyYou: "Only you",
    shared: "Shared",
    day: (weekday: string, day: string) => `${weekday} ${day}`,
    withPartners: (names: string) => `with ${names}`,
    empty: "No notes yet",
    emptyHint:
      "After a game, write how it felt or what to work on. Your notes collect here.",
    emptyFiltered: "No notes here yet",
    openGame: "Open the game",
  },
  played: {
    summary: (photos: string, notes: string) => `${photos}, ${notes}`,
    photos: (n: number) =>
      plural("en", n, { one: "1 photo", other: "{n} photos" }),
    noPhotos: "No photos yet",
    notes: (n: number) =>
      plural("en", n, { one: "1 note", other: "{n} notes" }),
    noNotes: "no notes",
    open: "Open",
    addPhotos: "Add photos",
  },
  errors: {
    notPlayed: "The album opens once the game is played",
    notPlayer: "Only the players of this game can do that",
    albumFull: "The album is full",
    notesClosed: "Notes close 30 days after the game",
    photoNotFound: "Photo not found",
    notYourPhoto: "You can only remove your own photos",
    noteEmpty: "Write something first",
    noteTooLong: "A note is 300 characters at most",
    photoEmpty: "That photo is empty",
    photoTooLarge: "That photo is over 2 MB",
    photoType: "Use a JPEG, PNG or WebP photo",
    photoUploadFailed: "The photo couldn’t be uploaded. Try again.",
    noteNotFound: "Note not found",
  },
};
