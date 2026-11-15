import { describe, expect, it } from "vitest";

import {
  albumCaption,
  albumStripTiles,
  albumSummaryLine,
  albumTiles,
  filterMyNotes,
  gameNotesCloseAt,
  myNoteGameLine,
  myNotesByMonth,
  myNotesCounts,
  noteDraftIsSavable,
  noteReadersHint,
  noteScoreLine,
  notesCountLabel,
  notesFootnote,
  type GameAlbum,
  type GameAlbumNote,
  type GameAlbumPerson,
  type GameAlbumPhoto,
  type MyGameNote,
} from "./game-album";

const hassan: GameAlbumPerson = {
  userId: "h",
  name: "Hassan Haji",
  image: null,
};
const khalid: GameAlbumPerson = {
  userId: "k",
  name: "Khalid Janahi",
  image: null,
};
const dana: GameAlbumPerson = {
  userId: "d",
  name: "Dana Al-Khalifa",
  image: null,
};
const ahmed: GameAlbumPerson = {
  userId: "a",
  name: "Ahmed Buali",
  image: null,
};

const at = new Date("2026-11-06T20:32:00Z");

function photo(uploader: GameAlbumPerson, id: string): GameAlbumPhoto {
  return {
    id,
    url: `/p/${id}`,
    uploader,
    isMine: uploader === hassan,
    canRemove: uploader === hassan,
    createdAt: at,
  };
}

function note(
  author: GameAlbumPerson,
  visibility: GameAlbumNote["visibility"],
): GameAlbumNote {
  return {
    id: author.userId,
    author,
    isMine: author === hassan,
    body: "Good game",
    visibility,
    createdAt: at,
    updatedAt: at,
  };
}

function album(overrides: Partial<GameAlbum> = {}): GameAlbum {
  return {
    gameId: "g",
    open: true,
    viewer: {
      person: hassan,
      isPlayer: true,
      isOrganizer: false,
      canAddPhotos: true,
      room: 6,
      canWriteNote: true,
      notesCloseAt: gameNotesCloseAt(at),
    },
    photos: [],
    notes: { mine: null, shared: [] },
    readers: [khalid, dana, ahmed],
    silentPlayers: [khalid, dana, ahmed],
    ...overrides,
  };
}

describe("albumTiles", () => {
  it("opens an empty Album on one black Add tile and five plus slots", () => {
    const tiles = albumTiles([], true);
    expect(tiles).toHaveLength(6);
    expect(tiles[0]).toEqual({ kind: "add", primary: true });
    expect(
      tiles.slice(1).every((tile) => tile.kind === "add" && !tile.primary),
    ).toBe(true);
  });

  it("fills from the start and keeps six tiles", () => {
    const tiles = albumTiles([photo(hassan, "1"), photo(dana, "2")], true);
    expect(tiles.map((tile) => tile.kind)).toEqual([
      "photo",
      "photo",
      "add",
      "add",
      "add",
      "add",
    ]);
    expect(tiles[2]).toEqual({ kind: "add", primary: false });
  });

  it("hatches empty slots without a plus for someone who cannot add", () => {
    expect(albumTiles([photo(dana, "1")], false).slice(1)).toEqual(
      Array.from({ length: 5 }, () => ({ kind: "empty" })),
    );
  });
});

describe("albumCaption", () => {
  it("explains the Album while it is empty", () => {
    expect(albumCaption(album(), "en")).toBe(
      "Six photos for the game, from anyone who played. The four of you see them here; nothing is posted anywhere else.",
    );
  });

  it("counts free slots and who added what, you first", () => {
    const photos = [
      photo(dana, "1"),
      photo(hassan, "2"),
      photo(hassan, "3"),
      photo(khalid, "4"),
    ];
    expect(albumCaption(album({ photos }), "en")).toBe(
      "Two more fit. You added two, Dana one, Khalid one.",
    );
  });

  it("offers to remove one of yours once full", () => {
    const photos = ["1", "2", "3", "4", "5", "6"].map((id) =>
      photo(id === "1" ? hassan : dana, id),
    );
    expect(albumCaption(album({ photos }), "en")).toBe(
      "Full. Remove one of yours to add another.",
    );
    expect(
      albumCaption(
        album({ photos: photos.map((p) => ({ ...p, isMine: false })) }),
        "en",
      ),
    ).toBe("Full.");
  });
});

