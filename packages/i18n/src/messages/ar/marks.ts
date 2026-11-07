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
} satisfies typeof source;
