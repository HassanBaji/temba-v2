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

/** The ten who join the Game, in sign-up order. */
export const players = [
  { name: "Ali Al-Mahroos", short: "Ali", level: 6.8 },
  { name: "سيد محمود", short: "محمود", level: 7.2 },
  { name: "Yousif Janahi", short: "Yousif", level: 6.1 },
  { name: "Hussain Ebrahim", short: "Hussain", level: 5.9 },
  { name: "عبدالله الدوسري", short: "عبدالله", level: 6.6 },
  { name: "Faisal Al-Qassab", short: "Faisal", level: 6.4 },
  { name: "Mohamed Buhiji", short: "Mohamed", level: 7.0 },
  { name: "Ahmed Al-Aali", short: "Ahmed", level: 5.7 },
  { name: "Abbas Radhi", short: "Abbas", level: 6.3 },
  { name: "قاسم عيسى", short: "قاسم", level: 6.0 },
];

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
export const finalSplit = { a: [0, 3, 4, 6, 9], b: [1, 2, 5, 7, 8] };

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

export const captions = {
  group: "سوّ قروبك",
  game: "نزّل القيم والشباب يسجلون",
  teams: "سوّ التقسيمة",
  result: "حط النتيجة وتنحسب إحصائياتك",
  season: "موسم و leaderboard لكل قروب",
};
