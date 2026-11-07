import type { FootballBib } from "./football-lineup";
import {
  MARKS_WINDOW_HOURS,
  marksWindow,
  remainingMarks,
  type GameMark,
  type GameMarks,
  type GameMarksParticipant,
  type GivenMark,
  type MarkKind,
} from "./marks";
import type { Sport } from "./sport";

export const MARKS_FIXTURE_VIEWER_ID = "user-viewer";

export type MarksFixtureKey =
  | "notCompleted"
  | "openNoneGiven"
  | "openSomeGiven"
  | "capReached"
  | "unclaimedReceiver"
  | "football"
  | "spectator"
  | "closed";

const HOUR_MS = 60 * 60 * 1000;

type Seat = {
  userId: string;
  name: string;
  slot: 1 | 2;
  isUnclaimed?: boolean;
  goals?: number;
  keeper?: boolean;
};

const PADEL_SEATS: Seat[] = [
  { userId: MARKS_FIXTURE_VIEWER_ID, name: "Hassan Haji", slot: 1 },
  { userId: "user-ali", name: "Ali Mansoor", slot: 1 },
  { userId: "user-bo", name: "Bo Fareed", slot: 2 },
  { userId: "user-khalid", name: "Khalid R", slot: 2 },
];

const FOOTBALL_SEATS: Seat[] = [
  { userId: MARKS_FIXTURE_VIEWER_ID, name: "Hassan Haji", slot: 1 },
  { userId: "user-yousif", name: "Yousif Kadhem", slot: 1, goals: 3 },
  { userId: "user-hamad", name: "Hamad A", slot: 1, keeper: true },
  { userId: "user-bo", name: "Bo Fareed", slot: 2, goals: 1 },
  { userId: "user-khalid", name: "Khalid R", slot: 2, keeper: true },
  { userId: "user-omar", name: "Omar T", slot: 2 },
];

const FOOTBALL_BIBS: Record<1 | 2, FootballBib> = { 1: "black", 2: "white" };

type MarkSeed = [giverUserId: string, receiverUserId: string, kind: MarkKind];

function receivedBy(userId: string, marks: GameMark[]) {
  const counts = new Map<MarkKind, number>();
  for (const mark of marks) {
    if (mark.receiverUserId === userId) {
      counts.set(mark.kind, (counts.get(mark.kind) ?? 0) + 1);
    }
  }
  return [...counts].map(([kind, count]) => ({ kind, count }));
}

function gameMarks(args: {
  sport: Sport;
  seats: Seat[];
  marks: MarkSeed[];
  completedAt: Date | null;
  now: Date;
}): GameMarks {
  const viewerId = MARKS_FIXTURE_VIEWER_ID;
  const marks: GameMark[] = args.marks.map(
    ([giverUserId, receiverUserId, kind], index) => ({
      id: `mark-${index + 1}`,
      kind,
      giverUserId,
      receiverUserId,
      createdAt: new Date(
        (args.completedAt ?? args.now).getTime() + (index + 1) * HOUR_MS,
      ),
    }),
  );
  const football = args.sport === "football";
  const participants: GameMarksParticipant[] = args.seats.map((seat) => ({
    userId: seat.userId,
    name: seat.name,
    image: null,
    slot: seat.slot,
    bib: football ? FOOTBALL_BIBS[seat.slot] : null,
    isUnclaimed: seat.isUnclaimed ?? false,
    isViewer: seat.userId === viewerId,
    goals: football ? (seat.goals ?? 0) : null,
    keeper: seat.keeper ?? false,
    received: receivedBy(seat.userId, marks),
  }));
  const marksWindowState = marksWindow(args.completedAt, args.now);
  const given: GivenMark[] = marks
    .filter((mark) => mark.giverUserId === viewerId)
    .map(({ receiverUserId, kind }) => ({ receiverUserId, kind }));
  const isParticipant = participants.some(
    (participant) => participant.userId === viewerId,
  );
  const remaining = remainingMarks(given);
  return {
    gameId: `game-${args.sport}`,
    sport: args.sport,
    matchId: `match-${args.sport}`,
    window: marksWindowState,
    participants,
    marks,
    summary: {
      given: marks.length,
      givers: new Set(marks.map((mark) => mark.giverUserId)).size,
    },
    viewer: {
      isParticipant,
      canGive:
        isParticipant && marksWindowState?.state === "open" && remaining > 0,
      remaining,
      given,
    },
  };
}

/** One `marks.forGame` payload per Game screen state, for both clients' tests. */
export function createMarksFixtures(
  now: Date = new Date(),
): Record<MarksFixtureKey, GameMarks> {
  const completedAt = new Date(now.getTime() - 10 * HOUR_MS);
  const longAgo = new Date(now.getTime() - (MARKS_WINDOW_HOURS + 2) * HOUR_MS);
  const viewer = MARKS_FIXTURE_VIEWER_ID;
  return {
    notCompleted: gameMarks({
      sport: "padel",
      seats: PADEL_SEATS,
      marks: [],
      completedAt: null,
      now,
    }),
    openNoneGiven: gameMarks({
      sport: "padel",
      seats: PADEL_SEATS,
      marks: [["user-bo", "user-khalid", "dynamo"]],
      completedAt,
      now,
    }),
    openSomeGiven: gameMarks({
      sport: "padel",
      seats: PADEL_SEATS,
      marks: [
        [viewer, "user-ali", "dynamo"],
        ["user-bo", viewer, "great_wall"],
      ],
      completedAt,
      now,
    }),
    capReached: gameMarks({
      sport: "padel",
      seats: PADEL_SEATS,
      marks: [
        [viewer, "user-ali", "smash_machine"],
        [viewer, "user-bo", "good_game"],
        [viewer, "user-khalid", "mr_ice"],
      ],
      completedAt,
      now,
    }),
    unclaimedReceiver: gameMarks({
      sport: "padel",
      seats: PADEL_SEATS.map((seat) =>
        seat.userId === "user-khalid" ? { ...seat, isUnclaimed: true } : seat,
      ),
      marks: [[viewer, "user-khalid", "underdog"]],
      completedAt,
      now,
    }),
    football: gameMarks({
      sport: "football",
      seats: FOOTBALL_SEATS,
      marks: [
        ["user-hamad", "user-yousif", "goal_machine"],
        ["user-bo", "user-hamad", "great_wall"],
        [viewer, "user-yousif", "clutch"],
      ],
      completedAt,
      now,
    }),
    spectator: gameMarks({
      sport: "padel",
      seats: PADEL_SEATS.filter((seat) => seat.userId !== viewer),
      marks: [["user-bo", "user-ali", "comeback_king"]],
      completedAt,
      now,
    }),
    closed: gameMarks({
      sport: "football",
      seats: FOOTBALL_SEATS,
      marks: [
        [viewer, "user-yousif", "dynamo"],
        [viewer, "user-bo", "good_game"],
        ["user-omar", "user-bo", "mr_fumble"],
      ],
      completedAt: longAgo,
      now,
    }),
  };
}