describe("notesCountLabel", () => {
  it("reads none yet, public only, and public plus yours", () => {
    expect(notesCountLabel(album(), "en")).toBe("none yet");
    expect(
      notesCountLabel(
        album({
          notes: {
            mine: note(hassan, "private"),
            shared: [note(khalid, "public"), note(dana, "public")],
          },
        }),
        "en",
      ),
    ).toBe("2 public, 1 yours");
    expect(
      notesCountLabel(
        album({
          notes: {
            mine: note(hassan, "public"),
            shared: [note(dana, "public")],
          },
        }),
        "en",
      ),
    ).toBe("2 public");
  });
});

describe("notesFootnote", () => {
  it("names who has not shared a note and says when notes close", () => {
    expect(notesFootnote(album({ silentPlayers: [ahmed] }), at, "en")).toBe(
      "Ahmed hasn’t shared a note. Notes close 30 days after the game.",
    );
    expect(
      notesFootnote(
        album({ silentPlayers: [hassan, ahmed] }),
        new Date("2027-01-01"),
        "en",
      ),
    ).toBe("Hassan and Ahmed haven’t shared a note. Notes are closed.");
  });
});

describe("noteReadersHint", () => {
  it("names up to three readers, then counts the rest", () => {
    expect(noteReadersHint([khalid, ahmed, dana], "en")).toBe(
      "Khalid, Ahmed and Dana will read this",
    );
    const many = Array.from({ length: 12 }, (_, index) => ({
      ...khalid,
      userId: String(index),
    }));
    expect(noteReadersHint(many, "en")).toBe(
      "Khalid, Khalid and 10 others will read this",
    );
  });
});

describe("noteDraftIsSavable", () => {
  it("needs something written and at most 300 characters", () => {
    expect(noteDraftIsSavable("   ")).toBe(false);
    expect(noteDraftIsSavable("Clean.")).toBe(true);
    expect(noteDraftIsSavable("x".repeat(301))).toBe(false);
  });
});

describe("albumSummaryLine and albumStripTiles", () => {
  it("counts photos and notes, and pads the strip to six", () => {
    const summary = { photoUrls: ["a", "b", "c"], photoCount: 3, noteCount: 6 };
    expect(albumSummaryLine(summary, "en")).toBe("3 photos, 6 notes");
    expect(
      albumSummaryLine({ photoUrls: [], photoCount: 0, noteCount: 1 }, "en"),
    ).toBe("No photos yet, 1 note");
    expect(albumStripTiles(summary).map((tile) => tile.kind)).toEqual([
      "photo",
      "photo",
      "photo",
      "empty",
      "empty",
      "empty",
    ]);
  });
});

function myNote(
  id: string,
  playedAt: string,
  visibility: MyGameNote["visibility"],
): MyGameNote {
  return {
    id,
    gameId: id,
    body: "Note",
    visibility,
    createdAt: new Date(playedAt),
    updatedAt: new Date(playedAt),
    game: {
      playedAt: new Date(playedAt),
      venueName: "Ace Padel",
      groupName: "Tuesday Night Padel",
      name: null,
      outcome: "won",
      sets: [
        { us: 6, them: 4 },
        { us: 4, them: 6 },
        { us: 7, them: 5 },
      ],
      partnerNames: ["Khalid Janahi"],
    },
  };
}

describe("Your notes", () => {
  const notes = [
    myNote("oct", "2026-10-30T17:00:00Z", "private"),
    myNote("nov", "2026-11-06T17:00:00Z", "private"),
    myNote("oct-shared", "2026-10-25T17:00:00Z", "public"),
  ];

  it("groups newest first by month", () => {
    const months = myNotesByMonth(notes, "en");
    expect(months.map((month) => month.label)).toEqual(["November", "October"]);
    expect(months[1]!.notes.map((entry) => entry.id)).toEqual([
      "oct",
      "oct-shared",
    ]);
  });

  it("counts and filters by visibility", () => {
    expect(myNotesCounts(notes)).toEqual({ all: 3, private: 2, public: 1 });
    expect(filterMyNotes(notes, "public").map((entry) => entry.id)).toEqual([
      "oct-shared",
    ]);
  });

  it("puts the day, the venue and the partner on one line", () => {
    expect(myNoteGameLine(notes[1]!, "en")).toBe(
      "Fri 6, Ace Padel, with Khalid",
    );
  });

  it("reads the score set by set, or a single set as one score", () => {
    expect(noteScoreLine(notes[0]!.game.sets)).toContain("6-4 4-6 7-5");
    expect(noteScoreLine([{ us: 3, them: 5 }])).toContain("3–5");
    expect(noteScoreLine([])).toBeNull();
  });
});
