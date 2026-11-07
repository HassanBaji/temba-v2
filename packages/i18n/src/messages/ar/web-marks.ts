import { isolate } from "../../bidi";
import type { webMarks as source } from "../en/web-marks";
import { plural } from "../../plural";

function timesAr(n: number) {
  return plural("ar", n, {
    one: "مرة",
    two: "مرتان",
    few: "{n} مرات",
    many: "{n} مرة",
    other: "{n} مرة",
  });
}

function kindsAr(n: number) {
  return plural("ar", n, {
    zero: "لا أنواع",
    one: "نوع واحد",
    two: "نوعان",
    few: "{n} أنواع",
    many: "{n} نوعًا",
    other: "{n} نوع",
  });
}

export const webMarks = {
  sentences: (parts: string[]) => parts.join(". "),
  and: (first: string, second: string) => `${first} و${second}`,
  marksCount: (n: number) =>
    plural("ar", n, {
      zero: "لا أوسمة",
      one: "وسام واحد",
      two: "وسامان",
      few: "{n} أوسمة",
      many: "{n} وسامًا",
      other: "{n} وسام",
    }),
  closesAt: (when: string) => `يُغلق ${when}`,
  mvp: {
    title: (name: string) => `${isolate(name)}، نجم المباراة`,
    votePending: (mode: string, progress: string) => `${mode}. ${progress}`,
    organizerPending: (when: string) => `المنظّم يختار. يُغلق ${when}`,
    tieWaiting: (when: string) =>
      `تعادل في التصويت. يختار المنظّم، يُغلق ${when}`,
    pickChangeable: (when: string) =>
      `اختيار المنظّم، قابل للتغيير حتى ${when}`,
    profileSpoken: (name: string) => `عرض ملف ${isolate(name)}`,
  },
  give: {
    noneLeft: "لم يبقَ لك أوسمة. استرجع واحدًا لتمنحه لغيره.",
  },
  pickPlayer: {
    title: "من يستحق وسامًا؟",
    subtitle: (n: number) =>
      plural("ar", n, {
        zero: "لم يبقَ أوسمة. واحد لكل لاعب، وليس لنفسك.",
        one: "بقي وسام واحد. واحد لكل لاعب، وليس لنفسك.",
        two: "بقي وسامان. واحد لكل لاعب، وليس لنفسك.",
        few: "بقي {n} أوسمة. واحد لكل لاعب، وليس لنفسك.",
        many: "بقي {n} وسامًا. واحد لكل لاعب، وليس لنفسك.",
        other: "بقي {n} وسام. واحد لكل لاعب، وليس لنفسك.",
      }),
    ownSide: (side: string) => `فريقك، ${side}`,
    ownCaption: "أوسمة الزملاء والمشتركة",
    otherSide: (side: string) => `الفريق الآخر، ${side}`,
    otherCaption: "أوسمة الخصوم والمشتركة",
    retractSpoken: (kind: string, name: string) =>
      `استرجاع ${kind} من ${isolate(name)}`,
  },
  pickMark: {
    title: (name: string) => `وسام لـ ${isolate(name)}`,
    teammateSubtitle: "زميلك في الفريق. اختر واحدًا، وسيعرف ممن جاء.",
    opponentSubtitle: "منافسك. اختر واحدًا، وسيعرف ممن جاء.",
    forTeammate: "لزميل في الفريق",
    forOpponent: "لمنافس",
    roasts: "للمزاح",
    roastsCaption: "يمكنه إخفاءها من ملفه",
    padelOnly: (kind: string) => `${kind} غير موجودة هنا لأنها للبادل فقط.`,
    footballOnly: (kind: string) =>
      `${kind} غير موجودة هنا لأنها لكرة القدم فقط.`,
    opponentOnly: (kind: string) =>
      `أوسمة الخصوم مثل ${kind} تظهر فقط عند اختيار لاعب من الفريق الآخر.`,
    teammateOnly: (kind: string) =>
      `أوسمة الزملاء مثل ${kind} تظهر فقط عند اختيار لاعب من فريقك.`,
    picked: (kind: string, name: string) => `${kind} لـ ${isolate(name)}`,
    leftAfter: (n: number) => `يبقى ${n} بعد هذا`,
    give: (kind: string) => `امنح ${kind}`,
    choose: "اختر وسامًا",
  },
  vote: {
    title: "صوّت لنجم المباراة",
    subtitle: (when: string) =>
      `صوت واحد، من أي فريق، وليس لنفسك. تبقى الأصوات مخفية حتى الإغلاق ${when}.`,
    progress: (cast: number, eligible: number) => `صوّت ${cast} من ${eligible}`,
    tieRule: "التعادل يحسمه المنظّم",
    current: (name: string) =>
      `صوتك: ${isolate(name)}. يمكنك تغييره حتى الإغلاق.`,
    cta: (firstName: string) => `صوّت لـ ${isolate(firstName)}`,
  },
  pick: {
    subtitle:
      "ضبطت هذه المباراة على اختيار المنظّم. الأوسمة والأهداف إشارات، والقرار لك.",
    footnote:
      "مرتّبون حسب الأوسمة. عند تعادل التصويت تُفتح هذه النافذة نفسها لك مع المتعادلين فقط.",
  },
  roster: {
    openTitle: "الأوسمة حتى الآن",
    closedTitle: "الأوسمة",
    footnote:
      "اختر عملة لترى من منحها. أوسمة المزاح التي أخفاها اللاعب تبقى ظاهرة هنا لمن شارك في المباراة.",
    coinsSpoken: (name: string, coins: string) =>
      `أوسمة ${isolate(name)}: ${coins}. اعرض من منحها`,
  },
  history: {
    coinsSpoken: (coins: string) => `أوسمتك: ${coins}`,
  },
  givers: {
    title: (name: string) => `أوسمة ${isolate(name)}`,
  },
  cabinet: {
    empty: "لا أوسمة بعد",
    unavailableTitle: "هذه الأوسمة غير متاحة",
    unavailableDescription:
      "تتبع الأوسمة من يسمح لهم اللاعب برؤية سجل مبارياته.",
    loadError: "تعذّر تحميل الأوسمة",
    marksReceived: (n: number) =>
      plural("ar", n, {
        zero: "لا أوسمة",
        one: "وسام واحد",
        two: "وسامان",
        few: "{n} أوسمة",
        many: "{n} وسامًا",
        other: "{n} وسام",
      }),
    marksReceivedIn: (marks: string, games: number) =>
      `${marks} في ${plural("ar", games, {
        zero: "0 مباراة",
        one: "مباراة واحدة",
        two: "مباراتين",
        few: "{n} مباريات",
        many: "{n} مباراة",
        other: "{n} مباراة",
      })}`,
    sections: {
      teammate: "من الزملاء",
      anyone: "من أي لاعب",
      opponent: "من الخصوم",
    },
    kinds: (n: number) => kindsAr(n),
    kindsIn: (n: number, sport: "padel" | "football") =>
      `${kindsAr(n)} في ${sport === "padel" ? "البادل" : "كرة القدم"}`,
    from: (name: string, when: string) => `من ${isolate(name)}، ${when}`,
    mvpTimes: {
      vote: (n: number) => `${timesAr(n)} بالتصويت`,
      organizer: (n: number) => `${timesAr(n)} من المنظّم`,
      tieBreak: (n: number) => `${timesAr(n)} من المنظّم بعد تعادل التصويت`,
    },
    mvpHow: (parts: string[]) => parts.join(" و"),
    lastOne: (when: string, game: string) => `آخرها ${when}، ${isolate(game)}`,
  },
  detail: {
    about: (description: string, givenBy: string) =>
      `${description} ${givenBy}`,
    givenBy: {
      teammate: "يمنحه زميل أو شريك.",
      anyone: "يمكن لأي لاعب في المباراة منحه.",
      opponent: "يمنحه لاعب من الفريق الآخر.",
    },
    byVote: "بالتصويت",
    firstOne: (when: string) => `الأول ${when}`,
    otherTab: (sport: "padel" | "football") =>
      sport === "padel"
        ? "أوسمة البادل تظهر تحت تبويب بادل"
        : "أوسمة كرة القدم تظهر تحت تبويب كرة القدم",
    otherTabMvp: (sport: "padel" | "football") =>
      sport === "padel"
        ? "نجم المباراة في البادل يظهر تحت تبويب بادل"
        : "نجم المباراة في كرة القدم يظهر تحت تبويب كرة القدم",
  },
} satisfies typeof source;
