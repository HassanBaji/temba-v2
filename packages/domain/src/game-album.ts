import { isolate } from "@repo/i18n/bidi";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  formatDayMonth,
  formatGameClock,
  formatMonth,
  formatWeekday,
} from "./format-game-start";
import { gameDayStart } from "./game-day";
import { productDayKey, zonedParts } from "./product-timezone";
import { shortPlayerName } from "./player-name";

/** A played Game's Album holds six photos between all of its players. */
export const GAME_ALBUM_SLOTS = 6;

export const GAME_NOTE_MAX_LENGTH = 300;

/** A player writes and edits their Game note until this long after the Game. */
export const GAME_NOTE_EDIT_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export const GAME_NOTE_VISIBILITIES = ["public", "private"] as const;

export type GameNoteVisibility = (typeof GAME_NOTE_VISIBILITIES)[number];

export function isGameNoteVisibility(
  value: unknown,
): value is GameNoteVisibility {
  return GAME_NOTE_VISIBILITIES.includes(value as GameNoteVisibility);
}

/** When notes on a Game stop taking writes: thirty days after it was played. */
export function gameNotesCloseAt(playedAt: Date): Date {
  return new Date(playedAt.getTime() + GAME_NOTE_EDIT_DAYS * DAY_MS);
}

export type GameAlbumPerson = {
  userId: string;
  name: string;
  image: string | null;
};

export type GameAlbumPhoto = {
  id: string;
  url: string;
  uploader: GameAlbumPerson;
  /** The viewer added it. */
  isMine: boolean;
  /** The viewer added it, or organizes the Game. */
  canRemove: boolean;
  createdAt: Date;
};

