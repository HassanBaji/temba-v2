import { isolate } from "../../bidi";
import type { marks as source } from "../en/marks";
import { plural } from "../../plural";

export const marks = {
  kind: {
    dynamo: {
      name: "الدينامو",
      description: "غطّى كل كرة ولم يتوقف عن الركض.",
    },
    let_him_cook: {
      name: "خلّوه يطبخ",
      description: "تراجعت خطوة وتركته يقود المباراة.",
    },
    mr_fumble: {
      name: "أبو زلّة",
      description: "كانت في يده، وأفلتها رغم ذلك.",
    },
    sayed_malek: {
      name: "سيد مالك",
      description: "لعب كشيخ نعسان. وقت القيلولة في الملعب.",
    },
    clutch: {
      name: "رجل الحسم",
      description: "فاز بالنقاط المهمة.",
    },
    mr_ice: {
      name: "أعصاب حديد",
      description: "لم ينهر تحت الضغط.",
    },
    smash_machine: {
      name: "ماكينة سماش",
      description: "لم يتوقف عن إنهاء الكرات.",
    },
    goal_machine: {
      name: "ماكينة أهداف",
      description: "لم يتوقف عن التسجيل.",
    },
    great_wall: {
      name: "سور الصين",
      description: "لم يمرّ منه شيء.",
    },
    comeback_king: {
      name: "ملك الريمونتادا",
      description: "عاد من موقف خاسر.",
    },
    underdog: {
      name: "الحصان الأسود",
      description: "لم يتوقع أحد هذا الفوز.",
    },
    good_game: {
      name: "يعطيك العافية",
      description: "لعب نظيف، ومتعة، واحترام.",
    },
    mvp: {
      name: "نجم المباراة",
      description: "أفضل لاعب، واحد في كل مباراة.",
    },
  },
  group: {
    teammate: "من زميلك أو شريكك",
    anyone: "من أي لاعب في المباراة",
    opponent: "من الفريق الآخر",
  },
  window: {
    closes: (when: string) => `يُغلق ${when}`,
    closed: (when: string) => `أُغلق ${when}`,
    opensAfterScore: "مفتوحة 48 ساعة بعد النتيجة",
  },
  give: {
    title: "امنح أوسمتك",
    toGive: (n: number) =>
      plural("ar", n, {
        zero: "لا أوسمة متبقية",
        one: "وسام واحد، واحد لكل لاعب",
        two: "وسامان، واحد لكل لاعب",
        few: "{n} أوسمة، واحد لكل لاعب",
        many: "{n} وسامًا، واحد لكل لاعب",
        other: "{n} وسام، واحد لكل لاعب",
      }),
    choosePlayer: "اختر لاعبًا",
    youGave: (given: number, total: number) => `منحت ${given} من ${total}`,
    gaveTo: (kind: string, name: string) => `${kind} لـ ${isolate(name)}`,
    retract: "استرجاع",
    refused: {
      self: "لا يمكنك منح نفسك وسامًا.",
      notParticipant: "يمنح الأوسمة لاعبو هذه المباراة فقط، لبعضهم.",
      windowClosed: "أُغلقت الأوسمة في هذه المباراة.",
      capReached: "منحت كل أوسمتك في هذه المباراة.",
      alreadyMarkedReceiver: "منحت هذا اللاعب وسامًا من قبل.",
      kindNotAllowed: "لا يمكن منح هذا الوسام لهذا اللاعب.",
    },
  },
  soFar: (given: number, givers: number) =>
    plural("ar", givers, {
      one: `${given} منحها لاعب واحد`,
      two: `${given} منحها لاعبان`,
      few: `${given} منحها {n} لاعبين`,
      many: `${given} منحها {n} لاعبًا`,
      other: `${given} منحها {n} لاعب`,
    }),
  count: (n: number) => `×${n}`,
  roast: {
    hiddenFromOthers: "مخفي عن الآخرين",
  },
  cabinet: {
    title: "الأوسمة",
    received: (n: number) =>
      plural("ar", n, {
        zero: "لا أوسمة بعد",
        one: "وسام واحد",
        two: "وسامان",
        few: "{n} أوسمة",
        many: "{n} وسامًا",
        other: "{n} وسام",
      }),
    notYet: "ليس بعد",
    kindsNotYet: (n: number, total: number) => `${n} من ${total} لم تُنَل بعد`,
    lastFrom: (name: string, game: string) =>
      `آخرها من ${isolate(name)}، ${isolate(game)}`,
    fromTeammate: "زميل",
    fromOpponent: "منافس",
  },
  settings: {
    hideRoasts: "إخفاء أوسمة المزاح من ملفي",
    hideRoastsHelp: "أبو زلّة وسيد مالك. تبقى ظاهرة داخل كل مباراة.",
  },
  mvp: {
    mode: {
      vote: {
        label: "تصويت اللاعبين",
        description:
          "كل لاعب في المباراة له صوت واحد بعد النتيجة. تبقى الأصوات مخفية حتى الإغلاق.",
        help: "التعادل في التصويت يأتيك لتحسمه. يُغلق التصويت بعد 48 ساعة من النتيجة، أو قبلها إذا صوّت الجميع.",
      },
      organizer: {
        label: "المنظّم يختار",
        description: "أنت تختار، مع الأوسمة والأهداف كإشارات.",
        help: "يمكنك تغيير اختيارك حتى انتهاء مهلة الـ48 ساعة.",
      },
      none: {
        label: "بدون نجم",
        description:
          "الأوسمة تعمل كالمعتاد، لكن لا أحد يحصل على العملة الذهبية.",
        help: "يمكنك تفعيله لاحقًا من المباراة ما دامت النتيجة لم تُؤكَّد بعد.",
      },
    },
    notDecided: "نجم المباراة لم يُحدَّد بعد",
    vote: "صوّت",
    pick: "اختر نجم المباراة",
    changePick: "غيّر الاختيار",
    progress: (cast: number, eligible: number, closes: string) =>
      `صوّت ${cast} من ${eligible}، ${closes}`,
    byVote: (cast: number, eligible: number) =>
      `بالتصويت، ${cast} من ${eligible}`,
    organizerPick: "اختيار المنظّم",
    tieBreak: "تعادل في التصويت، واختيار المنظّم",
    noMvp: "لا نجم في هذه المباراة",
    make: (firstName: string) => `اجعل ${isolate(firstName)} نجم المباراة`,
    tieNotice: (n: number) =>
      plural("ar", n, {
        one: "تعادل في التصويت. اختر نجم المباراة.",
        two: "تعادل في التصويت بين لاعبَين. اختر نجم المباراة.",
        few: "تعادل في التصويت بين {n} لاعبين. اختر نجم المباراة.",
        many: "تعادل في التصويت بين {n} لاعبًا. اختر نجم المباراة.",
        other: "تعادل في التصويت بين {n} لاعب. اختر نجم المباراة.",
      }),
    refused: {
      wrongMode: "لا تحدد هذه المباراة نجمها بهذه الطريقة.",
      notVoter: "يصوّت لنجم المباراة لاعبو هذه المباراة فقط.",
      notOrganizer: "يختار المنظّم وحده نجم المباراة.",
      self: "لا يمكنك اختيار نفسك.",
      notCandidate: "لا يمكن أن يكون هذا اللاعب نجم المباراة هنا.",
      closed: "لم يعد اختيار نجم المباراة مفتوحًا.",
    },
  },
  errors: {
    mvpFriendlyOnly: "نجم المباراة للمباراة الودية فقط",
    mvpModeFixed: "تُثبَّت طريقة اختيار نجم المباراة بعد تأكيد النتيجة",
    markNotFound: "الوسام غير موجود",
  },
} satisfies typeof source;
