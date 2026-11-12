import type { gameAlbum as source } from "../en/game-album";
import { plural } from "../../plural";

const sentences = (parts: string[]) =>
  parts.map((part) => (/[.!؟]$/.test(part) ? part : `${part}.`)).join(" ");

function everyoneWho(players: number) {
  return plural("ar", players, {
    zero: "أنت فقط",
    one: "أنت فقط",
    two: "أنتما الاثنان",
    few: "أنتم الـ{n}",
    many: "أنتم الـ{n}",
    other: "أنتم الـ{n}",
  });
}

function photoCount(n: number) {
  return plural("ar", n, {
    zero: "لا صور",
    one: "صورة واحدة",
    two: "صورتين",
    few: "{n} صور",
    many: "{n} صورة",
    other: "{n} صورة",
  });
}

export const gameAlbum = {
  twoNames: (names: string, last: string) => `${names} و${last}`,
  album: {
    title: "الألبوم",
    count: (n: number, total: number) => `${n} من ${total}`,
    addPhotos: "أضف صورًا",
    addPhoto: "أضف صورة",
    emptyCaption: (players: number) =>
      `ست صور للمباراة، من أي لاعب شارك فيها. ${everyoneWho(players)} ترونها هنا فقط، ولا تُنشر في أي مكان آخر.`,
    moreFit: (n: number) =>
      plural("ar", n, {
        zero: "لا مكان لصور أخرى",
        one: "تتسع لصورة أخرى",
        two: "تتسع لصورتين أخريين",
        few: "تتسع لـ{n} صور أخرى",
        many: "تتسع لـ{n} صورة أخرى",
        other: "تتسع لـ{n} صورة أخرى",
      }),
    youAdded: (n: number) => `أضفت ${photoCount(n)}`,
    firstAdded: (name: string, n: number) => `أضاف ${name} ${photoCount(n)}`,
    alsoAdded: (name: string, n: number) => `${name} ${photoCount(n)}`,
    sentences,
    full: "الألبوم ممتلئ.",
    fullRemoveYours: "الألبوم ممتلئ. احذف إحدى صورك لتضيف أخرى.",
    photoBy: (name: string) => `صورة أضافها ${name}`,
    photoByYou: "صورة أضفتها",
    emptySlot: "خانة فارغة",
  },
  add: {
    title: "أضف إلى الألبوم",
    subtitle: (room: number, total: number) =>
      plural("ar", room, {
        zero: `لا خانات متبقية من ${total}.`,
        one: `بقيت خانة واحدة من ${total}. اختر صورة واحدة.`,
        two: `بقيت خانتان من ${total}. اختر حتى صورتين.`,
        few: `بقيت {n} خانات من ${total}. اختر حتى {n} صور.`,
        many: `بقيت {n} خانة من ${total}. اختر حتى {n} صورة.`,
        other: `بقيت {n} خانة من ${total}. اختر حتى {n} صورة.`,
      }),
    takePhoto: "التقط صورة",
    library: "المعرض",
    footnote:
      "تبقى الصور مع المباراة ولا يراها إلا اللاعبون. يحذف كل لاعب صوره، ويحذف المنظّم أي صورة.",
    submit: (n: number) =>
      plural("ar", n, {
        zero: "أضف الصور",
        one: "أضف صورة واحدة",
        two: "أضف صورتين",
        few: "أضف {n} صور",
        many: "أضف {n} صورة",
        other: "أضف {n} صورة",
      }),
    pickFirst: "اختر صورًا",
    uploading: (done: number, total: number) =>
      `جارٍ إضافة ${done} من ${total}…`,
    added: (n: number) =>
      plural("ar", n, {
        zero: "لم تُضف صور",
        one: "أُضيفت الصورة",
        two: "أُضيفت صورتان",
        few: "أُضيفت {n} صور",
        many: "أُضيفت {n} صورة",
        other: "أُضيفت {n} صورة",
      }),
    tooMany: (room: number) =>
      plural("ar", room, {
        zero: "لا مكان لصور أخرى",
        one: "يتسع الألبوم لصورة واحدة، فأُبقيت الأولى",
        two: "يتسع الألبوم لصورتين، فأُبقيت الأوليان",
        few: "يتسع الألبوم لـ{n} صور، فأُبقيت الأولى منها",
        many: "يتسع الألبوم لـ{n} صورة، فأُبقيت الأولى منها",
        other: "يتسع الألبوم لـ{n} صورة، فأُبقيت الأولى منها",
      }),
    cameraDenied: "اسمح بالوصول إلى الكاميرا من الإعدادات لالتقاط صورة",
    unreadable: "تعذّرت قراءة هذه الصورة",
    remove: "أزلها من الاختيار",
    close: "إغلاق",
  },
  viewer: {
    counter: (index: number, total: number) => `${index} من ${total}`,
    close: "إغلاق",
    share: "مشاركة",
    save: "حفظ",
    remove: "حذف",
    youAdded: "أضفت هذه الصورة",
    added: (name: string) => `أضافها ${name}`,
    meta: (time: string, place: string) => `${time}. ${place}`,
    saved: "حُفظت في صورك",
    saveDenied: "اسمح بالوصول إلى الصور من الإعدادات لتحفظ",
    removeTitle: "حذف هذه الصورة؟",
    removeBody: "ستُحذف من الألبوم لكل من لعب.",
    removeConfirm: "احذف الصورة",
    cancel: "إلغاء",
    removed: "حُذفت الصورة",
    previous: "الصورة السابقة",
    next: "الصورة التالية",
    photo: (index: number, total: number) => `الصورة ${index} من ${total}`,
  },
  notes: {
    title: "الملاحظات",
    noneYet: "لا شيء بعد",
    publicCount: (n: number) => `${n} عامة`,
    onlyYours: "1 لك",
    publicAndYours: (n: number) => `${n} عامة، 1 لك`,
    writeTitle: "اكتب ملاحظتك",
    writeHint: "ملاحظة واحدة لكل لاعب. لكل من في المباراة، أو لك وحدك.",
    emptyCaption: (players: number) =>
      `الملاحظة هي إحساسك بالمباراة، وما تتمرن عليه، ومن تلعب معه مجددًا. الملاحظات العامة يقرؤها ${everyoneWho(players)} فقط. والخاصة لك وحدك وتصنع دفترك الخاص.`,
    you: "أنت",
    onlyYou: "لك وحدك",
    time: (day: string, clock: string) => `${day}، ${clock}`,
    privateTime: (time: string) => `لك وحدك، ${time}`,
    onlyYouCanRead: "لا يقرأ الملاحظة أعلاه غيرك",
    everyoneCanRead: "يقرأ ملاحظتك كل من في المباراة",
    edit: "تعديل",
    editNote: "عدّل ملاحظتك",
    notShared: (names: string, count: number) =>
      plural("ar", count, {
        one: `لم يشارك ${names} ملاحظة`,
        two: `لم يشارك ${names} ملاحظة`,
        few: `لم يشارك ${names} ملاحظة`,
        many: `لم يشارك ${names} ملاحظة`,
        other: `لم يشارك ${names} ملاحظة`,
      }),
    notSharedCount: (n: number) =>
      plural("ar", n, {
        one: "لاعب واحد لم يشارك ملاحظة",
        two: "لاعبان لم يشاركا ملاحظة",
        few: "{n} لاعبين لم يشاركوا ملاحظة",
        many: "{n} لاعبًا لم يشاركوا ملاحظة",
        other: "{n} لاعب لم يشاركوا ملاحظة",
      }),
    closeAfter: "تُغلق الملاحظات بعد 30 يومًا من المباراة",
    closed: "أُغلقت الملاحظات",
    sentences,
  },
  note: {
    title: "ملاحظتك",
    subtitle:
      "ملاحظة واحدة لكل لاعب، عدّلها متى شئت خلال الثلاثين يومًا القادمة.",
    who: "من يقرؤها",
    everyone: (players: number) => everyoneWho(players),
    everyoneHint: "تظهر تحت المباراة لكل من لعب.",
    onlyMe: "أنا فقط",
    onlyMeHint: "سطر في دفترك الخاص. لا يراه أحد غيرك.",
    fieldLabel: "ملاحظتك",
    placeholder: "إحساسك، وما تتمرن عليه، ومن تلعب معه مجددًا",
    privateHint: "لن يقرأها أحد غيرك",
    publicHint: (names: string) => `سيقرؤها ${names}`,
    publicNobodyYet: "سيقرؤها كل من لعب",
    namesAndOthers: (names: string, others: number) =>
      plural("ar", others, {
        one: `${names} وشخص آخر`,
        two: `${names} وشخصان آخران`,
        few: `${names} و{n} آخرون`,
        many: `${names} و{n} آخرين`,
        other: `${names} و{n} آخرين`,
      }),
    counter: (n: number, max: number) => `${n} من ${max}`,
    savePrivate: "احفظ في ملاحظاتك",
    savePublic: (players: number) => `شاركها مع ${everyoneWho(players)}`,
    saved: "حُفظت في ملاحظاتك",
    shared: "شوركت الملاحظة",
    delete: "احذف الملاحظة",
    deleteTitle: "حذف ملاحظتك؟",
    deleteBody:
      "ستُحذف من المباراة ومن ملاحظاتك. يمكنك كتابة غيرها ما دامت الملاحظات مفتوحة.",
    deleteConfirm: "احذف الملاحظة",
    deleted: "حُذفت الملاحظة",
    close: "إغلاق",
  },
  myNotes: {
    title: "ملاحظاتك",
    entry: "ملاحظاتك",
    entryHint: "كل ملاحظة كتبتها، الخاصة والمشتركة",
    subtitle: (n: number) =>
      plural("ar", n, {
        zero: "لا ملاحظات. لا يرى هذه الصفحة غيرك؛ والمشتركة تظهر أيضًا تحت مبارياتها.",
        one: "ملاحظة واحدة. لا يرى هذه الصفحة غيرك؛ والمشتركة تظهر أيضًا تحت مبارياتها.",
        two: "ملاحظتان. لا يرى هذه الصفحة غيرك؛ والمشتركة تظهر أيضًا تحت مبارياتها.",
        few: "{n} ملاحظات. لا يرى هذه الصفحة غيرك؛ والمشتركة تظهر أيضًا تحت مبارياتها.",
        many: "{n} ملاحظة. لا يرى هذه الصفحة غيرك؛ والمشتركة تظهر أيضًا تحت مبارياتها.",
        other:
          "{n} ملاحظة. لا يرى هذه الصفحة غيرك؛ والمشتركة تظهر أيضًا تحت مبارياتها.",
      }),
    tabs: "تصفية الملاحظات",
    all: (n: number) => `الكل ${n}`,
    private: (n: number) => `لي فقط ${n}`,
    public: (n: number) => `مشتركة ${n}`,
    onlyYou: "لك وحدك",
    shared: "مشتركة",
    day: (weekday: string, day: string) => `${weekday} ${day}`,
    withPartners: (names: string) => `مع ${names}`,
    empty: "لا ملاحظات بعد",
    emptyHint:
      "بعد كل مباراة، اكتب إحساسك أو ما تتمرن عليه. تتجمع ملاحظاتك هنا.",
    emptyFiltered: "لا ملاحظات هنا بعد",
    openGame: "افتح المباراة",
  },
  played: {
    summary: (photos: string, notes: string) => `${photos}، ${notes}`,
    photos: (n: number) => photoCount(n),
    noPhotos: "لا صور بعد",
    notes: (n: number) =>
      plural("ar", n, {
        zero: "لا ملاحظات",
        one: "ملاحظة واحدة",
        two: "ملاحظتان",
        few: "{n} ملاحظات",
        many: "{n} ملاحظة",
        other: "{n} ملاحظة",
      }),
    noNotes: "لا ملاحظات",
    open: "افتح",
    addPhotos: "أضف صورًا",
  },
  errors: {
    notPlayed: "يُفتح الألبوم بعد انتهاء المباراة",
    notPlayer: "لا يفعل ذلك إلا لاعبو هذه المباراة",
    albumFull: "الألبوم ممتلئ",
    notesClosed: "تُغلق الملاحظات بعد 30 يومًا من المباراة",
    photoNotFound: "الصورة غير موجودة",
    notYourPhoto: "لا تحذف إلا صورك",
    noteEmpty: "اكتب شيئًا أولًا",
    noteTooLong: "الملاحظة 300 حرف على الأكثر",
    photoEmpty: "الصورة فارغة",
    photoTooLarge: "حجم الصورة أكبر من 2 ميغابايت",
    photoType: "استخدم صورة JPEG أو PNG أو WebP",
    photoUploadFailed: "تعذّر رفع الصورة. حاول مجددًا.",
    noteNotFound: "الملاحظة غير موجودة",
  },
} satisfies typeof source;