export type GameAlbumNote = {
  id: string;
  author: GameAlbumPerson;
  isMine: boolean;
  body: string;
  visibility: GameNoteVisibility;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * The Album and Notes on a played Game, as the viewer may see them. Another
 * player's private note never leaves the server: `silentPlayers` lists every
 * other player without a public note, whether or not they kept one private.
 */
export type GameAlbum = {
  gameId: string;
  /** A score is final and the viewer played or organizes, so the sections show. */
  open: boolean;
  viewer: {
    /** The viewer as a player of this Game; null for an Organizer who did not play. */
    person: GameAlbumPerson | null;
    isPlayer: boolean;
    isOrganizer: boolean;
    canAddPhotos: boolean;
    /** Free slots the viewer may fill now. */
    room: number;
    canWriteNote: boolean;
    notesCloseAt: Date | null;
  };
  photos: GameAlbumPhoto[];
  notes: {
    mine: GameAlbumNote | null;
    /** Other players' public notes, oldest first. Empty for a non-player. */
    shared: GameAlbumNote[];
  };
  /** The other players, who read a public note. */
  readers: GameAlbumPerson[];
  silentPlayers: GameAlbumPerson[];
};

export type AlbumTile =
  | { kind: "photo"; photo: GameAlbumPhoto; index: number }
  | { kind: "add"; primary: boolean }
  | { kind: "empty" };

/**
 * Six tiles, always. Photos fill from the start; while the viewer may add,
 * an empty Album opens on one black Add tile and every other empty slot
 * carries the plus; otherwise empty slots are only hatched.
 */
export function albumTiles(
  photos: readonly GameAlbumPhoto[],
  canAdd: boolean,
): AlbumTile[] {
  const tiles: AlbumTile[] = photos
    .slice(0, GAME_ALBUM_SLOTS)
    .map((photo, index) => ({ kind: "photo", photo, index }));
  while (tiles.length < GAME_ALBUM_SLOTS) {
    if (!canAdd) {
      tiles.push({ kind: "empty" });
    } else {
      tiles.push({
        kind: "add",
        primary: photos.length === 0 && tiles.length === 0,
      });
    }
  }
  return tiles;
}

export function albumCountLabel(count: number, locale: Locale) {
  return messagesFor(locale).gameAlbum.album.count(count, GAME_ALBUM_SLOTS);
}

function uploaderTally(album: GameAlbum, locale: Locale) {
  const m = messagesFor(locale).gameAlbum.album;
  const counts = new Map<
    string,
    { person: GameAlbumPerson; mine: boolean; count: number }
  >();
  for (const photo of album.photos) {
    const entry = counts.get(photo.uploader.userId) ?? {
      person: photo.uploader,
      mine: photo.isMine,
      count: 0,
    };
    entry.count += 1;
    counts.set(photo.uploader.userId, entry);
  }
  const entries = [...counts.values()].sort(
    (left, right) =>
      Number(right.mine) - Number(left.mine) || right.count - left.count,
  );
  return entries
    .map((entry, index) =>
      entry.mine
        ? m.youAdded(entry.count)
        : index === 0
          ? m.firstAdded(firstName(entry.person.name), entry.count)
          : m.alsoAdded(firstName(entry.person.name), entry.count),
    )
    .join(messagesFor(locale).common.listSeparator);
}

/** The line under the grid: what the Album is for, who filled it, or that it is full. */
export function albumCaption(album: GameAlbum, locale: Locale) {
  const m = messagesFor(locale).gameAlbum.album;
  const count = album.photos.length;
  if (count === 0) {
    return m.emptyCaption(album.readers.length + 1);
  }
  const free = GAME_ALBUM_SLOTS - count;
  const tally = uploaderTally(album, locale);
  if (free > 0) {
    return m.sentences([m.moreFit(free), tally]);
  }
  const hasMine = album.photos.some((photo) => photo.isMine);
  return hasMine ? m.fullRemoveYours : m.full;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function joinNames(names: readonly string[], locale: Locale) {
  const m = messagesFor(locale).gameAlbum;
  if (names.length <= 1) {
    return names[0] ?? "";
  }
  return m.twoNames(
    names.slice(0, -1).join(messagesFor(locale).common.listSeparator),
    names[names.length - 1]!,
  );
}

const NAMED_READERS = 3;

/** "Khalid, Ahmed and Dana will read this", or "Khalid, Ahmed and 10 others" on a big roster. */
export function noteReadersHint(
  readers: readonly GameAlbumPerson[],
  locale: Locale,
) {
  const m = messagesFor(locale).gameAlbum.note;
  if (readers.length === 0) {
    return m.publicNobodyYet;
  }
  const names = readers.map((reader) => firstName(reader.name));
  if (names.length <= NAMED_READERS) {
    return m.publicHint(joinNames(names, locale));
  }
  return m.publicHint(
    m.namesAndOthers(
      names
        .slice(0, NAMED_READERS - 1)
        .join(messagesFor(locale).common.listSeparator),
      names.length - (NAMED_READERS - 1),
    ),
  );
}

/** "The four of you": everyone who played, the viewer included. */
export function everyoneWhoPlayed(album: GameAlbum, locale: Locale) {
  return messagesFor(locale).gameAlbum.note.everyone(album.readers.length + 1);
}

export function notesCountLabel(album: GameAlbum, locale: Locale) {
  const m = messagesFor(locale).gameAlbum.notes;
  const shared =
    album.notes.shared.length +
    (album.notes.mine?.visibility === "public" ? 1 : 0);
  const privateMine = album.notes.mine?.visibility === "private";
  if (shared === 0 && !privateMine) {
    return m.noneYet;
  }
  if (!privateMine) {
    return m.publicCount(shared);
  }
  if (shared === 0) {
    return m.onlyYours;
  }
  return m.publicAndYours(shared);
}

/** Who has not shared a note, then when notes close. Never says who kept one private. */
export function notesFootnote(album: GameAlbum, now: Date, locale: Locale) {
  const m = messagesFor(locale).gameAlbum.notes;
  const silent = album.silentPlayers.map((person) => firstName(person.name));
  const parts: string[] = [];
  if (silent.length > 0 && silent.length <= NAMED_READERS) {
    parts.push(m.notShared(joinNames(silent, locale), silent.length));
  } else if (silent.length > NAMED_READERS) {
    parts.push(m.notSharedCount(silent.length));
  }
  const closeAt = album.viewer.notesCloseAt;
  if (album.viewer.isPlayer && closeAt) {
    parts.push(closeAt.getTime() > now.getTime() ? m.closeAfter : m.closed);
  }
  return parts.length > 0 ? m.sentences(parts) : null;
}

/** "Thu, 11:40 PM". */
export function noteTimeLabel(value: Date, locale: Locale) {
  return messagesFor(locale).gameAlbum.notes.time(
    formatWeekday(value, "short", locale),
    formatGameClock(value, locale),
  );
}

/** "Thu 6 Nov, 11:32 PM" under a photo in the viewer. */
export function photoTimeLabel(value: Date, locale: Locale) {
  return messagesFor(locale).gameAlbum.notes.time(
    formatDayMonth(value, locale, { weekday: "short" }),
    formatGameClock(value, locale),
  );
}

export function noteCharacterCount(body: string, locale: Locale) {
  return messagesFor(locale).gameAlbum.note.counter(
    Array.from(body).length,
    GAME_NOTE_MAX_LENGTH,
  );
}

/** Whether a draft may be saved: something written, not over the limit. */
export function noteDraftIsSavable(body: string) {
  const length = Array.from(body.trim()).length;
  return length > 0 && Array.from(body).length <= GAME_NOTE_MAX_LENGTH;
}

/** One played Game in the Played list: up to six thumbnails and the counts. */
export type GameAlbumSummary = {
  photoUrls: string[];
  photoCount: number;
  /** Notes the viewer can read: the public ones and their own. */
  noteCount: number;
};

export type AlbumStripTile = { kind: "photo"; url: string } | { kind: "empty" };

export function albumStripTiles(summary: GameAlbumSummary): AlbumStripTile[] {
  const tiles: AlbumStripTile[] = summary.photoUrls
    .slice(0, GAME_ALBUM_SLOTS)
    .map((url) => ({ kind: "photo", url }));
  while (tiles.length < GAME_ALBUM_SLOTS) {
    tiles.push({ kind: "empty" });
  }
  return tiles;
}

/** "6 photos, 3 notes", "No photos yet, 1 note". */
export function albumSummaryLine(summary: GameAlbumSummary, locale: Locale) {
  const m = messagesFor(locale).gameAlbum.played;
  return m.summary(
    summary.photoCount === 0 ? m.noPhotos : m.photos(summary.photoCount),
    summary.noteCount === 0 ? m.noNotes : m.notes(summary.noteCount),
  );
}

/** A note the viewer wrote, with its Game for context, for Your notes. */
export type MyGameNote = {
  id: string;
  gameId: string;
  body: string;
  visibility: GameNoteVisibility;
  createdAt: Date;
  updatedAt: Date;
  game: {
    playedAt: Date;
    venueName: string | null;
    groupName: string | null;
    /** The Game's name when it carries one (a social, a tournament). */
    name: string | null;
    outcome: "won" | "lost" | "draw" | null;
    /** Viewer's games first, one entry per set. Empty when there is no score. */
    sets: { us: number; them: number }[];
    partnerNames: string[];
  };
};

export type MyNotesTab = "all" | GameNoteVisibility;

export function filterMyNotes(
  notes: readonly MyGameNote[],
  tab: MyNotesTab,
): MyGameNote[] {
  return tab === "all"
    ? [...notes]
    : notes.filter((note) => note.visibility === tab);
}

export function myNotesCounts(notes: readonly MyGameNote[]) {
  const priv = notes.filter((note) => note.visibility === "private").length;
  return { all: notes.length, private: priv, public: notes.length - priv };
}

/** One set reads as its own score ("3–5"); more read set by set ("6-4 4-6 7-5"). */
export function noteScoreLine(sets: readonly { us: number; them: number }[]) {
  if (sets.length === 0) {
    return null;
  }
  if (sets.length === 1) {
    return isolate(`${sets[0]!.us}–${sets[0]!.them}`);
  }
  return isolate(sets.map((set) => `${set.us}-${set.them}`).join(" "));
}

/** "Thu 6, Ace Padel, with Khalid". */
export function myNoteGameLine(note: MyGameNote, locale: Locale) {
  const m = messagesFor(locale).gameAlbum.myNotes;
  const gameDay = gameDayStart(note.game.playedAt);
  const day = m.day(
    formatWeekday(gameDay, "short", locale),
    String(zonedParts(gameDay).day),
  );
  const place = note.game.name ?? note.game.venueName ?? note.game.groupName;
  const partners = note.game.partnerNames.map(shortPlayerName);
  const parts = [day, place].filter((part): part is string => Boolean(part));
  if (partners.length > 0) {
    parts.push(m.withPartners(joinNames(partners.map(firstName), locale)));
  }
  return parts.join(messagesFor(locale).common.listSeparator);
}

export type MyNotesMonth = { key: string; label: string; notes: MyGameNote[] };

/** Newest first, one group per month the Game was played in. */
export function myNotesByMonth(
  notes: readonly MyGameNote[],
  locale: Locale,
): MyNotesMonth[] {
  const sorted = [...notes].sort(
    (left, right) =>
      right.game.playedAt.getTime() - left.game.playedAt.getTime() ||
      right.createdAt.getTime() - left.createdAt.getTime(),
  );
  const months: MyNotesMonth[] = [];
  for (const note of sorted) {
    const key = productDayKey(note.game.playedAt).slice(0, 7);
    const last = months[months.length - 1];
    if (last && last.key === key) {
      last.notes.push(note);
    } else {
      months.push({
        key,
        label: formatMonth(note.game.playedAt, "long", locale),
        notes: [note],
      });
    }
  }
  return months;
}
