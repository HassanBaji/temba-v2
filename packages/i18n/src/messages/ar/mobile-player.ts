import { plural } from "../../plural";
import type { mobilePlayer as source } from "../en/mobile-player";

export const mobilePlayer = {
  primitives: {
    clearSearch: "مسح البحث",
    formSlot: { won: "ف", lost: "خ", draw: "ت" },
  },
  lib: {
    sport: "الرياضة",
    sports: "الرياضات",
    toggleOn: (label: string) => `${label}، مفعّل`,
    toggleOff: (label: string) => `${label}، معطّل`,
  },
  profile: {
    loadError: "تعذّر تحميل الملف الشخصي",
    gamesLoadError: "تعذّر تحميل الألعاب",
    lastTenTitle: "آخر 10 ألعاب",
    lastTenSpoken: (record: string) => `آخر 10 ألعاب. ${record}`,
    filterGames: "تصفية الألعاب",
    matchesSubtitle: (name: string, record: string) => `${name}، ${record}`,
    preferredSide: "الجهة المفضّلة",
    preferredPosition: "المركز المفضّل",
    positionSpoken: (label: string, subtitle: string) =>
      `${label}. ${subtitle}`,
    streaks: "السلاسل",
    currentStreak: "السلسلة الحالية",
    bestStreak: "أفضل سلسلة",
    currentStreakSpoken: (headline: string) => `السلسلة الحالية. ${headline}`,
    bestStreakSpoken: (headline: string, reachedIn: string | null) =>
      reachedIn
        ? `أفضل سلسلة. ${headline}، ${reachedIn}`
        : `أفضل سلسلة. ${headline}`,
    levelSpoken: (label: string) => `المستوى. ${label}`,
    levelWithTrendSpoken: (label: string, trend: string) =>
      `${label}. ${trend}`,
    provisional: "مبدئي",
    tileSpoken: (label: string, value: string) => `${label} ${value}`,
    setsSpoken: (sets: string[]) => `الأشواط: ${sets.join("، ")}`,
    opensPlayerProfile: "يفتح ملف اللاعب الشخصي",
    ratingChange: (before: string, after: string) => `${before} ← ${after}`,
  },
  played: {
    levelLine: (level: string) => `المستوى ${level}`,
    columnSpoken: (title: string, word: string) => `${title}، ${word}`,
    notOnATeam: "ليس في فريق",
    scoreSpoken: (
      firstName: string,
      firstScore: number,
      secondName: string,
      secondScore: number,
    ) => `${firstName} ${firstScore}، ${secondName} ${secondScore}`,
    confirmed: "مؤكَّدة",
    pairRowSpoken: (line: string, word: string, sets: string[]) =>
      `${line}، ${word}. الأشواط ${sets.join("، ")}`,
    viewProfile: "عرض الملف الشخصي",
    renameSpoken: (action: string, name: string) => `${action}: ${name}`,
    kickSpoken: (action: string, name: string) => `${action} ${name}`,
  },
  share: {
    story: "قصة",
    sticker: "ملصق",
    whatToShare: "ما تريد مشاركته",
    hint: {
      story: "1080 × 1920، بحجم القصة.",
      sticker: "ملصق شفاف تضعه على صورتك.",
    },
    permissionRefused: "اسمح لـ Temba بالإضافة إلى صورك من الإعدادات.",
    sharingUnavailable: "المشاركة غير متاحة على هذا الجهاز.",
    gameNotFound: "اللعبة غير موجودة",
    gameNotFoundDescription: "ربما أُزيلت، أو ليس لديك صلاحية الوصول إليها.",
    loadError: "تعذّر تحميل النتيجة",
    loading: "جارٍ تحميل النتيجة",
    noResultYet: "لا نتيجة للمشاركة بعد",
    noResultYetDescription: "بعد تأكيد النتيجة، تكون بطاقة النتيجة جاهزة هنا.",
    couldNotShare: "تعذّرت المشاركة",
    savedToPhotos: "تم الحفظ في الصور",
    linkStillLoading: "الرابط ما زال يُحمَّل",
    saveToPhotos: "حفظ في الصور",
    saveStickerToPhotos: "حفظ الملصق في الصور",
    saveHint: "صورة PNG تنشرها في أي مكان",
    shareImage: "مشاركة الصورة",
    shareImageHint: "أرسل الصورة مباشرة إلى تطبيق",
    shareLink: "مشاركة الرابط",
    shareLinkHint: "النتيجة على Temba",
    shareAsMessage: "مشاركة كرسالة",
    shareAsMessageHint: "النتيجة والنادي والرابط كنص",
    sets: "الأشواط",
    scorers: "المسجّلون",
    you: "أنت",
    goals: (n: number) =>
      plural("ar", n, {
        zero: "لا أهداف",
        one: "هدف واحد",
        two: "هدفان",
        few: "{n} أهداف",
        many: "{n} هدفًا",
        other: "{n} هدف",
      }),
  },
} satisfies typeof source;
