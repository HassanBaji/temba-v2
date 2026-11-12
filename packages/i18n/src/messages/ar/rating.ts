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
  inYourGroups: {
    title: "في مجموعاتك",
    noTierPadel: "لا فئات في البادل",
    seasonRecord: (won: number, lost: number) =>
      `${won} فوز، ${lost} خسارة هذا الموسم`,
    seasonRecordWithDrawn: (won: number, drawn: number, lost: number) =>
      `${won} فوز، ${drawn} تعادل، ${lost} خسارة هذا الموسم`,
    record: (won: number, lost: number) => `${won} فوز، ${lost} خسارة`,
    recordWithDrawn: (won: number, drawn: number, lost: number) =>
      `${won} فوز، ${drawn} تعادل، ${lost} خسارة`,
    place: (position: number, of: number) => `#${position} من ${of}`,
    unranked: "بلا ترتيب",
    spoken: (name: string, place: string, record: string) =>
      `${name}، ${place}، ${record}`,
    padelNote:
      "الأزواج تتبدّل، لذا يتكفّل مستوى واحد صادق بالموازنة. مباريات المجموعة تُحتسب في الفوز والخسارة وموسم المجموعة فقط.",
  },
  ovrImpact: {
    title: "ما الذي حرّك OVR الخاص بك",
    move: (before: string, after: string) =>
      `${isolate(before)} إلى ${isolate(after)}`,
    result: (percent: number) => `النتيجة ${percent}%`,
    outcome: {
      won: (average: string) => `فوز، أمام فريق متوسطه ${isolate(average)}`,
      drew: (average: string) => `تعادل، أمام فريق متوسطه ${isolate(average)}`,
      lost: (average: string) => `خسارة، أمام فريق متوسطه ${isolate(average)}`,
    },
    spoken: (title: string, delta: string) => `${title}، ${isolate(delta)} OVR`,
    ratings: (percent: number) => `تقييمات اللاعبين ${percent}%`,
    ratingFrom: (rating: string, ballots: number) =>
      plural("ar", ballots, {
        zero: `${isolate(rating)} بلا تقييمات من الزملاء والمنافسين`,
        one: `${isolate(rating)} من زميل أو منافس واحد`,
        two: `${isolate(rating)} من زميلين أو منافسين`,
        few: `${isolate(rating)} من {n} زملاء ومنافسين`,
        many: `${isolate(rating)} من {n} زميلًا ومنافسًا`,
        other: `${isolate(rating)} من {n} زميل ومنافس`,
      }),
    noRating: (min: number) =>
      `أقل من ${min} تقييمات هذه المرة، لذا هذا الجزء صفر`,
    goals: (percent: number) => `الأهداف ${percent}%`,
    goalsLine: (scored: number, conceded: number) =>
      `سجّلت ${scored}، واستقبل فريقك ${conceded} أثناء لعبك. الأهداف المستقبَلة تزن أكثر في الخط الخلفي`,
    mvp: (percent: number) => `نجم المباراة ${percent}%`,
    mvpYou: "اختارك اللاعبون نجمًا للمباراة",
    mvpOther: "ليس هذه المرة. الأوسمة الأخرى لا تحرّك OVR",
    mvpNone: "لم يُصوَّت لنجم المباراة. وحده النجم المختار بالتصويت يحرّك OVR",
    honest:
      "لتبقى التقييمات نزيهة: لا تقيّم نفسك، ويُستبعد الأعلى والأدنى، وتبقى مخفية حتى تُغلق نافذة الـ24 ساعة، وفي المباريات الموثّقة فقط.",
  },
  scope: {
    temba: "تُحتسب لمستوى Temba",
    tembaNote: "تحرّك OVR لكل لاعب. المجموعة الموثّقة ليس لها فئة.",
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
  settingsLine: {
    resultsOnly: "النتائج فقط: تتحرّك نقاط الفئة بالفوز والتعادل والخسارة.",
    organizer: (weight: number) =>
      `بعد كل مباراة يقيّم المنظّم كل لاعب، وذلك ${weight}% من الحركة.`,
    everyone: (weight: number) =>
      `بعد كل مباراة يقيّم الجميع، والمعدّل ${weight}% من الحركة.`,
    everyoneDouble: (weight: number) =>
      `بعد كل مباراة يقيّم الجميع، والمعدّل ${weight}% من الحركة، ويُحتسب تقييم المنظّم مرتين.`,
  },
  settings: {
    title: "إعدادات التقييم",
    menuRow: "إعدادات التقييم",
    summary: {
      off: "متوقّف، النتيجة وحدها تحرّك النقاط",
      organizer: (weight: string) =>
        `يقيّم المنظّم بعد المباراة، بوزن ${weight}`,
      everyone: (weight: string) => `يقيّم الجميع بعد المباراة، بوزن ${weight}`,
    },
    afterEachGame: "بعد كل مباراة",
    performanceRatings: "تقييمات الأداء",
    modes: {
      off: {
        title: "متوقّف",
        description: "النتيجة وحدها تحرّك النقاط.",
      },
      organizer: {
        title: "يقيّم المنظّم",
        description: "شخص واحد يعطي الجميع من 1 إلى 10 بعد المباراة.",
      },
      everyone: {
        title: "يقيّم الجميع",
        description: "كل لاعب يقيّم زملاءه والخصوم. تبقى مخفية 24 ساعة.",
      },
    },
    howMuch: "كم يُحتسب",
    weights: {
      light: "خفيف",
      standard: "عادي",
      heavy: "ثقيل",
    },
    weightName: {
      light: "خفيف",
      standard: "عادي",
      heavy: "ثقيل",
    },
    resultShare: "النتيجة",
    performanceShare: "كيف لعبت",
    percent: (value: number) => `${value}%`,
    splitSpoken: (result: number, performance: number) =>
      `${result}% النتيجة، ${performance}% كيف لعبت`,
    weightNote: {
      light:
        "دفعة صغيرة. المباراة الرائعة في الفريق الخاسر تخفّف الخسارة قليلًا.",
      standard:
        "الافتراضي. المباراة الرائعة في الفريق الخاسر قد تلغي معظم الخسارة.",
      heavy: "مناصفة. اللعب الجيد يهمّ بقدر الفوز؛ الأفضل مع مقيّمين صادقين.",
    },
    fairness: "الحفاظ على العدل",
    countsDouble: "تقييم المنظّم يُحتسب مرتين",
    countsDoubleHint: "الشخص الوحيد الذي شاهد المباراة كلها",
    alwaysOn:
      "مفعّل دائمًا: لا أحد يقيّم نفسه، ويُستبعد أعلى تقييم وأدناه، وتبقى التقييمات مخفية 24 ساعة، والمقيّم البعيد دائمًا عن البقية يُحتسب أقل.",
    manualChanges: "التغييرات اليدوية",
    whoCanAdjust: "من يعدّل",
    organizersOnly: "المنظّمون فقط",
    reason: "السبب",
    alwaysRequired: "مطلوب دائمًا",
    shownToPlayer: "يظهر للاعب",
    inTheirHistory: "نعم، في سجله",
    appliesFromNextGame: (line: string) =>
      `${line} تسري التغييرات من المباراة القادمة.`,
    save: "حفظ",
    savedToast: "حُفظت إعدادات التقييم",
    loadFailed: "تعذّر تحميل إعدادات التقييم",
    readOnly: "منظّمو المجموعة وحدهم يغيّرون إعدادات التقييم.",
    errors: {
      organizerOnly: "منظّمو هذه المجموعة وحدهم يغيّرون إعدادات التقييم.",
      noTier:
        "لا فئات في هذه المجموعة، فلا إعدادات تقييم لها. الفئات لمجموعات كرة القدم غير الموثّقة.",
      notMember: "أعضاء هذه المجموعة وحدهم يرون إعدادات التقييم.",
      weight: "اختر وزنًا من 20 أو 30 أو 50%.",
    },
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
    suggested: (points: string) => `مقترح من مستوى Temba: ${isolate(points)}`,
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
  ovr: {
    label: "OVR",
    value: (ovr: string) => `${isolate("OVR")} ${isolate(ovr)}`,
    startsAt: (description: string, ovr: string) =>
      `${description} تبدأ عند ${isolate("OVR")} ${isolate(ovr)}.`,
    member: (band: string, ovr: string) =>
      `${isolate(band)}، ${isolate("OVR")} ${isolate(ovr)}`,
    team: (band: string, ovr: string) =>
      `${isolate(band)}، بمعدل ${isolate("OVR")} ${isolate(ovr)}`,
    avg: (ovr: string) => `بمعدل ${isolate("OVR")} ${isolate(ovr)}`,
    heroSpoken: (ovr: string, band: string, detail: string) =>
      `${isolate("OVR")} ${isolate(ovr)}، الفئة ${isolate(band)}. ${detail}`,
  },
  performance: {
    title: "قيّم المباراة",
    entry: {
      title: "قيّم المباراة",
      organizer: (closes: string) =>
        `امنح كل لاعب من 1 إلى 10. يُغلق ${isolate(closes)}، وبعدها تتحرّك النقاط بالنتيجة وحدها.`,
      everyone: (closes: string) =>
        `قيّم زملاءك، والخصوم إن أردت. لا أحد يرى من أعطى ماذا. يُغلق ${isolate(closes)}.`,
      cta: "قيّم",
    },
    hero: {
      final: "نهائية",
      score: (slot1: number, slot2: number) => isolate(`${slot1}–${slot2}`),
      line: (place: string, who: string) => `${place}. ${who}`,
      placeSeparator: "، ",
      youOrganized: "أنت المنظّم",
      youPlayedIn: (side: string) => `لعبت مع ${side}`,
    },
    heading: "كيف لعبوا؟",
    side: {
      won: "فاز",
      lost: "خسر",
      drew: "تعادل",
      ratedOf: (rated: number, of: number) => `قُيّم ${rated} من ${of}`,
      notRatedYet: (n: number) =>
        plural("ar", n, {
          zero: "لا لاعبين",
          one: "لاعب واحد، لم يُقيَّم بعد",
          two: "لاعبان، لم يُقيَّما بعد",
          few: "{n} لاعبين، لم يُقيَّموا بعد",
          many: "{n} لاعبًا، لم يُقيَّموا بعد",
          other: "{n} لاعب، لم يُقيَّموا بعد",
        }),
      show: (side: string) => `اعرض ${side}`,
      hide: (side: string) => `أخفِ ${side}`,
    },
    you: "أنت",
    keeper: "حارس",
    selfNote: "لا تقيّم نفسك. نقاطك تتحرّك بالنتيجة",
    notRated: "–",
    cellSpoken: (name: string, value: number) => `${name}، ${value} من 10`,
    valueSpoken: (name: string, value: number) =>
      `${name}، تقييمه ${value} من 10`,
    notRatedSpoken: (name: string) => `${name}، لم يُقيَّم بعد`,
    mvpSpoken: (name: string) => `اجعل ${name} نجم المباراة`,
    footnote: (weight: number) =>
      `6 مباراة عادية. في هذه المجموعة تقييماتك هي جزء الأداء من نقاط الجميع، ${weight}% من الحركة.`,
    footnoteStar: "النجمة لنجم المباراة.",
    footer: {
      ratedOf: (rated: number, of: number) => `قُيّم ${rated} من ${of}`,
      mvp: (name: string) => `نجم المباراة: ${name}`,
      noMvp: "لا نجم للمباراة بعد",
      submit: "أرسل",
    },
    submitted: "أُرسلت التقييمات. تحرّكت نقاط الجميع.",
    everyone: {
      heading: "زملاؤك",
      closesToday: (clock: string) => `يُغلق اليوم، ${isolate(clock)}`,
      closesTomorrow: (clock: string) => `يُغلق غدًا، ${isolate(clock)}`,
      closesOn: (day: string, clock: string) =>
        `يُغلق ${day}، ${isolate(clock)}`,
      privacy: (raters: number, players: number) =>
        `لا أحد يرى من أعطى ماذا. قيّم ${raters} من ${players} حتى الآن`,
      yourSide: "فريقك",
      optional: "اختياري",
      opponentsOptional: (n: number) =>
        plural("ar", n, {
          zero: "لا خصوم",
          one: "خصم واحد، اختياري",
          two: "خصمان، اختياري",
          few: "{n} خصوم، اختياري",
          many: "{n} خصمًا، اختياري",
          other: "{n} خصم، اختياري",
        }),
      selfNote: "لا يمكنك تقييم نفسك",
      footnote: "قيّم من رأيته، واترك الباقي فارغًا. الفراغ ليس صفرًا.",
      footer: {
        nothingYet: "لم تقيّم أحدًا بعد",
        hiddenUntil: (rated: number, until: string) =>
          `قيّمت ${rated}، مخفية حتى ${isolate(until)}`,
        untilTomorrow: "الغد",
        change: "يمكنك تغييرها حتى يُغلق",
        send: "أرسل",
      },
      submitted: "أُرسلت التقييمات. يمكنك تغييرها حتى يُغلق.",
    },
    closed: {
      title: "أُغلقت التقييمات",
      description:
        "وصلت تقييمات هذه المباراة وتحرّكت نقاطها. لا شيء آخر لتقييمه.",
    },
    suspended: {
      title: "التقييمات متوقّفة",
      description:
        "يجري تصحيح النتيجة. تُفتح التقييمات من جديد لمدة 24 ساعة حين تصبح نهائية، وتبقى تقييماتك.",
    },
    result: {
      pending: {
        title: "تقييمك في الطريق",
        everyone: (closes: string) =>
          `${closes}. بعدها ترى تقييمك وما فعله بنقاط فئتك.`,
        everyoneOvr: (closes: string) =>
          `${closes}. بعدها ترى تقييمك وما الذي حرّك OVR الخاص بك.`,
        organizer: (closes: string) =>
          `المنظّم يقيّم الجميع. ترى تقييمك وما فعله بنقاط فئتك حين يرسل تقييماته، وفي موعد أقصاه ${isolate(closes)}.`,
      },
      game: "مباراتك",
      gameOn: (day: string) => `مباراتك، ${day}`,
      score: (slot1: string, score: string, slot2: string) =>
        `${slot1} ${isolate(score)} ${slot2}`,
      rating: {
        ofTen: "من 10",
        spoken: (rating: string) => `تقييمك ${isolate(rating)} من 10`,
        from: (n: number) =>
          plural("ar", n, {
            zero: "من دون تقييمات.",
            one: "من تقييم واحد.",
            two: "من تقييمين.",
            few: "من {n} تقييمات.",
            many: "من {n} تقييمًا.",
            other: "من {n} تقييم.",
          }),
        trimmed: "استُبعد الأعلى والأدنى.",
        double: "واحتُسب تقييم المنظّم مرّتين.",
        trimmedAndDouble:
          "استُبعد الأعلى والأدنى، واحتُسب تقييم المنظّم مرّتين.",
        average: (rating: string) => `متوسط المباراة ${isolate(rating)}.`,
      },
      outcome: {
        won: (score: string) => `فوز ${isolate(score)}`,
        drew: (score: string) => `تعادل ${isolate(score)}`,
        lost: (score: string) => `خسارة ${isolate(score)}`,
        played: "لعبت",
        againstStronger: (outcome: string) =>
          `${outcome} أمام الفريق الأقوى على الورق`,
        againstWeaker: (outcome: string) =>
          `${outcome} أمام الفريق الأضعف على الورق`,
        againstEven: (outcome: string) =>
          `${outcome} أمام فريق مكافئ على الورق`,
      },
      points: {
        title: "ما فعله بنقاطك",
        result: "النتيجة",
        performance: "كيف لعبت",
        againstUsual: (rating: string, usual: string) =>
          `${isolate(rating)} مقابل معدّلك ${isolate(usual)}`,
        rated: (rating: string) => `تقييمك ${isolate(rating)}`,
        total: (before: string, after: string) =>
          `من ${isolate(before)} إلى ${isolate(after)}`,
        weight: (weight: number) =>
          `الأداء ${isolate(`${weight}%`)} من الحركة في هذه المجموعة`,
        spoken: (title: string, delta: string) =>
          `${title}، ${isolate(delta)} نقطة`,
      },
      noRating: {
        organizerRated: "قيّمت هذه المباراة، فتحرّكت نقاطك على النتيجة وحدها.",
        organizerDidNotRate:
          "لم يقيّمك المنظّم، فتحرّكت نقاطك على النتيجة وحدها.",
        nobody: (min: number) =>
          `لم يقيّمك أحد، ويلزم ${min}. تحرّكت نقاطك على النتيجة وحدها.`,
        tooFew: (n: number, min: number) =>
          plural("ar", n, {
            zero: `لم يقيّمك أحد، ويلزم ${min}. تحرّكت نقاطك على النتيجة وحدها.`,
            one: `قيّمك لاعب واحد فقط، ويلزم ${min}. تحرّكت نقاطك على النتيجة وحدها.`,
            two: `قيّمك لاعبان فقط، ويلزم ${min}. تحرّكت نقاطك على النتيجة وحدها.`,
            few: `قيّمك {n} لاعبين فقط، ويلزم ${min}. تحرّكت نقاطك على النتيجة وحدها.`,
            many: `قيّمك {n} لاعبًا فقط، ويلزم ${min}. تحرّكت نقاطك على النتيجة وحدها.`,
            other: `قيّمك {n} لاعب فقط، ويلزم ${min}. تحرّكت نقاطك على النتيجة وحدها.`,
          }),
      },
      tier: {
        title: "فئتك",
        upFrom: (placeOf: string, before: number) =>
          `${placeOf}، صعودًا من #${before}`,
        downFrom: (placeOf: string, before: number) =>
          `${placeOf}، نزولًا من #${before}`,
        still: (band: string) => `ما زلت ${band}.`,
        upTo: (band: string) => `صعدت إلى ${band}.`,
        downTo: (band: string) => `نزلت إلى ${band}.`,
        nowA: (band: string) => `صرت ${band}.`,
        toNext: (points: string, band: string) =>
          `${isolate(points)} نقطة إلى ${band}.`,
        noFish: "لا أسماك حتى يُصنَّف أربعة لاعبين.",
        provisional:
          "يأتي مركزك وسمكتك بعد خمس مباريات في المجموعة، أو قبل ذلك إن حدّد منظّم نقاطك.",
      },
      mvp: {
        title: (name: string) => `نجم المباراة: ${name}`,
        you: "أنت",
        votes: (votes: number, cast: number) =>
          plural("ar", cast, {
            zero: `${votes} من دون أصوات`,
            one: `${votes} من صوت واحد`,
            two: `${votes} من صوتين`,
            few: `${votes} من {n} أصوات`,
            many: `${votes} من {n} صوتًا`,
            other: `${votes} من {n} صوت`,
          }),
        picked: "اختاره المنظّم",
        tieBreak: "اختاره المنظّم بعد تعادل في التصويت",
        rated: (how: string, rating: string) =>
          `${how}، تقييمه ${isolate(rating)}`,
      },
      footnote:
        "مباراة مجموعة. حرّكت نقاط فئتك هنا ولا شيء غيرها: لا مستواك في Temba، ولا أي رتبة.",
    },
    summary: {
      title: "وصلت التقييمات",
      entry: {
        title: "وصلت التقييمات",
        description: "تقييم كل لاعب وحركة نقاطه، ومن تغيّرت فئته.",
        cta: "اعرض",
      },
      pending: {
        title: "التقييمات ما زالت مفتوحة",
        description: (closes: string) =>
          `${closes}. بعدها تجد هنا تقييم كل لاعب وحركة نقاطه.`,
      },
      line: (rated: string, closed: string) =>
        `${rated}. أُغلقت النافذة ${isolate(closed)}`,
      organizerRated: "قيّمها المنظّم",
      organizerDidNotRate: "لم يقيّم المنظّم",
      columns: "التقييم، النقاط",
      more: (n: number) =>
        plural("ar", n, {
          zero: "لا مزيد",
          one: "واحد آخر",
          two: "اثنان آخران",
          few: "{n} آخرين",
          many: "{n} آخرين",
          other: "{n} آخرين",
        }),
      row: {
        mvp: "نجم المباراة",
        upTo: (band: string) => `صعد إلى ${band}`,
        downTo: (band: string) => `نزل إلى ${band}`,
        nowA: (band: string) => `صار ${band}`,
        ratings: (n: number) =>
          plural("ar", n, {
            zero: "لا تقييمات",
            one: "تقييم واحد",
            two: "تقييمان",
            few: "{n} تقييمات",
            many: "{n} تقييمًا",
            other: "{n} تقييم",
          }),
        notRated: "لم يُقيَّم",
        ratedSpoken: (rating: string) => `تقييمه ${isolate(rating)}`,
        notRatedSpoken: "بلا تقييم",
        pointsSpoken: (points: string) => `${isolate(points)} نقطة`,
        spokenSeparator: "، ",
      },
      outliers: {
        title: (n: number) =>
          plural("ar", n, {
            zero: "لم يُخفَّف وزن أي مقيّم",
            one: "احتُسب مقيّم واحد بوزن أقل",
            two: "احتُسب مقيّمان بوزن أقل",
            few: "احتُسب {n} مقيّمين بوزن أقل",
            many: "احتُسب {n} مقيّمًا بوزن أقل",
            other: "احتُسب {n} مقيّم بوزن أقل",
          }),
        description:
          "ابتعدت تقييماتهم عن تقييمات الجميع للمباراة الثالثة على التوالي. تبقى الأسماء سرّية، حتى عنك.",
      },
      footer: {
        title: "هل يبدو شيء خاطئًا؟",
        description: "عدّل لاعبًا من الأعضاء، إدارة",
        cta: "الأعضاء",
      },
      loadFailed: "تعذّر تحميل ملخّص التقييمات",
    },
    loadFailed: "تعذّر تحميل التقييمات",
    errors: {
      noWindow: "لا تقييمات أداء لهذه المباراة.",
      closed: "أُغلقت تقييمات هذه المباراة.",
      organizerOnly: "في هذه المجموعة لا يقيّم إلا منظّم المباراة.",
      seatedOnly: "لا يقيّم هذه المباراة إلا لاعبوها.",
      self: "لا يمكنك تقييم نفسك.",
      notPlayer: "قيّم لاعبي هذه المباراة فقط.",
      value: "التقييم عدد صحيح من 1 إلى 10.",
      duplicate: "قيّم كل لاعب مرة واحدة.",
      summaryOrganizerOnly: "لا يرى ملخّص التقييمات إلا منظّم المباراة.",
    },
  },
  verifier: {
    kinds: {
      club_staff: "طاقم النادي",
      referee: "حكم",
      coach: "مدرب",
    },
    calibrate: {
      action: "معايرة المستوى",
      title: (sport: string) => `معايرة مستوى ${sport}`,
      description: "بصفتك مُوثِّقًا. يرى اللاعب اسمك وناديك وسببك.",
      saved: (name: string, level: string) =>
        `تمت معايرة مستوى ${name} إلى ${level}`,
      notAllowed: {
        title: "لا يمكنك معايرة مستوى هذا اللاعب",
        description:
          "يعاير المُوثِّق مستوى لاعب لعب في ناديه أو ينتمي إلى إحدى مجموعات النادي.",
      },
    },
    stamp: {
      action: "اختم النتيجة",
      note: "بصفتك مُوثِّقًا في هذا النادي. ختمك نهائي ويُكمل المباراة.",
      stamped: "تم ختم النتيجة",
      stampedBy: (name: string) => `ختمها ${name}`,
      stampedFinal: (name: string) => `ختمها ${name}. لا حاجة إلى شيء آخر.`,
      errors: {
        notVerifier: "لا يختم مباريات هذه اللعبة إلا مُوثِّق في ناديها.",
        seated: "لعبت في هذه المباراة، لذا لا يمكنك ختمها.",
        cancelled: "لا يمكن ختم مباراة ملغاة.",
      },
    },
  },
  dispute: {
    action: "اعترض على هذه النتيجة",
    hint: "ترى النتيجة خاطئة؟ أخبر Temba ويقرّر أحد المشغّلين.",
    sheetTitle: "اعترض على هذه النتيجة",
    sheetDescription: (days: number) =>
      plural("ar", days, {
        one: "لنتيجة احتُسبت لمستوى Temba، خلال يوم من المباراة. إن وافق المشغّل، تُفتح النتيجة من جديد وتُسترجع حركات المستوى.",
        two: "لنتيجة احتُسبت لمستوى Temba، خلال يومين من المباراة. إن وافق المشغّل، تُفتح النتيجة من جديد وتُسترجع حركات المستوى.",
        few: "لنتيجة احتُسبت لمستوى Temba، خلال {n} أيام من المباراة. إن وافق المشغّل، تُفتح النتيجة من جديد وتُسترجع حركات المستوى.",
        many: "لنتيجة احتُسبت لمستوى Temba، خلال {n} يومًا من المباراة. إن وافق المشغّل، تُفتح النتيجة من جديد وتُسترجع حركات المستوى.",
        other:
          "لنتيجة احتُسبت لمستوى Temba، خلال {n} يوم من المباراة. إن وافق المشغّل، تُفتح النتيجة من جديد وتُسترجع حركات المستوى.",
      }),
    noteLabel: "ما الخطأ",
    notePlaceholder: "كانت النتيجة 6–4، 3–6، 6–2",
    submit: "أرسل إلى Temba",
    sent: "أُرسل الاعتراض. سيقرّر Temba.",
    openByViewer: "اعترضت على هذه النتيجة. سيقرّر Temba.",
    openByOther: "اعترض لاعب على هذه النتيجة. سيقرّر Temba.",
    errors: {
      notCounted: "لا يُعترض إلا على نتيجة احتُسبت لمستوى Temba.",
      notSeated: "لا يعترض على المباراة إلا لاعب فيها.",
      notCompleted: "لا يُعترض إلا على مباراة منتهية.",
      tooLate: (days: number) =>
        plural("ar", days, {
          one: "يمكن الاعتراض على النتيجة خلال يوم من المباراة.",
          two: "يمكن الاعتراض على النتيجة خلال يومين من المباراة.",
          few: "يمكن الاعتراض على النتيجة خلال {n} أيام من المباراة.",
          many: "يمكن الاعتراض على النتيجة خلال {n} يومًا من المباراة.",
          other: "يمكن الاعتراض على النتيجة خلال {n} يوم من المباراة.",
        }),
      alreadyOpen: "هذه النتيجة معترض عليها بالفعل. سيقرّر Temba.",
      note: "اكتب ما الخطأ، في 280 حرفًا أو أقل.",
      notFound: "لم يُعثر على الاعتراض.",
      decided: "تم البتّ في هذا الاعتراض بالفعل.",
    },
    operator: {
      title: "الاعتراضات",
      description:
        "نتائج يقول اللاعبون إنها خاطئة. قبول الاعتراض يفتح النتيجة من جديد ويسترجع حركات المستوى.",
      settingsSubtitle: "نتائج يقول اللاعبون إنها خاطئة",
      errorTitle: "تعذّر تحميل الاعتراضات",
      empty: {
        title: "لا اعتراضات مفتوحة",
        description:
          "حين يعترض لاعب على نتيجة احتُسبت لمستوى Temba، تظهر هنا.",
      },
      raisedBy: (name: string, when: string) => `${isolate(name)} · ${when}`,
      openGame: "افتح المباراة",
      uphold: "اقبل",
      dismiss: "ارفض",
      upholdTitle: "قبول هذا الاعتراض؟",
      upholdDescription:
        "تُفتح النتيجة من جديد وتُسترجع حركات المستوى. يُدخل اللاعبون النتيجة الصحيحة.",
      dismissTitle: "رفض هذا الاعتراض؟",
      dismissDescription: "تبقى النتيجة. يُبلَّغ اللاعب ومنظمو المباراة.",
      upheld: "قُبل الاعتراض. النتيجة مفتوحة من جديد.",
      dismissed: "رُفض الاعتراض. تبقى النتيجة.",
      notCompleted: "النتيجة مفتوحة من جديد بالفعل.",
    },
  },
  publicGame: {
    label: "مباراة عامة",
    createNote:
      "بلا مجموعة. يستطيع الانضمام كل من يقع ضمن نطاق مستواها، في نادٍ شريك.",
    createAction: "أنشئ مباراة عامة",
    levelRangeNote: "يُنصح به",
    levelRangeHint:
      "ينضم غرباء إلى المباراة العامة. نطاق المستوى يُبقيها متكافئة.",
    noPartnerVenues: "لا نوادٍ شريكة بعد، لذا لا يمكن إنشاء مباراة عامة.",
    noPartnerPitches:
      "لا نوادٍ شريكة فيها ملعب كرة قدم بعد، لذا لا يمكن إنشاء مباراة كرة قدم عامة.",
    sport: "الرياضة",
    countsNote:
      "يؤكد الفريقان النتيجة خلال 24 ساعة. وإن لم يحدث، تبقى النتيجة ولا تُحتسب.",
    confirmWindow: {
      hours: (n: number) =>
        plural("ar", n, {
          one: "ساعة",
          two: "ساعتان",
          few: "{n} ساعات",
          many: "{n} ساعة",
          other: "{n} ساعة",
        }),
      minutes: (n: number) =>
        plural("ar", n, {
          one: "دقيقة",
          two: "دقيقتان",
          few: "{n} دقائق",
          many: "{n} دقيقة",
          other: "{n} دقيقة",
        }),
      yours: (left: string) =>
        `بقي ${left} للتأكيد. إن لم يؤكد فريقك، تبقى النتيجة ولا تُحتسب لمستوى Temba.`,
      theirs: (left: string) =>
        `بقي ${left} ليؤكد الفريق الآخر. إن لم يؤكد، تبقى النتيجة ولا تُحتسب لمستوى Temba.`,
    },
    stood: "لم تُؤكَّد في الوقت. لم تُحتسب.",
    notInTime: "ليس في الوقت",
    hub: {
      emptyTitle: "لا مباريات عامة الآن",
      emptyLine:
        "تظهر هنا المباريات العامة في النوادي الشريكة. أنشئ واحدة ويستطيع الانضمام كل من يقع ضمن نطاق مستواها.",
      emptySportLine: (sport: string) =>
        `تظهر هنا مباريات ${sport} العامة في النوادي الشريكة. أنشئ واحدة ويستطيع الانضمام كل من يقع ضمن نطاق مستواها.`,
    },
  },
} satisfies typeof source;
