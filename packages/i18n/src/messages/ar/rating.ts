import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { rating as source } from "../en/rating";

export const rating = {
  bands: {
    shark: "قرش",
    hamour: "هامور",
    kanaad: "كنعد",
    safi: "صافي",
  },
  provisional: "مبدئي",
  scope: {
    group: "تُحتسب في فئة المجموعة",
    groupNote:
      "تحرّك نقاط الفئة في هذه المجموعة فقط. مستويات Temba تتحرّك في المجموعات الموثّقة.",
  },
  tier: {
    columnTier: "الفئة",
    columnPlayer: "اللاعب",
    columnPoints: "النقاط",
    theShark: "القرش",
    points: (points: string) => `${isolate(points)} نقطة`,
    sharkFor: (points: string, weeks: number) =>
      plural("ar", weeks, {
        zero: `${isolate(points)} نقطة، في الصدارة منذ أقل من أسبوع`,
        one: `${isolate(points)} نقطة، في الصدارة منذ أسبوع`,
        two: `${isolate(points)} نقطة، في الصدارة منذ أسبوعين`,
        few: `${isolate(points)} نقطة، في الصدارة منذ {n} أسابيع`,
        other: `${isolate(points)} نقطة، في الصدارة منذ {n} أسبوعًا`,
      }),
    place: (place: number) => `#${place}`,
    provisionalGames: (games: number, of: number) =>
      `مبدئي، ${games} من ${of} مباريات`,
    noTier: "بلا فئة",
    withOrganizer: (label: string) => `${label}، منظّم`,
    stillProvisional: (n: number) =>
      plural("ar", n, {
        zero: "لا أحد مبدئي",
        one: "واحد ما زال مبدئيًا",
        two: "اثنان ما زالا مبدئيين",
        few: "{n} ما زالوا مبدئيين",
        other: "{n} ما زالوا مبدئيين",
      }),
    pointsSpoken: (points: string) => `${isolate(points)} نقطة فئة`,
    footnote:
      "الفئة والنقاط خاصة بهذه المجموعة: الهامور هم أعلى 15% بعد القرش، والكنعد الـ35% التالية، والصافي البقية. النقاط تأتي من مباريات هذه المجموعة فقط.",
  },
  adjust: {
    menuRow: "تعديل التقييم",
    menuHint: "حرّك نقاط فئته يدويًا، مع سبب يراه",
    title: "تعديل التقييم",
    subtitle: (group: string) =>
      `${group}. تغيير يدوي، فوق ما فعلته المباريات.`,
    placeOf: (place: number, of: number) => `#${place} من ${of}`,
    now: (points: string, standing: string) =>
      `الآن ${isolate(points)}، ${standing}`,
    nowRanked: (band: string, placeOf: string) => `${band}، ${placeOf}`,
    nowProvisional: (games: number, of: number) =>
      `مبدئي، ${games} من ${of} مباريات`,
    newPoints: "النقاط الجديدة",
    noChange: "بلا تغيير",
    place: "المركز",
    noFish: "لا سمكة بعد",
    step: (delta: string) => `غيّر بمقدار ${isolate(delta)}`,
    orJump: "أو انتقل:",
    into: (band: string) => `إلى ${band}`,
    reset: "إعادة",
    tierAfter: "الفئة بعد التغيير",
    effect: {
      none: "لا تغيير بعد. الفئات مراكز في المجموعة، فحين يتحرّك لاعب يتحرّك غيره في الاتجاه الآخر.",
      stays: (band: string, placeOf: string) =>
        `ما زال ${band}، الآن ${placeOf}.`,
      nobodyElse: "لا يتغيّر أحد غيره في الفئة.",
      ranked: (name: string, band: string, placeOf: string) =>
        `صار ${name} مصنّفًا ${placeOf}، ${band}.`,
      rankedNoFish: (name: string, placeOf: string) =>
        `صار ${name} مصنّفًا ${placeOf}.`,
      passes: (name: string, names: string, band: string) =>
        `يتجاوز ${name} ${names} ويأخذ مكانًا في ${band}.`,
      dropsBelow: (name: string, names: string, band: string) =>
        `ينزل ${name} تحت ${names} إلى ${band}.`,
      movesUp: (name: string, band: string) => `يصعد ${name} إلى ${band}.`,
      movesDown: (name: string, band: string) => `ينزل ${name} إلى ${band}.`,
      noFish: (placeOf: string) =>
        `الآن ${placeOf}. لا أسماك حتى يُصنَّف أربعة لاعبين.`,
      otherUp: (name: string, band: string) => `يصعد ${name} إلى ${band}.`,
      otherBecomes: (name: string, band: string) => `يصبح ${name} ${band}.`,
      andMore: (n: number) =>
        plural("ar", n, {
          zero: "لا يتغيّر غيرهم.",
          one: "ويتغيّر لاعب آخر في الفئة.",
          two: "ويتغيّر لاعبان آخران في الفئة.",
          few: "ويتغيّر {n} لاعبين آخرين في الفئة.",
          many: "ويتغيّر {n} لاعبًا آخر في الفئة.",
          other: "ويتغيّر {n} لاعب آخر في الفئة.",
        }),
      twoNames: (first: string, last: string) => `${first} و${last}`,
      nameSeparator: "، ",
    },
    why: (name: string) => `لماذا؟ سيرى ${name} هذا.`,
    reasons: {
      new_to_group: "جديد هنا، مستواه معروف",
      back_from_injury: "عائد بعد انقطاع",
      plays_above_results: "يلعب أفضل من هذا",
      plays_below_results: "يلعب أقل من هذا",
      correcting_a_mistake: "تصحيح خطأ",
    },
    notePlaceholder: "أضف ملاحظة (اختياري)",
    noteLabel: "ملاحظة",
    saveMoveFirst: "حرّك النقاط أولًا",
    savePickReason: "اختر سببًا للحفظ",
    save: (delta: string) => `احفظ ${isolate(delta)} وسجّله`,
    saved: (name: string) => `حُفظ وسُجّل في سجل ${name}`,
    errors: {
      organizerOnly: "منظّمو هذه المجموعة وحدهم يعدّلون نقاط الفئة.",
      notYourOwn: "لا يمكنك تعديل نقاط فئتك.",
      noTier:
        "لا فئات في هذه المجموعة. الفئات لمجموعات كرة القدم غير الموثّقة.",
      notMember: "هذا اللاعب ليس في هذه المجموعة.",
      reasonRequired: "اختر سببًا. سيراه اللاعب.",
      noChange: "حرّك النقاط أولًا.",
      tooFar: (max: number) =>
        `يمكن للتعديل أن يحرّك نقاط الفئة ${max} على الأكثر.`,
      belowZero: "لا يمكن أن تنزل نقاط الفئة تحت الصفر.",
    },
  },
  history: {
    title: "النقاط والسجل",
    menuRow: "النقاط والسجل",
    menuHint: "ما حرّك نقاط فئته، مباراة بمباراة",
    groupGames: (n: number) =>
      plural("ar", n, {
        zero: "لا مباريات في المجموعة",
        one: "مباراة واحدة في المجموعة",
        two: "مباراتان في المجموعة",
        few: "{n} مباريات في المجموعة",
        many: "{n} مباراة في المجموعة",
        other: "{n} مباراة في المجموعة",
      }),
    toNextBand: (points: string, band: string) =>
      `${isolate(points)} إلى ${band}`,
    whatMovedIt: "ما الذي حرّكها",
    lastCount: (n: number) => `آخر ${n}`,
    empty: "لم يحرّك شيء هذه النقاط بعد. تتحرّك بعد كل مباراة في المجموعة.",
    deltaSpoken: (delta: string) => `${isolate(delta)} نقطة`,
    game: {
      won: (score: string) => `فوز ${isolate(score)}`,
      drew: (score: string) => `تعادل ${isolate(score)}`,
      lost: (score: string) => `خسارة ${isolate(score)}`,
      played: "مباراة في المجموعة",
      rated: (title: string, rating: string) =>
        `${title}، التقييم ${isolate(rating)}`,
      parts: (date: string, result: string, performance: string) =>
        `${date}. النتيجة ${isolate(result)}، الأداء ${isolate(performance)}`,
      resultOnly: (date: string, result: string) =>
        `${date}. النتيجة ${isolate(result)}`,
    },
    adjustment: {
      title: "حدّدها منظّم",
      detail: (date: string, from: string, to: string) =>
        `${date}، من ${isolate(from)} إلى ${isolate(to)}`,
      byline: (name: string, reason: string) => `${name}، ${reason}`,
      bylineNote: (name: string, reason: string, note: string) =>
        `${name}، ${reason}: «${note}»`,
      quote: (name: string, note: string) => `${name}: «${note}»`,
      you: "أنت",
      someone: "منظّم",
    },
    footnote: {
      other: (name: string) =>
        `يرى ${name} هذه القائمة نفسها. لا شيء هنا يغيّر مستوى Temba.`,
      self: "يرى منظّمو مجموعتك هذه القائمة نفسها. لا شيء هنا يغيّر مستواك في Temba.",
    },
    unnamed: "لاعب",
    loadFailed: "تعذّر تحميل النقاط والسجل",
    errors: {
      forbidden: "لا يرى هذه النقاط إلا اللاعب ومنظّمو هذه المجموعة.",
    },
  },
} satisfies typeof source;
