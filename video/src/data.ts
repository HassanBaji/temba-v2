export const group = {
  name: "Juffair Thursday 5s",
  meta: "Football · 5-a-side · Manama",
};

export const members = [
  { name: "Ali Al-Mahroos", line: "Organizer" },
  { name: "سيد محمود العلوي", line: "Joined just now" },
  { name: "Yousif Janahi", line: "Joined just now" },
  { name: "Hussain Ebrahim", line: "Joined just now" },
  { name: "عبدالله الدوسري", line: "Joined just now" },
  { name: "Faisal Al-Qassab", line: "Joined just now" },
];

/**
 * The ten who join the Game, in sign-up order. A football Group that is not
 * Verified is a tier Group: each member holds Tier points (from 1,200) and
 * Make teams balances on them. `move` is what the 5–3 Game did to them.
 */
export const players = [
  { name: "Ali Al-Mahroos", short: "Ali", points: 1486, move: 14 },
  { name: "سيد محمود", short: "محمود", points: 1441, move: -15 },
  { name: "Yousif Janahi", short: "Yousif", points: 1312, move: 16 },
  { name: "Hussain Ebrahim", short: "Hussain", points: 1287, move: -21 },
  { name: "عبدالله الدوسري", short: "عبدالله", points: 1254, move: 17 },
  { name: "Faisal Al-Qassab", short: "Faisal", points: 1241, move: 38 },
  { name: "Mohamed Buhiji", short: "Mohd", points: 1398, move: -16 },
  { name: "Ahmed Al-Aali", short: "Ahmed", points: 1148, move: 22 },
  { name: "Abbas Radhi", short: "Abbas", points: 1176, move: -18 },
  { name: "قاسم عيسى", short: "قاسم", points: 1121, move: -12 },
];

/** Members still Provisional: no fish and no place until five Games. */
export const provisional = [
  { name: "Salman Fakhro", games: 3 },
  { name: "Jassim Kooheji", games: 1 },
];

export const memberCount = players.length + provisional.length;
export const sharkWeeks = 3;

export const game = {
  sport: "Football · 5-a-side",
  day: "Thursday 19 Nov",
  time: "8:00",
  meridiem: "PM",
  venue: "Juffair Sports Hub",
  pitch: "Pitch 2 · Manama",
  price: "BD 2.500",
};

/** Team indices into `players`: the first split, then the one shuffle. */
export const firstSplit = { a: [0, 2, 4, 6, 8], b: [1, 3, 5, 7, 9] };
export const finalSplit = { a: [0, 2, 4, 7, 5], b: [1, 3, 8, 6, 9] };

export const profile = {
  name: "Ali Al-Mahroos",
  group: "Juffair Thursday 5s",
  form: ["won", "won", "lost", "won", "lost", "won", "won", "won"] as const,
  played: 24,
  won: 15,
  winRate: 63,
  goals: 31,
  /** Win rate after each Game this season. */
  trend: [40, 45, 42, 48, 52, 50, 55, 53, 58, 57, 61, 60, 63],
};

export const standing = [
  { name: "Ali Al-Mahroos", p: 12, w: 9, pts: 28 },
  { name: "سيد محمود", p: 12, w: 8, pts: 25 },
  { name: "Mohamed Buhiji", p: 11, w: 7, pts: 22 },
  { name: "Yousif Janahi", p: 12, w: 6, pts: 20 },
  { name: "عبدالله الدوسري", p: 10, w: 6, pts: 19 },
  { name: "Faisal Al-Qassab", p: 12, w: 5, pts: 16 },
  { name: "Hussain Ebrahim", p: 9, w: 4, pts: 13 },
  { name: "Abbas Radhi", p: 11, w: 3, pts: 11 },
];

/** Captions in white Arabic, with the App's own Arabic terms (المجموعة، المباراة، الفئة). */
export const captions = {
  group: "أنشئ مجموعتك",
  game: "انشر المباراة والكل يسجّل",
  teams: "كوّن الفرق",
  result: "سجّل النتيجة وتتحدّث إحصاءاتك",
  season: "موسم وترتيب لكل مجموعة",
  tiers: "فئة لكل لاعب: من صافي إلى قرش",
};
