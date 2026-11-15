export const group = { name: "Juffair Thursday 5s" };

export const game = {
  format: "5-a-side football",
  time: "8:00",
  meridiem: "PM",
  day: "Thursday 19 Nov",
  venue: "Juffair Sports Hub",
  pitch: "Pitch 2, Manama",
  price: "BD 2.500",
};

/**
 * The ten who play, in sign-up order. The Group is a football tier Group:
 * `points` are Tier points before the Game and `move` what the 5–3 result
 * did to them (winners up, losers down).
 */
export const players = [
  { name: "Ali Al-Mahroos", short: "Ali", points: 1560, move: 12 },
  { name: "سيد محمود", short: "محمود", points: 1512, move: -14 },
  { name: "Yousif Janahi", short: "Yousif", points: 1420, move: 16 },
  { name: "Hussain Ebrahim", short: "Hussain", points: 1221, move: -19 },
  { name: "عبدالله الدوسري", short: "عبدالله", points: 1204, move: 15 },
  { name: "Faisal Al-Qassab", short: "Faisal", points: 1188, move: 38 },
  { name: "Mohamed Buhiji", short: "Mohd", points: 1470, move: -17 },
  { name: "Ahmed Al-Aali", short: "Ahmed", points: 1138, move: 22 },
  { name: "Abbas Radhi", short: "Abbas", points: 1172, move: -18 },
  { name: "قاسم عيسى", short: "قاسم", points: 1130, move: -12 },
];

export const FAISAL = 5;
export const QASSIM = 9;

/** Team indices into `players`, by row. The one shuffle swaps Faisal and قاسم. */
export const firstSplit = { a: [0, 2, 4, 7, QASSIM], b: [1, 6, 3, 8, FAISAL] };
export const finalSplit = { a: [0, 2, 4, 7, FAISAL], b: [1, 6, 3, 8, QASSIM] };

/** Members still Provisional: no fish and no place until five Games. */
export const provisional = [
  { name: "Salman Fakhro", games: 3 },
  { name: "Jassim Kooheji", games: 1 },
];

export const memberCount = players.length + provisional.length;

export const score = { a: 5, b: 3, line: "Final, Thursday 19 Nov" };

export const mvpVotes = [
  { index: 0, votes: 5 },
  { index: 2, votes: 3 },
  { index: FAISAL, votes: 2 },
];

export type MarkKind = "mvp" | "goal_machine" | "great_wall" | "let_him_cook" | "mr_fumble" | "sayed_malek";

/** Mark names as the catalog has them (`marks.ts`). */
export const marks: { index: number; kind: MarkKind; name: string }[] = [
  { index: 0, kind: "mvp", name: "MVP" },
  { index: 2, kind: "goal_machine", name: "Goal Machine" },
  { index: 3, kind: "great_wall", name: "The Great Wall" },
  { index: 6, kind: "let_him_cook", name: "Let him cook" },
  { index: FAISAL, kind: "mr_fumble", name: "Mr Fumble" },
  { index: 8, kind: "sayed_malek", name: "Sayed Malek" },
];

/** Season 3 Standing before the Game; `won` marks Team A. Pts are win 3, draw 1. */
export const standing = [
  { index: 0, p: 12, w: 9, d: 1, won: true },
  { index: 1, p: 12, w: 8, d: 1, won: false },
  { index: 6, p: 11, w: 7, d: 0, won: false },
  { index: 2, p: 12, w: 6, d: 1, won: true },
  { index: 3, p: 12, w: 5, d: 2, won: false },
  { index: 4, p: 10, w: 4, d: 1, won: true },
  { index: FAISAL, p: 11, w: 3, d: 2, won: true },
  { index: 8, p: 11, w: 3, d: 1, won: false },
];

export const challenge = {
  team: "Juffair FC",
  lines: ["5-a-side, level around 1,300", "Juffair Sports Hub or Isa Town", "Thu or Fri, after 8 PM"],
  note: "Looking for a regular Thursday rival.",
  proposer: "Seef Strikers",
  proposal: ["Thu 26 Nov, 9:00 PM", "Juffair Sports Hub"],
  squad: ["Ali", "Yousif", "Faisal", "Mohd", "عبدالله"],
};

export const rivals = [
  { team: "Seef Strikers", won: 3, lost: 2, games: 5, form: ["won", "won", "lost", "won", "lost"] as const },
  { team: "Riffa Lions", won: 1, lost: 1, games: 2, form: ["won", "lost"] as const },
];

export const captions = {
  game: "نزّل القيم والشباب يسجلون",
  teams: "تقسيمة متوازنة بضغطة",
  mvp: "صوّتوا لأفضل لاعب",
  marks: "ووزّعوا الأوسمة",
  season: "موسم وترتيب لكل قروب",
  tiers: "فئة لكل لاعب: من صافي إلى قرش",
  challenge: "كوّن فريقك وتحدّى الفرق",
  rivals: "وخصومك راس براس",
};
