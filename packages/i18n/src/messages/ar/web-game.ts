import { plural } from "../../plural";
import type { webGame as source } from "../en/web-game";

export const webGame = {
  addPlayer: {
    playsAs: "يلعب كـ",
    preferredPosition: "المركز المفضّل",
    side: "الجهة",
    position: "الموضع",
    adding: "جارٍ الإضافة…",
    phone: "الهاتف",
    lookingUp: "جارٍ البحث…",
    startingLevel: "المستوى الابتدائي",
  },
  hero: {
    timeUnset: "الوقت غير محدد",
    youAnd: (name: string) => `أنت و${name}`,
  },
  directions: "الاتجاهات",
  overflow: {
    gameActions: "إجراءات اللعبة",
  },
  joinSheet: {
    seatName: (side: string, position: string) => `${side} ${position}`,
    seatTakenBy: (seat: string, name: string) => `${seat}، يشغله ${name}`,
    takeSeat: (seat: string) => `خذ ${seat}`,
    versus: "ضد",
    teams: "الفرق",
    allTeams: "كل الفرق",
    joinSeatButton: (side: string, position: string) =>
      `انضم إلى ${side}، المقعد ${position}`,
    registeredToast: "تم التسجيل",
    seatJoinFailed: "تعذّر أخذ هذا المقعد. حاول مجددًا.",
  },
  partnerPicker: {
    playedWithBefore: "لعبت معهم من قبل",
    loadingSuggestions: "جارٍ تحميل اقتراحات الشركاء",
    suggestionsError: "تعذّر تحميل الاقتراحات",
    searchPlaceholder: "ابحث عن مستخدمين",
    fromYourGroups: "من مجموعاتك",
  },
  partnerReview: {
    stepTwoOfTwo: "الخطوة 2 من 2",
    seatSides: "جهات المقاعد",
    registering: "جارٍ التسجيل…",
  },
  seatBlocks: {
    actionsFor: (name: string) => `إجراءات لـ ${name}`,
    open: "مفتوح",
    vacant: "شاغر",
  },
  booked: "محجوز",
  detailTiles: {
    date: "التاريخ",
    time: "الوقت",
    levelRange: "نطاق المستوى",
  },
  loadingGame: "جارٍ تحميل اللعبة",
  header: {
    onGroup: "في مجموعة",
    pickupGame: "لعبة مفتوحة",
    public: "عامة",
  },
  levelRange: {
    requestApproved: "تمت الموافقة على الطلب",
    requestRejected: "تم رفض الطلب",
    requesting: "جارٍ الطلب…",
    sectionTitle: "طلبات نطاق المستوى",
    sectionDescription:
      "الموافقة تمنح إعفاءً دون إجلاسهم. الرفض يتيح لهم الطلب مجددًا.",
    noPending: "لا طلبات معلّقة لنطاق المستوى.",
  },
  occupancy: {
    teamsToGo: (n: number) =>
      plural("ar", n, {
        one: "بقي فريق واحد",
        two: "بقي فريقان",
        few: "بقي {n} فرق",
        many: "بقي {n} فريقًا",
        other: "بقي {n} فريق",
      }),
    teams: "الفرق",
    onWaitlist: (n: number) =>
      plural("ar", n, {
        one: "1 في قائمة الانتظار",
        two: "2 في قائمة الانتظار",
        few: "{n} في قائمة الانتظار",
        many: "{n} في قائمة الانتظار",
        other: "{n} في قائمة الانتظار",
      }),
  },
  overview: {
    rounds: "الجولات",
    roundUnit: (n: number) =>
      plural("ar", n, { one: "جولة", two: "جولتان", few: "جولات", many: "جولة", other: "جولة" }),
  },
} satisfies typeof source;
