import type { editTeams as source } from "../en/edit-teams";
import { plural } from "../../plural";

function teamChanges(n: number) {
  return plural("ar", n, {
    zero: "لا أحد يغيّر فريقه",
    one: "لاعب واحد يغيّر فريقه",
    two: "لاعبان يغيّران فريقيهما",
    few: "{n} لاعبين يغيّرون فرقهم",
    many: "{n} لاعبًا يغيّرون فرقهم",
    other: "{n} لاعب يغيّرون فرقهم",
  });
}

function sideChanges(n: number) {
  return plural("ar", n, {
    zero: "لا أحد يغيّر جهته",
    one: "لاعب واحد يغيّر جهته",
    two: "لاعبان يغيّران جهتيهما",
    few: "{n} لاعبين يغيّرون جهاتهم",
    many: "{n} لاعبًا يغيّرون جهاتهم",
    other: "{n} لاعب يغيّرون جهاتهم",
  });
}

export const editTeams = {
  action: "تعديل الفرق",
  gameMenuHint: "انقل اللاعبين بين الجهات والفرق",
  tournamentMenuHint: "غيّر الثنائيات والجهات",
  title: "تعديل الفرق",
  gameInstructions:
    "اضغط على لاعب، ثم على المكان الذي ينتقل إليه. في الفريق نفسه تتغيّر جهته؛ وعبر الشبكة يتغيّر فريقه.",
  tournamentInstructions:
    "اضغط على لاعب، ثم على آخر لتبديلهما. في الفريق نفسه تتبدّل جهتاهما؛ وبين فريقين يتبدّل فريقاهما.",
  swapSides: "بدّل الجهتين",
  swapSidesOf: (team: string) => `بدّل الجهتين في ${team}`,
  net: "الشبكة",
  open: "شاغر",
  moveHere: "انقل هنا",
  left: "يسار",
  right: "يمين",
  spot: (team: string, side: string) => `${team}، ${side}`,
  playerSr: (name: string, spot: string) => `${name}، ${spot}`,
  openSr: (spot: string) => `${spot}، شاغر`,
  pickHint: "يختار هذا اللاعب لنقله",
  dropHint: "ينقل اللاعب المختار إلى هنا",
  cancelHint: "يلغي الاختيار",
  moved: "نُقل",
  lockedTag: "لعب",
  lockedTitle: "النتائج مسجّلة",
  lockedCopy:
    "النتيجة للفريق الذي لعبها، لذلك يبقى أفراده معًا. ما زال بإمكانك تبديل جهتيهما.",
  untilScore: "مسموح حتى تُسجَّل النتيجة.",
  roundsKeepSlots: "تحتفظ الجولات بفرقها؛ تتغيّر الأسماء فقط.",
  reset: "إعادة",
  noChangesTitle: "لا تغييرات بعد",
  noChangesGame: "التشكيلة كما اختارها اللاعبون",
  noChangesTournament: "الفرق كما سجّلت",
  changesTitle: (n: number) =>
    plural("ar", n, {
      zero: "لا تغييرات",
      one: "تغيير واحد",
      two: "تغييران",
      few: "{n} تغييرات",
      many: "{n} تغييرًا",
      other: "{n} تغيير",
    }),
  changesSubline: "لا يتغيّر شيء حتى تحفظ",
  save: "حفظ",
  confirmTitle: "حفظ الفرق الجديدة؟",
  summary: (teamChangeCount: number, sideChangeCount: number) => {
    if (teamChangeCount > 0 && sideChangeCount > 0) {
      return `${teamChanges(teamChangeCount)}، و${sideChanges(sideChangeCount)}.`;
    }
    if (teamChangeCount > 0) {
      return `${teamChanges(teamChangeCount)}.`;
    }
    return `${sideChanges(sideChangeCount)}.`;
  },
  movedLine: (from: string, to: string) => `من ${from} إلى ${to}`,
  notifyTitle: "أبلغ اللاعبين",
  notifyCopy: (names: string, count: number) =>
    plural("ar", count, {
      one: `يصل إلى ${names} إشعار بمكانه الجديد`,
      two: `يصل إلى ${names} إشعار بمكانيهما الجديدين`,
      other: `يصل إلى ${names} إشعار بأماكنهم الجديدة`,
    }),
  notifyNobody: "يتغيّر مكانك أنت فقط، فلن يُبلَّغ أحد.",
  keepEditing: "متابعة التعديل",
  saveTeams: "حفظ الفرق",
  savedToast: "حُفظت الفرق",
  tournamentCardCopy:
    "بدّل اللاعبين بين الفرق أو الجهات. الفرق التي لعبت تبقى معًا.",
  refused: {
    locked:
      "لعب هذا الفريق، لذلك يبقى أفراده معًا. ما زال بإمكانك تبديل جهتيه.",
    halfSide: "يحتاج كل فريق في هذه البطولة إلى لاعبَين.",
    fixedSides: "بعد نشر القرعة، بدّل اللاعبين بدل نقلهم إلى مكان شاغر.",
  },
  openSpot: {
    title: (spot: string) => `${spot} شاغر`,
    addPlayer: "أضف لاعبًا هنا",
    addPlayerHint: "أجلس أحدًا بنفسك، من المجموعة أو برقم الهاتف",
    join: "خذ هذا المكان بنفسك",
    move: "انتقل إلى هنا بنفسك",
  },
  errors: {
    format: "يمكن تعديل الفرق في مباريات البادل والبطولات الودية",
    scoreIn: "سُجّلت النتيجة، لذلك أصبحت الفرق ثابتة",
    lineupChanged: "انضم أحد أو غادر أثناء التعديل. راجع الفرق وحاول مجددًا.",
    spotTwice: "لا يمكن للاعبَين أن يشغلا المكان نفسه",
  },
} satisfies typeof source;
