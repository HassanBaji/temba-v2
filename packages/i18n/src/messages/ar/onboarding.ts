import type { onboarding as source } from "../en/onboarding";

export const onboarding = {
  sport: {
    padel: {
      description: "زوجي، فترات 90 دقيقة. مستوى بحرف يتبع نتائجك.",
      meta: "المستوى من D إلى A، الجهة",
    },
    football: {
      description: "5 ضد 5 أو 7 ضد 7. تجمّع أولًا، وتُحدد الفرق قبل البداية.",
      meta: "المستوى، الدور، المركز",
    },
  },
  padelLevel: {
    newToPadel: {
      name: "جديد في البادل",
      detail: "يتعلّم الجدران والقواعد.",
    },
    beginner: { name: "مبتدئ", detail: "لوب وفولي بقصد." },
    improver: {
      name: "متحسّن",
      detail: "الضربات العلوية والفولي موثوقة، والأخطاء ما زالت تتسلل.",
    },
    clubPlayer: {
      name: "لاعب نادٍ",
      detail: "مرتاح مع الزجاج، يبني النقطة بدل التسرّع فيها.",
    },
    intermediate: {
      name: "متوسط",
      detail: "يلعب البطولات، يختار الضربة الصحيحة، ونادرًا ما يهدي النقاط.",
    },
    advanced: {
      name: "متقدم",
      detail: "يفوز بالبطولات، ينهي النقاط عند الشبكة.",
    },
    competitor: {
      name: "منافس",
      detail: "يحقق مراكز في البطولات، يضغط عند الشبكة، ويدافع عن اللوب جيدًا.",
    },
    expert: {
      name: "خبير",
      detail: "في قمة الساحة المحلية، يقرأ المباراة بخطوة مسبقة.",
    },
    pro: {
      name: "محترف",
      detail: "ينافس في الدوري الوطني أو الدولي.",
    },
  },
  padelSide: {
    left: "جهة الباكهاند",
    right: "جهة الفورهاند",
    either: "حيثما يكون شاغرًا",
  },
  footballRole: {
    outfield: "لاعب",
    keeper: "حارس",
  },
  padelNotSure: (level: string) =>
    `لست متأكدًا، ابدأ عند ${level} واترك الجهة مفتوحة`,
  summary: {
    levelAlreadySet: "المستوى محدد مسبقًا",
    padelLine: (level: string, side: string) => `${level}، ${side}`,
    footballLine: (slot: string, placement: string) => `${slot}، ${placement}`,
  },
  flow: {
    pickAtLeastOne: "اختر واحدة على الأقل",
    continueWithBoth: "تابع بكلتيهما",
    continueWith: (sport: string) => `تابع مع ${sport}`,
    findSportGames: (sport: string) => `ابحث عن مباريات ${sport}`,
    findGames: "ابحث عن مباريات",
  },
} satisfies typeof source;
